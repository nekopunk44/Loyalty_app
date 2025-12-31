/**
 * Card Top-Up routes (prefix: /api/card):
 *   POST /topup              — пополнить баланс (idempotent, SELECT FOR UPDATE)
 *   GET  /balance/:userId    — текущий баланс карты
 *   GET  /transactions/:userId — история транзакций
 *   GET  /topups/:userId     — история пополнений
 */
const express = require('express');

const logger = require('../logger');
const { sequelize, Sequelize } = require('../db');
const { LoyaltyCard, CardTopUp, Transaction, User, Booking } = require('../models');
const { verifyToken, requireOwnerOrAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../validation');
const { parsePagination } = require('../utils/pagination');

const isDev = () => (process.env.NODE_ENV || 'development') === 'development';
const allowDemoPayments = () =>
  process.env.ALLOW_DEMO_PAYMENTS === 'true' ||
  (process.env.NODE_ENV || 'development') !== 'production';

module.exports = function createCardRouter({ isDbConnected }) {
  const router = express.Router();

  /**
   * POST /topup — пополнить баланс. Idempotent по idempotencyKey.
   */
  router.post('/topup', verifyToken, validate(schemas.cardTopup), async (req, res) => {
    const { amount, paymentMethod, idempotencyKey } = req.body;
    const userId = req.userId;

    if (!amount || !paymentMethod) {
      return res.status(400).json({ success: false, error: 'amount и paymentMethod обязательны' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Сумма должна быть больше 0' });
    }
    if (parsedAmount > 1000000) {
      return res.status(400).json({ success: false, error: 'Максимальная сумма пополнения: 1 000 000 ₽' });
    }
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, error: 'База данных не подключена' });
    }
    if (!allowDemoPayments()) {
      return res.status(402).json({ success: false, error: 'Payment provider confirmation is required' });
    }

    const transactionId = idempotencyKey || `TOPUP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // SERIALIZABLE — защита от фантомных вставок при одновременных запросах с одним idempotencyKey
    const t = await sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    });
    try {
      // Idempotency check ВНУТРИ транзакции: два параллельных запроса не пройдут оба
      if (idempotencyKey) {
        const existing = await CardTopUp.findOne({
          where: { transactionId: idempotencyKey },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (existing) {
          await t.rollback();
          const card = await LoyaltyCard.findOne({ where: { userId } });
          return res.status(200).json({
            success:       true,
            duplicate:     true,
            message:       'Платёж уже был обработан',
            newBalance:    card?.balance ?? 0,
            transactionId: idempotencyKey,
          });
        }
      }

      let loyaltyCard = await LoyaltyCard.findOne({
        where: { userId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      const balanceBefore = loyaltyCard ? parseFloat(loyaltyCard.balance) : 0;
      const balanceAfter  = parseFloat((balanceBefore + parsedAmount).toFixed(2));

      if (!loyaltyCard) {
        loyaltyCard = await LoyaltyCard.create({
          userId,
          balance:         parsedAmount,
          totalSpent:      0,
          totalEarned:     parsedAmount,
          cashbackRate:    5,
          membershipLevel: 'Bronze',
        }, { transaction: t });
      } else {
        await loyaltyCard.update({
          balance:     balanceAfter,
          totalEarned: parseFloat((parseFloat(loyaltyCard.totalEarned) + parsedAmount).toFixed(2)),
        }, { transaction: t });
      }

      await CardTopUp.create({
        userId,
        amount:        parsedAmount,
        paymentMethod,
        status:        'completed',
        transactionId,
        description:   `Пополнение карты через ${paymentMethod}`,
      }, { transaction: t });

      await Transaction.create({
        userId,
        type:          'credit',
        category:      'topup',
        amount:        parsedAmount,
        description:   `Пополнение карты через ${paymentMethod}`,
        balanceBefore,
        balanceAfter,
        metadata:      { paymentMethod, transactionId },
      }, { transaction: t });

      await t.commit();

      logger.info('Пополнение карты', { userId, amount: parsedAmount, paymentMethod });

      return res.status(201).json({
        success:       true,
        message:       'Баланс карты успешно пополнен',
        newBalance:    balanceAfter,
        transactionId,
      });
    } catch (error) {
      await t.rollback();
      logger.error('card topup error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при пополнении баланса',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /balance/:userId — текущий баланс карты лояльности.
   */
  router.get('/balance/:userId', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId обязателен' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const loyaltyCard = await LoyaltyCard.findOne({ where: { userId } });
      if (!loyaltyCard) {
        return res.status(404).json({ success: false, error: 'Карта лояльности не найдена' });
      }

      return res.status(200).json({
        success:         true,
        balance:         parseFloat(loyaltyCard.balance),
        totalSpent:      parseFloat(loyaltyCard.totalSpent),
        totalEarned:     parseFloat(loyaltyCard.totalEarned),
        membershipLevel: loyaltyCard.membershipLevel,
        cashbackRate:    parseFloat(loyaltyCard.cashbackRate),
      });
    } catch (error) {
      logger.error('card balance error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при получении баланса',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /transactions/:userId — история транзакций с пагинацией.
   *
   * Sprint B: разрешаем performedBy → displayName/email админа,
   * bookingId → property name (одним пакетом, без N+1).
   */
  router.get('/transactions/:userId', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit, offset } = parsePagination(req.query);

      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId обязателен' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const transactions = await Transaction.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });
      const total = await Transaction.count({ where: { userId } });

      // Резолвим performedBy (админы) и bookingId (брони) одним пакетом
      const adminIds  = [...new Set(transactions.map(t => t.performedBy).filter(Boolean))];
      const bookingIds = [...new Set(transactions.map(t => t.bookingId).filter(Boolean))];

      const [admins, bookings] = await Promise.all([
        adminIds.length
          ? User.findAll({
              where: { userId: adminIds },
              attributes: ['userId', 'email', 'displayName'],
            })
          : [],
        bookingIds.length
          ? Booking.findAll({
              where: { id: bookingIds },
              attributes: ['id', 'propertyId', 'checkInDate', 'checkOutDate'],
            })
          : [],
      ]);

      const adminMap   = new Map(admins.map(a => [a.userId, a]));
      const bookingMap = new Map(bookings.map(b => [b.id, b]));

      const enriched = transactions.map((tx) => {
        const obj = typeof tx.toJSON === 'function' ? tx.toJSON() : { ...tx };
        if (obj.performedBy && adminMap.has(obj.performedBy)) {
          const a = adminMap.get(obj.performedBy);
          obj.performedByInfo = { displayName: a.displayName, email: a.email };
        }
        if (obj.bookingId && bookingMap.has(obj.bookingId)) {
          const b = bookingMap.get(obj.bookingId);
          obj.bookingInfo = {
            id: b.id,
            propertyId: b.propertyId,
            checkInDate: b.checkInDate,
            checkOutDate: b.checkOutDate,
          };
        }
        return obj;
      });

      return res.status(200).json({ success: true, transactions: enriched, total, limit, offset });
    } catch (error) {
      logger.error('card transactions error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при получении истории транзакций',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /topups/:userId — история пополнений с пагинацией.
   */
  router.get('/topups/:userId', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit, offset } = parsePagination(req.query);

      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId обязателен' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const topups = await CardTopUp.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });
      const total = await CardTopUp.count({ where: { userId } });

      return res.status(200).json({ success: true, topups, total, limit, offset });
    } catch (error) {
      logger.error('card topups error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при получении истории пополнений',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  return router;
};
