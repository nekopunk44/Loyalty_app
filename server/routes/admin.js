/**
 * Admin routes (prefix: /api/admin):
 *   GET  /stats                        — агрегированная статистика
 *   POST /ai-analysis                  — AI-анализ через OpenRouter
 *   GET  /finances/summary             — финансовая сводка администратора
 *   GET  /finances/transactions        — список финансовых транзакций
 *   POST /finances/withdrawal          — запросить вывод средств
 *   GET  /finances/withdrawals         — список запросов на вывод
 *   GET  /churn-risk                   — оценка риска оттока (ML)
 *   GET  /ltv-top                      — топ-N клиентов по предсказанному LTV (ML)
 *   GET  /forecast-revenue             — прогноз ежедневной выручки (ML)
 *   GET  /anomalies                    — транзакции с anomaly_score (ML)
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

  return router;
};
