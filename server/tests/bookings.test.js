/**
 * Тесты маршрутов /api/bookings.
 * Все обращения к БД и кэшу замокированы — реального Postgres не нужно.
 */

process.env.JWT_SECRET = 'test-secret-bookings';
process.env.NODE_ENV   = 'test';

const jwt     = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// ─── Моки ────────────────────────────────────────────────────────────────────

jest.mock('../models', () => ({
  Booking: {
    findAll:  jest.fn(),
    findByPk: jest.fn(),
    create:   jest.fn(),
    update:   jest.fn(),
    destroy:  jest.fn(),
    count:    jest.fn(),
  },
  LoyaltyCard:      { findOne: jest.fn(), update: jest.fn() },
  Transaction:      { create: jest.fn() },
  Property:         { findByPk: jest.fn(), findAll: jest.fn().mockResolvedValue([]) },
  User:             { findOne: jest.fn(), findAll: jest.fn(), update: jest.fn() },
  Payment:          { create: jest.fn(), findOne: jest.fn(), update: jest.fn() },
  AdminWallet:      { findOne: jest.fn(), create: jest.fn() },
  AdminTransaction: { create: jest.fn() },
  Event:            { findAll: jest.fn() },
  Notification:     { create: jest.fn() },
}));

jest.mock('../utils/notify', () => ({
  notify:          jest.fn(),
  notifyAllAdmins: jest.fn(),
}));

// verifyAdmin обращается к ../models/User напрямую
jest.mock('../models/User', () => ({ findOne: jest.fn() }));

const makeTxn = () => ({
  LOCK:     { UPDATE: 'UPDATE' },
  commit:   jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
});

jest.mock('../db', () => ({
  sequelize: { transaction: jest.fn() },
  Sequelize: {
    Transaction: { ISOLATION_LEVELS: { SERIALIZABLE: 'SERIALIZABLE' } },
    Op: { in: 'in', lt: 'lt', gt: 'gt' },
  },
}));

jest.mock('../cache', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(true),
}));

jest.mock('../logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

// ─── Хелперы ────────────────────────────────────────────────────────────────

const SECRET    = 'test-secret-bookings';
const userToken = jwt.sign({ userId: 'user-1', role: 'user' },  SECRET);
const adminToken= jwt.sign({ userId: 'admin-1', role: 'admin' }, SECRET);

const { sequelize } = require('../db');
const {
  Booking, LoyaltyCard, Transaction, Property, User, Payment,
  AdminWallet, AdminTransaction, Event, Notification,
} = require('../models');
const UserModel = require('../models/User');
const cache     = require('../cache');

const createApp = (isDbConnected = () => true) => {
  const app = express();
  app.use(express.json());
  app.use('/api/bookings', require('../routes/bookings')({ isDbConnected }));
  return app;
};

// ─── GET /property/:propertyId/booked-dates ──────────────────────────────────

describe('GET /property/:propertyId/booked-dates', () => {
  beforeEach(() => jest.clearAllMocks());

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .get('/api/bookings/property/1/booked-dates');
    expect(res.status).toBe(503);
  });

  test('200 возвращает данные из кэша (без обращения к БД)', async () => {
    const cached = { success: true, bookedDates: ['01.06.2025'], count: 1 };
    cache.get.mockResolvedValueOnce(cached);

    const res = await request(createApp())
      .get('/api/bookings/property/1/booked-dates');

    expect(res.status).toBe(200);
    expect(res.body.bookedDates).toContain('01.06.2025');
    expect(Booking.findAll).not.toHaveBeenCalled();
  });

  test('200 возвращает занятые даты из БД и кэширует результат', async () => {
    Booking.findAll.mockResolvedValueOnce([
      { id: 1, checkInDate: '01.06.2025', checkOutDate: '03.06.2025' },
    ]);

    const res = await request(createApp())
      .get('/api/bookings/property/1/booked-dates');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.bookedDates)).toBe(true);
    expect(res.body.bookedDates).toContain('01.06.2025');
    expect(cache.set).toHaveBeenCalled();
  });
});

// ─── POST / — создать бронирование ───────────────────────────────────────────

describe('POST /api/bookings', () => {
  const validBody = {
    propertyId:   '1',
    checkInDate:  '10.07.2025',
    checkOutDate: '13.07.2025',
    guests:       2,
    totalPrice:   450,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(() => Promise.resolve(makeTxn()));
    Booking.findAll.mockResolvedValue([]);
    Booking.create.mockResolvedValue({
      id: 'b-1', ...validBody,
      status: 'pending_payment', userId: 'user-1',
      depositAmount: 1000, remainingAmount: 0, paymentDeadline: new Date(),
    });
    LoyaltyCard.findOne.mockResolvedValue({ balance: '0', totalEarned: '0', update: jest.fn().mockResolvedValue(true) });
    Property.findByPk.mockResolvedValue({ id: 1, depositAmount: '1000', name: 'Test' });
    User.findOne.mockResolvedValue(null);
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).post('/api/bookings').send(validBody);
    expect(res.status).toBe(401);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody);
    expect(res.status).toBe(503);
  });

  test('400 когда дата выезда не позже заезда', async () => {
    const res = await request(createApp())
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...validBody, checkOutDate: '10.07.2025' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/выезда/);
  });

  test('409 при конфликте дат (даты заняты)', async () => {
    Booking.findAll.mockResolvedValueOnce([
      { id: 'existing', checkInDate: '09.07.2025', checkOutDate: '12.07.2025' },
    ]);

    const res = await request(createApp())
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/заняты/);
  });

  test('201 успешное создание бронирования (pending_payment + 12h deadline)', async () => {
    const res = await request(createApp())
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.booking).toBeDefined();
    expect(res.body.payment).toBeDefined();
    expect(res.body.payment.status).toBe('pending_payment');
    expect(res.body.payment.depositAmount).toBeGreaterThan(0);
    expect(res.body.payment.paymentDeadline).toBeDefined();
  });
});

// ─── POST /:bookingId/pay-deposit ────────────────────────────────────────────

describe('POST /api/bookings/:bookingId/pay-deposit', () => {
  let bookingInstance;
  let cardInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(() => Promise.resolve(makeTxn()));

    bookingInstance = {
      id: 'b-1', userId: 'user-1', propertyId: '1',
      status: 'pending_payment',
      depositAmount: '1000', remainingAmount: '500',
      paymentDeadline: new Date(Date.now() + 60 * 60 * 1000),
      update: jest.fn().mockImplementation(function (patch) { Object.assign(this, patch); return Promise.resolve(this); }),
    };
    cardInstance = {
      balance: '2000', lockedBalance: '0', totalSpent: '0', totalEarned: '0',
      update: jest.fn().mockResolvedValue(true),
    };

    Booking.findByPk.mockResolvedValue(bookingInstance);
    LoyaltyCard.findOne.mockResolvedValue(cardInstance);
    User.findOne.mockResolvedValue({ userId: 'admin-1', adminLevel: 1 });
    AdminWallet.findOne.mockResolvedValue({
      totalBalance: '0', availableBalance: '0', totalReceived: '0',
      update: jest.fn().mockResolvedValue(true),
    });
    AdminTransaction.create.mockResolvedValue({});
    Transaction.create.mockResolvedValue({});
    Property.findByPk.mockResolvedValue({ id: 1, name: 'Test' });
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).post('/api/bookings/b-1/pay-deposit');
    expect(res.status).toBe(401);
  });

  test('400 если booking уже не в pending_payment', async () => {
    bookingInstance.status = 'confirmed';
    const res = await request(createApp())
      .post('/api/bookings/b-1/pay-deposit')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(400);
    expect(res.body.currentStatus).toBe('confirmed');
  });

  test('410 если paymentDeadline истёк', async () => {
    bookingInstance.paymentDeadline = new Date(Date.now() - 1000);
    const res = await request(createApp())
      .post('/api/bookings/b-1/pay-deposit')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(410);
  });

  test('402 при нехватке доступного баланса', async () => {
    cardInstance.balance = '500';
    const res = await request(createApp())
      .post('/api/bookings/b-1/pay-deposit')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(402);
    expect(res.body.deficit).toBeGreaterThan(0);
  });

  test('200 успех — статус confirmed, депозит списан, AdminWallet кредитован', async () => {
    const res = await request(createApp())
      .post('/api/bookings/b-1/pay-deposit')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.payment.type).toBe('deposit');
    expect(res.body.payment.amount).toBe(1000);
    expect(bookingInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmed' }),
      expect.any(Object),
    );
    expect(cardInstance.update).toHaveBeenCalled();
    expect(Transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'debit', amount: 1000 }),
      expect.any(Object),
    );
    expect(AdminTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'booking_deposit', amount: 1000 }),
      expect.any(Object),
    );
  });
});

// ─── POST /:bookingId/pay-remaining ──────────────────────────────────────────

describe('POST /api/bookings/:bookingId/pay-remaining', () => {
  let bookingInstance;
  let cardInstance;
  let walletInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(() => Promise.resolve(makeTxn()));

    bookingInstance = {
      id: 'b-1', userId: 'user-1', propertyId: '1',
      status: 'confirmed',
      depositAmount: '1000', remainingAmount: '500', totalPrice: '1500',
      update: jest.fn().mockImplementation(function (patch) { Object.assign(this, patch); return Promise.resolve(this); }),
    };
    cardInstance = {
      balance: '2000', lockedBalance: '0', totalSpent: '1000', totalEarned: '0',
      update: jest.fn().mockResolvedValue(true),
    };
    walletInstance = {
      totalBalance: '1000', availableBalance: '1000', totalReceived: '1000',
      update: jest.fn().mockResolvedValue(true),
    };

    Booking.findByPk.mockResolvedValue(bookingInstance);
    LoyaltyCard.findOne.mockResolvedValue(cardInstance);
    User.findOne
      .mockResolvedValueOnce({ userId: 'user-1', membershipLevel: 'Bronze' }) // first inside txn (user)
      .mockResolvedValueOnce({ userId: 'admin-1', adminLevel: 1 });           // financeAdmin
    AdminWallet.findOne.mockResolvedValue(walletInstance);
    AdminTransaction.create.mockResolvedValue({});
    Transaction.create.mockResolvedValue({});
    Event.findAll.mockResolvedValue([]);
    Property.findByPk.mockResolvedValue({ id: 1, name: 'Test' });
  });

  test('400 при неверном method', async () => {
    const res = await request(createApp())
      .post('/api/bookings/b-1/pay-remaining')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ method: 'crypto' });
    expect(res.status).toBe(400);
  });

  test('400 если booking не в confirmed', async () => {
    bookingInstance.status = 'pending_payment';
    const res = await request(createApp())
      .post('/api/bookings/b-1/pay-remaining')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ method: 'card' });
    expect(res.status).toBe(400);
  });

  test('200 card-оплата: списание остатка + кэшбэк со всей суммы', async () => {
    const res = await request(createApp())
      .post('/api/bookings/b-1/pay-remaining')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ method: 'card' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.payment.method).toBe('card');
    // Bronze = 3% от (1000+500) = 45
    expect(res.body.cashback.amount).toBeCloseTo(45, 2);
    expect(res.body.cashback.base).toBe(1500);
    expect(bookingInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', remainingPaymentMethod: 'card' }),
      expect.any(Object),
    );
  });

  test('200 cash-оплата: без списания + кэшбэк только с депозита', async () => {
    const res = await request(createApp())
      .post('/api/bookings/b-1/pay-remaining')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ method: 'cash' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.payment.method).toBe('cash');
    // Bronze = 3% × 1000 = 30
    expect(res.body.cashback.amount).toBeCloseTo(30, 2);
    expect(res.body.cashback.base).toBe(1000);
  });
});

// ─── POST /:bookingId/cancel ─────────────────────────────────────────────────

describe('POST /api/bookings/:bookingId/cancel', () => {
  let bookingInstance;
  let cardInstance;
  let walletInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(() => Promise.resolve(makeTxn()));

    bookingInstance = {
      id: 'b-1', userId: 'user-1', propertyId: '1',
      checkInDate: '15.12.2099',
      status: 'pending_payment',
      depositAmount: '1000', remainingAmount: '500',
      cashbackAmount: '45', cashbackRevertedAt: null,
      update: jest.fn().mockImplementation(function (patch) { Object.assign(this, patch); return Promise.resolve(this); }),
    };
    cardInstance = {
      balance: '2000', totalEarned: '45',
      update: jest.fn().mockResolvedValue(true),
    };
    walletInstance = {
      totalBalance: '1000', availableBalance: '1000', totalReceived: '1000',
      update: jest.fn().mockResolvedValue(true),
    };

    Booking.findByPk.mockResolvedValue(bookingInstance);
    LoyaltyCard.findOne.mockResolvedValue(cardInstance);
    User.findOne.mockResolvedValue({ userId: 'admin-1', adminLevel: 1 });
    AdminWallet.findOne.mockResolvedValue(walletInstance);
    AdminTransaction.create.mockResolvedValue({});
    Transaction.create.mockResolvedValue({});
  });

  test('200 cancel pending_payment — без движения средств', async () => {
    const res = await request(createApp())
      .post('/api/bookings/b-1/cancel')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.refund.depositBurned).toBe(0);
    expect(res.body.refund.remainingRefund).toBe(0);
    expect(res.body.refund.cashbackRevert).toBe(0);
    expect(Transaction.create).not.toHaveBeenCalled();
  });

  test('200 cancel confirmed — депозит сгорает в AdminWallet, без возврата юзеру', async () => {
    bookingInstance.status = 'confirmed';

    const res = await request(createApp())
      .post('/api/bookings/b-1/cancel')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.refund.depositBurned).toBe(1000);
    expect(res.body.refund.remainingRefund).toBe(0);
    expect(res.body.refund.cashbackRevert).toBe(0);
  });

  test('200 cancel completed (card) — возврат остатка + откат кэшбэка', async () => {
    bookingInstance.status = 'completed';
    bookingInstance.remainingPaymentMethod = 'card';

    const res = await request(createApp())
      .post('/api/bookings/b-1/cancel')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.refund.depositBurned).toBe(1000);
    expect(res.body.refund.remainingRefund).toBe(500);
    expect(res.body.refund.cashbackRevert).toBe(45);
    // На юзера: +500 (возврат) и −75 (откат кэшбэка) — два вызова update LoyaltyCard
    expect(cardInstance.update).toHaveBeenCalled();
  });

  test('200 cancel completed (cash) — нет возврата остатка, но откат кэшбэка с депозита', async () => {
    bookingInstance.status = 'completed';
    bookingInstance.remainingPaymentMethod = 'cash';
    bookingInstance.cashbackAmount = '30';
    cardInstance.totalEarned = '30';

    const res = await request(createApp())
      .post('/api/bookings/b-1/cancel')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.refund.remainingRefund).toBe(0);
    expect(res.body.refund.cashbackRevert).toBe(30);
  });

  test('400 cancel за <2 дней до заезда для confirmed', async () => {
    bookingInstance.status = 'confirmed';
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const d = String(tomorrow.getDate()).padStart(2, '0');
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const y = tomorrow.getFullYear();
    bookingInstance.checkInDate = `${d}.${m}.${y}`;

    const res = await request(createApp())
      .post('/api/bookings/b-1/cancel')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(400);
    expect(res.body.daysUntilCheckIn).toBeLessThan(2);
  });
});

// ─── Старые endpoints — 410 Gone ─────────────────────────────────────────────

describe('Старые endpoints возвращают 410 Gone', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POST /:bookingId/confirm-payment → 410', async () => {
    const res = await request(createApp())
      .post('/api/bookings/b-1/confirm-payment')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(410);
    expect(res.body.migration).toBeDefined();
  });

  test('POST /:bookingId/pay-from-card → 410', async () => {
    const res = await request(createApp())
      .post('/api/bookings/b-1/pay-from-card')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(410);
    expect(res.body.migration).toBeDefined();
  });
});

// ─── GET /user/:userId ───────────────────────────────────────────────────────

describe('GET /api/bookings/user/:userId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Booking.findAll.mockResolvedValue([
      { id: 'b-1', propertyId: '1', status: 'confirmed' },
    ]);
    Property.findAll.mockResolvedValue([]);
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).get('/api/bookings/user/user-1');
    expect(res.status).toBe(401);
  });

  test('200 возвращает бронирования пользователя', async () => {
    const res = await request(createApp())
      .get('/api/bookings/user/user-1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.bookings)).toBe(true);
  });
});

// ─── GET / — все бронирования [admin] ────────────────────────────────────────

describe('GET /api/bookings (admin only)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue({ userId: 'admin-1', role: 'admin' });
    Booking.findAll.mockResolvedValue([]);
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).get('/api/bookings');
    expect(res.status).toBe(401);
  });

  test('403 для обычного пользователя', async () => {
    UserModel.findOne.mockResolvedValue({ userId: 'user-1', role: 'user' });
    const res = await request(createApp())
      .get('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  test('200 для администратора', async () => {
    const res = await request(createApp())
      .get('/api/bookings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.bookings)).toBe(true);
  });
});
