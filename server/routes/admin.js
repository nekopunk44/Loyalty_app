/**
 * Admin routes (prefix: /api/admin):
 *   GET  /stats                        — агрегированная статистика
 *   POST /ai-analysis                  — AI-анализ через OpenRouter
 *   GET  /finances/summary             — финансовая сводка администратора
 *   GET  /finances/transactions        — список финансовых транзакций
 *   POST  /finances/withdrawal                  — запросить вывод средств
 *   GET   /finances/withdrawals                 — список запросов на вывод (?scope=mine для своих)
 *   GET   /finances/withdrawals/:id/audit       — журнал событий по заявке
 *   PATCH /finances/withdrawals/:id/cancel      — отменить (возврат средств)
 *   PATCH /finances/withdrawals/:id/complete    — пометить как выплаченное
 *   POST  /users/:userId/adjust-balance         — ± баланс пользователя (Sprint B: финансовый админ)
 *   GET  /churn-risk                   — оценка риска оттока (ML)
 *   GET  /ltv-top                      — топ-N клиентов по предсказанному LTV (ML)
 *   GET  /forecast-revenue             — прогноз ежедневной выручки (ML)
 *   GET  /anomalies                    — транзакции с anomaly_score (ML)
 *   POST /ml/rfm-recompute             — ручной запуск RFM-пересчёта (ML)
 */
const express = require('express');
const { Op } = require('sequelize');

const logger = require('../logger');
const { sequelize, Sequelize } = require('../db');
const {
  User, Booking, Property,
  Payment, AdminWallet, AdminTransaction, WithdrawalRequest, WithdrawalAuditLog,
  LoyaltyCard, Transaction, Notification,
} = require('../models');
const { verifyAdmin, verifyFinanceAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../validation');
const { parsePagination } = require('../utils/pagination');

const isDev = () => (process.env.NODE_ENV || 'development') === 'development';

/**
 * Иммутабельная запись в журнал жизненного цикла заявки.
 * Принимает опциональный sequelize-transaction, чтобы запись в журнал
 * откатывалась вместе с основной операцией при ошибке.
 */
async function writeWithdrawalAudit({
  withdrawalId, action, fromStatus, toStatus, actorId, amount, note, transaction,
}) {
  return WithdrawalAuditLog.create({
    withdrawalId,
    action,
    fromStatus: fromStatus || null,
    toStatus,
    actorId,
    amount,
    note: note || null,
  }, transaction ? { transaction } : undefined);
}

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
   * Атомарно: блокирует средства (available → pending), создаёт WithdrawalRequest
   * и пишет первую запись в WithdrawalAuditLog (action='created').
   */
  router.post('/finances/withdrawal', verifyFinanceAdmin, async (req, res) => {
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

    const t = await sequelize.transaction();
    try {
      const userId = req.userId;

      const adminUser = await User.findOne({ where: { userId }, transaction: t });
      if (!adminUser) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Пользователь не найден' });
      }

      const adminWallet = await AdminWallet.findOne({ where: { adminId: userId }, transaction: t });
      if (!adminWallet) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Кошелек администратора не найден' });
      }

      const withdrawAmount    = parseFloat(amount);
      const availableBalance  = parseFloat(adminWallet.availableBalance);

      if (availableBalance < withdrawAmount) {
        await t.rollback();
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
      }, { transaction: t });

      adminWallet.availableBalance = parseFloat((availableBalance - withdrawAmount).toFixed(2));
      adminWallet.pendingBalance   = parseFloat((parseFloat(adminWallet.pendingBalance) + withdrawAmount).toFixed(2));
      await adminWallet.save({ transaction: t });

      await writeWithdrawalAudit({
        withdrawalId: withdrawalRequest.id,
        action:       'created',
        fromStatus:   null,
        toStatus:     'pending',
        actorId:      userId,
        amount:       withdrawAmount,
        note:         reason || null,
        transaction:  t,
      });

      await t.commit();
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
      await t.rollback();
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
   *
   * По умолчанию возвращает заявки всех финансовых админов — это нужно для
   * peer-approval (фин. админы одобряют друг друга). Если нужно показать
   * только свои — передать ?scope=mine.
   */
  router.get('/finances/withdrawals', verifyFinanceAdmin, async (req, res) => {
    try {
      const userId = req.userId;
      const { status, scope } = req.query;
      const { limit, offset } = parsePagination(req.query);

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const where = {};
      if (scope === 'mine') where.adminId = userId;
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

  /**
   * PATCH /finances/withdrawals/:id/cancel — отменить pending-заявку.
   * pending → rejected (enum-значение repurposed как «cancelled»).
   * Возврат: pendingBalance −= amount, availableBalance += amount.
   * Пишет AdminTransaction(type='refund') для аудита.
   *
   * Single-admin модель: владелец сам отменяет, нет защиты от само-отмены.
   */
  router.patch('/finances/withdrawals/:id/cancel', verifyFinanceAdmin, async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const userId = req.userId;
      const { id } = req.params;
      const { reason } = req.body || {};

      if (!isDbConnected()) {
        await t.rollback();
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const withdrawal = await WithdrawalRequest.findByPk(id, { transaction: t });
      if (!withdrawal) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Заявка не найдена' });
      }
      if (withdrawal.status !== 'pending') {
        await t.rollback();
        return res.status(409).json({
          success: false,
          error:   `Отменить можно только pending-заявку (текущий статус: "${withdrawal.status}")`,
        });
      }

      const adminWallet = await AdminWallet.findOne({
        where: { adminId: withdrawal.adminId },
        transaction: t,
      });
      if (!adminWallet) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Кошелек заявителя не найден' });
      }

      const amount = parseFloat(withdrawal.amount);
      const prevAvailable = parseFloat(adminWallet.availableBalance);
      const prevPending   = parseFloat(adminWallet.pendingBalance);

      adminWallet.pendingBalance   = parseFloat((prevPending   - amount).toFixed(2));
      adminWallet.availableBalance = parseFloat((prevAvailable + amount).toFixed(2));
      adminWallet.totalBalance     = parseFloat((parseFloat(adminWallet.totalBalance) || 0).toFixed(2));
      await adminWallet.save({ transaction: t });

      withdrawal.status     = 'rejected';
      withdrawal.approvedBy = userId;
      withdrawal.approvedAt = new Date();
      if (reason && typeof reason === 'string') {
        withdrawal.reason = `${withdrawal.reason || ''}\n[Отменено: ${reason}]`.trim();
      }
      await withdrawal.save({ transaction: t });

      await AdminTransaction.create({
        adminId:       withdrawal.adminId,
        adminLevel:    withdrawal.adminLevel,
        type:          'refund',
        amount,
        description:   `Возврат при отмене заявки #${withdrawal.id}`,
        balanceBefore: prevAvailable,
        balanceAfter:  adminWallet.availableBalance,
      }, { transaction: t });

      await writeWithdrawalAudit({
        withdrawalId: withdrawal.id,
        action:       'cancelled',
        fromStatus:   'pending',
        toStatus:     'rejected',
        actorId:      userId,
        amount,
        transaction:  t,
      });

      await t.commit();
      logger.info('Заявка отменена', { id, by: userId });

      return res.status(200).json({
        success:       true,
        withdrawal,
        updatedWallet: {
          availableBalance: adminWallet.availableBalance,
          pendingBalance:   adminWallet.pendingBalance,
        },
      });
    } catch (error) {
      await t.rollback();
      logger.error('admin cancel withdrawal error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при отмене заявки',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * PATCH /finances/withdrawals/:id/complete — пометить заявку как выплаченную.
   * pending → completed. Применяется ПОСЛЕ ручного банковского перевода.
   *
   * Что меняется:
   * - pendingBalance −= amount  (деньги покинули кошелёк)
   * - totalWithdrawn += amount  (накопительный аудит выплат)
   * - AdminTransaction(type='withdrawal') пишется для журнала
   */
  router.patch('/finances/withdrawals/:id/complete', verifyFinanceAdmin, async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!isDbConnected()) {
        await t.rollback();
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const withdrawal = await WithdrawalRequest.findByPk(id, { transaction: t });
      if (!withdrawal) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Заявка не найдена' });
      }
      if (withdrawal.status !== 'pending') {
        await t.rollback();
        return res.status(409).json({
          success: false,
          error:   `Завершить можно только pending-заявку (текущий статус: "${withdrawal.status}")`,
        });
      }

      const adminWallet = await AdminWallet.findOne({
        where: { adminId: withdrawal.adminId },
        transaction: t,
      });
      if (!adminWallet) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Кошелек заявителя не найден' });
      }

      const amount = parseFloat(withdrawal.amount);
      const prevPending    = parseFloat(adminWallet.pendingBalance);
      const prevWithdrawn  = parseFloat(adminWallet.totalWithdrawn || 0);
      const prevTotal      = parseFloat(adminWallet.totalBalance || 0);

      adminWallet.pendingBalance = parseFloat((prevPending - amount).toFixed(2));
      adminWallet.totalWithdrawn = parseFloat((prevWithdrawn + amount).toFixed(2));
      adminWallet.totalBalance   = parseFloat((prevTotal - amount).toFixed(2));
      await adminWallet.save({ transaction: t });

      withdrawal.status      = 'completed';
      withdrawal.approvedBy  = userId;
      withdrawal.approvedAt  = withdrawal.approvedAt || new Date();
      withdrawal.completedAt = new Date();
      await withdrawal.save({ transaction: t });

      await AdminTransaction.create({
        adminId:       withdrawal.adminId,
        adminLevel:    withdrawal.adminLevel,
        type:          'withdrawal',
        amount,
        description:   `Выплата по заявке #${withdrawal.id} на счёт ${withdrawal.bankAccount || '—'}`,
        balanceBefore: prevPending + parseFloat(adminWallet.availableBalance),
        balanceAfter:  adminWallet.pendingBalance + parseFloat(adminWallet.availableBalance),
      }, { transaction: t });

      await writeWithdrawalAudit({
        withdrawalId: withdrawal.id,
        action:       'completed',
        fromStatus:   'pending',
        toStatus:     'completed',
        actorId:      userId,
        amount,
        transaction:  t,
      });

      await t.commit();
      logger.info('Заявка выплачена', { id, by: userId, amount });

      return res.status(200).json({
        success:       true,
        withdrawal,
        updatedWallet: {
          availableBalance: adminWallet.availableBalance,
          pendingBalance:   adminWallet.pendingBalance,
          totalWithdrawn:   adminWallet.totalWithdrawn,
        },
      });
    } catch (error) {
      await t.rollback();
      logger.error('admin complete withdrawal error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при завершении заявки',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /finances/withdrawals/:id/audit — журнал событий по конкретной заявке.
   * Возвращает все записи в хронологическом порядке (created → cancelled/completed).
   */
  router.get('/finances/withdrawals/:id/audit', verifyFinanceAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const withdrawal = await WithdrawalRequest.findByPk(id);
      if (!withdrawal) {
        return res.status(404).json({ success: false, error: 'Заявка не найдена' });
      }

      const entries = await WithdrawalAuditLog.findAll({
        where:  { withdrawalId: id },
        order:  [['createdAt', 'ASC']],
      });

      return res.status(200).json({ success: true, entries });
    } catch (error) {
      logger.error('admin withdrawal audit error', { error: error.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при получении журнала заявки',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /churn-risk — оценка риска оттока для активных пользователей.
   *
   * Query:
   *   limit (1..500, default 100)       — макс. пользователей в выборке
   *   windowDays (1..365, default 90)   — окно активности (бронирования за N дней)
   *   risk (high|medium|low|all, all)   — фильтр по уровню риска
   *
   * Источник истины — ML-сервис /churn/predict. Выдача отсортирована по
   * probability DESC. При недоступности ML возвращается 503 с partial=true
   * и пустым items, чтобы фронт мог корректно показать состояние.
   */
  router.get('/churn-risk', verifyAdmin, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const rawLimit = parseInt(req.query.limit, 10);
      const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? 100 : rawLimit, 1), 500);
      const rawWindow = parseInt(req.query.windowDays, 10);
      const windowDays = Math.min(Math.max(Number.isNaN(rawWindow) ? 90 : rawWindow, 1), 365);
      const riskFilter = ['high', 'medium', 'low', 'all'].includes(req.query.risk)
        ? req.query.risk : 'all';

      const cutoff = new Date(Date.now() - windowDays * 86400 * 1000);
      const activeRows = await Booking.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('userId')), 'userId']],
        where: { createdAt: { [Op.gte]: cutoff } },
        raw: true,
        limit,
      });
      const userIds = activeRows.map((r) => r.userId).filter(Boolean);

      if (userIds.length === 0) {
        // Нет активных пользователей в окне — это не «ML offline».
        // Возвращаем нулевую мету, чтобы фронт показал спокойное состояние, а не off-state.
        return res.status(200).json({
          success: true,
          items: [],
          total: 0,
          meta: {
            windowDays,
            scanned: 0,
            predicted: 0,
            failed: 0,
            counts: { high: 0, medium: 0, low: 0 },
          },
        });
      }

      const mlClient = require('../services/mlClient');
      const BATCH = 20;
      const predictions = [];
      let failed = 0;

      for (let i = 0; i < userIds.length; i += BATCH) {
        const chunk = userIds.slice(i, i + BATCH);
        const results = await Promise.all(
          chunk.map((uid) => mlClient.churnPredict({ userId: uid })),
        );
        for (let j = 0; j < results.length; j += 1) {
          const r = results[j];
          if (!r.ok) { failed += 1; continue; }
          predictions.push({
            userId: chunk[j],
            probability: r.data.churn_probability,
            risk: r.data.risk,
          });
        }
      }

      if (predictions.length === 0) {
        return res.status(503).json({
          success: false,
          error: 'ML-сервис недоступен',
          partial: true,
          items: [],
          failed,
        });
      }

      const filtered = riskFilter === 'all'
        ? predictions
        : predictions.filter((p) => p.risk === riskFilter);

      // Подтягиваем профили пользователей одним запросом
      const profiles = await User.findAll({
        where: { userId: { [Op.in]: filtered.map((p) => p.userId) } },
        attributes: ['userId', 'displayName', 'email', 'membershipLevel'],
        raw: true,
      });
      const profileById = new Map(profiles.map((u) => [u.userId, u]));

      const items = filtered
        .map((p) => ({
          ...p,
          probability: Number(p.probability.toFixed(4)),
          displayName: profileById.get(p.userId)?.displayName || null,
          email: profileById.get(p.userId)?.email || null,
          membershipLevel: profileById.get(p.userId)?.membershipLevel || null,
        }))
        .sort((a, b) => b.probability - a.probability);

      return res.status(200).json({
        success: true,
        items,
        total: items.length,
        meta: {
          windowDays,
          scanned: userIds.length,
          predicted: predictions.length,
          failed,
          counts: {
            high:   predictions.filter((p) => p.risk === 'high').length,
            medium: predictions.filter((p) => p.risk === 'medium').length,
            low:    predictions.filter((p) => p.risk === 'low').length,
          },
        },
      });
    } catch (error) {
      logger.error('admin churn-risk error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении оценки оттока',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /ltv-top — топ-N клиентов по предсказанному годовому LTV.
   *
   * Query:
   *   n (1..100, default 20) — размер выдачи
   *
   * Источник истины — ML-сервис /ltv/top. К каждой записи подмешивается
   * профиль пользователя из БД (displayName, email, membershipLevel).
   * При недоступности ML возвращается 503 с partial=true.
   */
  router.get('/ltv-top', verifyAdmin, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const rawN = parseInt(req.query.n, 10);
      const n = Math.min(Math.max(Number.isNaN(rawN) ? 20 : rawN, 1), 100);

      const mlClient = require('../services/mlClient');
      const result = await mlClient.ltvTop({ n });
      if (!result.ok) {
        return res.status(503).json({
          success: false,
          error: 'ML-сервис недоступен',
          partial: true,
          items: [],
          detail: result.error,
        });
      }

      const items = result.data.items || [];
      const userIds = items.map((it) => it.user_id).filter(Boolean);
      const profiles = userIds.length
        ? await User.findAll({
          where: { userId: { [Op.in]: userIds } },
          attributes: ['userId', 'displayName', 'email', 'membershipLevel'],
          raw: true,
        })
        : [];
      const profileById = new Map(profiles.map((u) => [u.userId, u]));

      const enriched = items.map((it) => {
        const p = profileById.get(it.user_id);
        return {
          userId: it.user_id,
          predictedLtv: Math.round(it.predicted_ltv),
          totalSpent: Math.round(it.total_spent),
          displayName: p?.displayName || null,
          email: p?.email || null,
          membershipLevel: p?.membershipLevel || null,
        };
      });

      return res.status(200).json({
        success: true,
        items: enriched,
        total: enriched.length,
      });
    } catch (error) {
      logger.error('admin ltv-top error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении топ-LTV',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /forecast-revenue — прогноз ежедневной выручки.
   *
   * Query:
   *   horizon    (1..180, default 30)  — горизонт прогноза, дней
   *   windowDays (14..730, default 180) — окно истории для обучения
   *
   * Источник — Holt-Winters / linear trend на стороне ML-сервиса.
   */
  router.get('/forecast-revenue', verifyAdmin, async (req, res) => {
    try {
      const mlClient = require('../services/mlClient');
      const horizon = parseInt(req.query.horizon, 10) || 30;
      const windowDays = parseInt(req.query.windowDays, 10) || 180;
      const result = await mlClient.forecastRevenue({ horizon, windowDays });
      if (!result.ok) {
        return res.status(503).json({
          success: false,
          error: 'ML-сервис недоступен',
          partial: true,
          detail: result.error,
        });
      }
      return res.status(200).json({ success: true, ...result.data });
    } catch (error) {
      logger.error('admin forecast-revenue error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении прогноза выручки',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /anomalies — последние транзакции с anomaly_score.
   *
   * Query:
   *   limit      (1..1000, default 200) — макс. транзакций для скоринга
   *   windowDays (1..365, default 30)   — окно по дате транзакции
   *   onlyFlagged (0|1, default 0)      — вернуть только is_anomaly=true
   */
  router.get('/anomalies', verifyAdmin, async (req, res) => {
    try {
      const mlClient = require('../services/mlClient');
      const limit = parseInt(req.query.limit, 10) || 200;
      const windowDays = parseInt(req.query.windowDays, 10) || 30;
      const onlyFlagged = req.query.onlyFlagged === '1' || req.query.onlyFlagged === 'true';

      const result = await mlClient.detectAnomalies({ limit, windowDays });
      if (!result.ok) {
        return res.status(503).json({
          success: false,
          error: 'ML-сервис недоступен',
          partial: true,
          items: [],
          detail: result.error,
        });
      }

      const rawItems = result.data.items || [];
      const items = (onlyFlagged ? rawItems.filter((it) => it.is_anomaly) : rawItems)
        .map((it) => ({
          userId: it.user_id,
          amount: Number(it.amount),
          createdAt: it.created_at,
          anomalyScore: Number(it.anomaly_score.toFixed(4)),
          isAnomaly: Boolean(it.is_anomaly),
        }));

      const userIds = [...new Set(items.map((it) => it.userId))].filter(Boolean);
      const profiles = userIds.length
        ? await User.findAll({
          where: { userId: { [Op.in]: userIds } },
          attributes: ['userId', 'displayName', 'email'],
          raw: true,
        })
        : [];
      const profileById = new Map(profiles.map((u) => [u.userId, u]));
      const enriched = items.map((it) => {
        const p = profileById.get(it.userId);
        return {
          ...it,
          displayName: p?.displayName || null,
          email: p?.email || null,
        };
      });

      return res.status(200).json({
        success: true,
        items: enriched,
        total: enriched.length,
        nTotal: result.data.n_total,
        nAnomalies: result.data.n_anomalies,
      });
    } catch (error) {
      logger.error('admin anomalies error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении аномалий',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * POST /ml/rfm-recompute — ручной триггер пересчёта RFM-уровней.
   *
   * Выполняет ту же логику, что и ночной cron (mlJobs.runRfmRecompute):
   * запрос к ML, обновление LoyaltyCard.membershipLevel + User.membershipLevel,
   * рассылка уведомлений о повышении уровня. Для отладки и демо-сценариев
   * (например, для скриншота в ВКР).
   *
   * Доступ — только admin (verifyAdmin).
   * 200 → результат пересчёта; 4xx/5xx — ошибка ML-сервиса.
   */
  router.post('/ml/rfm-recompute', verifyAdmin, async (req, res) => {
    try {
      const mlJobs = require('../services/mlJobs');
      const result = await mlJobs.runRfmRecompute();

      if (result.skipped) {
        return res.status(409).json({
          success: false,
          error: 'RFM-задача уже выполняется',
        });
      }

      if (!result.ok) {
        const status = result.status && result.status >= 400 && result.status < 500 ? 400 : 503;
        return res.status(status).json({
          success: false,
          error: 'ML-сервис вернул ошибку',
          detail: result.error,
          mlStatus: result.status,
        });
      }

      return res.status(200).json({
        success: true,
        updated: result.updated,
        upgrades: result.upgrades,
        downgrades: result.downgrades,
        distribution: result.distribution,
        silhouette: result.silhouette,
      });
    } catch (error) {
      logger.error('admin rfm-recompute error', { error: error.message, stack: error.stack });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при запуске RFM-пересчёта',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * POST /users/:userId/adjust-balance — ручная корректировка баланса пользователя.
   *
   * Финансовый админ (adminLevel=1) переводит средства между AdminWallet и LoyaltyCard:
   *   amount > 0  → AdminWallet ↓, LoyaltyCard ↑  (бонус, компенсация)
   *   amount < 0  → AdminWallet ↑, LoyaltyCard ↓  (штраф, корректировка)
   *
   * Транзакция SERIALIZABLE + SELECT FOR UPDATE на оба кошелька — защита от гонок
   * при двух параллельных корректировках одному и тому же пользователю.
   *
   * Все движения логируются в Transaction (category='admin_adjustment', performedBy, metadata.reason)
   * и в AdminTransaction (type='adjustment') — двойная запись для аудита.
   */
  router.post(
    '/users/:userId/adjust-balance',
    verifyFinanceAdmin,
    validate(schemas.adminAdjustBalance),
    async (req, res) => {
      const { userId } = req.params;
      const { amount, reason, description } = req.body;
      const adminId = req.userId;

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }
      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId обязателен' });
      }

      const t = await sequelize.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
      });
      try {
        const targetUser = await User.findOne({ where: { userId }, transaction: t });
        if (!targetUser) {
          await t.rollback();
          return res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }
        if (targetUser.role === 'admin') {
          await t.rollback();
          return res.status(400).json({ success: false, error: 'Нельзя корректировать баланс админа' });
        }

        const loyaltyCard = await LoyaltyCard.findOne({
          where: { userId },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (!loyaltyCard) {
          await t.rollback();
          return res.status(404).json({ success: false, error: 'Карта лояльности не найдена' });
        }

        const adminWallet = await AdminWallet.findOne({
          where: { adminId, adminLevel: 1 },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (!adminWallet) {
          await t.rollback();
          return res.status(404).json({ success: false, error: 'Кошелёк админа не найден' });
        }

        const delta             = parseFloat(amount);
        const cardBalanceBefore = parseFloat(loyaltyCard.balance);
        const cardBalanceAfter  = parseFloat((cardBalanceBefore + delta).toFixed(2));

        if (cardBalanceAfter < 0) {
          await t.rollback();
          return res.status(409).json({
            success: false,
            error:   `Недостаточно средств на карте: списание ${Math.abs(delta)} приведёт к отрицательному балансу (${cardBalanceBefore})`,
          });
        }

        const walletBalBefore   = parseFloat(adminWallet.totalBalance);
        const walletAvailBefore = parseFloat(adminWallet.availableBalance);

        // Зачисление пользователю → списание из AdminWallet.
        // Списание у пользователя → возврат в AdminWallet.
        const walletBalAfter   = parseFloat((walletBalBefore   - delta).toFixed(2));
        const walletAvailAfter = parseFloat((walletAvailBefore - delta).toFixed(2));

        if (delta > 0 && walletAvailBefore < delta) {
          await t.rollback();
          return res.status(409).json({
            success: false,
            error:   `Недостаточно доступных средств в кошельке админа: требуется ${delta}, доступно ${walletAvailBefore}`,
          });
        }

        await loyaltyCard.update({ balance: cardBalanceAfter }, { transaction: t });
        await adminWallet.update({
          totalBalance:     walletBalAfter,
          availableBalance: walletAvailAfter,
        }, { transaction: t });

        const adjustmentId = `ADJ_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        // 1) Transaction в истории пользователя
        await Transaction.create({
          userId,
          type:          delta > 0 ? 'credit' : 'debit',
          category:      'admin_adjustment',
          amount:        Math.abs(delta),
          description,
          balanceBefore: cardBalanceBefore,
          balanceAfter:  cardBalanceAfter,
          performedBy:   adminId,
          relatedType:   'admin_adjustment',
          relatedId:     adjustmentId,
          metadata: {
            reason,
            adjustmentId,
            adminId,
            adminEmail: req.dbUser?.email || null,
            signedAmount: delta,
          },
        }, { transaction: t });

        // 2) AdminTransaction в истории админа
        await AdminTransaction.create({
          adminId,
          adminLevel:    1,
          type:          'adjustment',
          amount:        Math.abs(delta),
          description:   `Корректировка баланса ${targetUser.email || userId} (${reason}): ${description}`,
          balanceBefore: walletBalBefore,
          balanceAfter:  walletBalAfter,
        }, { transaction: t });

        // 3) Уведомление пользователю
        try {
          await Notification.create({
            userId,
            title:   delta > 0 ? 'Баланс пополнен администратором' : 'Корректировка баланса',
            message: delta > 0
              ? `На вашу карту зачислено ${delta} PRB. Причина: ${description}`
              : `С вашей карты списано ${Math.abs(delta)} PRB. Причина: ${description}`,
            type:    'admin_adjustment',
            data: {
              amount:       delta,
              reason,
              adjustmentId,
              balanceAfter: cardBalanceAfter,
            },
            read: false,
          }, { transaction: t });
        } catch (notifErr) {
          logger.error('admin adjust-balance notify error', { error: notifErr.message });
        }

        await t.commit();

        logger.info('admin adjust-balance', {
          adminId, userId, delta, reason, adjustmentId,
        });

        return res.status(200).json({
          success:           true,
          adjustmentId,
          userBalanceBefore: cardBalanceBefore,
          userBalanceAfter:  cardBalanceAfter,
          walletBalanceAfter: walletBalAfter,
        });
      } catch (error) {
        try { await t.rollback(); } catch (_e) { /* already finished */ }
        logger.error('admin adjust-balance error', { error: error.message, userId });
        return res.status(500).json({
          success: false,
          error:   'Ошибка при корректировке баланса',
          details: isDev() ? error.message : undefined,
        });
      }
    },
  );

  return router;
};
