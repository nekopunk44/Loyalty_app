/**
 * Тесты маршрутов /api/card (пополнение карты лояльности).
 * Все обращения к БД замокированы.
 */

process.env.JWT_SECRET          = 'test-secret-card';
process.env.NODE_ENV            = 'test';
process.env.ALLOW_DEMO_PAYMENTS = 'true';

const jwt     = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// ─── Моки ────────────────────────────────────────────────────────────────────

jest.mock('../models', () => ({
  LoyaltyCard: { findOne: jest.fn(), create: jest.fn(), update: jest.fn() },
  CardTopUp:   { findOne: jest.fn(), create: jest.fn() },
  Transaction: { findAll: jest.fn(), create: jest.fn(), count: jest.fn() },
  User:        { findOne: jest.fn() },
}));

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

jest.mock('../logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

jest.mock('../utils/pagination', () => ({
  parsePagination: jest.fn(() => ({ limit: 20, offset: 0 })),
}));

// ─── Хелперы ────────────────────────────────────────────────────────────────

const SECRET    = 'test-secret-card';
const userToken = jwt.sign({ userId: 'user-1', role: 'user' }, SECRET);
const otherToken= jwt.sign({ userId: 'user-2', role: 'user' }, SECRET);

const { sequelize } = require('../db');
const { LoyaltyCard, CardTopUp, Transaction } = require('../models');

const createApp = (isDbConnected = () => true) => {
  const app = express();
  app.use(express.json());
  app.use('/api/card', require('../routes/card')({ isDbConnected }));
  return app;
};

// ─── POST /topup ─────────────────────────────────────────────────────────────

describe('POST /api/card/topup', () => {
  const validBody = { amount: 500, paymentMethod: 'card' };

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(() => Promise.resolve(makeTxn()));
    CardTopUp.findOne.mockResolvedValue(null);
    LoyaltyCard.findOne.mockResolvedValue({ balance: '1000', totalEarned: '200', update: jest.fn() });
    CardTopUp.create.mockResolvedValue({ id: 'ct-1' });
    Transaction.create.mockResolvedValue({ id: 'tx-1' });
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).post('/api/card/topup').send(validBody);
    expect(res.status).toBe(401);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/card/topup')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody);
    expect(res.status).toBe(503);
  });

  test('400 когда amount = 0', async () => {
    const res = await request(createApp())
      .post('/api/card/topup')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 0, paymentMethod: 'card' });
    expect(res.status).toBe(400);
  });

  test('400 когда amount > 1 000 000', async () => {
    const res = await request(createApp())
      .post('/api/card/topup')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 1_000_001, paymentMethod: 'card' });
    expect(res.status).toBe(400);
  });

  test('400 когда paymentMethod не передан', async () => {
    const res = await request(createApp())
      .post('/api/card/topup')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 500 });
    expect(res.status).toBe(400);
  });

  test('200 при idempotent-повторе (дубликат transactionId)', async () => {
    CardTopUp.findOne.mockResolvedValueOnce({ transactionId: 'idem-key-1' });
    LoyaltyCard.findOne.mockResolvedValue({ balance: '1500' });

    const res = await request(createApp())
      .post('/api/card/topup')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...validBody, idempotencyKey: 'idem-key-1' });

    expect(res.status).toBe(200);
    expect(res.body.duplicate).toBe(true);
  });

  test('201 успешное пополнение', async () => {
    const loyaltyCard = {
      balance:      '1000',
      totalEarned:  '200',
      update:       jest.fn().mockResolvedValue(true),
    };
    LoyaltyCard.findOne.mockResolvedValue(loyaltyCard);

    const res = await request(createApp())
      .post('/api/card/topup')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.newBalance).toBe('number');
  });
});

// ─── GET /balance/:userId ─────────────────────────────────────────────────────

describe('GET /api/card/balance/:userId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LoyaltyCard.findOne.mockResolvedValue({
      balance: '2500', cashbackRate: 5, membershipLevel: 'Bronze',
      totalSpent: '10000', totalEarned: '500',
    });
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).get('/api/card/balance/user-1');
    expect(res.status).toBe(401);
  });

  test('403 при запросе чужого баланса', async () => {
    const res = await request(createApp())
      .get('/api/card/balance/user-1')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .get('/api/card/balance/user-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(503);
  });

  test('200 возвращает баланс карты', async () => {
    const res = await request(createApp())
      .get('/api/card/balance/user-1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.balance).toBeDefined();
  });
});

// ─── GET /transactions/:userId ────────────────────────────────────────────────

describe('GET /api/card/transactions/:userId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Transaction.findAll.mockResolvedValue([
      { id: 'tx-1', type: 'credit', amount: 500, createdAt: new Date() },
    ]);
    Transaction.count.mockResolvedValue(1);
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).get('/api/card/transactions/user-1');
    expect(res.status).toBe(401);
  });

  test('403 при запросе чужих транзакций', async () => {
    const res = await request(createApp())
      .get('/api/card/transactions/user-1')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  test('200 возвращает список транзакций', async () => {
    const res = await request(createApp())
      .get('/api/card/transactions/user-1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.transactions)).toBe(true);
  });
});
