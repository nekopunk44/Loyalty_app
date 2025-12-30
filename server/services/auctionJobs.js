/**
 * Cron-задача: закрытие просроченных аукционов.
 *
 * Запускается из server/index.js после connectDB(). По умолчанию каждые
 * 5 минут (cron-выражение `*\/5 * * * *`). Можно переопределить через
 * AUCTION_CLOSE_CRON.
 *
 * Multi-instance: пока без advisory-lock. Если будет >1 инстанса —
 * включать только на одном (worker pod) через AUCTION_JOBS_ENABLED=false.
 */

const cron = require('node-cron');
const logger = require('../logger');
const { closeExpiredAuctions } = require('./auctionService');

const _tasks = [];
let _running = false;

async function runCloseExpired() {
  if (_running) {
    logger.warn('Auction close-expired уже выполняется, пропускаю запуск');
    return { skipped: true };
  }
  _running = true;
  try {
    const results = await closeExpiredAuctions();
    const ok = results.filter((r) => r.ok).length;
    const fail = results.length - ok;
    if (results.length > 0) {
      logger.info('Auction close-expired: цикл завершён', {
        total: results.length, ok, fail,
      });
    }
    return { ok: true, total: results.length, results };
  } catch (err) {
    logger.error('Auction close-expired: критическая ошибка', { error: err.message });
    return { ok: false, error: err.message };
  } finally {
    _running = false;
  }
}

function start() {
  if (process.env.AUCTION_JOBS_ENABLED === 'false') {
    logger.info('Auction-jobs отключены через AUCTION_JOBS_ENABLED=false');
    return;
  }
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const expression = process.env.AUCTION_CLOSE_CRON || '*/5 * * * *';

  if (!cron.validate(expression)) {
    logger.error('Auction-jobs: некорректное cron-выражение', { expression });
    return;
  }

  _tasks.push(cron.schedule(expression, () => { runCloseExpired(); }, { timezone: 'Europe/Moscow' }));
  logger.info('Auction-jobs запланированы', { expression, tz: 'Europe/Moscow' });
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
  runCloseExpired,
};
