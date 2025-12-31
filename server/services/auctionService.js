/**
 * AuctionService — атомарные операции с аукционами Stage 2 ВКР.
 *
 * Семантика soft-lock (см. §3.1 ВКР):
 *   placeBid:
 *     1. SERIALIZABLE-txn + SELECT FOR UPDATE на Event и LoyaltyCard.
 *     2. Валидация: тип='auction', статус='active', сейчас ∈ [start,end],
 *        amount >= startBid (если ставок нет) или amount >= currentBid + minBidIncrement,
 *        userMeetsLevelRequirement(user, allowedUsers).
 *     3. Освобождаем предыдущую active-ставку этого юзера (если есть) — она будет outbid.
 *     4. Проверяем (balance - lockedBalance) >= amount. Если не хватает — fail.
 *     5. Создаём новый AuctionBid (status='active'), +amount к lockedBalance.
 *     6. Старого лидера (если есть и это не сам юзер) — освобождаем: его active-bid
 *        переводим в outbid, его lockedBalance уменьшается на сумму его ставки.
 *     7. Денормализуем currentBid/currentBidUserId на Event.
 *
 *   closeAuction:
 *     1. SERIALIZABLE-txn + SELECT FOR UPDATE на Event.
 *     2. Найти все active-bids этого аукциона.
 *     3. Победитель — самая высокая (или Event.currentBidUserId).
 *     4. У победителя: balance -= amount, lockedBalance -= amount, bid.status='won'.
 *        Запись в Transaction (debit) с metadata.source='auction_win'.
 *     5. У проигравших: lockedBalance -= amount, bid.status='returned'.
 *     6. Event.winnerUserId, closedAt, status='ended'.
 *
 * Все денежные операции через .update() c явным newValue — никаких .increment(),
 * чтобы видеть итоговое значение в логах и не зависеть от внутреннего SQL Sequelize.
 */

const { Sequelize } = require('sequelize');
const { sequelize } = require('../db');
const { Event, LoyaltyCard, AuctionBid, Transaction, User } = require('../models');
const { userMeetsLevelRequirement } = require('../utils/membershipLevels');
const logger = require('../logger');

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

class BidError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;     // машинно-читаемый
    this.extra = extra;
  }
}

/**
 * Поставить ставку. Атомарная операция.
 *
 * @param {object} params
 * @param {number} params.eventId
 * @param {string} params.userId
 * @param {number} params.amount
 * @returns {Promise<{bid: object, event: object, lockedBalance: number}>}
 * @throws  BidError (.code: 'event_not_found'|'not_auction'|'closed'|'not_started'|
 *                    'expired'|'level_required'|'below_start_bid'|'below_increment'|
 *                    'self_outbid'|'insufficient_available'|'card_not_found')
 */
async function placeBid({ eventId, userId, amount }) {
  const bidAmount = num(amount);
  if (bidAmount <= 0) throw new BidError('invalid_amount', 'Сумма ставки должна быть > 0');

  const txn = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });

  try {
    const event = await Event.findByPk(eventId, { lock: txn.LOCK.UPDATE, transaction: txn });
    if (!event) throw new BidError('event_not_found', 'Аукцион не найден');
    if (event.eventType !== 'auction') throw new BidError('not_auction', 'Это не аукцион');
    if (event.status !== 'active') throw new BidError('closed', 'Аукцион не активен');
    if (event.winnerUserId || event.closedAt) throw new BidError('closed', 'Аукцион уже завершён');

    const now = new Date();
    if (event.startDate && now < new Date(event.startDate)) {
      throw new BidError('not_started', 'Аукцион ещё не начался');
    }
    if (event.endDate && now > new Date(event.endDate)) {
      throw new BidError('expired', 'Аукцион уже закрыт по времени');
    }

    // Проверка уровня доступа (Silver+ семантика)
    const user = await User.findOne({ where: { userId }, transaction: txn });
    if (event.allowedUsers && event.allowedUsers !== 'all') {
      const userLevel = user?.membershipLevel || 'Bronze';
      if (!userMeetsLevelRequirement(userLevel, event.allowedUsers)) {
        throw new BidError('level_required', `Доступно с уровня ${event.allowedUsers} и выше`, {
          userLevel,
          required: event.allowedUsers,
        });
      }
    }

    // Шаг ставки
    const currentBid = event.currentBid != null ? num(event.currentBid) : null;
    const startBid   = event.startBid   != null ? num(event.startBid)   : 0;
    const increment  = num(event.minBidIncrement) || 100;

    if (currentBid == null) {
      if (bidAmount < startBid) {
        throw new BidError('below_start_bid', `Первая ставка должна быть не меньше ${startBid} PRB`, {
          startBid,
        });
      }
    } else {
      const minNext = currentBid + increment;
      if (bidAmount < minNext) {
        throw new BidError('below_increment', `Ставка должна быть не меньше ${minNext} PRB`, {
          currentBid, increment, minNext,
        });
      }
      if (event.currentBidUserId === userId) {
        // Защита от случайного самоперебития своей же ставки выше минимально нужного.
        // Разрешаем — но это лишнее замораживание. Лучше отказать.
        throw new BidError('self_outbid', 'Вы уже лидируете в этом аукционе');
      }
    }

    // Lock карты ставящего
    const loyaltyCard = await LoyaltyCard.findOne({
      where: { userId },
      lock: txn.LOCK.UPDATE,
      transaction: txn,
    });
    if (!loyaltyCard) throw new BidError('card_not_found', 'Карта лояльности не найдена');

    const balance       = num(loyaltyCard.balance);
    const locked        = num(loyaltyCard.lockedBalance);
    const available     = parseFloat((balance - locked).toFixed(2));

    // Сначала освобождаем СВОЮ предыдущую active-ставку на этом аукционе (если была),
    // чтобы её сумма не учитывалась в locked при проверке available. На практике сюда
    // не дойдёт из-за self_outbid выше, но оставляем код безопасным.
    const myActive = await AuctionBid.findOne({
      where: { eventId, userId, status: 'active' },
      lock: txn.LOCK.UPDATE,
      transaction: txn,
    });
    let releasedSelf = 0;
    if (myActive) {
      releasedSelf = num(myActive.amount);
      await myActive.update({ status: 'outbid', resolvedAt: now }, { transaction: txn });
    }

    const availableAfterRelease = parseFloat((available + releasedSelf).toFixed(2));
    if (availableAfterRelease < bidAmount) {
      throw new BidError('insufficient_available', 'Недостаточно доступных PRB на карте', {
        available: availableAfterRelease,
        required:  bidAmount,
      });
    }

    // Освобождаем lockedBalance прежнего лидера (если есть и это другой юзер)
    let prevLeaderCard = null;
    let prevLeaderBid  = null;
    if (event.currentBidUserId && event.currentBidUserId !== userId) {
      prevLeaderCard = await LoyaltyCard.findOne({
        where: { userId: event.currentBidUserId },
        lock: txn.LOCK.UPDATE,
        transaction: txn,
      });
      prevLeaderBid = await AuctionBid.findOne({
        where: { eventId, userId: event.currentBidUserId, status: 'active' },
        lock: txn.LOCK.UPDATE,
        transaction: txn,
      });

      if (prevLeaderCard && prevLeaderBid) {
        const newLocked = parseFloat((num(prevLeaderCard.lockedBalance) - num(prevLeaderBid.amount)).toFixed(2));
        await prevLeaderCard.update({ lockedBalance: Math.max(0, newLocked) }, { transaction: txn });
        await prevLeaderBid.update({ status: 'outbid', resolvedAt: now }, { transaction: txn });
      }
    }

    // Лочим сумму у нового лидера
    const myNewLocked = parseFloat((locked - releasedSelf + bidAmount).toFixed(2));
    await loyaltyCard.update({ lockedBalance: myNewLocked }, { transaction: txn });

    // Создаём новую active-ставку
    const newBid = await AuctionBid.create({
      eventId,
      userId,
      amount: bidAmount,
      status: 'active',
    }, { transaction: txn });

    // Денормализация на Event
    await event.update({
      currentBid:       bidAmount,
      currentBidUserId: userId,
    }, { transaction: txn });

    await txn.commit();

    logger.info('Auction bid placed', {
      eventId, userId, amount: bidAmount,
      prevLeader: event.currentBidUserId,
      myNewLocked,
    });

    return {
      bid:           newBid.toJSON(),
      event:         event.toJSON(),
      lockedBalance: myNewLocked,
    };
  } catch (err) {
    await txn.rollback();
    throw err;
  }
}

/**
 * Закрыть аукцион. Может вызываться cron'ом (по endDate) или админом вручную.
 * Идемпотентна: если уже закрыт — no-op, возвращает текущее состояние.
 *
 * @param {number} eventId
 * @returns {Promise<{event: object, winnerUserId: string|null, winningAmount: number|null}>}
 */
async function closeAuction(eventId) {
  const txn = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });

  try {
    const event = await Event.findByPk(eventId, { lock: txn.LOCK.UPDATE, transaction: txn });
    if (!event) throw new BidError('event_not_found', 'Аукцион не найден');
    if (event.eventType !== 'auction') throw new BidError('not_auction', 'Это не аукцион');

    // Идемпотентность
    if (event.closedAt) {
      await txn.commit();
      return {
        event:        event.toJSON(),
        winnerUserId: event.winnerUserId,
        winningAmount: event.currentBid != null ? num(event.currentBid) : null,
        alreadyClosed: true,
      };
    }

    const activeBids = await AuctionBid.findAll({
      where: { eventId, status: 'active' },
      transaction: txn,
      lock: txn.LOCK.UPDATE,
    });

    const now = new Date();

    if (activeBids.length === 0) {
      // Аукцион закончился без ставок
      await event.update({
        closedAt: now,
        status:   'ended',
      }, { transaction: txn });
      await txn.commit();
      logger.info('Auction closed with no bids', { eventId });
      return { event: event.toJSON(), winnerUserId: null, winningAmount: null };
    }

    // Победитель — единственная active-ставка с максимальной суммой. На уровне
    // placeBid в active одновременно может быть только одна ставка на юзера,
    // но на разных юзерах есть ровно одна active (текущий лидер), потому что
    // прошлых лидеров placeBid переводит в outbid. Всё же подстрахуемся sort.
    const sorted = [...activeBids].sort((a, b) => num(b.amount) - num(a.amount));
    const winningBid = sorted[0];
    const winnerUserId = winningBid.userId;
    const winningAmount = num(winningBid.amount);

    // Списываем у победителя
    const winnerCard = await LoyaltyCard.findOne({
      where: { userId: winnerUserId },
      lock: txn.LOCK.UPDATE,
      transaction: txn,
    });
    if (!winnerCard) {
      throw new BidError('winner_card_missing', 'Карта победителя не найдена — аномалия данных', { winnerUserId });
    }

    const winBalanceBefore  = num(winnerCard.balance);
    const winLockedBefore   = num(winnerCard.lockedBalance);
    const winBalanceAfter   = parseFloat((winBalanceBefore - winningAmount).toFixed(2));
    const winLockedAfter    = parseFloat(Math.max(0, winLockedBefore - winningAmount).toFixed(2));

    await winnerCard.update({
      balance:       winBalanceAfter,
      lockedBalance: winLockedAfter,
      totalSpent:    parseFloat((num(winnerCard.totalSpent) + winningAmount).toFixed(2)),
    }, { transaction: txn });

    await Transaction.create({
      userId:        winnerUserId,
      type:          'debit',
      category:      'bid_lock',
      amount:        winningAmount,
      description:   `Победа в аукционе: ${event.title}`,
      balanceBefore: winBalanceBefore,
      balanceAfter:  winBalanceAfter,
      relatedType:   'auction',
      relatedId:     String(event.id),
      metadata: {
        source:  'auction_win',
        eventId: event.id,
        bidId:   winningBid.id,
      },
    }, { transaction: txn });

    await winningBid.update({ status: 'won', resolvedAt: now }, { transaction: txn });

    // Возвращаем locked у остальных active (теоретически их быть не должно,
    // но защитный код).
    for (const otherBid of sorted.slice(1)) {
      const otherCard = await LoyaltyCard.findOne({
        where: { userId: otherBid.userId },
        lock: txn.LOCK.UPDATE,
        transaction: txn,
      });
      if (otherCard) {
        const otherLocked = parseFloat(Math.max(0, num(otherCard.lockedBalance) - num(otherBid.amount)).toFixed(2));
        await otherCard.update({ lockedBalance: otherLocked }, { transaction: txn });
      }
      await otherBid.update({ status: 'returned', resolvedAt: now }, { transaction: txn });
    }

    await event.update({
      winnerUserId,
      closedAt: now,
      status:   'ended',
    }, { transaction: txn });

    await txn.commit();
    logger.info('Auction closed', {
      eventId, winnerUserId, winningAmount, otherActiveCount: sorted.length - 1,
    });

    return {
      event: event.toJSON(),
      winnerUserId,
      winningAmount,
      alreadyClosed: false,
    };
  } catch (err) {
    await txn.rollback();
    throw err;
  }
}

/**
 * Найти и закрыть все аукционы, у которых endDate < now() и они ещё не закрыты.
 * Используется cron-задачей. Возвращает массив результатов closeAuction.
 */
async function closeExpiredAuctions() {
  const now = new Date();
  const expired = await Event.findAll({
    where: {
      eventType: 'auction',
      closedAt: null,
      endDate:  { [Sequelize.Op.lt]: now },
    },
  });

  const results = [];
  for (const e of expired) {
    try {
      const result = await closeAuction(e.id);
      results.push({ eventId: e.id, ok: true, ...result });
    } catch (err) {
      logger.error('closeExpiredAuctions: failed to close', { eventId: e.id, error: err.message });
      results.push({ eventId: e.id, ok: false, error: err.message });
    }
  }
  return results;
}

module.exports = {
  placeBid,
  closeAuction,
  closeExpiredAuctions,
  BidError,
};
