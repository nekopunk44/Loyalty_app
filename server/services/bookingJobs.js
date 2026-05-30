/**
 * Cron-задача: авто-просрочка неоплаченных бронирований.
 *
 * Sprint A ВКР (§3.1): pending_payment с истёкшим paymentDeadline → expired.
 * Это освобождает слот (booked-dates перестаёт его показывать) и закрывает
 * квази-DoS от «squatter»-ов, которые забронировали и не платят.
 *
 * Запуск: ENV BOOKING_EXPIRE_CRON, по умолчанию каждую минуту.
 *
 * Multi-instance: пока без advisory-lock. На >1 инстансе включать только
 * на одном (worker pod) через BOOKING_JOBS_ENABLED=false на остальных.
 */

const cron = require('node-cron');
const logger = require('../logger');
const { sequelize, Sequelize } = require('../db');
const { Op } = Sequelize;
const cache = require('../cache');
const { Booking } = require('../models');
const { notify } = require('../utils/notify');

const relatedProperties = {
  '1': ['1', '2', '4'],
  '2': ['1', '2', '4'],
  '3': ['3', '4'],
  '4': ['1', '2', '3', '4'],
};

const _tasks = [];
let _running = false;

async function expireOne(bookingId) {
  const txn = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });
  try {
    const booking = await Booking.findByPk(bookingId, {
      lock: txn.LOCK.UPDATE,
      transaction: txn,
    });
    if (!booking) {
      await txn.rollback();
      return { id: bookingId, ok: false, reason: 'not_found' };
    }
    // На случай, если статус сменился между SELECT и блокировкой
    if (booking.status !== 'pending_payment') {
      await txn.rollback();
      return { id: bookingId, ok: true, skipped: 'not_pending_payment', status: booking.status };
    }
    if (!booking.paymentDeadline || new Date() <= new Date(booking.paymentDeadline)) {
      await txn.rollback();
      return { id: bookingId, ok: true, skipped: 'not_expired' };
    }

    await booking.update({ status: 'expired' }, { transaction: txn });
    await txn.commit();

    const ids = relatedProperties[String(booking.propertyId)] || [String(booking.propertyId)];
    await Promise.all(ids.map((id) => cache.del(`booked-dates:${id}`)));

    try {
      notify({
        userId:  booking.userId,
        title:   'Бронирование отменено',
        message: `Бронирование #${booking.id} отменено: депозит не был оплачен в течение 12 часов.`,
        type:    'booking_expired',
        data:    { bookingId: booking.id },
      });
    } catch (notifyErr) {
      logger.error('booking expire notify error', { bookingId: booking.id, error: notifyErr.message });
    }

    return { id: bookingId, ok: true, expired: true };
  } catch (err) {
    try { await txn.rollback(); } catch (_) { /* noop */ }
    logger.error('booking expire txn error', { bookingId, error: err.message });
    return { id: bookingId, ok: false, error: err.message };
  }
}

async function expirePendingPayments() {
  const candidates = await Booking.findAll({
    where: {
      status: 'pending_payment',
      paymentDeadline: { [Op.lt]: new Date() },
    },
    attributes: ['id'],
    limit: 200,
  });
  const results = [];
  for (const b of candidates) {
    results.push(await expireOne(b.id));
  }
  return results;
}

async function runExpire() {
  if (_running) {
    logger.warn('Booking expire уже выполняется, пропускаю запуск');
    return { skipped: true };
  }
  _running = true;
  try {
    const results = await expirePendingPayments();
    const expired = results.filter((r) => r.expired).length;
    if (expired > 0) {
      logger.info('Booking expire: цикл завершён', { total: results.length, expired });
    }
    return { ok: true, total: results.length, expired, results };
  } catch (err) {
    logger.error('Booking expire: критическая ошибка', { error: err.message });
    return { ok: false, error: err.message };
  } finally {
    _running = false;
  }
}

function start() {
  if (process.env.BOOKING_JOBS_ENABLED === 'false') {
    logger.info('Booking-jobs отключены через BOOKING_JOBS_ENABLED=false');
    return;
  }
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const expression = process.env.BOOKING_EXPIRE_CRON || '*/1 * * * *';
  if (!cron.validate(expression)) {
    logger.error('Booking-jobs: некорректное cron-выражение', { expression });
    return;
  }

  _tasks.push(cron.schedule(expression, () => { runExpire(); }, { timezone: 'Europe/Moscow' }));
  logger.info('Booking-jobs запланированы', { expression, tz: 'Europe/Moscow' });
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
  runExpire,
  expirePendingPayments,
};
