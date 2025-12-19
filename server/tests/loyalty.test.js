/**
 * Тесты маршрутов /api/loyalty-card.
 */

process.env.JWT_SECRET          = 'test-secret-loyalty';
process.env.NODE_ENV            = 'test';
process.env.ALLOW_DEMO_PAYMENTS = 'true';

const jwt     = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// ─── Моки ────────────────────────────────────────────────────────────────────

const mockCard = (overrides = {}) => ({
  userId:          'user-1',
  balance:         '1000',
  cashbackRate:    '5',
  totalSpent:      '5000',
  totalEarned:     '250',
  membershipLevel: 'Bronze',
  save:            jest.fn().mockResolvedValue(true),
  ...overrides,
});

jest.mock('../models', () => ({
  LoyaltyCard:  { findOne: jest.fn(), create: jest.fn() },
  Transaction:  { findAll: jest.fn(), create: jest.fn(), count: jest.fn() },
  User:         { findOne: jest.fn(), findAll: jest.fn() },
  Notification: { create: jest.fn() },
}));

jest.mock('../models/User', () => ({ findOne: jest.fn() }));

jest.mock('../utils/pagination', () => ({
  parsePagination: jest.fn(() => ({ limit: 20, offset: 0 })),
}));

jest.mock('../logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

// ─── Хелперы ────────────────────────────────────────────────────────────────

const SECRET     = 'test-secret-loyalty';
const userToken  = jwt.sign({ userId: 'user-1', role: 'user'  }, SECRET);
const otherToken = jwt.sign({ userId: 'user-2', role: 'user'  }, SECRET);

const { LoyaltyCard, Transaction, User } = require('../models');

const createApp = (isDbConnected = () => true) => {
  const app = express();
  app.use(express.json());
  app.use('/api/loyalty-card', require('../routes/loyalty')({ isDbConnected }));
  return app;
};

// ─── GET /:userId ─────────────────────────────────────────────────────────────

describe('GET /api/loyalty-card/:userId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LoyaltyCard.findOne.mockResolvedValue(mockCard());
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).get('/api/loyalty-card/user-1');
    expect(res.status).toBe(401);
  });

  test('403 при запросе чужой карты', async () => {
    const res = await request(createApp())
      .get('/api/loyalty-card/user-1')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .get('/api/loyalty-card/user-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(503);
  });

  test('200 возвращает карту (существующую)', async () => {
    const res = await request(createApp())
      .get('/api/loyalty-card/user-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.loyaltyCard).toBeDefined();
    expect(typeof res.body.loyaltyCard.balance).toBe('number');
  });

  test('200 создаёт карту если её нет', async () => {
    LoyaltyCard.findOne.mockResolvedValue(null);
    LoyaltyCard.create.mockResolvedValue(mockCard({ balance: '0' }));
    const res = await request(createApp())
      .get('/api/loyalty-card/user-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(LoyaltyCard.create).toHaveBeenCalled();
  });
});

// ─── POST /:userId/top-up ────────────────────────────────────────────────────

describe('POST /api/loyalty-card/:userId/top-up', () => {
  const validBody = { amount: 500, paymentMethod: 'card' };

  beforeEach(() => {
    jest.clearAllMocks();
    LoyaltyCard.findOne.mockResolvedValue(mockCard());
    Transaction.create.mockResolvedValue({ id: 'tx-1' });
    User.findOne.mockResolvedValue({ userId: 'user-1', displayName: 'Test' });
    User.findAll.mockResolvedValue([]);
  });

  test('401 без токена', async () => {
    const res = await request(createApp())
      .post('/api/loyalty-card/user-1/top-up')
      .send(validBody);
    expect(res.status).toBe(401);
  });

  test('403 при пополнении чужой карты', async () => {
    const res = await request(createApp())
      .post('/api/loyalty-card/user-1/top-up')
      .set('Authorization', `Bearer ${otherToken}`)
      .send(validBody);
    expect(res.status).toBe(403);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/loyalty-card/user-1/top-up')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody);
    expect(res.status).toBe(503);
  });

  test('400 когда amount <= 0', async () => {
    const res = await request(createApp())
      .post('/api/loyalty-card/user-1/top-up')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 0, paymentMethod: 'card' });
    expect(res.status).toBe(400);
  });

  test('402 в production без ALLOW_DEMO_PAYMENTS', async () => {
    const origEnv = process.env.ALLOW_DEMO_PAYMENTS;
    process.env.ALLOW_DEMO_PAYMENTS = 'false';
    process.env.NODE_ENV = 'production';

    const res = await request(createApp())
      .post('/api/loyalty-card/user-1/top-up')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody);

    process.env.ALLOW_DEMO_PAYMENTS = origEnv;
    process.env.NODE_ENV = 'test';

    expect(res.status).toBe(402);
  });

  test('200 успешное пополнение', async () => {
    const res = await request(createApp())
      .post('/api/loyalty-card/user-1/top-up')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.loyaltyCard).toBeDefined();
  });
});

// ─── GET /:userId/transactions ───────────────────────────────────────────────

describe('GET /api/loyalty-card/:userId/transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Transaction.findAll.mockResolvedValue([
      { id: 'tx-1', type: 'credit', amount: 500, createdAt: new Date() },
    ]);
    Transaction.count.mockResolvedValue(1);
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).get('/api/loyalty-card/user-1/transactions');
    expect(res.status).toBe(401);
  });

  test('403 при запросе чужих транзакций', async () => {
    const res = await request(createApp())
      .get('/api/loyalty-card/user-1/transactions')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .get('/api/loyalty-card/user-1/transactions')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(503);
  });

  test('200 возвращает транзакции с пагинацией', async () => {
    const res = await request(createApp())
      .get('/api/loyalty-card/user-1/transactions')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.transactions)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });
});
