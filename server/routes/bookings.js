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
const cache = require('../cache');
const {
  Booking, LoyaltyCard, Transaction, Property,
  User, Payment, AdminWallet, AdminTransaction, Notification,
} = require('../models');
const {
  verifyToken, verifyAdmin, canAccessBooking, requireOwnerOrAdmin,
} = require('../middleware/auth');
const { validate, schemas } = require('../validation');

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

const CASHBACK_RATES = {
  Bronze:   0.10,
  Silver:   0.20,
  Gold:     0.30,
  Platinum: 0.40,
};

const BOOKING_ATTRIBUTES = [
  'id', 'propertyId', 'userId', 'checkInDate', 'checkOutDate',
  'guests', 'notes', 'saunaHours', 'kitchenware', 'totalPrice',
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

      const bookings = await Booking.findAll({
        where: { propertyId: propertiesToCheck, status: 'confirmed' },
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
      const { propertyId, checkInDate, checkOutDate, guests, notes, totalPrice, saunaHours, kitchenware } = req.body;
      const userId = req.userId;

      if (!propertyId || !userId || !checkInDate || !checkOutDate || !guests) {
        return res.status(400).json({ success: false, error: 'Отсутствуют обязательные поля' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL не подключена' });
      }

      const [dayIn, monthIn, yearIn]   = checkInDate.split('.');
      const [dayOut, monthOut, yearOut] = checkOutDate.split('.');
      const checkIn  = new Date(yearIn,  monthIn  - 1, dayIn);
      const checkOut = new Date(yearOut, monthOut - 1, dayOut);

      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        return res.status(400).json({ success: false, error: 'Неверный формат даты. Используйте ДД.MM.YYYY' });
      }
      if (checkOut <= checkIn) {
        return res.status(400).json({ success: false, error: 'Дата выезда должна быть позже даты заезда' });
      }

      const bookingTxn = await sequelize.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
      });

      let booking;
      try {
        const conflicts = await Booking.findAll({
          where: { propertyId, status: 'confirmed' },
          lock: bookingTxn.LOCK.UPDATE,
          transaction: bookingTxn,
        });

        let hasConflict = false;
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
          ) { hasConflict = true; break; }
        }

        if (hasConflict) {
          await bookingTxn.rollback();
          return res.status(409).json({ success: false, error: 'Выбранные даты уже заняты' });
        }

        let loyaltyCard = await LoyaltyCard.findOne({ where: { userId }, transaction: bookingTxn });
        if (!loyaltyCard) {
          loyaltyCard = await LoyaltyCard.create({
            userId, balance: 0, cashbackRate: 5, totalSpent: 0, totalEarned: 0, membershipLevel: 'Bronze',
          }, { transaction: bookingTxn });
        }

        const bookingPrice = parseFloat(totalPrice) || 0;
        const guestsInt    = Math.max(1, parseInt(guests) || 1);

        booking = await Booking.create({
          propertyId,
          userId,
          checkInDate,
          checkOutDate,
          guests:      guestsInt,
          notes:       notes || '',
          saunaHours:  Math.max(0, parseInt(saunaHours) || 0),
          kitchenware: kitchenware || false,
          totalPrice:  bookingPrice,
          status:      'pending',
        }, { transaction: bookingTxn });

        await bookingTxn.commit();
      } catch (txnErr) {
        await bookingTxn.rollback();
        throw txnErr;
      }

      await invalidateBookedDatesCache(propertyId);

      return res.status(201).json({
        success:   true,
        message:   'Бронирование создано. Требуется завершить оплату.',
        bookingId: booking.id,
        booking,
        payment: {
          amount:          parseFloat(totalPrice) || 0,
          status:          'pending',
          requiredAmount:  parseFloat(totalPrice) || 0,
          transactionTime: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('booking create error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при создании бронирования',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET / — все бронирования с фильтром по статусу [admin].
   */
  router.get('/', verifyAdmin, async (req, res) => {
    try {
      const { status } = req.query;
      if (!isDbConnected()) return res.status(503).json({ success: false, error: 'DB not connected' });
      const where = status ? { status } : {};
      const bookings = await Booking.findAll({ where, order: [['id', 'DESC']] });
      return res.json({ success: true, bookings, count: bookings.length });
    } catch (error) {
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
      const bookings = await Booking.findAll({
        where: { userId },
        attributes: BOOKING_ATTRIBUTES,
      });
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

  /**
   * POST /:bookingId/confirm-payment — подтвердить платёж, списать с карты и начислить кэшбек.
   */
  router.post('/:bookingId/confirm-payment', verifyToken, async (req, res) => {
    // SERIALIZABLE + SELECT FOR UPDATE на обе записи исключает race condition:
    // два одновременных запроса confirm не спишут деньги дважды.
    // Кэшбек начисляется В ТОЙ ЖЕ транзакции — атомарно с дебетом.
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
      if (booking.status !== 'pending') {
        await txn.rollback();
        return res.status(400).json({
          success: false,
          error: 'Бронирование уже обработано или отменено',
          currentStatus: booking.status,
        });
      }

      // SELECT FOR UPDATE на loyaltyCard — блокируем строку
      const loyaltyCard = await LoyaltyCard.findOne({
        where: { userId: booking.userId },
        lock: txn.LOCK.UPDATE,
        transaction: txn,
      });
      if (!loyaltyCard) {
        await txn.rollback();
        return res.status(404).json({ success: false, error: 'Карта лояльности пользователя не найдена' });
      }

      const user           = await User.findOne({ where: { userId: booking.userId }, transaction: txn });
      const bookingPrice   = parseFloat(booking.totalPrice);
      const currentBalance = parseFloat(loyaltyCard.balance);

      if (currentBalance < bookingPrice) {
        await txn.rollback();
        return res.status(402).json({
          success:        false,
          error:          'Недостаточно средств на карте лояльности',
          currentBalance,
          requiredAmount: bookingPrice,
          deficit:        parseFloat((bookingPrice - currentBalance).toFixed(2)),
        });
      }

      // Рассчитываем кэшбек внутри транзакции
      const membershipLevel = user?.membershipLevel || 'Bronze';
      const cashbackRate    = CASHBACK_RATES[membershipLevel] || 0.10;
      const cashbackAmount  = parseFloat((bookingPrice * cashbackRate).toFixed(2));

      const balanceBefore      = parseFloat(currentBalance.toFixed(2));
      const balanceAfterDebit  = parseFloat((currentBalance - bookingPrice).toFixed(2));
      const balanceAfterCashback = parseFloat((balanceAfterDebit + cashbackAmount).toFixed(2));

      // Атомарно: дебет + кэшбек + обновление статистики
      await loyaltyCard.update({
        balance:     balanceAfterCashback,
        totalSpent:  parseFloat((parseFloat(loyaltyCard.totalSpent) + bookingPrice).toFixed(2)),
        totalEarned: parseFloat((parseFloat(loyaltyCard.totalEarned) + cashbackAmount).toFixed(2)),
      }, { transaction: txn });

      await booking.update({ status: 'confirmed' }, { transaction: txn });

      // Запись дебета
      await Transaction.create({
        userId:       booking.userId,
        bookingId:    booking.id,
        type:         'debit',
        amount:       bookingPrice,
        description:  `Оплата бронирования #${booking.id} в объекте ${booking.propertyId}`,
        balanceBefore,
        balanceAfter: balanceAfterDebit,
      }, { transaction: txn });

      // Запись кэшбека
      await Transaction.create({
        userId:       booking.userId,
        bookingId:    booking.id,
        type:         'credit',
        amount:       cashbackAmount,
        description:  `Кэшбек ${Math.round(cashbackRate * 100)}% за бронирование #${booking.id} (уровень: ${membershipLevel})`,
        balanceBefore: balanceAfterDebit,
        balanceAfter:  balanceAfterCashback,
      }, { transaction: txn });

      await txn.commit();

      await invalidateBookedDatesCache(booking.propertyId);

      // Уведомления — вне транзакции, best-effort
      try {
        const admins      = await User.findAll({ where: { role: 'admin' } });
        const bookingUser = await User.findOne({ where: { userId: booking.userId } });
        const property    = await Property.findByPk(booking.propertyId);

        let services = '';
        if (booking.saunaHours > 0) services += ` Сауна: ${booking.saunaHours}ч.`;
        if (booking.kitchenware) services += ' Посуда и кухня';

        const adminMsg = `Новое бронирование от ${bookingUser?.name || 'Пользователь'}: ${property?.name || `объект ${booking.propertyId}`}. Гостей: ${booking.guests}, Сумма: ${bookingPrice}₽, Даты: ${booking.checkInDate} - ${booking.checkOutDate}${services.trim() ? '. ' + services.trim() : ''}`;

        await Promise.allSettled(admins.map(admin => Notification.create({
          userId:  admin.userId,
          title:   ' Новое бронирование',
          message: adminMsg,
          type:    'new_booking',
          data: {
            bookingId: booking.id, propertyId: booking.propertyId,
            userId: booking.userId, checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate, guests: booking.guests,
            totalPrice: bookingPrice,
          },
          read: false,
        })));
      } catch (notifyErr) {
        logger.error('booking confirm notify error', { error: notifyErr.message });
      }

      return res.status(200).json({
        success:   true,
        message:   'Платеж успешно обработан. Бронирование подтверждено. Кэшбек начислен.',
        bookingId: booking.id,
        booking,
        payment: {
          amount:              bookingPrice,
          status:              'confirmed',
          balanceAfterPayment: balanceAfterDebit,
          transactionTime:     new Date().toISOString(),
        },
        cashback: {
          rate:                `${Math.round(cashbackRate * 100)}%`,
          membershipLevel,
          amount:              cashbackAmount,
          balanceAfterCashback,
        },
      });
    } catch (error) {
      try { await txn.rollback(); } catch (_) {}
      logger.error('booking confirm-payment error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при обработке платежа',
        details: isDev() ? error.message : undefined,
      });
    }
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

      if (booking.status !== 'pending' && booking.status !== 'confirmed') {
        await txn.rollback();
        return res.status(400).json({
          success: false,
          error:  'Можно отменить только незаплаченные (pending) или подтвержденные (confirmed) бронирования',
          currentStatus: booking.status,
        });
      }

      const [dayIn, monthIn, yearIn] = booking.checkInDate.split('.');
      const checkInDate = new Date(yearIn, monthIn - 1, dayIn);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      checkInDate.setHours(0, 0, 0, 0);
      const daysUntilCheckIn = Math.floor((checkInDate - today) / (1000 * 60 * 60 * 24));

      if (daysUntilCheckIn < 2) {
        await txn.rollback();
        return res.status(400).json({
          success: false,
          error:  `Отмена доступна минимум за 2 дня до заезда. До заезда осталось ${daysUntilCheckIn} дней.`,
          daysUntilCheckIn,
        });
      }

      let refundAmount = 0;
      let cashbackDeducted = 0;

      if (booking.status === 'confirmed') {
        // SELECT FOR UPDATE на loyaltyCard — блокируем строку от параллельных изменений
        const loyaltyCard = await LoyaltyCard.findOne({
          where: { userId: booking.userId },
          lock: txn.LOCK.UPDATE,
          transaction: txn,
        });

        if (!loyaltyCard) {
          await txn.rollback();
          return res.status(404).json({ success: false, error: 'Карта лояльности пользователя не найдена' });
        }

        const user            = await User.findOne({ where: { userId: booking.userId }, transaction: txn });
        const bookingPrice    = parseFloat(booking.totalPrice);
        const membershipLevel = user?.membershipLevel || 'Bronze';
        const cashbackRate    = CASHBACK_RATES[membershipLevel] || 0.10;

        cashbackDeducted = parseFloat((bookingPrice * cashbackRate).toFixed(2));
        refundAmount     = parseFloat((bookingPrice - cashbackDeducted).toFixed(2));

        const balanceBefore = parseFloat(loyaltyCard.balance);
        const balanceAfter  = parseFloat((balanceBefore + refundAmount).toFixed(2));
        const earnedAfter   = parseFloat(((parseFloat(loyaltyCard.totalEarned) || 0) - cashbackDeducted).toFixed(2));

        // Один атомарный update — баланс и totalEarned меняются вместе
        await loyaltyCard.update({
          balance:     balanceAfter,
          totalEarned: earnedAfter,
        }, { transaction: txn });

        await Transaction.create({
          userId:      booking.userId,
          bookingId:   booking.id,
          type:        'credit',
          amount:      refundAmount,
          description: `Возврат при отмене бронирования #${booking.id} (минус кэшбек ${Math.round(cashbackRate * 100)}%)`,
          balanceBefore,
          balanceAfter,
        }, { transaction: txn });
      }

      await booking.update({ status: 'cancelled' }, { transaction: txn });
      await txn.commit();

      await invalidateBookedDatesCache(booking.propertyId);

      return res.status(200).json({
        success:   true,
        message:   'Бронирование отменено. Даты освобождены.',
        bookingId: booking.id,
        booking,
        refund: { refundAmount, cashbackDeducted, daysUntilCheckIn },
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

      const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
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
   * POST /:bookingId/pay-from-card — оплатить бронирование с карты лояльности (SELECT FOR UPDATE).
   */
  router.post('/:bookingId/pay-from-card', verifyToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { bookingId } = req.params;
      const userId = req.userId;

      if (!bookingId) {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'bookingId обязателен' });
      }
      if (!isDbConnected()) {
        await t.rollback();
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const booking = await Booking.findByPk(bookingId, { lock: t.LOCK.UPDATE, transaction: t });
      if (!booking) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Бронирование не найдено' });
      }
      if (booking.userId !== userId) {
        await t.rollback();
        return res.status(403).json({ success: false, error: 'Вы не можете оплатить чужое бронирование' });
      }
      if (booking.status === 'confirmed') {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'Бронирование уже оплачено' });
      }

      const bookingAmount = parseFloat(booking.totalPrice);
      const loyaltyCard   = await LoyaltyCard.findOne({ where: { userId }, lock: t.LOCK.UPDATE, transaction: t });
      if (!loyaltyCard) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Карта лояльности не найдена' });
      }

      const currentBalance = parseFloat(loyaltyCard.balance);
      if (currentBalance < bookingAmount) {
        await t.rollback();
        return res.status(400).json({
          success:          false,
          error:            'Недостаточно средств на карте',
          requiredAmount:   bookingAmount,
          availableBalance: currentBalance,
          deficit:          bookingAmount - currentBalance,
        });
      }

      const payment = await Payment.create({
        userId,
        bookingId:     booking.id,
        amount:        bookingAmount,
        currency:      'RUB',
        paymentMethod: 'loyalty_card',
        status:        'completed',
      }, { transaction: t });

      const newBalance = parseFloat((currentBalance - bookingAmount).toFixed(2));
      await loyaltyCard.update({
        balance:    newBalance,
        totalSpent: parseFloat((parseFloat(loyaltyCard.totalSpent) + bookingAmount).toFixed(2)),
      }, { transaction: t });

      await Transaction.create({
        userId,
        bookingId:    booking.id,
        type:         'debit',
        amount:       bookingAmount,
        description:  `Оплата бронирования #${booking.id} с карты лояльности`,
        balanceBefore: currentBalance,
        balanceAfter:  newBalance,
      }, { transaction: t });

      await booking.update({ status: 'confirmed' }, { transaction: t });

      const financeAdmin = await User.findOne({ where: { role: 'admin', adminLevel: 1 }, transaction: t });
      if (financeAdmin) {
        const adminWallet = await AdminWallet.findOne({ where: { adminId: financeAdmin.userId }, lock: t.LOCK.UPDATE, transaction: t });
        if (adminWallet) {
          const prevAdminBalance = parseFloat(adminWallet.totalBalance);
          await adminWallet.update({
            totalBalance:     parseFloat((prevAdminBalance + bookingAmount).toFixed(2)),
            availableBalance: parseFloat((parseFloat(adminWallet.availableBalance) + bookingAmount).toFixed(2)),
            totalReceived:    parseFloat((parseFloat(adminWallet.totalReceived) + bookingAmount).toFixed(2)),
          }, { transaction: t });

          await AdminTransaction.create({
            adminId:      financeAdmin.userId,
            adminLevel:   1,
            type:         'booking_payment',
            amount:       bookingAmount,
            bookingId:    booking.id,
            description:  `Платёж за бронирование #${booking.id} (пользователь: ${userId})`,
            balanceBefore: prevAdminBalance,
            balanceAfter:  prevAdminBalance + bookingAmount,
          }, { transaction: t });
        }
      }

      await t.commit();
      await invalidateBookedDatesCache(booking.propertyId);

      try {
        await Notification.create({
          userId,
          title:   ' Платёж принят',
          message: `Ваше бронирование #${booking.id} успешно оплачено. Сумма: ${bookingAmount}₽`,
          type:    'payment',
          data:    { bookingId: booking.id, paymentId: payment.id, amount: bookingAmount },
          read:    false,
        });
      } catch (notifyErr) {
        logger.error('pay-from-card user notify error', { error: notifyErr.message });
      }

      try {
        if (financeAdmin) {
          await Notification.create({
            userId:  financeAdmin.userId,
            title:   ' Новый платёж',
            message: `Получен платёж ${bookingAmount}₽ за бронирование #${booking.id}`,
            type:    'admin_payment',
            data:    { bookingId: booking.id, paymentId: payment.id, amount: bookingAmount },
            read:    false,
          });
        }
      } catch (notifyErr) {
        logger.error('pay-from-card admin notify error', { error: notifyErr.message });
      }

      logger.info('Платёж с карты лояльности', { bookingId, amount: bookingAmount });

      return res.status(201).json({
        success:   true,
        message:   'Платёж успешно выполнен',
        payment,
        booking:   { id: booking.id, status: booking.status },
        newBalance: loyaltyCard.balance,
        paymentId:  payment.id,
      });
    } catch (error) {
      await t.rollback();
      logger.error('pay-from-card error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при оплате с карты',
        details: isDev() ? error.message : undefined,
      });
    }
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
