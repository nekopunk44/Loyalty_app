/**
 * Тесты bookingJobs: авто-просрочка неоплаченных бронирований.
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

describe('bookingJobs.expirePendingPayments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(() => Promise.resolve(makeTxn()));
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
    Booking.findAll.mockResolvedValueOnce([{ id: 42 }]);
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
    Booking.findAll.mockResolvedValueOnce([{ id: 42 }]);
    Booking.findByPk.mockResolvedValueOnce(bookingInstance);

    const result = await bookingJobs.runExpire();

    expect(result.ok).toBe(true);
    expect(result.expired).toBe(0);
    expect(bookingInstance.update).not.toHaveBeenCalled();
  });

  test('пустой список кандидатов — no-op', async () => {
    Booking.findAll.mockResolvedValueOnce([]);
    const result = await bookingJobs.runExpire();
    expect(result.ok).toBe(true);
    expect(result.total).toBe(0);
  });
});
