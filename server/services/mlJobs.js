/**
 * Фоновые ML-задачи: ежесуточный пересчёт RFM-уровней и проверка оттока.
 *
 * Запускается из server/index.js после успешного connectDB().
 * Управление через .env:
 *   ML_JOBS_ENABLED         = true|false (default: true, в test всегда false)
 *   ML_JOB_RFM_CRON         = cron-выражение (default: 0 3 * * * — 03:00 ежедневно)
 *   ML_JOB_CHURN_CRON       = cron-выражение (default: 0 4 * * * — 04:00 ежедневно)
 *   ML_JOB_CHURN_ACTIVE_DAYS = окно активности пользователей для churn (default: 90)
 *   ML_JOB_CHURN_BATCH      = размер батча параллельных запросов (default: 20)
 *
 * Безопасность multi-instance: для MVP блокировка по advisory-lock не введена.
 * При деплое >1 инстанса включить ML_JOBS_ENABLED только на одном (worker pod).
 */
const cron = require('node-cron');

const logger = require('../logger');
const sequelize = require('../db').sequelize;
const { Op } = require('sequelize');
const User = require('../models/User');
const LoyaltyCard = require('../models/LoyaltyCard');
const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const mlClient = require('./mlClient');

const LEVELS = ['Bronze', 'Silver', 'Gold', 'Platinum'];
const LEVEL_RANK = Object.fromEntries(LEVELS.map((l, i) => [l, i]));
const LEVEL_CASHBACK = { Bronze: 3, Silver: 5, Gold: 7, Platinum: 10 };

const _tasks = [];
let _running = { rfm: false, churn: false };

// ---------------------------------------------------------------------------
// RFM: пересчёт уровней лояльности
// ---------------------------------------------------------------------------
async function runRfmRecompute() {
  if (_running.rfm) {
    logger.warn('RFM-задача уже выполняется, пропускаю запуск');
    return { skipped: true };
  }
  _running.rfm = true;
  const startedAt = Date.now();

  try {
    logger.info('RFM-recompute: вызываю ML-сервис');
    const res = await mlClient.rfmRecompute({ windowDays: 365 });
    if (!res.ok) {
      // 4xx — ML-сервис жив, просто нет/мало данных для пересчёта. Это норма
      // для свежей БД, логируем как warn, чтобы не шуметь error-ами.
      const isClientError = res.status && res.status >= 400 && res.status < 500;
      if (isClientError) {
        logger.warn('RFM-recompute: пропущено', { status: res.status, error: res.error });
      } else {
        logger.error('RFM-recompute: ML недоступен', { status: res.status, error: res.error });
      }
      return { ok: false, error: res.error, status: res.status };
    }

    const { user_levels: userLevels = {}, distribution, silhouette } = res.data;
    const userIds = Object.keys(userLevels);
    if (userIds.length === 0) {
      logger.warn('RFM-recompute: ML вернул пустой user_levels');
      return { ok: true, updated: 0, distribution, silhouette };
    }

    // Текущие уровни — чтобы создавать уведомление только при изменении
    const cards = await LoyaltyCard.findAll({
      where: { userId: { [Op.in]: userIds } },
      attributes: ['userId', 'membershipLevel'],
    });
    const currentLevel = new Map(cards.map((c) => [c.userId, c.membershipLevel]));

    let updated = 0;
    let upgrades = 0;
    let downgrades = 0;

    // Группируем по новому уровню → один UPDATE per level вместо N запросов
    const byNewLevel = { Bronze: [], Silver: [], Gold: [], Platinum: [] };
    for (const userId of userIds) {
      const newLevel = userLevels[userId];
      if (!LEVELS.includes(newLevel)) continue;
      const cur = currentLevel.get(userId);
      if (cur === newLevel) continue;
      byNewLevel[newLevel].push(userId);
      if (cur && LEVEL_RANK[newLevel] > LEVEL_RANK[cur]) upgrades += 1;
      else if (cur && LEVEL_RANK[newLevel] < LEVEL_RANK[cur]) downgrades += 1;
    }

    await sequelize.transaction(async (tx) => {
      for (const lvl of LEVELS) {
        const ids = byNewLevel[lvl];
        if (ids.length === 0) continue;
        await LoyaltyCard.update(
          { membershipLevel: lvl, cashbackRate: LEVEL_CASHBACK[lvl] },
          { where: { userId: { [Op.in]: ids } }, transaction: tx },
        );
        await User.update(
          { membershipLevel: lvl },
          { where: { userId: { [Op.in]: ids } }, transaction: tx },
        );
        updated += ids.length;
      }
    });

    // Уведомления о повышении уровня — вне транзакции, не критично
    const upgradedUserIds = [];
    for (const userId of userIds) {
      const newLevel = userLevels[userId];
      const cur = currentLevel.get(userId);
      if (cur && LEVELS.includes(newLevel) && LEVEL_RANK[newLevel] > LEVEL_RANK[cur]) {
        upgradedUserIds.push({ userId, from: cur, to: newLevel });
      }
    }
    if (upgradedUserIds.length > 0) {
      await Notification.bulkCreate(
        upgradedUserIds.map(({ userId, from, to }) => ({
          userId,
          title: 'Поздравляем с повышением уровня!',
          message: `Ваш уровень лояльности повышен с ${from} до ${to}. Теперь доступен увеличенный кэшбек.`,
          type: 'level_upgrade',
          data: { from, to, source: 'rfm_recompute' },
          read: false,
        })),
        { ignoreDuplicates: true },
      );
    }

    const durationMs = Date.now() - startedAt;
    logger.info('RFM-recompute: готово', {
      durationMs,
      updated,
      upgrades,
      downgrades,
      distribution,
      silhouette: Number(silhouette).toFixed(3),
    });
    return { ok: true, updated, upgrades, downgrades, distribution, silhouette };
  } catch (err) {
    logger.error('RFM-recompute: ошибка', { error: err.message, stack: err.stack });
    return { ok: false, error: err.message };
  } finally {
    _running.rfm = false;
  }
}

// ---------------------------------------------------------------------------
// Churn: прогноз оттока для активных пользователей
// ---------------------------------------------------------------------------
async function runChurnCheck({
  activeWindowDays = parseInt(process.env.ML_JOB_CHURN_ACTIVE_DAYS || '90', 10),
  batchSize = parseInt(process.env.ML_JOB_CHURN_BATCH || '20', 10),
} = {}) {
  if (_running.churn) {
    logger.warn('Churn-задача уже выполняется, пропускаю запуск');
    return { skipped: true };
  }
  _running.churn = true;
  const startedAt = Date.now();

  try {
    // Активные = были бронирования за последние N дней (любого статуса)
    const cutoff = new Date(Date.now() - activeWindowDays * 86400 * 1000);
    const rows = await Booking.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('userId')), 'userId']],
      where: { createdAt: { [Op.gte]: cutoff } },
      raw: true,
    });
    const userIds = rows.map((r) => r.userId).filter(Boolean);
    logger.info('Churn-check: активных пользователей', { count: userIds.length });

    let highRisk = 0;
    let mediumRisk = 0;
    let lowRisk = 0;
    let failed = 0;
    const highRiskUsers = [];

    // Чанкуем, чтобы не положить ML параллельными запросами
    for (let i = 0; i < userIds.length; i += batchSize) {
      const chunk = userIds.slice(i, i + batchSize);
      const results = await Promise.all(
        chunk.map((uid) => mlClient.churnPredict({ userId: uid })),
      );
      for (let j = 0; j < results.length; j += 1) {
        const r = results[j];
        if (!r.ok) {
          failed += 1;
          continue;
        }
        if (r.data.risk === 'high') {
          highRisk += 1;
          highRiskUsers.push({ userId: chunk[j], probability: r.data.churn_probability });
        } else if (r.data.risk === 'medium') mediumRisk += 1;
        else lowRisk += 1;
      }
    }

    // Один retention-нотиф на high-risk юзера в сутки
    // (idempotent: если уже есть свежий — не дублируем)
    if (highRiskUsers.length > 0) {
      const since = new Date(Date.now() - 20 * 3600 * 1000);
      const existing = await Notification.findAll({
        where: {
          userId: { [Op.in]: highRiskUsers.map((u) => u.userId) },
          type: 'retention_offer',
          createdAt: { [Op.gte]: since },
        },
        attributes: ['userId'],
        raw: true,
      });
      const alreadyNotified = new Set(existing.map((e) => e.userId));
      const fresh = highRiskUsers.filter((u) => !alreadyNotified.has(u.userId));
      if (fresh.length > 0) {
        await Notification.bulkCreate(
          fresh.map(({ userId, probability }) => ({
            userId,
            title: 'Мы скучаем по вам',
            message: 'Вернитесь до конца недели — для вас действует персональное предложение с повышенным кэшбеком на следующее бронирование.',
            type: 'retention_offer',
            data: { churn_probability: probability, source: 'churn_check' },
            read: false,
          })),
        );
      }
    }

    const durationMs = Date.now() - startedAt;
    logger.info('Churn-check: готово', {
      durationMs,
      total: userIds.length,
      highRisk,
      mediumRisk,
      lowRisk,
      failed,
    });
    return { ok: true, total: userIds.length, highRisk, mediumRisk, lowRisk, failed };
  } catch (err) {
    logger.error('Churn-check: ошибка', { error: err.message, stack: err.stack });
    return { ok: false, error: err.message };
  } finally {
    _running.churn = false;
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
function start() {
  if (process.env.ML_JOBS_ENABLED === 'false') {
    logger.info('ML-jobs отключены через ML_JOBS_ENABLED=false');
    return;
  }
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const rfmCron = process.env.ML_JOB_RFM_CRON || '0 3 * * *';
  const churnCron = process.env.ML_JOB_CHURN_CRON || '0 4 * * *';

  if (!cron.validate(rfmCron) || !cron.validate(churnCron)) {
    logger.error('ML-jobs: некорректное cron-выражение', { rfmCron, churnCron });
    return;
  }

  _tasks.push(cron.schedule(rfmCron, () => { runRfmRecompute(); }, { timezone: 'Europe/Moscow' }));
  _tasks.push(cron.schedule(churnCron, () => { runChurnCheck(); }, { timezone: 'Europe/Moscow' }));
  logger.info('ML-jobs запланированы', { rfmCron, churnCron, tz: 'Europe/Moscow' });
}

function stop() {
  for (const t of _tasks) {
    try { t.stop(); } catch (_) { /* noop */ }
  }
  _tasks.length = 0;
}

module.exports = {
  start,
  stop,
  runRfmRecompute,
  runChurnCheck,
};
