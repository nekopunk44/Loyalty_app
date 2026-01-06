/**
 * Bookings routes (prefix: /api/bookings):
 *   GET    /property/:propertyId/booked-dates  — занятые даты (кэш TTL=60s)
 *   POST   /                                   — создать бронирование (SERIALIZABLE txn)
 *   GET    /                                   — все бронирования [admin]
 *   GET    /property/:propertyId               — бронирования объекта [admin]
 *   GET    /user/:userId                       — бронирования пользователя
 *   GET    /:bookingId                         — конкретное бронирование
 *   PUT    /:bookingId                         — обновить бронирование
 *   DELETE /:bookingId                         — удалить бронирование [admin]
 *   POST   /:bookingId/confirm-payment         — подтвердить платёж + кэшбек
 *   POST   /:bookingId/cancel                  — отменить + возврат средств
 *   PATCH  /:bookingId/status                  — изменить статус [admin]
 *   POST   /:bookingId/pay-from-card           — оплатить с карты лояльности
 *   GET    /:bookingId/payment-status          — статус платежа
 */
const express = require('express');

const logger = require('../logger');
const { sequelize, Sequelize } = require('../db');
const { Op } = Sequelize;
const cache = require('../cache');
const {
  Booking, LoyaltyCard, Transaction, Property,
  User, Payment, AdminWallet, AdminTransaction, Event,
} = require('../models');
const {
  verifyToken, verifyAdmin, canAccessBooking, requireOwnerOrAdmin,
} = require('../middleware/auth');
const { validate, schemas } = require('../validation');
const { CASHBACK_RATES, BIRTHDAY_MULTIPLIER, DEFAULT_CASHBACK_RATE } = require('../config/loyalty');
const { notify, notifyAllAdmins } = require('../utils/notify');
const { computePromotionEffect } = require('../services/promotionEngine');

const isBirthday = (birthDate) => {
  if (!birthDate) return false;
  const today = new Date();
  const bd = new Date(birthDate);
  return bd.getMonth() === today.getMonth() && bd.getDate() === today.getDate();
};

const isDev = () => (process.env.NODE_ENV || 'development') === 'development';

// Люкс и Стандарт — один дом, их календари синхронизированы.
// Вся территория синхронизирована со всеми объектами.
const relatedProperties = {
  '1': ['1', '2', '4'],
  '2': ['1', '2', '4'],
  '3': ['3', '4'],
  '4': ['1', '2', '3', '4'],
};

const invalidateBookedDatesCache = async (propertyId) => {
  const ids = relatedProperties[String(propertyId)] || [String(propertyId)];
  await Promise.all(ids.map(id => cache.del(`booked-dates:${id}`)));
};

const BOOKING_ATTRIBUTES = [
  'id', 'propertyId', 'userId', 'checkInDate', 'checkOutDate',
  'guests', 'notes', 'saunaHours', 'kitchenware', 'totalPrice',
  'depositAmount', 'depositPaidAt', 'remainingAmount', 'remainingPaidAt',
  'remainingPaymentMethod', 'paymentDeadline',
  'cashbackAmount', 'cashbackCreditedAt', 'cashbackRevertedAt',
  'status', 'createdAt', 'updatedAt',
];

module.exports = function createBookingsRouter({ isDbConnected }) {
  const router = express.Router();

  /**
   * GET /property/:propertyId/booked-dates — занятые даты (с кэшем 60s).
   */
  router.get('/property/:propertyId/booked-dates', async (req, res) => {
    try {
      const { propertyId } = req.params;

      if (!propertyId) {
        return res.status(400).json({ success: false, error: 'propertyId является обязательным параметром' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL не подключена' });
      }

      const cacheKey = `booked-dates:${propertyId}`;
      const cached = await cache.get(cacheKey);
      if (cached) return res.status(200).json(cached);

      const propertiesToCheck = relatedProperties[propertyId.toString()] || [propertyId.toString()];

      // booked-dates показывает занятые слоты: и confirmed/completed (оплата
      // прошла), и pending_payment (зарезервирован, ждёт оплаты депозита).
      const bookings = await Booking.findAll({
        where: {
          propertyId: propertiesToCheck,
          status:     { [Op.in]: ['pending_payment', 'pending', 'confirmed', 'completed'] },
        },
        attributes: BOOKING_ATTRIBUTES,
      });

      const bookedDates = [];
      bookings.forEach((booking) => {
        try {
          if (!booking.checkInDate || !booking.checkOutDate) return;
          const [dayIn, monthIn, yearIn]   = booking.checkInDate.split('.');
          const [dayOut, monthOut, yearOut] = booking.checkOutDate.split('.');
          const checkIn  = new Date(yearIn,  monthIn  - 1, dayIn);
          const checkOut = new Date(yearOut, monthOut - 1, dayOut);
          if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return;
          const current = new Date(checkIn);
          while (current <= checkOut) {
            const d = current.getDate(), m = current.getMonth() + 1, y = current.getFullYear();
            bookedDates.push(`${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`);
            current.setDate(current.getDate() + 1);
          }
        } catch (e) {
          logger.error('booked-dates parse error', { bookingId: booking.id, error: e.message });
        }
      });

      const payload = {
        success: true,
        propertyId,
        bookedDates: [...new Set(bookedDates)],
        allBookings: bookings,
        count: [...new Set(bookedDates)].length,
      };

      await cache.set(cacheKey, payload, 60);
      return res.status(200).json(payload);
    } catch (error) {
      logger.error('booked dates error', { propertyId: req.params.propertyId, error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при получении занятых дат',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * POST / — создать бронирование (SERIALIZABLE для защиты от race condition).
   */
  router.post('/', verifyToken, validate(schemas.createBooking), async (req, res) => {
    try {
      const { checkInDate, checkOutDate, guests, notes, totalPrice, saunaHours, kitchenware } = req.body;
      const userId = req.userId;
      // zod union пропускает propertyId как число ИЛИ строку. Booking.propertyId
      // — TEXT-колонка, Property.id — INTEGER. Если не нормализовать здесь,
      // в WHERE летят разные типы и Postgres падает с «operator does not exist».
      const propertyIdStr = String(req.body.propertyId);
      const propertyIdInt = parseInt(propertyIdStr, 10);

      if (!propertyIdStr || !userId || !checkInDate || !checkOutDate || !guests) {
        return res.status(400).json({ success: false, error: 'Отсутствуют обязательные поля' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL не подключена' });
      }

      const [dayIn, monthIn, yearIn]   = checkInDate.split('.');
      const [dayOut, monthOut, yearOut] = checkOutDate.split('.');
      const checkIn  = new Date(yearIn,  monthIn  - 1, dayIn);
      const checkOut = new Date(yearOut, monthOut - 1, dayOut);

      // new Date() молча оборачивает невалидные даты (напр. 31.02 → 03.03)
      // поэтому проверяем что дни/месяцы не изменились после конструирования
      const dateInvalid =
        isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) ||
        checkIn.getDate()  !== Number(dayIn)   || checkIn.getMonth()  !== Number(monthIn)  - 1 ||
        checkOut.getDate() !== Number(dayOut)  || checkOut.getMonth() !== Number(monthOut) - 1;
      if (dateInvalid) {
        return res.status(400).json({ success: false, error: 'Неверный формат даты. Используйте ДД.MM.YYYY' });
      }
      if (checkOut <= checkIn) {
        return res.status(400).json({ success: false, error: 'Дата выезда должна быть позже даты заезда' });
      }

      const bookingTxn = await sequelize.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
      });

      let booking;
      let depositAmount   = 0;
      let remainingAmount = 0;
      let paymentDeadline;
      // Hoisted: используются и в транзакции, и в блоке уведомлений ниже.
      const bookingPrice = parseFloat(totalPrice) || 0;
      const guestsInt    = Math.max(1, parseInt(guests) || 1);
      try {
        // Конфликт = любая не-отменённая/не-просроченная бронь. pending_payment тоже
        // блокирует слот до своего expiry (Sprint A: 12ч TTL, см. §3.1 ВКР).
        const conflicts = await Booking.findAll({
          where: {
            propertyId: propertyIdStr,
            status: { [Op.in]: ['pending_payment', 'pending', 'confirmed', 'completed'] },
          },
          lock: bookingTxn.LOCK.UPDATE,
          transaction: bookingTxn,
        });

        const conflictingBookings = [];
        for (const b of conflicts) {
          if (!b.checkInDate || !b.checkOutDate) continue;
          const [edi, emi, eyi] = b.checkInDate.split('.');
          const [edo, emo, eyo] = b.checkOutDate.split('.');
          const existIn  = new Date(eyi, emi - 1, edi);
          const existOut = new Date(eyo, emo - 1, edo);
          if (
            (checkIn >= existIn && checkIn <= existOut) ||
            (checkOut >= existIn && checkOut <= existOut) ||
            (checkIn <= existIn && checkOut >= existOut)
          ) {
            conflictingBookings.push({
              id:           b.id,
              status:       b.status,
              userId:       b.userId,
              checkInDate:  b.checkInDate,
              checkOutDate: b.checkOutDate,
              paymentDeadline: b.paymentDeadline,
            });
          }
        }

        if (conflictingBookings.length > 0) {
          await bookingTxn.rollback();
          // Сбрасываем кэш — возможно, юзер видел стаpые «свободные» даты,
          // а в БД уже был conflict (TTL 60s).
          await invalidateBookedDatesCache(propertyIdStr);
          logger.warn('booking create conflict', {
            propertyId: propertyIdStr,
            requested:  { checkInDate, checkOutDate },
            conflicts:  conflictingBookings,
          });

          // Если хотя бы один из конфликтов — pending_payment самого же
          // пользователя, значит он повторно жмёт «Подтвердить» вместо того,
          // чтобы оплатить уже существующую бронь. Подсказываем фронту.
          const ownPending = conflictingBookings.find(
            (c) => c.userId === userId && c.status === 'pending_payment',
          );
          if (ownPending) {
            return res.status(409).json({
              success: false,
              error:   'У вас уже есть бронь на эти даты, ожидающая оплаты депозита',
              ownPendingBookingId: ownPending.id,
              ownPendingDeadline:  ownPending.paymentDeadline,
              conflicts: conflictingBookings,
            });
          }
          return res.status(409).json({
            success: false,
            error:   'Выбранные даты уже заняты',
            conflicts: conflictingBookings,
          });
        }

        let loyaltyCard = await LoyaltyCard.findOne({ where: { userId }, transaction: bookingTxn });
        if (!loyaltyCard) {
          loyaltyCard = await LoyaltyCard.create({
            userId, balance: 0, cashbackRate: 5, totalSpent: 0, totalEarned: 0, membershipLevel: 'Bronze',
          }, { transaction: bookingTxn });
        }

        // Депозит — snapshot из Property на момент создания. Если у Property его нет
        // (legacy=0) — депозит = totalPrice, остатка нет, юзер платит сразу всё.
        const property = await Property.findByPk(propertyIdInt, { transaction: bookingTxn });
        const propertyDeposit = parseFloat(property?.depositAmount) || 0;
        depositAmount   = propertyDeposit > 0
          ? Math.min(propertyDeposit, bookingPrice)
          : bookingPrice;
        remainingAmount = Math.max(0, parseFloat((bookingPrice - depositAmount).toFixed(2)));
        // 12 часов на оплату депозита (см. §3.1 ВКР: anti-squat механизм).
        paymentDeadline = new Date(Date.now() + 12 * 60 * 60 * 1000);

        booking = await Booking.create({
          propertyId:       propertyIdStr,
          userId,
          checkInDate,
          checkOutDate,
          guests:           guestsInt,
          notes:            notes || '',
          saunaHours:       Math.max(0, parseInt(saunaHours) || 0),
          kitchenware:      kitchenware || false,
          totalPrice:       bookingPrice,
          depositAmount,
          remainingAmount,
          paymentDeadline,
          status:           'pending_payment',
        }, { transaction: bookingTxn });

        await bookingTxn.commit();
      } catch (txnErr) {
        await bookingTxn.rollback();
        throw txnErr;
      }

      await invalidateBookedDatesCache(propertyIdStr);

      // Уведомление администраторов о новом (ещё не оплаченном) бронировании — best-effort
      try {
        const bookingUser = await User.findOne({ where: { userId } });
        const property    = await Property.findByPk(propertyIdInt);

        const services = [];
        if (booking.saunaHours > 0) services.push(`сауна ${booking.saunaHours}ч.`);
        if (booking.kitchenware)    services.push('посуда и кухня');
        const servicesStr = services.length ? `. Услуги: ${services.join(', ')}` : '';

        const adminMsg =
          `Новое бронирование от ${bookingUser?.name || 'пользователь'}` +
          ` (${bookingUser?.email || userId}): ${property?.name || `объект ${propertyIdStr}`}.` +
          ` Заезд: ${checkInDate}, выезд: ${checkOutDate}.` +
          ` Гостей: ${guestsInt}. Сумма: ${bookingPrice} PRB${servicesStr}.` +
          ` Ожидает оплаты.`;

        notifyAllAdmins({
          title:   'Новое бронирование',
          message: adminMsg,
          type:    'new_booking',
          data: {
            bookingId: booking.id,
            propertyId: propertyIdStr,
            userId,
            userName: bookingUser?.name,
            checkInDate,
            checkOutDate,
            guests: guestsInt,
            totalPrice: bookingPrice,
            status: 'pending',
          },
        });
      } catch (notifyErr) {
        logger.error('booking create notify error', { error: notifyErr.message, stack: notifyErr.stack });
      }

      return res.status(201).json({
        success:   true,
        message:   `Бронирование создано. Оплатите депозит ${depositAmount} PRB до ${paymentDeadline.toISOString()}.`,
        bookingId: booking.id,
        booking,
        payment: {
          totalAmount:     parseFloat(totalPrice) || 0,
          depositAmount,
          remainingAmount,
          status:          'pending_payment',
          paymentDeadline: paymentDeadline.toISOString(),
          transactionTime: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('booking create error', {
        error:     error.message,
        sqlOriginal: error.original?.message,
        sqlDetail:   error.original?.detail,
        sqlHint:     error.original?.hint,
        sqlCode:     error.original?.code,
        stack:     error.stack,
      });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при создании бронирования',
        details: error.message,
      });
    }
  });

  /**
   * GET / — все бронирования с фильтром по статусу [admin].
   * Обогащает каждое бронирование именем гостя и названием объекта.
   */
  router.get('/', verifyAdmin, async (req, res) => {
    try {
      const { status } = req.query;
      if (!isDbConnected()) return res.status(503).json({ success: false, error: 'DB not connected' });
      const where = status ? { status } : {};
      const rawBookings = await Booking.findAll({ where, order: [['id', 'DESC']] });

      // Обогащаем именами пользователей и объектов за один дополнительный запрос
      const userIds = [...new Set(rawBookings.map(b => b.userId).filter(Boolean))];
      const propIds = [...new Set(rawBookings.map(b => b.propertyId).filter(Boolean))];
      const [users, properties] = await Promise.all([
        userIds.length ? User.findAll({ where: { userId: { [Op.in]: userIds } }, attributes: ['userId', 'displayName', 'email', 'avatar', 'rulesSignature', 'rulesSignedAt'] }) : [],
        propIds.length ? Property.findAll({ where: { id: { [Op.in]: propIds } }, attributes: ['id', 'name'] }) : [],
      ]);
      const userMap = Object.fromEntries(users.map(u => [u.userId, u]));
      const propMap = Object.fromEntries(properties.map(p => [String(p.id), p]));

      const bookings = rawBookings.map(b => ({
        ...b.toJSON(),
        userName:     userMap[b.userId]?.displayName || null,
        userEmail:    userMap[b.userId]?.email       || null,
        userAvatar:   userMap[b.userId]?.avatar      || null,
        userRulesSignature: userMap[b.userId]?.rulesSignature || null,
        userRulesSignedAt:  userMap[b.userId]?.rulesSignedAt  || null,
        propertyName: propMap[String(b.propertyId)]?.name || null,
      }));

      return res.json({ success: true, bookings, count: bookings.length });
    } catch (error) {
      logger.error('admin bookings list error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Error fetching bookings' });
    }
  });

  /**
   * GET /property/:propertyId — бронирования конкретного объекта [admin].
   * ВАЖНО: должен быть объявлен ДО /:bookingId, иначе Express подхватит "property" как bookingId.
   */
  router.get('/property/:propertyId', verifyAdmin, async (req, res) => {
    try {
      const { propertyId } = req.params;
      if (!isDbConnected()) return res.status(503).json({ success: false, error: 'DB not connected' });
      const bookings = await Booking.findAll({ where: { propertyId }, order: [['id', 'DESC']] });
      return res.json({ success: true, bookings, count: bookings.length });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Error fetching property bookings' });
    }
  });

  /**
   * GET /user/:userId — бронирования пользователя.
   * ВАЖНО: должен быть объявлен ДО /:bookingId.
   */
  router.get('/user/:userId', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL не подключена' });
      }
      const rawBookings = await Booking.findAll({
        where: { userId },
        attributes: BOOKING_ATTRIBUTES,
      });

      // Подтягиваем актуальные имена номеров — каталог /api/properties отдаёт
      // только status='available', а в истории встречаются и снятые с продажи.
      // Booking.propertyId — TEXT, Property.id — INTEGER, поэтому кастуем в число.
      const propIds = [...new Set(
        rawBookings.map(b => parseInt(b.propertyId, 10)).filter(Number.isFinite)
      )];
      const properties = propIds.length
        ? await Property.findAll({ where: { id: { [Op.in]: propIds } }, attributes: ['id', 'name'] })
        : [];
      const propMap = Object.fromEntries(properties.map(p => [String(p.id), p.name]));

      const bookings = rawBookings.map(b => ({
        ...(typeof b.toJSON === 'function' ? b.toJSON() : b),
        propertyName: propMap[String(b.propertyId)] || null,
      }));

      return res.status(200).json({ success: true, userId, bookings, count: bookings.length });
    } catch (error) {
      logger.error('user bookings error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при получении бронирований пользователя',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /:bookingId — конкретное бронирование.
   */
  router.get('/:bookingId', verifyToken, async (req, res) => {
    try {
      const { bookingId } = req.params;
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL не подключена' });
      }
      const booking = await Booking.findByPk(bookingId, { attributes: BOOKING_ATTRIBUTES });
      if (!booking) return res.status(404).json({ success: false, error: 'Бронирование не найдено' });
      if (!canAccessBooking(req, booking)) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      return res.status(200).json({ success: true, bookingId: booking.id, booking });
    } catch (error) {
      logger.error('booking fetch error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при получении бронирования',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * PUT /:bookingId — обновить поля бронирования.
   */
  router.put('/:bookingId', verifyToken, async (req, res) => {
    try {
      const { bookingId } = req.params;
      if (!isDbConnected()) return res.status(503).json({ success: false, error: 'DB not connected' });
      const booking = await Booking.findByPk(bookingId);
      if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
      if (booking.userId !== req.userId && req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      const allowed = ['checkInDate', 'checkOutDate', 'guestName', 'guestCount', 'notes'];
      const updates = {};
      allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
      await booking.update(updates);
      return res.json({ success: true, booking });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Error updating booking' });
    }
  });

  /**
   * DELETE /:bookingId — удалить бронирование [admin].
   */
  router.delete('/:bookingId', verifyAdmin, async (req, res) => {
    try {
      const { bookingId } = req.params;
      if (!isDbConnected()) return res.status(503).json({ success: false, error: 'DB not connected' });
      const booking = await Booking.findByPk(bookingId);
      if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
      await booking.destroy();
      return res.json({ success: true, message: 'Booking deleted' });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Error deleting booking' });
    }
  });

  // ─── Sprint A ВКР: гибридный платёжный поток (deposit + remaining) ─────────
  //
  // Пути:
  //   POST /:id/pay-deposit         — оплата депозита с карты (pending_payment → confirmed)
  //   POST /:id/pay-remaining       — оплата остатка (confirmed → completed),
  //                                    body: { method: 'card' | 'cash' }
  //
  // Кэшбэк начисляется ТОЛЬКО при completion. Если remaining оплачен налом —
  // кэшбэк считается только с депозита (нал мимо приложения).
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * POST /:bookingId/pay-deposit — оплатить депозит с карты лояльности.
   * После успешной оплаты status='confirmed'. Остаток оплачивается отдельно.
   */
  router.post('/:bookingId/pay-deposit', verifyToken, async (req, res) => {
    const txn = await sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    });
    try {
      const { bookingId } = req.params;
      if (!isDbConnected()) {
        await txn.rollback();
        return res.status(503).json({ success: false, error: 'PostgreSQL не подключена' });
      }

      const booking = await Booking.findByPk(bookingId, { lock: txn.LOCK.UPDATE, transaction: txn });
      if (!booking) {
        await txn.rollback();
        return res.status(404).json({ success: false, error: 'Бронирование не найдено' });
      }
      if (!canAccessBooking(req, booking)) {
        await txn.rollback();
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      if (booking.status !== 'pending_payment') {
        await txn.rollback();
        return res.status(400).json({
          success: false,
          error:  'Депозит уже оплачен или бронирование не ожидает оплаты',
          currentStatus: booking.status,
        });
      }
      if (booking.depositAmount == null) {
        await txn.rollback();
        return res.status(400).json({ success: false, error: 'У бронирования не указан депозит' });
      }
      // Проверка дедлайна (на случай если cron ещё не успел отработать)
      if (booking.paymentDeadline && new Date() > new Date(booking.paymentDeadline)) {
        await txn.rollback();
        return res.status(410).json({ success: false, error: 'Срок оплаты депозита истёк' });
      }

      const depositAmount = parseFloat(booking.depositAmount);
      const loyaltyCard = await LoyaltyCard.findOne({
        where: { userId: booking.userId },
        lock: txn.LOCK.UPDATE,
        transaction: txn,
      });
      if (!loyaltyCard) {
        await txn.rollback();
        return res.status(404).json({ success: false, error: 'Карта лояльности не найдена' });
      }

      const balance   = parseFloat(loyaltyCard.balance);
      const locked    = parseFloat(loyaltyCard.lockedBalance || 0);
      const available = parseFloat((balance - locked).toFixed(2));
      if (available < depositAmount) {
        await txn.rollback();
        return res.status(402).json({
          success:        false,
          error:          'Недостаточно доступных PRB для депозита',
          requiredAmount: depositAmount,
          available,
          deficit:        parseFloat((depositAmount - available).toFixed(2)),
        });
      }

      const balanceAfter = parseFloat((balance - depositAmount).toFixed(2));
      await loyaltyCard.update({
        balance:    balanceAfter,
        totalSpent: parseFloat((parseFloat(loyaltyCard.totalSpent) + depositAmount).toFixed(2)),
      }, { transaction: txn });

      const paidAt = new Date();
      await booking.update({
        status:        'confirmed',
        depositPaidAt: paidAt,
      }, { transaction: txn });

      await Transaction.create({
        userId:        booking.userId,
        bookingId:     booking.id,
        type:          'debit',
        category:      'booking_deposit',
        amount:        depositAmount,
        description:   `Депозит за бронирование #${booking.id}`,
        balanceBefore: balance,
        balanceAfter,
        relatedType:   'booking',
        relatedId:     String(booking.id),
        metadata:      { source: 'booking_deposit' },
      }, { transaction: txn });

      // AdminWallet credit
      const financeAdmin = await User.findOne({ where: { role: 'admin', adminLevel: 1 }, transaction: txn });
      if (financeAdmin) {
        const adminWallet = await AdminWallet.findOne({
          where: { adminId: financeAdmin.userId },
          lock: txn.LOCK.UPDATE,
          transaction: txn,
        });
        if (adminWallet) {
          const aBefore = parseFloat(adminWallet.totalBalance);
          await adminWallet.update({
            totalBalance:     parseFloat((aBefore + depositAmount).toFixed(2)),
            availableBalance: parseFloat((parseFloat(adminWallet.availableBalance) + depositAmount).toFixed(2)),
            totalReceived:    parseFloat((parseFloat(adminWallet.totalReceived) + depositAmount).toFixed(2)),
          }, { transaction: txn });
          await AdminTransaction.create({
            adminId:       financeAdmin.userId,
            adminLevel:    1,
            type:          'booking_deposit',
            amount:        depositAmount,
            bookingId:     booking.id,
            description:   `Депозит за бронирование #${booking.id}`,
            balanceBefore: aBefore,
            balanceAfter:  parseFloat((aBefore + depositAmount).toFixed(2)),
          }, { transaction: txn });
        }
      }

      await txn.commit();
      await invalidateBookedDatesCache(booking.propertyId);

      // Уведомления best-effort
      try {
        const property = await Property.findByPk(booking.propertyId);
        notify({
          userId:  booking.userId,
          title:   'Депозит принят',
          message: `Депозит ${depositAmount} PRB за бронирование #${booking.id} (${property?.name || ''}) принят. Остаток ${booking.remainingAmount || 0} PRB — оплатите до заезда.`,
          type:    'payment',
          data:    { bookingId: booking.id, depositAmount },
        });
        const user = await User.findOne({ where: { userId: booking.userId } });
        notifyAllAdmins({
          title:   'Депозит оплачен',
          message: `${user?.name || 'пользователь'} оплатил депозит ${depositAmount} PRB за #${booking.id} (${property?.name || `объект ${booking.propertyId}`}).`,
          type:    'booking_deposit',
          data:    { bookingId: booking.id, userId: booking.userId, depositAmount },
        });
      } catch (notifyErr) {
        logger.error('pay-deposit notify error', { error: notifyErr.message });
      }

      return res.status(200).json({
        success:   true,
        message:   'Депозит оплачен. Бронирование подтверждено.',
        bookingId: booking.id,
        booking,
        payment: {
          type:            'deposit',
          amount:          depositAmount,
          remainingAmount: parseFloat(booking.remainingAmount) || 0,
          balanceAfter,
        },
      });
    } catch (error) {
      try { await txn.rollback(); } catch (_) {}
      logger.error('booking pay-deposit error', {
        error:       error.message,
        sqlOriginal: error.original?.message,
        sqlDetail:   error.original?.detail,
        sqlHint:     error.original?.hint,
        sqlCode:     error.original?.code,
        stack:       error.stack,
      });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при оплате депозита',
        details: error.message,
      });
    }
  });

  /**
   * POST /:bookingId/pay-remaining — зафиксировать способ оплаты остатка.
   * Body: { method: 'card' | 'cash' }.
   *
   * НЕ списывает деньги и НЕ меняет статус. Только сохраняет выбор юзера
   * в booking.remainingPaymentMethod и нотифицирует админа. Само списание
   * (для card) и начисление кэшбэка происходит в last-day-cron'е
   * (bookingJobs.settleRemainingPayments) на дату выезда.
   *
   * Для card делается preview-проверка доступного баланса, чтобы юзер
   * сразу узнал, если денег не хватит на дату списания.
   */
  router.post('/:bookingId/pay-remaining', verifyToken, async (req, res) => {
    const txn = await sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    });
    try {
      const { bookingId } = req.params;
      const { method }    = req.body || {};
      if (!['card', 'cash'].includes(method)) {
        await txn.rollback();
        return res.status(400).json({ success: false, error: 'method должен быть "card" или "cash"' });
      }
      if (!isDbConnected()) {
        await txn.rollback();
        return res.status(503).json({ success: false, error: 'PostgreSQL не подключена' });
      }

      const booking = await Booking.findByPk(bookingId, { lock: txn.LOCK.UPDATE, transaction: txn });
      if (!booking) {
        await txn.rollback();
        return res.status(404).json({ success: false, error: 'Бронирование не найдено' });
      }
      if (!canAccessBooking(req, booking)) {
        await txn.rollback();
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      if (booking.status !== 'confirmed') {
        await txn.rollback();
        return res.status(400).json({
          success: false,
          error:  'Остаток можно оплатить только после оплаты депозита',
          currentStatus: booking.status,
        });
      }

      const remainingAmount = parseFloat(booking.remainingAmount) || 0;

      // Preview-проверка для card: убедимся, что денег хватит на дату списания.
      // Это не гарантия (баланс может измениться), но даёт юзеру быструю
      // обратную связь.
      if (method === 'card' && remainingAmount > 0) {
        const loyaltyCard = await LoyaltyCard.findOne({
          where: { userId: booking.userId },
          transaction: txn,
        });
        if (!loyaltyCard) {
          await txn.rollback();
          return res.status(404).json({ success: false, error: 'Карта лояльности не найдена' });
        }
        const balance = parseFloat(loyaltyCard.balance);
        const locked  = parseFloat(loyaltyCard.lockedBalance || 0);
        const available = parseFloat((balance - locked).toFixed(2));
        if (available < remainingAmount) {
          await txn.rollback();
          return res.status(402).json({
            success:        false,
            error:          'Недостаточно доступных PRB для оплаты остатка картой',
            requiredAmount: remainingAmount,
            available,
            deficit:        parseFloat((remainingAmount - available).toFixed(2)),
          });
        }
      }

      // Сохраняем выбор. Статус остаётся 'confirmed'. Само списание для card
      // и переход в 'completed' для обоих методов произойдёт в день выезда.
      await booking.update({
        remainingPaymentMethod: method,
      }, { transaction: txn });

      await txn.commit();

      // Уведомления best-effort
      try {
        const property = await Property.findByPk(booking.propertyId);
        const user     = await User.findOne({ where: { userId: booking.userId } });
        notify({
          userId:  booking.userId,
          title:   'Способ оплаты остатка сохранён',
          message: method === 'card'
            ? `Остаток ${remainingAmount} PRB будет списан с карты лояльности в день выезда (${booking.checkOutDate}). Кэшбэк начислится со всей суммы брони.`
            : `Бронирование #${booking.id}: остаток ${remainingAmount} PRB будет принят наличными при заезде. Кэшбэк начислится только с депозита.`,
          type:    'payment_method_selected',
          data:    { bookingId: booking.id, method, remainingAmount },
        });
        notifyAllAdmins({
          title:   method === 'card' ? 'Пользователь выбрал оплату остатка картой' : 'Пользователь выбрал оплату остатка наличными',
          message: method === 'card'
            ? `${user?.name || 'пользователь'} (${booking.userId}) выбрал списание остатка ${remainingAmount} PRB с карты по бронированию #${booking.id} (${property?.name || ''}). Списание — в день выезда (${booking.checkOutDate}).`
            : `${user?.name || 'пользователь'} (${booking.userId}) выбрал оплату остатка ${remainingAmount} PRB наличными по бронированию #${booking.id} (${property?.name || ''}). Принять наличные при заезде.`,
          type:    'remaining_method_selected',
          data:    { bookingId: booking.id, userId: booking.userId, method, remainingAmount, checkOutDate: booking.checkOutDate },
        });
      } catch (notifyErr) {
        logger.error('pay-remaining notify error', { error: notifyErr.message });
      }

      return res.status(200).json({
        success:   true,
        message:   method === 'card'
          ? 'Способ оплаты остатка сохранён. Списание произойдёт в день выезда.'
          : 'Способ оплаты остатка сохранён. Принять наличные при заезде.',
        bookingId: booking.id,
        booking,
        payment: {
          type:            'remaining_method_choice',
          method,
          remainingAmount,
          settleOn:        booking.checkOutDate,
        },
      });
    } catch (error) {
      try { await txn.rollback(); } catch (_) {}
      logger.error('booking pay-remaining error', {
        error:       error.message,
        sqlOriginal: error.original?.message,
        sqlDetail:   error.original?.detail,
        sqlHint:     error.original?.hint,
        sqlCode:     error.original?.code,
        stack:       error.stack,
      });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при сохранении способа оплаты',
        details: error.message,
      });
    }
  });

  // ─── Старый confirm-payment (deprecated в Sprint A ВКР) ────────────────────
  // Заменён на пару pay-deposit + pay-remaining. Возвращает 410 Gone, чтобы
  // старые клиенты получили явную ошибку, а не молчаливо «сломались».
  router.post('/:bookingId/confirm-payment', verifyToken, async (req, res) => {
    return res.status(410).json({
      success: false,
      error:   'Endpoint удалён. Используйте POST /:bookingId/pay-deposit и POST /:bookingId/pay-remaining.',
      migration: {
        deposit:   'POST /api/bookings/:bookingId/pay-deposit',
        remaining: 'POST /api/bookings/:bookingId/pay-remaining  body: { method: "card" | "cash" }',
      },
    });
  });

  /**
   * POST /:bookingId/cancel — отменить бронирование с возвратом средств.
   * SERIALIZABLE + SELECT FOR UPDATE на booking и loyaltyCard исключает двойной возврат
   * при параллельных запросах отмены.
   */
  router.post('/:bookingId/cancel', verifyToken, async (req, res) => {
    const txn = await sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    });

    try {
      const { bookingId } = req.params;

      if (!isDbConnected()) {
        await txn.rollback();
        return res.status(503).json({ success: false, error: 'PostgreSQL не подключена' });
      }

      const booking = await Booking.findByPk(bookingId, { lock: txn.LOCK.UPDATE, transaction: txn });
      if (!booking) {
        await txn.rollback();
        return res.status(404).json({ success: false, error: 'Бронирование не найдено' });
      }

      if (!canAccessBooking(req, booking)) {
        await txn.rollback();
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      // Допустимые статусы для отмены. expired / cancelled — терминальные.
      const CANCELLABLE = ['pending', 'pending_payment', 'confirmed', 'completed'];
      if (!CANCELLABLE.includes(booking.status)) {
        await txn.rollback();
        return res.status(400).json({
          success: false,
          error:  'Бронирование уже отменено или просрочено',
          currentStatus: booking.status,
        });
      }

      // 2-day deadline применяется только когда уже есть оплата (confirmed/completed).
      // Для pending_payment/pending — отмена бесплатна в любой момент.
      const [dayIn, monthIn, yearIn] = booking.checkInDate.split('.');
      const checkInDate = new Date(yearIn, monthIn - 1, dayIn);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      checkInDate.setHours(0, 0, 0, 0);
      const daysUntilCheckIn = Math.floor((checkInDate - today) / (1000 * 60 * 60 * 24));

      const hasPayment = booking.status === 'confirmed' || booking.status === 'completed';
      if (hasPayment && daysUntilCheckIn < 2) {
        await txn.rollback();
        return res.status(400).json({
          success: false,
          error:  `Отмена доступна минимум за 2 дня до заезда. До заезда осталось ${daysUntilCheckIn} дней.`,
          daysUntilCheckIn,
        });
      }

      let depositBurned   = 0;
      let remainingRefund = 0;
      let cashbackRevert  = 0;

      if (booking.status === 'confirmed' || booking.status === 'completed') {
        const loyaltyCard = await LoyaltyCard.findOne({
          where: { userId: booking.userId },
          lock: txn.LOCK.UPDATE,
          transaction: txn,
        });
        if (!loyaltyCard) {
          await txn.rollback();
          return res.status(404).json({ success: false, error: 'Карта лояльности пользователя не найдена' });
        }

        const financeAdmin = await User.findOne({ where: { role: 'admin', adminLevel: 1 }, transaction: txn });
        const adminWallet  = financeAdmin
          ? await AdminWallet.findOne({ where: { adminId: financeAdmin.userId }, lock: txn.LOCK.UPDATE, transaction: txn })
          : null;

        // Депозит остаётся в AdminWallet — записываем как штраф для аудита.
        depositBurned = parseFloat(booking.depositAmount) || 0;

        // 1) Возврат остатка (если был оплачен картой) — забираем из AdminWallet,
        //    возвращаем на LoyaltyCard.
        if (booking.status === 'completed' && booking.remainingPaymentMethod === 'card') {
          remainingRefund = parseFloat(booking.remainingAmount) || 0;
          if (remainingRefund > 0) {
            const balBefore = parseFloat(loyaltyCard.balance);
            const balAfter  = parseFloat((balBefore + remainingRefund).toFixed(2));
            await loyaltyCard.update({ balance: balAfter }, { transaction: txn });

            await Transaction.create({
              userId:        booking.userId,
              bookingId:     booking.id,
              type:          'credit',
              category:      'refund',
              amount:        remainingRefund,
              description:   `Возврат остатка по отмене бронирования #${booking.id}`,
              balanceBefore: balBefore,
              balanceAfter:  balAfter,
              relatedType:   'booking',
              relatedId:     String(booking.id),
              metadata:      { source: 'cancel_refund_remaining' },
            }, { transaction: txn });

            if (adminWallet) {
              const aBefore = parseFloat(adminWallet.totalBalance);
              const aAfter  = parseFloat((aBefore - remainingRefund).toFixed(2));
              await adminWallet.update({
                totalBalance:     aAfter,
                availableBalance: parseFloat((parseFloat(adminWallet.availableBalance) - remainingRefund).toFixed(2)),
                totalReceived:    parseFloat((parseFloat(adminWallet.totalReceived) - remainingRefund).toFixed(2)),
              }, { transaction: txn });
              await AdminTransaction.create({
                adminId:       financeAdmin.userId,
                adminLevel:    1,
                type:          'booking_refund',
                amount:        remainingRefund,
                bookingId:     booking.id,
                description:   `Возврат остатка по отмене бронирования #${booking.id}`,
                balanceBefore: aBefore,
                balanceAfter:  aAfter,
              }, { transaction: txn });
            }
          }
        }

        // 2) Возврат кэшбэка обратно в AdminWallet (только для completed,
        //    т.к. кэшбэк начислялся только при completion).
        if (booking.status === 'completed' && !booking.cashbackRevertedAt) {
          cashbackRevert = parseFloat(booking.cashbackAmount) || 0;
          if (cashbackRevert > 0) {
            const balBefore = parseFloat(loyaltyCard.balance);
            const balAfter  = parseFloat((balBefore - cashbackRevert).toFixed(2));
            const earnedBefore = parseFloat(loyaltyCard.totalEarned) || 0;
            const earnedAfter  = parseFloat((earnedBefore - cashbackRevert).toFixed(2));

            await loyaltyCard.update({
              balance:     balAfter,
              totalEarned: earnedAfter,
            }, { transaction: txn });

            await Transaction.create({
              userId:        booking.userId,
              bookingId:     booking.id,
              type:          'debit',
              category:      'refund',
              amount:        cashbackRevert,
              description:   `Возврат кэшбэка по отмене бронирования #${booking.id}`,
              balanceBefore: balBefore,
              balanceAfter:  balAfter,
              relatedType:   'booking',
              relatedId:     String(booking.id),
              metadata:      { source: 'cashback_revert' },
            }, { transaction: txn });

            if (adminWallet) {
              const aBefore = parseFloat(adminWallet.totalBalance);
              const aAfter  = parseFloat((aBefore + cashbackRevert).toFixed(2));
              await adminWallet.update({
                totalBalance:     aAfter,
                availableBalance: parseFloat((parseFloat(adminWallet.availableBalance) + cashbackRevert).toFixed(2)),
                totalReceived:    parseFloat((parseFloat(adminWallet.totalReceived) + cashbackRevert).toFixed(2)),
              }, { transaction: txn });
              await AdminTransaction.create({
                adminId:       financeAdmin.userId,
                adminLevel:    1,
                type:          'cashback_revert',
                amount:        cashbackRevert,
                bookingId:     booking.id,
                description:   `Возврат кэшбэка по отмене бронирования #${booking.id}`,
                balanceBefore: aBefore,
                balanceAfter:  aAfter,
              }, { transaction: txn });
            }

            await booking.update({ cashbackRevertedAt: new Date() }, { transaction: txn });
          }
        }
      }

      await booking.update({ status: 'cancelled' }, { transaction: txn });
      await txn.commit();

      await invalidateBookedDatesCache(booking.propertyId);

      return res.status(200).json({
        success:   true,
        message:   'Бронирование отменено. Даты освобождены.',
        bookingId: booking.id,
        booking,
        refund: {
          depositBurned,
          remainingRefund,
          cashbackRevert,
          daysUntilCheckIn,
        },
      });
    } catch (error) {
      try { await txn.rollback(); } catch (_) {}
      logger.error('booking cancel error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при отмене бронирования',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * PATCH /:bookingId/status — изменить статус бронирования [admin].
   */
  router.patch('/:bookingId/status', verifyAdmin, async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { status }    = req.body;

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL не подключена' });
      }
      if (!status) {
        return res.status(400).json({ success: false, error: 'Статус не предоставлен' });
      }

      const validStatuses = ['pending', 'pending_payment', 'confirmed', 'completed', 'cancelled', 'expired'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error:   `Недопустимый статус. Допустимые значения: ${validStatuses.join(', ')}`,
        });
      }

      const booking = await Booking.findByPk(bookingId);
      if (!booking) return res.status(404).json({ success: false, error: 'Бронирование не найдено' });

      booking.status = status;
      await booking.save();

      return res.status(200).json({
        success:   true,
        message:   `Статус бронирования обновлен на: ${status}`,
        bookingId: booking.id,
        booking,
      });
    } catch (error) {
      logger.error('booking status error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при обновлении статуса бронирования',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * POST /:bookingId/pay-from-card — DEPRECATED (Sprint A ВКР).
   * Заменён парой pay-deposit + pay-remaining (method='card').
   */
  router.post('/:bookingId/pay-from-card', verifyToken, async (req, res) => {
    return res.status(410).json({
      success: false,
      error:   'Endpoint удалён. Используйте POST /:bookingId/pay-deposit и POST /:bookingId/pay-remaining { method:"card" }.',
      migration: {
        deposit:   'POST /api/bookings/:bookingId/pay-deposit',
        remaining: 'POST /api/bookings/:bookingId/pay-remaining  body: { method: "card" }',
      },
    });
  });

  /**
   * GET /:bookingId/payment-status — статус платежа по бронированию.
   */
  router.get('/:bookingId/payment-status', verifyToken, async (req, res) => {
    try {
      const { bookingId } = req.params;

      if (!bookingId) {
        return res.status(400).json({ success: false, error: 'bookingId обязателен' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const booking = await Booking.findByPk(bookingId);
      if (!booking) return res.status(404).json({ success: false, error: 'Бронирование не найдено' });

      if (!canAccessBooking(req, booking)) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const payment = await Payment.findOne({
        where: { bookingId: booking.id },
        order: [['createdAt', 'DESC']],
      });

      return res.status(200).json({
        success:       true,
        bookingId:     booking.id,
        bookingStatus: booking.status,
        payment:       payment || null,
        isPaid:        booking.status === 'confirmed' || booking.status === 'completed',
      });
    } catch (error) {
      logger.error('payment-status error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при получении статуса платежа',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  return router;
};
