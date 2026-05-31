/**
 * Тесты bookingJobs: авто-просрочка неоплаченных бронирований + no-show.
 */

process.env.NODE_ENV = 'test';

jest.mock('../models', () => ({
  Booking: { findAll: jest.fn(), findByPk: jest.fn() },
}));

jest.mock('../db', () => ({
  sequelize: { transaction: jest.fn() },
  Sequelize: {
    Transaction: { ISOLATION_LEVELS: { SERIALIZABLE: 'SERIALIZABLE' } },
    Op: { in: 'in', lt: 'lt', gt: 'gt' },
  },
}));

jest.mock('../cache', () => ({
  del: jest.fn().mockResolvedValue(true),
}));

jest.mock('../logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

jest.mock('../utils/notify', () => ({ notify: jest.fn() }));

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
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([booking]);

    const result = await bookingJobs.runExpire();

    expect(result.expired).toBe(0);
  });
});
