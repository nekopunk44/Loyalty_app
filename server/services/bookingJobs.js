/**
 * Cron-задача: авто-просрочка бронирований.
 *
 * Два прохода в одном тике:
 *  1) Депозит не оплачен в срок (Sprint A ВКР, §3.1):
 *     pending_payment с истёкшим paymentDeadline → expired.
 *  2) No-show (заезд не состоялся):
 *     checkOutDate < сегодня и статус ∈ {pending, pending_payment,
 *     confirmed-с-неоплаченным-остатком} → expired.
 *     Депозит удерживается в пользу отеля как продолжение политики
 *     ≥3 дней до заезда для возврата.
 *
 * Оба прохода освобождают слот (booked-dates cache) и нотифицируют юзера.
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

/**
 * Парсит checkOutDate ('DD.MM.YYYY') в локальный Date. Возвращает null для пустой
 * или некорректной строки.
 */
function parseCheckOut(s) {
  if (!s || typeof s !== 'string' || !s.includes('.')) return null;
  const [d, m, y] = s.split('.').map((x) => parseInt(x, 10));
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d, 23, 59, 59);
}

async function expireOneNoShow(bookingId) {
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
    const stillStuck =
      booking.status === 'pending' ||
      booking.status === 'pending_payment' ||
      (booking.status === 'confirmed' && parseFloat(booking.remainingAmount || 0) > 0);
    if (!stillStuck) {
      await txn.rollback();
      return { id: bookingId, ok: true, skipped: 'status_changed', status: booking.status };
    }
    const co = parseCheckOut(booking.checkOutDate);
    if (!co || new Date() <= co) {
      await txn.rollback();
      return { id: bookingId, ok: true, skipped: 'not_past_checkout' };
    }

    const prevStatus = booking.status;
    await booking.update({ status: 'expired' }, { transaction: txn });
    await txn.commit();

    const ids = relatedProperties[String(booking.propertyId)] || [String(booking.propertyId)];
    await Promise.all(ids.map((id) => cache.del(`booked-dates:${id}`)));

    const depositPaid = !!booking.depositPaidAt;
    const msg = depositPaid
      ? `Бронирование #${booking.id} закрыто: заезд не состоялся. Депозит ${parseFloat(booking.depositAmount || 0)} PRB удержан согласно политике отмены.`
      : `Бронирование #${booking.id} закрыто: даты заезда прошли, оплата не поступила.`;

    try {
      notify({
        userId:  booking.userId,
        title:   'Бронирование закрыто',
        message: msg,
        type:    'booking_no_show',
        data:    {
          bookingId:   booking.id,
          prevStatus,
          depositHeld: depositPaid ? parseFloat(booking.depositAmount || 0) : 0,
        },
      });
    } catch (notifyErr) {
      logger.error('booking no-show notify error', { bookingId: booking.id, error: notifyErr.message });
    }

    logger.info('Booking no-show expired', {
      bookingId:   booking.id,
      prevStatus,
      depositHeld: depositPaid ? parseFloat(booking.depositAmount || 0) : 0,
    });

    return { id: bookingId, ok: true, expired: true, reason: 'no_show', prevStatus };
  } catch (err) {
    try { await txn.rollback(); } catch (_) { /* noop */ }
    logger.error('booking no-show txn error', { bookingId, error: err.message });
    return { id: bookingId, ok: false, error: err.message };
  }
}

async function expireNoShows() {
  const now = new Date();
  const candidates = await Booking.findAll({
    where: {
      status: { [Op.in]: ['pending', 'pending_payment', 'confirmed'] },
    },
    attributes: ['id', 'checkOutDate', 'status', 'remainingAmount'],
    limit: 500,
  });
  const stale = candidates.filter((b) => {
    if (b.status === 'confirmed' && !(parseFloat(b.remainingAmount || 0) > 0)) return false;
    const co = parseCheckOut(b.checkOutDate);
    return co && co < now;
  });
  const results = [];
  for (const b of stale) {
    results.push(await expireOneNoShow(b.id));
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
    const deposit = await expirePendingPayments();
    const noShow  = await expireNoShows();
    const all = [...deposit, ...noShow];
    const expired = all.filter((r) => r.expired).length;
    if (expired > 0) {
      logger.info('Booking expire: цикл завершён', {
        total: all.length,
        expiredDeposit: deposit.filter((r) => r.expired).length,
        expiredNoShow:  noShow.filter((r) => r.expired).length,
      });
    }
    return { ok: true, total: all.length, expired, results: all };
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
  expireNoShows,
};
