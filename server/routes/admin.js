/**
 * Admin routes (prefix: /api/admin):
 *   GET  /stats                        — агрегированная статистика
 *   POST /ai-analysis                  — AI-анализ через OpenRouter
 *   GET  /finances/summary             — финансовая сводка администратора
 *   GET  /finances/transactions        — список финансовых транзакций
 *   POST /finances/withdrawal          — запросить вывод средств
 *   GET  /finances/withdrawals         — список запросов на вывод
 */
const express = require('express');
const { Op } = require('sequelize');

const logger = require('../logger');
const { sequelize } = require('../db');
const {
  User, Booking, Property,
  Payment, AdminWallet, AdminTransaction, WithdrawalRequest,
} = require('../models');
const { verifyAdmin, verifyFinanceAdmin } = require('../middleware/auth');
const { parsePagination } = require('../utils/pagination');

const isDev = () => (process.env.NODE_ENV || 'development') === 'development';

module.exports = function createAdminRouter({ isDbConnected }) {
  const router = express.Router();

  /**
   * GET /stats — агрегированная статистика для AdminStats экрана.
   */
  router.get('/stats', verifyAdmin, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const [totalUsers, totalBookings, premiumUsers] = await Promise.all([
        User.count({ where: { role: 'user' } }),
        Booking.count(),
        User.count({ where: { membershipLevel: { [Op.in]: ['Gold', 'Platinum'] } } }),
      ]);

      const revenueRows = await Booking.findAll({
        where: { status: { [Op.in]: ['confirmed', 'completed'] } },
        attributes: [[sequelize.fn('SUM', sequelize.col('totalPrice')), 'total']],
        raw: true,
      });
      const totalRevenue = parseFloat(revenueRows[0]?.total || 0);

      const statsPerPeriod = {};
      for (const key of ['week', 'month', 'quarter', 'year']) {
        statsPerPeriod[key] = {
          users:     totalUsers,
          purchases: totalBookings,
          revenue:   totalRevenue,
          premium:   premiumUsers,
        };
      }

      const topUsers = await User.findAll({
        where: { role: 'user' },
        attributes: ['userId', 'displayName', 'email', 'membershipLevel', 'loyaltyPoints'],
        order: [['loyaltyPoints', 'DESC']],
        limit: 10,
      });

      const properties = await Property.findAll({
        attributes: ['id', 'name'],
        limit: 10,
      });

      const propertiesWithStats = await Promise.all(properties.map(async (p) => {
        const bookingCount = await Booking.count({ where: { propertyId: p.id.toString() } });
        const revRows = await Booking.findAll({
          where: { propertyId: p.id.toString(), status: { [Op.in]: ['confirmed', 'completed'] } },
          attributes: [[sequelize.fn('SUM', sequelize.col('totalPrice')), 'total']],
          raw: true,
        });
        return {
          id:       p.id,
          name:     p.name,
          bookings: bookingCount,
          revenue:  parseFloat(revRows[0]?.total || 0),
          views:    bookingCount * 10,
        };
      }));

      return res.json({
        success: true,
        statsPerPeriod,
        topUsers: topUsers.map(u => ({
          id:        u.userId,
          name:      u.displayName || u.email.split('@')[0],
          status:    u.membershipLevel || 'Bronze',
          purchases: Math.floor((u.loyaltyPoints || 0) / 100),
          spent:     u.loyaltyPoints || 0,
        })),
        properties: propertiesWithStats,
      });
    } catch (error) {
      logger.error('admin stats error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Ошибка при получении статистики' });
    }
  });

  /**
   * POST /ai-analysis — AI-анализ статистики через OpenRouter.
   */
  router.post('/ai-analysis', verifyAdmin, async (req, res) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model  = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

    if (!apiKey || apiKey.startsWith('sk-or-v1-your')) {
      return res.status(503).json({ success: false, error: 'OPENROUTER_API_KEY не настроен' });
    }

    try {
      const { stats } = req.body;
      if (!stats) return res.status(400).json({ success: false, error: 'stats обязательны' });

      const prompt = `Ты — аналитик бизнеса апарт-отеля. Дай краткий анализ на русском языке (не более 300 слов) на основе реальных данных.

Данные за выбранный период:
- Клиентов: ${stats.users}
- Бронирований: ${stats.purchases}
- Оборот: ${stats.revenue} PRB
- Premium-клиентов: ${stats.premium}
- Средний чек: ${stats.avgBooking} PRB
- Ожидают подтверждения: ${stats.pendingBookings}
- Конверсия: ${stats.convRate}%
- Объектов: ${stats.propertyCount}
- Топ объект по выручке: ${stats.topProperty || 'нет данных'}

Дай:
1. Оценку текущего состояния (1-2 предложения)
2. Три конкретных рекомендации с ожидаемым эффектом
3. Главный риск

Отвечай только по делу, без вводных фраз.`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.API_BASE_URL || 'http://localhost:5002',
          'X-Title': 'Villa Jaconda Analytics',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `OpenRouter error ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      return res.json({ success: true, analysis: text, model: data.model });
    } catch (error) {
      logger.error('AI analysis error', { error: error.message });
      return res.status(500).json({ success: false, error: error.message || 'Ошибка AI-анализа' });
    }
  });

  /**
   * GET /finances/summary — финансовая сводка администратора.
   */
  router.get('/finances/summary', verifyFinanceAdmin, async (req, res) => {
    try {
      const userId = req.userId;

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const user = await User.findOne({ where: { userId } });
      const adminWallet = await AdminWallet.findOne({ where: { adminId: userId } });
      if (!adminWallet) {
        return res.status(404).json({ success: false, error: 'Кошелек администратора не найден' });
      }

      const totalPayments = await Payment.count({ where: { status: 'completed' } });
      const totalAmount   = await Payment.sum('amount', { where: { status: 'completed' } });

      const todayPayments = await Payment.findAll({
        where: {
          status: 'completed',
          createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      });
      const todayAmount = todayPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      return res.status(200).json({
        success: true,
        admin: {
          userId:      user.userId,
          email:       user.email,
          displayName: user.displayName,
          adminLevel:  user.adminLevel,
        },
        wallet: {
          totalBalance:     parseFloat(adminWallet.totalBalance),
          availableBalance: parseFloat(adminWallet.availableBalance),
          pendingBalance:   parseFloat(adminWallet.pendingBalance),
          totalReceived:    parseFloat(adminWallet.totalReceived),
          totalWithdrawn:   parseFloat(adminWallet.totalWithdrawn),
        },
        statistics: {
          totalPayments,
          totalAmount:    parseFloat(totalAmount || 0),
          todayPayments:  todayPayments.length,
          todayAmount,
          averagePayment: totalPayments > 0
            ? (parseFloat(totalAmount || 0) / totalPayments).toFixed(2)
            : 0,
        },
      });
    } catch (error) {
      logger.error('admin finances summary error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при получении финансовой сводки',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /finances/transactions — список финансовых транзакций администратора.
   */
  router.get('/finances/transactions', verifyFinanceAdmin, async (req, res) => {
    try {
      const userId = req.userId;
      const { limit, offset } = parsePagination(req.query);

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const transactions = await AdminTransaction.findAll({
        where: { adminId: userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });
      const total = await AdminTransaction.count({ where: { adminId: userId } });

      return res.status(200).json({ success: true, transactions, total, limit, offset });
    } catch (error) {
      logger.error('admin transactions error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при получении транзакций',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * POST /finances/withdrawal — запросить вывод средств.
   */
  router.post('/finances/withdrawal', verifyFinanceAdmin, async (req, res) => {
    try {
      const userId = req.userId;
      const { amount, bankAccount, reason } = req.body;

      if (!amount || !bankAccount) {
        return res.status(400).json({ success: false, error: 'amount и bankAccount обязательны' });
      }
      if (parseFloat(amount) <= 0) {
        return res.status(400).json({ success: false, error: 'Сумма должна быть больше 0' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const adminUser = await User.findOne({ where: { userId } });
      if (!adminUser) {
        return res.status(404).json({ success: false, error: 'Пользователь не найден' });
      }

      const adminWallet = await AdminWallet.findOne({ where: { adminId: userId } });
      if (!adminWallet) {
        return res.status(404).json({ success: false, error: 'Кошелек администратора не найден' });
      }

      const withdrawAmount    = parseFloat(amount);
      const availableBalance  = parseFloat(adminWallet.availableBalance);

      if (availableBalance < withdrawAmount) {
        return res.status(400).json({
          success:         false,
          error:           'Недостаточно средств',
          availableBalance,
          requestedAmount: withdrawAmount,
        });
      }

      const withdrawalRequest = await WithdrawalRequest.create({
        adminId:    userId,
        adminLevel: adminUser.adminLevel,
        amount:     withdrawAmount,
        bankAccount,
        status:     'pending',
        reason:     reason || 'Запрос на вывод средств',
      });

      adminWallet.availableBalance = parseFloat((availableBalance - withdrawAmount).toFixed(2));
      adminWallet.pendingBalance   = parseFloat((parseFloat(adminWallet.pendingBalance) + withdrawAmount).toFixed(2));
      await adminWallet.save();

      logger.info('Запрос на вывод', { userId, amount: withdrawAmount });

      return res.status(201).json({
        success:           true,
        message:           'Запрос на вывод создан',
        withdrawalRequest,
        updatedWallet: {
          availableBalance: adminWallet.availableBalance,
          pendingBalance:   adminWallet.pendingBalance,
        },
      });
    } catch (error) {
      logger.error('admin withdrawal error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при создании запроса на вывод',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /finances/withdrawals — список запросов на вывод с фильтром по статусу.
   */
  router.get('/finances/withdrawals', verifyFinanceAdmin, async (req, res) => {
    try {
      const userId = req.userId;
      const { status } = req.query;
      const { limit, offset } = parsePagination(req.query);

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const where = { adminId: userId };
      if (status) where.status = status;

      const withdrawals = await WithdrawalRequest.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });
      const total = await WithdrawalRequest.count({ where });

      return res.status(200).json({ success: true, withdrawals, total, limit, offset });
    } catch (error) {
      logger.error('admin withdrawals error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при получении запросов на вывод',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  return router;
};
