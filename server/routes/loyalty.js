/**
 * Loyalty Card routes (prefix: /api/loyalty-card):
 *   GET  /:userId                 — карта лояльности (создаётся автоматически если нет)
 *   POST /:userId/top-up          — пополнить (только demo-режим)
 *   GET  /:userId/transactions    — история транзакций
 */
const express = require('express');

const logger = require('../logger');
const { LoyaltyCard, Transaction, User, Notification } = require('../models');
const { verifyToken, requireOwnerOrAdmin } = require('../middleware/auth');
const { parsePagination } = require('../utils/pagination');

const isDev = () => (process.env.NODE_ENV || 'development') === 'development';
const allowDemoPayments = () =>
  process.env.ALLOW_DEMO_PAYMENTS === 'true' ||
  (process.env.NODE_ENV || 'development') !== 'production';

const formatCard = (c) => {
  const balance       = parseFloat(c.balance);
  const lockedBalance = parseFloat(c.lockedBalance || 0);
  return {
    userId:           c.userId,
    balance,
    lockedBalance,
    availableBalance: parseFloat((balance - lockedBalance).toFixed(2)),
    cashbackRate:     parseFloat(c.cashbackRate),
    totalSpent:       parseFloat(c.totalSpent),
    totalEarned:      parseFloat(c.totalEarned),
    membershipLevel:  c.membershipLevel,
  };
};

const findOrCreateCard = async (userId) => {
  let card = await LoyaltyCard.findOne({ where: { userId } });
  if (!card) {
    card = await LoyaltyCard.create({
      userId, balance: 0, cashbackRate: 5, totalSpent: 0, totalEarned: 0, membershipLevel: 'Bronze',
    });
  }
  return card;
};

module.exports = function createLoyaltyRouter({ isDbConnected }) {
  const router = express.Router();

  /**
   * GET /:userId — информация о карте. Если карты нет — создаётся на лету.
   */
  router.get('/:userId', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId обязателен' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL не подключена' });
      }
      const card = await findOrCreateCard(userId);
      return res.status(200).json({ success: true, loyaltyCard: formatCard(card) });
    } catch (error) {
      logger.error('loyalty card fetch error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении карты лояльности',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * POST /:userId/top-up — пополнить карту. Только в demo-режиме.
   */
  router.post('/:userId/top-up', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { amount, paymentMethod } = req.body;

      if (!userId || !amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'userId и amount (> 0) обязательны' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL не подключена' });
      }
      if (!allowDemoPayments()) {
        return res.status(402).json({ success: false, error: 'Payment provider confirmation is required' });
      }

      const topUpAmount = parseFloat(amount);
      const card = await findOrCreateCard(userId);
      const oldBalance = parseFloat(card.balance);
      card.balance = parseFloat((oldBalance + topUpAmount).toFixed(2));
      await card.save();

      await Transaction.create({
        userId,
        type: 'credit',
        category: 'topup',
        amount: topUpAmount,
        description: `Пополнение карты через ${paymentMethod || 'другой способ'}`,
        balanceBefore: oldBalance,
        balanceAfter: card.balance,
        metadata: { paymentMethod: paymentMethod || 'другой способ', source: 'loyalty_route' },
      });

      try {
        const user = await User.findOne({ where: { userId } });
        const userName = user?.displayName || 'Пользователь';

        await Notification.create({
          userId,
          title: ' Баланс пополнен',
          message: `Ваша карта лояльности пополнена на ${topUpAmount}₽. Новый баланс: ${card.balance}₽`,
          type: 'balance_replenishment',
          data: { amount: topUpAmount, newBalance: card.balance, oldBalance, paymentMethod: paymentMethod || 'другой способ' },
          read: false,
        });

        const admins = await User.findAll({ where: { role: 'admin' } });
        await Promise.all(admins.map((admin) =>
          Notification.create({
            userId: admin.userId,
            title: ' Пополнение баланса пользователем',
            message: `${userName} пополнил карту на ${topUpAmount}₽. Новый баланс: ${card.balance}₽`,
            type: 'user_balance_replenishment',
            data: { userId, userName, amount: topUpAmount, newBalance: card.balance, oldBalance, paymentMethod: paymentMethod || 'другой способ' },
            read: false,
          })
        ));
      } catch (notifErr) {
        logger.error('loyalty topup notify error', { error: notifErr.message });
      }

      return res.status(200).json({
        success: true,
        message: `Карта пополнена на ${topUpAmount}₽`,
        loyaltyCard: formatCard(card),
      });
    } catch (error) {
      logger.error('loyalty topup error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при пополнении карты',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /:userId/transactions — история транзакций с пагинацией.
   */
  router.get('/:userId/transactions', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit, offset } = parsePagination(req.query);

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL не подключена' });
      }

      const transactions = await Transaction.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });
      const total = await Transaction.count({ where: { userId } });

      return res.status(200).json({
        success: true,
        transactions,
        pagination: { total, limit, offset, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      logger.error('loyalty transactions error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении истории транзакций',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  return router;
};
