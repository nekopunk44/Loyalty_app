/**
 * Тесты bookingJobs: авто-просрочка неоплаченных бронирований + no-show.
 */

process.env.NODE_ENV = 'test';

jest.mock('../models', () => ({
  Booking:           { findAll: jest.fn(), findByPk: jest.fn() },
  LoyaltyCard:       { findOne: jest.fn() },
  Transaction:       { create: jest.fn() },
  Property:          { findByPk: jest.fn() },
  User:              { findOne: jest.fn() },
  AdminWallet:       { findOne: jest.fn() },
  AdminTransaction:  { create: jest.fn() },
  Event:             { findAll: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../db', () => ({
  sequelize: { transaction: jest.fn() },
  Sequelize: {
    Transaction: { ISOLATION_LEVELS: { SERIALIZABLE: 'SERIALIZABLE' } },
    Op: { in: 'in', lt: 'lt', gt: 'gt', ne: 'ne' },
  },
}));

jest.mock('../cache', () => ({
  del: jest.fn().mockResolvedValue(true),
}));

jest.mock('../logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

jest.mock('../utils/notify', () => ({ notify: jest.fn(), notifyAllAdmins: jest.fn() }));

jest.mock('../services/promotionEngine', () => ({
  computePromotionEffect: ({ cashbackRate }) => ({
    finalRate: cashbackRate,
    appliedEvents: [],
    boostPercentPoints: 0,
  }),
}));

const { sequelize } = require('../db');
const { Booking } = require('../models');
const cache = require('../cache');
const { notify } = require('../utils/notify');
const bookingJobs = require('../services/bookingJobs');

const makeTxn = () => ({
  LOCK:     { UPDATE: 'UPDATE' },
  commit:   jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
});

const pastDateString = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

const futureDateString = (daysAhead) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

describe('bookingJobs.expirePendingPayments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(() => Promise.resolve(makeTxn()));
    // По умолчанию no-show проход — пустой
    Booking.findAll.mockResolvedValue([]);
  });

  test('переводит pending_payment с истёкшим deadline в expired', async () => {
    const bookingInstance = {
      id: 42, userId: 'u-1', propertyId: '1',
      status: 'pending_payment',
      paymentDeadline: new Date(Date.now() - 60_000),
      update: jest.fn().mockImplementation(function (patch) {
        Object.assign(this, patch);
        return Promise.resolve(this);
      }),
    };
    Booking.findAll
      .mockResolvedValueOnce([])            // settleRemainingPayments
      .mockResolvedValueOnce([{ id: 42 }])  // expirePendingPayments
      .mockResolvedValueOnce([]);           // expireNoShows
    Booking.findByPk.mockResolvedValueOnce(bookingInstance);

    const result = await bookingJobs.runExpire();

    expect(result.ok).toBe(true);
    expect(result.expired).toBe(1);
    expect(bookingInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'expired' }),
      expect.any(Object),
    );
    expect(cache.del).toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'booking_expired' }),
    );
  });

  test('пропускает, если статус сменился между SELECT и LOCK (idempotency)', async () => {
    const bookingInstance = {
      id: 42, status: 'confirmed',
      paymentDeadline: new Date(Date.now() - 60_000),
      update: jest.fn(),
    };
    Booking.findAll
      .mockResolvedValueOnce([])            // settleRemainingPayments
      .mockResolvedValueOnce([{ id: 42 }])
      .mockResolvedValueOnce([]);
    Booking.findByPk.mockResolvedValueOnce(bookingInstance);

    const result = await bookingJobs.runExpire();

    expect(result.ok).toBe(true);
    expect(result.expired).toBe(0);
    expect(bookingInstance.update).not.toHaveBeenCalled();
  });

  test('пустой список кандидатов — no-op', async () => {
    Booking.findAll.mockResolvedValue([]);
    const result = await bookingJobs.runExpire();
    expect(result.ok).toBe(true);
    expect(result.total).toBe(0);
  });
});

describe('bookingJobs.expireNoShows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(() => Promise.resolve(makeTxn()));
  });

  test('confirmed с неоплаченным остатком и прошедшим checkOut → expired, депозит удержан', async () => {
    const booking = {
      id: 100, userId: 'u-2', propertyId: '2',
      status: 'confirmed',
      checkOutDate: pastDateString(2),
      remainingAmount: 500,
      depositAmount: 650,
      depositPaidAt: new Date(Date.now() - 10 * 24 * 3600_000),
      update: jest.fn().mockImplementation(function (patch) {
        Object.assign(this, patch);
        return Promise.resolve(this);
      }),
    };
    Booking.findAll
      .mockResolvedValueOnce([])                                // settleRemainingPayments
      .mockResolvedValueOnce([])                                // expirePendingPayments
      .mockResolvedValueOnce([booking]);                        // expireNoShows
    Booking.findByPk.mockResolvedValueOnce(booking);

    const result = await bookingJobs.runExpire();

    expect(result.expired).toBe(1);
    expect(booking.update).toHaveBeenCalledWith(
      { status: 'expired' },
      expect.any(Object),
    );
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'booking_no_show',
      data: expect.objectContaining({ depositHeld: 650, prevStatus: 'confirmed' }),
    }));
  });

  test('pending_payment с прошедшим checkOut → expired без удержания', async () => {
    const booking = {
      id: 101, userId: 'u-3', propertyId: '3',
      status: 'pending_payment',
      checkOutDate: pastDateString(1),
      remainingAmount: 0,
      depositAmount: 400,
      depositPaidAt: null,
      update: jest.fn().mockImplementation(function (patch) {
        Object.assign(this, patch);
        return Promise.resolve(this);
      }),
    };
    Booking.findAll
      .mockResolvedValueOnce([])            // settleRemainingPayments
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([booking]);
    Booking.findByPk.mockResolvedValueOnce(booking);

    const result = await bookingJobs.runExpire();

    expect(result.expired).toBe(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ depositHeld: 0 }),
    }));
  });

  test('confirmed с нулевым остатком — НЕ трогает (полностью оплачено, ждёт completed)', async () => {
    const booking = {
      id: 102,
      status: 'confirmed',
      checkOutDate: pastDateString(1),
      remainingAmount: 0,
    };
    Booking.findAll
      .mockResolvedValueOnce([])            // settleRemainingPayments
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([booking]);

    const result = await bookingJobs.runExpire();

    expect(result.expired).toBe(0);
  });

  test('будущая дата выезда — не трогает', async () => {
    const booking = {
      id: 103,
      status: 'pending_payment',
      checkOutDate: futureDateString(5),
      remainingAmount: 0,
    };
    Booking.findAll
      .mockResolvedValueOnce([])            // settleRemainingPayments
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([booking]);

    const result = await bookingJobs.runExpire();

    expect(result.expired).toBe(0);
  });
});

describe('bookingJobs.settleRemainingPayments', () => {
  const { LoyaltyCard, Transaction, User, AdminWallet, AdminTransaction, Event, Property } = require('../models');

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(() => Promise.resolve(makeTxn()));
    Event.findAll.mockResolvedValue([]);
    Property.findByPk.mockResolvedValue({ id: 1, name: 'Test' });
  });

  test('cash в день выезда: status→completed, кэшбэк только с депозита, никакого debit', async () => {
    const booking = {
      id: 200, userId: 'u-cash', propertyId: '1',
      status: 'confirmed',
      checkOutDate: pastDateString(0),
      remainingPaymentMethod: 'cash',
      remainingPaidAt: null,
      depositAmount: '1000', remainingAmount: '500',
      update: jest.fn().mockImplementation(function (patch) { Object.assign(this, patch); return Promise.resolve(this); }),
    };
    Booking.findAll
      .mockResolvedValueOnce([{ id: 200, checkOutDate: booking.checkOutDate }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    Booking.findByPk.mockResolvedValueOnce(booking);
    LoyaltyCard.findOne.mockResolvedValueOnce({
      balance: '2000', lockedBalance: '0', totalSpent: '1000', totalEarned: '0',
      update: jest.fn().mockResolvedValue(true),
    });
    User.findOne
      .mockResolvedValueOnce({ userId: 'u-cash', membershipLevel: 'Bronze' })  // в settle
      .mockResolvedValueOnce({ userId: 'admin-1', adminLevel: 1 });            // financeAdmin
    AdminWallet.findOne.mockResolvedValueOnce({
      totalBalance: '5000', availableBalance: '5000', totalReceived: '5000',
      update: jest.fn().mockResolvedValue(true),
    });

    const result = await bookingJobs.runExpire();

    expect(result.settled).toBe(1);
    expect(booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', cashbackAmount: expect.any(Number) }),
      expect.any(Object),
    );
    // cash → не должен создаваться debit за остаток
    const debitCalls = Transaction.create.mock.calls.filter(
      ([t]) => t.type === 'debit' && t.category === 'booking_remaining',
    );
    expect(debitCalls.length).toBe(0);
    // Кэшбэк должен быть начислен (Bronze 3% × 1000 = 30)
    const creditCalls = Transaction.create.mock.calls.filter(
      ([t]) => t.type === 'credit' && t.category === 'cashback',
    );
    expect(creditCalls.length).toBe(1);
    expect(creditCalls[0][0].amount).toBeCloseTo(30, 2);
  });

  test('card в день выезда с достаточным балансом: списание + кэшбэк со всей суммы + completed', async () => {
    const booking = {
      id: 201, userId: 'u-card', propertyId: '1',
      status: 'confirmed',
      checkOutDate: pastDateString(0),
      remainingPaymentMethod: 'card',
      remainingPaidAt: null,
      depositAmount: '1000', remainingAmount: '500',
      update: jest.fn().mockImplementation(function (patch) { Object.assign(this, patch); return Promise.resolve(this); }),
    };
    Booking.findAll
      .mockResolvedValueOnce([{ id: 201, checkOutDate: booking.checkOutDate }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    Booking.findByPk.mockResolvedValueOnce(booking);
    LoyaltyCard.findOne.mockResolvedValueOnce({
      balance: '2000', lockedBalance: '0', totalSpent: '1000', totalEarned: '0',
      update: jest.fn().mockResolvedValue(true),
    });
    User.findOne
      .mockResolvedValueOnce({ userId: 'u-card', membershipLevel: 'Bronze' })
      .mockResolvedValueOnce({ userId: 'admin-1', adminLevel: 1 });
    AdminWallet.findOne.mockResolvedValueOnce({
      totalBalance: '5000', availableBalance: '5000', totalReceived: '5000',
      update: jest.fn().mockResolvedValue(true),
    });

    const result = await bookingJobs.runExpire();

    expect(result.settled).toBe(1);
    expect(booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' }),
      expect.any(Object),
    );
    const debitCalls = Transaction.create.mock.calls.filter(
      ([t]) => t.type === 'debit' && t.category === 'booking_remaining',
    );
    expect(debitCalls.length).toBe(1);
    expect(debitCalls[0][0].amount).toBe(500);
    // Bronze 3% × (1000+500) = 45
    const creditCalls = Transaction.create.mock.calls.filter(
      ([t]) => t.type === 'credit' && t.category === 'cashback',
    );
    expect(creditCalls[0][0].amount).toBeCloseTo(45, 2);
  });

  test('будущая дата выезда: не settle', async () => {
    Booking.findAll
      .mockResolvedValueOnce([{ id: 202, checkOutDate: futureDateString(5) }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await bookingJobs.runExpire();

    expect(result.settled).toBe(0);
    expect(Booking.findByPk).not.toHaveBeenCalled();
  });

  test('card в день выезда при недостатке баланса: settle откладывается, status не меняется', async () => {
    const booking = {
      id: 203, userId: 'u-broke', propertyId: '1',
      status: 'confirmed',
      checkOutDate: pastDateString(0),
      remainingPaymentMethod: 'card',
      remainingPaidAt: null,
      depositAmount: '1000', remainingAmount: '500',
      update: jest.fn(),
    };
    Booking.findAll
      .mockResolvedValueOnce([{ id: 203, checkOutDate: booking.checkOutDate }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    Booking.findByPk.mockResolvedValueOnce(booking);
    LoyaltyCard.findOne.mockResolvedValueOnce({
      balance: '100', lockedBalance: '0', totalSpent: '1000', totalEarned: '0',
      update: jest.fn(),
    });

    const result = await bookingJobs.runExpire();

    expect(result.settled).toBe(0);
    expect(booking.update).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'remaining_settle_insufficient',
    }));
  });
});
