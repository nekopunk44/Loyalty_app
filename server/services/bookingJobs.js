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
const {
  Booking, LoyaltyCard, Transaction, Property,
  User, AdminWallet, AdminTransaction, Event,
} = require('../models');
const { notify, notifyAllAdmins } = require('../utils/notify');
const { CASHBACK_RATES, BIRTHDAY_MULTIPLIER, DEFAULT_CASHBACK_RATE } = require('../config/loyalty');
const { computePromotionEffect } = require('./promotionEngine');

const isBirthday = (birthDate) => {
  if (!birthDate) return false;
  const today = new Date();
  const bd = new Date(birthDate);
  return bd.getMonth() === today.getMonth() && bd.getDate() === today.getDate();
};

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

/**
 * Парсит checkOutDate в Date, выставленную в 00:00:00 локальной даты выезда.
 * Используется settle-проходом: settle должен срабатывать с НАЧАЛА дня выезда,
 * а не в его последнюю секунду (как в parseCheckOut для no-show).
 */
function parseCheckOutStart(s) {
  if (!s || typeof s !== 'string' || !s.includes('.')) return null;
  const [d, m, y] = s.split('.').map((x) => parseInt(x, 10));
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d, 0, 0, 0);
}

/**
 * Settle одного бронирования: списать остаток (card) или просто закрыть (cash),
 * начислить кэшбэк, перевести в 'completed'.
 *
 * Логика взята из старого pay-remaining (см. routes/bookings.js до Sprint A.2):
 *   card → списать remainingAmount с карты, кэшбэк со ВСЕЙ суммы (deposit + remaining)
 *   cash → ничего не списывать, кэшбэк только с депозита
 */
async function settleOneRemaining(bookingId) {
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
    // Защита от гонок: статус мог измениться (cancel/expire), метод сбросили
    if (booking.status !== 'confirmed') {
      await txn.rollback();
      return { id: bookingId, ok: true, skipped: 'not_confirmed', status: booking.status };
    }
    if (!booking.remainingPaymentMethod) {
      await txn.rollback();
      return { id: bookingId, ok: true, skipped: 'no_method' };
    }
    if (booking.remainingPaidAt) {
      await txn.rollback();
      return { id: bookingId, ok: true, skipped: 'already_settled' };
    }
    const coStart = parseCheckOutStart(booking.checkOutDate);
    if (!coStart || new Date() < coStart) {
      await txn.rollback();
      return { id: bookingId, ok: true, skipped: 'not_yet_checkout' };
    }

    const method          = booking.remainingPaymentMethod;
    const depositAmount   = parseFloat(booking.depositAmount)   || 0;
    const remainingAmount = parseFloat(booking.remainingAmount) || 0;

    const loyaltyCard = await LoyaltyCard.findOne({
      where: { userId: booking.userId },
      lock: txn.LOCK.UPDATE,
      transaction: txn,
    });
    if (!loyaltyCard) {
      await txn.rollback();
      return { id: bookingId, ok: false, reason: 'card_not_found' };
    }

    const balanceBefore = parseFloat(loyaltyCard.balance);
    const lockedBalance = parseFloat(loyaltyCard.lockedBalance || 0);

    let balanceAfter = balanceBefore;
    if (method === 'card' && remainingAmount > 0) {
      const available = parseFloat((balanceBefore - lockedBalance).toFixed(2));
      if (available < remainingAmount) {
        // Денег нет — settle откладываем. Юзеру нотификация «пополните,
        // иначе бронь будет отменена». Бронь остаётся confirmed; настоящий
        // expire произойдёт через no-show pass, когда дата выезда пройдёт
        // и метод по-прежнему останется неоплаченным (см. expireNoShows).
        await txn.rollback();
        try {
          notify({
            userId:  booking.userId,
            title:   'Недостаточно PRB для оплаты остатка',
            message: `На карте лояльности не хватает ${(remainingAmount - available).toFixed(2)} PRB для списания остатка по бронированию #${booking.id}. Пополните карту, иначе бронирование будет отменено по политике.`,
            type:    'remaining_settle_insufficient',
            data:    { bookingId: booking.id, required: remainingAmount, available, deficit: parseFloat((remainingAmount - available).toFixed(2)) },
          });
        } catch (_) { /* noop */ }
        return { id: bookingId, ok: false, reason: 'insufficient_balance', required: remainingAmount, available };
      }
      balanceAfter = parseFloat((balanceBefore - remainingAmount).toFixed(2));
    }

    // ── Кэшбэк ──
    const user = await User.findOne({ where: { userId: booking.userId }, transaction: txn });
    const cashbackBase     = method === 'card' ? (depositAmount + remainingAmount) : depositAmount;
    const membershipLevel  = user?.membershipLevel || 'Bronze';
    const baseCashbackRate = CASHBACK_RATES[membershipLevel] ?? DEFAULT_CASHBACK_RATE;
    const birthdayToday    = isBirthday(user?.birthDate);
    const birthdayMult     = birthdayToday ? (BIRTHDAY_MULTIPLIER[membershipLevel] ?? 1) : 1;
    const rateWithBirthday = baseCashbackRate * birthdayMult;

    const activeEvents = await Event.findAll({ where: { status: 'active' }, transaction: txn });
    const promotion = computePromotionEffect({
      basePrice:    cashbackBase,
      cashbackRate: rateWithBirthday,
      events:       activeEvents,
      userId:       booking.userId,
    });
    const cashbackAmount = parseFloat((cashbackBase * promotion.finalRate).toFixed(2));

    const balanceAfterCashback = parseFloat((balanceAfter + cashbackAmount).toFixed(2));
    const totalSpentDelta      = method === 'card' ? remainingAmount : 0;
    await loyaltyCard.update({
      balance:     balanceAfterCashback,
      totalSpent:  parseFloat((parseFloat(loyaltyCard.totalSpent) + totalSpentDelta).toFixed(2)),
      totalEarned: parseFloat((parseFloat(loyaltyCard.totalEarned) + cashbackAmount).toFixed(2)),
    }, { transaction: txn });

    const paidAt = new Date();
    await booking.update({
      status:             'completed',
      remainingPaidAt:    paidAt,
      cashbackAmount,
      cashbackCreditedAt: paidAt,
    }, { transaction: txn });

    if (method === 'card' && remainingAmount > 0) {
      await Transaction.create({
        userId:        booking.userId,
        bookingId:     booking.id,
        type:          'debit',
        category:      'booking_remaining',
        amount:        remainingAmount,
        description:   `Оплата остатка бронирования #${booking.id}`,
        balanceBefore,
        balanceAfter,
        relatedType:   'booking',
        relatedId:     String(booking.id),
        metadata:      { source: 'booking_remaining', settledBy: 'cron' },
      }, { transaction: txn });
    }
    if (cashbackAmount > 0) {
      await Transaction.create({
        userId:        booking.userId,
        bookingId:     booking.id,
        type:          'credit',
        category:      'cashback',
        amount:        cashbackAmount,
        description:   `Кэшбэк ${Math.round(promotion.finalRate * 100)}% за бронирование #${booking.id} (${method === 'cash' ? 'только депозит' : 'полная оплата'})`,
        balanceBefore: balanceAfter,
        balanceAfter:  balanceAfterCashback,
        relatedType:   'booking',
        relatedId:     String(booking.id),
        metadata: {
          source:           'cashback',
          cashbackBase,
          method,
          membershipLevel,
          birthdayBonus:    birthdayToday,
          multiplier:       birthdayMult,
          promotionApplied: promotion.appliedEvents,
          boostPercentPoints: promotion.boostPercentPoints,
          settledBy:        'cron',
        },
      }, { transaction: txn });
    }

    // AdminWallet: +remaining (для card), -cashback
    const financeAdmin = await User.findOne({ where: { role: 'admin', adminLevel: 1 }, transaction: txn });
    if (financeAdmin) {
      const adminWallet = await AdminWallet.findOne({
        where: { adminId: financeAdmin.userId },
        lock: txn.LOCK.UPDATE,
        transaction: txn,
      });
      if (adminWallet) {
        let aBalance = parseFloat(adminWallet.totalBalance);
        let aAvail   = parseFloat(adminWallet.availableBalance);
        let aRecv    = parseFloat(adminWallet.totalReceived);

        if (method === 'card' && remainingAmount > 0) {
          const before = aBalance;
          aBalance += remainingAmount;
          aAvail   += remainingAmount;
          aRecv    += remainingAmount;
          await AdminTransaction.create({
            adminId:       financeAdmin.userId,
            adminLevel:    1,
            type:          'booking_remaining',
            amount:        remainingAmount,
            bookingId:     booking.id,
            description:   `Остаток за бронирование #${booking.id} (списан в день выезда)`,
            balanceBefore: before,
            balanceAfter:  aBalance,
          }, { transaction: txn });
        }
        if (cashbackAmount > 0) {
          const before = aBalance;
          aBalance -= cashbackAmount;
          aAvail   -= cashbackAmount;
          aRecv    -= cashbackAmount;
          await AdminTransaction.create({
            adminId:       financeAdmin.userId,
            adminLevel:    1,
            type:          'cashback_payout',
            amount:        cashbackAmount,
            bookingId:     booking.id,
            description:   `Начисление кэшбэка за бронирование #${booking.id}`,
            balanceBefore: before,
            balanceAfter:  aBalance,
          }, { transaction: txn });
        }

        await adminWallet.update({
          totalBalance:     parseFloat(aBalance.toFixed(2)),
          availableBalance: parseFloat(aAvail.toFixed(2)),
          totalReceived:    parseFloat(aRecv.toFixed(2)),
        }, { transaction: txn });
      }
    }

    await txn.commit();

    const ids = relatedProperties[String(booking.propertyId)] || [String(booking.propertyId)];
    await Promise.all(ids.map((id) => cache.del(`booked-dates:${id}`)));

    try {
      const property = await Property.findByPk(booking.propertyId);
      notify({
        userId:  booking.userId,
        title:   method === 'card' ? 'Остаток списан с карты' : 'Бронирование завершено',
        message: method === 'card'
          ? `Остаток ${remainingAmount} PRB по бронированию #${booking.id} списан с карты лояльности. Начислен кэшбэк ${cashbackAmount} PRB.`
          : `Бронирование #${booking.id} завершено. Кэшбэк ${cashbackAmount} PRB с депозита начислен.`,
        type:    'booking_settled',
        data:    { bookingId: booking.id, method, remainingAmount, cashbackAmount },
      });
      notifyAllAdmins({
        title:   method === 'card' ? 'Остаток списан картой' : 'Принять наличные за бронирование',
        message: method === 'card'
          ? `С карты ${user?.name || 'пользователя'} списан остаток ${remainingAmount} PRB по бронированию #${booking.id} (${property?.name || ''}). Бронь закрыта.`
          : `Бронирование #${booking.id} (${property?.name || ''}, ${user?.name || 'пользователь'}) завершено. Получить с гостя ${remainingAmount} PRB наличными.`,
        type:    'booking_settled',
        data:    { bookingId: booking.id, userId: booking.userId, method, remainingAmount, cashbackAmount },
      });
    } catch (notifyErr) {
      logger.error('settle notify error', { bookingId: booking.id, error: notifyErr.message });
    }

    logger.info('Booking settled', { bookingId: booking.id, method, remainingAmount, cashbackAmount });
    return { id: bookingId, ok: true, settled: true, method, remainingAmount, cashbackAmount };
  } catch (err) {
    try { await txn.rollback(); } catch (_) { /* noop */ }
    logger.error('booking settle txn error', { bookingId, error: err.message, stack: err.stack });
    return { id: bookingId, ok: false, error: err.message };
  }
}

async function settleRemainingPayments() {
  const candidates = await Booking.findAll({
    where: {
      status: 'confirmed',
      remainingPaymentMethod: { [Op.ne]: null },
      remainingPaidAt: null,
    },
    attributes: ['id', 'checkOutDate'],
    limit: 500,
  });
  const now = new Date();
  const due = candidates.filter((b) => {
    const co = parseCheckOutStart(b.checkOutDate);
    return co && co <= now;
  });
  const results = [];
  for (const b of due) {
    results.push(await settleOneRemaining(b.id));
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
    // Порядок: сначала settle (закрывает confirmed-брони, у которых юзер
    // выбрал метод и пришёл день выезда), потом expire (depo-дедлайн,
    // no-show). Так settle успевает перевести в 'completed' до того, как
    // no-show пас попробует expired-ить тот же id.
    const settled = await settleRemainingPayments();
    const deposit = await expirePendingPayments();
    const noShow  = await expireNoShows();
    const all = [...settled, ...deposit, ...noShow];
    const expired      = [...deposit, ...noShow].filter((r) => r.expired).length;
    const settledCount = settled.filter((r) => r.settled).length;
    if (expired > 0 || settledCount > 0) {
      logger.info('Booking expire: цикл завершён', {
        total: all.length,
        settled: settledCount,
        expiredDeposit: deposit.filter((r) => r.expired).length,
        expiredNoShow:  noShow.filter((r) => r.expired).length,
      });
    }
    return { ok: true, total: all.length, expired, settled: settledCount, results: all };
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
  settleRemainingPayments,
  settleOneRemaining,
};
