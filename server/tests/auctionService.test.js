/**
 * Unit-тесты auctionService (Stage 2 ВКР).
 *
 * Гарантируют инварианты soft-lock:
 *   1) placeBid атомарна (SERIALIZABLE-txn), при любой ошибке — rollback.
 *   2) Денормализация Event.currentBid/currentBidUserId согласована с AuctionBid.
 *   3) При outbid: lockedBalance прежнего лидера уменьшается ровно на сумму его ставки.
 *   4) closeAuction идемпотентна; победителю balance уменьшается, lockedBalance — тоже.
 *   5) В Transaction для победителя metadata.source='auction_win'.
 *
 * Если эти инварианты сломают — §3.1 ВКР перестанет описывать рабочую систему,
 * а LoyaltyCard.lockedBalance начнёт расходиться с суммой active-ставок.
 */

process.env.NODE_ENV = 'test';

// ─── Моки ────────────────────────────────────────────────────────────────────

jest.mock('../models', () => ({
  Event:       { findByPk: jest.fn(), findAll: jest.fn() },
  LoyaltyCard: { findOne: jest.fn() },
  AuctionBid:  { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() },
  Transaction: { create: jest.fn() },
  User:        { findOne: jest.fn() },
}));

const makeTxn = () => ({
  LOCK:     { UPDATE: 'UPDATE' },
  commit:   jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
});

jest.mock('../db', () => ({
  sequelize: { transaction: jest.fn() },
  Sequelize: {
    Transaction: { ISOLATION_LEVELS: { SERIALIZABLE: 'SERIALIZABLE' } },
    Op:          { lt: 'lt' },
  },
}));

jest.mock('../logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

const { Event, LoyaltyCard, AuctionBid, Transaction, User } = require('../models');
const { sequelize } = require('../db');
const {
  placeBid, closeAuction, closeExpiredAuctions, BidError,
} = require('../services/auctionService');

// ─── Фабрики моков с .update / .toJSON ───────────────────────────────────────

const makeEvent = (overrides = {}) => {
  const state = {
    id:                1,
    title:             'Аукцион Villa Jaconda',
    eventType:         'auction',
    status:            'active',
    startDate:         new Date('2026-01-01'),
    endDate:           new Date('2099-01-01'),
    allowedUsers:      'all',
    startBid:          500,
    minBidIncrement:   100,
    currentBid:        null,
    currentBidUserId:  null,
    winnerUserId:      null,
    closedAt:          null,
    ...overrides,
  };
  state.update = jest.fn(async (patch) => Object.assign(state, patch));
  state.toJSON = () => ({ ...state });
  return state;
};

const makeCard = (overrides = {}) => {
  const state = {
    userId:        'u-1',
    balance:       '1000.00',
    lockedBalance: '0.00',
    totalSpent:    '0.00',
    ...overrides,
  };
  state.update = jest.fn(async (patch) => Object.assign(state, patch));
  return state;
};

const makeBid = (overrides = {}) => {
  const state = {
    id:         1,
    eventId:    1,
    userId:     'u-1',
    amount:     '500.00',
    status:     'active',
    resolvedAt: null,
    ...overrides,
  };
  state.update = jest.fn(async (patch) => Object.assign(state, patch));
  state.toJSON = () => ({ ...state });
  return state;
};

// ─── placeBid ────────────────────────────────────────────────────────────────

describe('placeBid: валидация и ранние ошибки', () => {
  let txn;
  beforeEach(() => {
    jest.clearAllMocks();
    txn = makeTxn();
    sequelize.transaction.mockResolvedValue(txn);
  });

  test('amount <= 0 → invalid_amount (до открытия транзакции)', async () => {
    await expect(placeBid({ eventId: 1, userId: 'u-1', amount: 0 }))
      .rejects.toMatchObject({ code: 'invalid_amount' });
    // Транзакция вообще не открывается — это валидация на входе.
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  test('event не найден → event_not_found', async () => {
    Event.findByPk.mockResolvedValue(null);
    await expect(placeBid({ eventId: 999, userId: 'u-1', amount: 600 }))
      .rejects.toMatchObject({ code: 'event_not_found' });
    expect(txn.rollback).toHaveBeenCalled();
  });

  test('event.eventType !== auction → not_auction', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ eventType: 'cashback' }));
    await expect(placeBid({ eventId: 1, userId: 'u-1', amount: 600 }))
      .rejects.toMatchObject({ code: 'not_auction' });
  });

  test('event.status !== active → closed', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ status: 'draft' }));
    await expect(placeBid({ eventId: 1, userId: 'u-1', amount: 600 }))
      .rejects.toMatchObject({ code: 'closed' });
  });

  test('event.closedAt установлен → closed', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ closedAt: new Date('2025-01-01') }));
    await expect(placeBid({ eventId: 1, userId: 'u-1', amount: 600 }))
      .rejects.toMatchObject({ code: 'closed' });
  });

  test('now < startDate → not_started', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ startDate: new Date('2099-01-01') }));
    await expect(placeBid({ eventId: 1, userId: 'u-1', amount: 600 }))
      .rejects.toMatchObject({ code: 'not_started' });
  });

  test('now > endDate → expired', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({
      startDate: new Date('2020-01-01'),
      endDate:   new Date('2020-12-31'),
    }));
    await expect(placeBid({ eventId: 1, userId: 'u-1', amount: 600 }))
      .rejects.toMatchObject({ code: 'expired' });
  });

  test('уровень ниже требуемого → level_required + extras', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ allowedUsers: 'gold' }));
    User.findOne.mockResolvedValue({ userId: 'u-1', membershipLevel: 'Silver' });
    try {
      await placeBid({ eventId: 1, userId: 'u-1', amount: 600 });
      throw new Error('должно было упасть');
    } catch (err) {
      expect(err).toBeInstanceOf(BidError);
      expect(err.code).toBe('level_required');
      expect(err.extra).toEqual({ userLevel: 'Silver', required: 'gold' });
    }
  });

  test('первая ставка < startBid → below_start_bid', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ startBid: 1000 }));
    User.findOne.mockResolvedValue({ userId: 'u-1', membershipLevel: 'Bronze' });
    await expect(placeBid({ eventId: 1, userId: 'u-1', amount: 500 }))
      .rejects.toMatchObject({ code: 'below_start_bid', extra: { startBid: 1000 } });
  });

  test('последующая ставка < currentBid + increment → below_increment', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({
      currentBid:       500,
      currentBidUserId: 'u-other',
      minBidIncrement:  100,
    }));
    User.findOne.mockResolvedValue({ userId: 'u-1', membershipLevel: 'Bronze' });
    await expect(placeBid({ eventId: 1, userId: 'u-1', amount: 550 }))
      .rejects.toMatchObject({
        code: 'below_increment',
        extra: { currentBid: 500, increment: 100, minNext: 600 },
      });
  });

  test('текущий лидер пытается перебить себя → self_outbid', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({
      currentBid:       500,
      currentBidUserId: 'u-1',
    }));
    User.findOne.mockResolvedValue({ userId: 'u-1', membershipLevel: 'Bronze' });
    await expect(placeBid({ eventId: 1, userId: 'u-1', amount: 700 }))
      .rejects.toMatchObject({ code: 'self_outbid' });
  });

  test('карта не найдена → card_not_found', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ startBid: 500 }));
    User.findOne.mockResolvedValue({ userId: 'u-1', membershipLevel: 'Bronze' });
    LoyaltyCard.findOne.mockResolvedValue(null);
    await expect(placeBid({ eventId: 1, userId: 'u-1', amount: 600 }))
      .rejects.toMatchObject({ code: 'card_not_found' });
  });

  test('available < amount → insufficient_available + extras', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ startBid: 500 }));
    User.findOne.mockResolvedValue({ userId: 'u-1', membershipLevel: 'Bronze' });
    LoyaltyCard.findOne.mockResolvedValue(makeCard({ balance: '500', lockedBalance: '200' }));
    AuctionBid.findOne.mockResolvedValue(null);
    await expect(placeBid({ eventId: 1, userId: 'u-1', amount: 600 }))
      .rejects.toMatchObject({
        code: 'insufficient_available',
        extra: { available: 300, required: 600 },
      });
  });
});

describe('placeBid: счастливый путь', () => {
  let txn;
  beforeEach(() => {
    jest.clearAllMocks();
    txn = makeTxn();
    sequelize.transaction.mockResolvedValue(txn);
  });

  test('первая ставка: lockedBalance растёт, Event.currentBid денормализуется', async () => {
    const event = makeEvent({ startBid: 500 });
    const card  = makeCard({ balance: '1000', lockedBalance: '0' });
    const bid   = makeBid({ amount: 600 });

    Event.findByPk.mockResolvedValue(event);
    User.findOne.mockResolvedValue({ userId: 'u-1', membershipLevel: 'Bronze' });
    LoyaltyCard.findOne.mockResolvedValue(card);
    AuctionBid.findOne.mockResolvedValue(null);
    AuctionBid.create.mockResolvedValue(bid);

    const result = await placeBid({ eventId: 1, userId: 'u-1', amount: 600 });

    expect(txn.commit).toHaveBeenCalled();
    expect(txn.rollback).not.toHaveBeenCalled();
    expect(card.update).toHaveBeenCalledWith({ lockedBalance: 600 }, { transaction: txn });
    expect(AuctionBid.create).toHaveBeenCalledWith(
      { eventId: 1, userId: 'u-1', amount: 600, status: 'active' },
      { transaction: txn },
    );
    expect(event.update).toHaveBeenCalledWith(
      { currentBid: 600, currentBidUserId: 'u-1' },
      { transaction: txn },
    );
    expect(result.lockedBalance).toBe(600);
  });

  test('outbid: прежнему лидеру освобождается lock, его bid → outbid', async () => {
    const event = makeEvent({
      currentBid:       500,
      currentBidUserId: 'u-prev',
      minBidIncrement:  100,
    });
    const myCard       = makeCard({ userId: 'u-1', balance: '1000', lockedBalance: '0' });
    const prevCard     = makeCard({ userId: 'u-prev', balance: '2000', lockedBalance: '500' });
    const prevBid      = makeBid({ userId: 'u-prev', amount: '500' });
    const newBid       = makeBid({ userId: 'u-1', amount: 700 });

    Event.findByPk.mockResolvedValue(event);
    User.findOne.mockResolvedValue({ userId: 'u-1', membershipLevel: 'Bronze' });
    // 1) LoyaltyCard.findOne для u-1 (текущий ставящий)
    // 2) LoyaltyCard.findOne для u-prev (прежний лидер)
    LoyaltyCard.findOne
      .mockResolvedValueOnce(myCard)
      .mockResolvedValueOnce(prevCard);
    // AuctionBid.findOne: первый вызов — моя предыдущая active (нет), второй — active прежнего лидера
    AuctionBid.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(prevBid);
    AuctionBid.create.mockResolvedValue(newBid);

    const result = await placeBid({ eventId: 1, userId: 'u-1', amount: 700 });

    // прежний лидер: lockedBalance 500 → 0, bid → outbid
    expect(prevCard.update).toHaveBeenCalledWith({ lockedBalance: 0 }, { transaction: txn });
    expect(prevBid.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'outbid' }),
      { transaction: txn },
    );
    // мой lock = 700
    expect(myCard.update).toHaveBeenCalledWith({ lockedBalance: 700 }, { transaction: txn });
    expect(event.update).toHaveBeenCalledWith(
      { currentBid: 700, currentBidUserId: 'u-1' },
      { transaction: txn },
    );
    expect(result.lockedBalance).toBe(700);
    expect(txn.commit).toHaveBeenCalled();
  });

  test('Bronze юзер на all-аукционе проходит проверку уровня', async () => {
    const event = makeEvent({ startBid: 500, allowedUsers: 'all' });
    const card  = makeCard({ balance: '1000', lockedBalance: '0' });
    Event.findByPk.mockResolvedValue(event);
    User.findOne.mockResolvedValue({ userId: 'u-1', membershipLevel: 'Bronze' });
    LoyaltyCard.findOne.mockResolvedValue(card);
    AuctionBid.findOne.mockResolvedValue(null);
    AuctionBid.create.mockResolvedValue(makeBid({ amount: 500 }));

    await expect(placeBid({ eventId: 1, userId: 'u-1', amount: 500 })).resolves.toBeDefined();
  });

  test('Gold юзер на silver-аукционе проходит (Silver И ВЫШЕ)', async () => {
    const event = makeEvent({ startBid: 500, allowedUsers: 'silver' });
    const card  = makeCard({ balance: '1000', lockedBalance: '0' });
    Event.findByPk.mockResolvedValue(event);
    User.findOne.mockResolvedValue({ userId: 'u-1', membershipLevel: 'Gold' });
    LoyaltyCard.findOne.mockResolvedValue(card);
    AuctionBid.findOne.mockResolvedValue(null);
    AuctionBid.create.mockResolvedValue(makeBid({ amount: 500 }));

    await expect(placeBid({ eventId: 1, userId: 'u-1', amount: 500 })).resolves.toBeDefined();
  });
});

// ─── closeAuction ────────────────────────────────────────────────────────────

describe('closeAuction', () => {
  let txn;
  beforeEach(() => {
    jest.clearAllMocks();
    txn = makeTxn();
    sequelize.transaction.mockResolvedValue(txn);
  });

  test('event не найден → event_not_found', async () => {
    Event.findByPk.mockResolvedValue(null);
    await expect(closeAuction(999)).rejects.toMatchObject({ code: 'event_not_found' });
    expect(txn.rollback).toHaveBeenCalled();
  });

  test('не аукцион → not_auction', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ eventType: 'cashback' }));
    await expect(closeAuction(1)).rejects.toMatchObject({ code: 'not_auction' });
  });

  test('идемпотентность: уже закрытый возвращает alreadyClosed=true', async () => {
    const event = makeEvent({
      closedAt:     new Date('2025-12-01'),
      winnerUserId: 'u-1',
      currentBid:   1500,
    });
    Event.findByPk.mockResolvedValue(event);

    const result = await closeAuction(1);
    expect(result.alreadyClosed).toBe(true);
    expect(result.winnerUserId).toBe('u-1');
    expect(result.winningAmount).toBe(1500);
    expect(txn.commit).toHaveBeenCalled();
    // .update не должен быть вызван, аукцион уже закрыт
    expect(event.update).not.toHaveBeenCalled();
  });

  test('без active-ставок: status=ended, closedAt установлен, победителя нет', async () => {
    const event = makeEvent();
    Event.findByPk.mockResolvedValue(event);
    AuctionBid.findAll.mockResolvedValue([]);

    const result = await closeAuction(1);
    expect(result.winnerUserId).toBeNull();
    expect(result.winningAmount).toBeNull();
    expect(event.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ended', closedAt: expect.any(Date) }),
      { transaction: txn },
    );
    expect(Transaction.create).not.toHaveBeenCalled();
  });

  test('счастливый путь: победителю balance↓, locked↓, Transaction с metadata.source=auction_win', async () => {
    const event       = makeEvent({ title: 'Лот №1', currentBid: 800, currentBidUserId: 'u-1' });
    const winningBid  = makeBid({ id: 42, userId: 'u-1', amount: 800 });
    const winnerCard  = makeCard({
      userId:        'u-1',
      balance:       '1000',
      lockedBalance: '800',
      totalSpent:    '0',
    });

    Event.findByPk.mockResolvedValue(event);
    AuctionBid.findAll.mockResolvedValue([winningBid]);
    LoyaltyCard.findOne.mockResolvedValue(winnerCard);

    const result = await closeAuction(1);

    expect(winnerCard.update).toHaveBeenCalledWith(
      { balance: 200, lockedBalance: 0, totalSpent: 800 },
      { transaction: txn },
    );
    expect(Transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId:        'u-1',
        type:          'debit',
        amount:        800,
        balanceBefore: 1000,
        balanceAfter:  200,
        metadata: {
          source:  'auction_win',
          eventId: 1,
          bidId:   42,
        },
      }),
      { transaction: txn },
    );
    expect(winningBid.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'won' }),
      { transaction: txn },
    );
    expect(event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        winnerUserId: 'u-1',
        status:       'ended',
        closedAt:     expect.any(Date),
      }),
      { transaction: txn },
    );
    expect(result.winnerUserId).toBe('u-1');
    expect(result.winningAmount).toBe(800);
    expect(txn.commit).toHaveBeenCalled();
  });

  test('защитный путь: если несколько active — выбирается с максимальной суммой, остальные → returned', async () => {
    const event   = makeEvent({ currentBid: 1500, currentBidUserId: 'u-top' });
    const topBid  = makeBid({ id: 10, userId: 'u-top', amount: 1500 });
    const lowBid  = makeBid({ id: 11, userId: 'u-low', amount: 800 });

    Event.findByPk.mockResolvedValue(event);
    AuctionBid.findAll.mockResolvedValue([lowBid, topBid]); // нарочно перевёрнуто
    const winnerCard = makeCard({ userId: 'u-top', balance: '5000', lockedBalance: '1500' });
    const lowCard    = makeCard({ userId: 'u-low', balance: '1000', lockedBalance: '800' });
    LoyaltyCard.findOne
      .mockResolvedValueOnce(winnerCard)
      .mockResolvedValueOnce(lowCard);

    const result = await closeAuction(1);
    expect(result.winnerUserId).toBe('u-top');
    expect(result.winningAmount).toBe(1500);
    expect(lowBid.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'returned' }),
      { transaction: txn },
    );
    expect(lowCard.update).toHaveBeenCalledWith({ lockedBalance: 0 }, { transaction: txn });
  });

  test('карта победителя пропала → winner_card_missing', async () => {
    const event       = makeEvent({ currentBid: 800, currentBidUserId: 'u-1' });
    const winningBid  = makeBid({ userId: 'u-1', amount: 800 });
    Event.findByPk.mockResolvedValue(event);
    AuctionBid.findAll.mockResolvedValue([winningBid]);
    LoyaltyCard.findOne.mockResolvedValue(null);
    await expect(closeAuction(1)).rejects.toMatchObject({
      code: 'winner_card_missing',
      extra: { winnerUserId: 'u-1' },
    });
    expect(txn.rollback).toHaveBeenCalled();
  });
});

// ─── closeExpiredAuctions ────────────────────────────────────────────────────

describe('closeExpiredAuctions', () => {
  let txn;
  beforeEach(() => {
    jest.clearAllMocks();
    txn = makeTxn();
    sequelize.transaction.mockResolvedValue(txn);
  });

  test('закрывает каждый просроченный аукцион и возвращает результаты', async () => {
    const e1 = makeEvent({ id: 1 });
    const e2 = makeEvent({ id: 2 });
    Event.findAll.mockResolvedValue([e1, e2]);

    // closeAuction для каждого: оба без ставок (быстрый путь)
    Event.findByPk
      .mockResolvedValueOnce(e1)
      .mockResolvedValueOnce(e2);
    AuctionBid.findAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const results = await closeExpiredAuctions();
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ eventId: 1, ok: true, winnerUserId: null });
    expect(results[1]).toMatchObject({ eventId: 2, ok: true, winnerUserId: null });
  });

  test('ошибка закрытия одного аукциона не валит остальные', async () => {
    const e1 = makeEvent({ id: 1 });
    const e2 = makeEvent({ id: 2 });
    Event.findAll.mockResolvedValue([e1, e2]);

    // e1 закроется нормально, e2 — упадёт на event_not_found
    Event.findByPk
      .mockResolvedValueOnce(e1)
      .mockResolvedValueOnce(null);
    AuctionBid.findAll.mockResolvedValueOnce([]);

    const results = await closeExpiredAuctions();
    expect(results[0]).toMatchObject({ eventId: 1, ok: true });
    expect(results[1]).toMatchObject({ eventId: 2, ok: false });
    expect(results[1].error).toMatch(/Аукцион не найден/);
  });
});
