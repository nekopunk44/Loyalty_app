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
  Property:         { findByPk: jest.fn() },
  User:             { findOne: jest.fn(), findAll: jest.fn(), update: jest.fn() },
  Payment:          { create: jest.fn(), findOne: jest.fn(), update: jest.fn() },
  AdminWallet:      { findOne: jest.fn(), create: jest.fn() },
  AdminTransaction: { create: jest.fn() },
  Notification:     { create: jest.fn() },
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
  Sequelize: { Transaction: { ISOLATION_LEVELS: { SERIALIZABLE: 'SERIALIZABLE' } } },
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
const { Booking, LoyaltyCard, Transaction, Payment, AdminWallet, Notification } = require('../models');
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
    Booking.create.mockResolvedValue({ id: 'b-1', ...validBody, status: 'pending', userId: 'user-1' });
    LoyaltyCard.findOne.mockResolvedValue({ balance: '0', totalEarned: '0', update: jest.fn().mockResolvedValue(true) });
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

  test('201 успешное создание бронирования', async () => {
    const res = await request(createApp())
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.booking).toBeDefined();
  });
});

// ─── GET /user/:userId ───────────────────────────────────────────────────────

describe('GET /api/bookings/user/:userId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Booking.findAll.mockResolvedValue([
      { id: 'b-1', propertyId: '1', status: 'confirmed' },
    ]);
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
