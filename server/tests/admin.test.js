/**
 * Тесты маршрутов /api/admin.
 * verifyFinanceAdmin = verifyAdmin + adminLevel === 1
 */

process.env.JWT_SECRET = 'test-secret-admin';
process.env.NODE_ENV   = 'test';

const jwt     = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// ─── Моки ────────────────────────────────────────────────────────────────────

jest.mock('../models', () => ({
  User:              { count: jest.fn(), findOne: jest.fn(), findAll: jest.fn() },
  Booking:           { count: jest.fn(), findAll: jest.fn() },
  Property:          { findAll: jest.fn() },
  Payment:           { count: jest.fn(), sum: jest.fn(), findAll: jest.fn() },
  AdminWallet:       { findOne: jest.fn() },
  AdminTransaction:  { findAll: jest.fn(), count: jest.fn() },
  WithdrawalRequest: { create: jest.fn(), findAll: jest.fn(), count: jest.fn() },
}));

jest.mock('../models/User', () => ({ findOne: jest.fn() }));

jest.mock('../db', () => ({
  sequelize: {
    fn:  jest.fn(() => 'SUM_FN'),
    col: jest.fn(() => 'COL_REF'),
    transaction: jest.fn(),
  },
  Sequelize: { Transaction: { ISOLATION_LEVELS: { SERIALIZABLE: 'SERIALIZABLE' } } },
}));

jest.mock('../utils/pagination', () => ({
  parsePagination: jest.fn(() => ({ limit: 20, offset: 0 })),
}));

jest.mock('../logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

// ─── Хелперы ────────────────────────────────────────────────────────────────

const SECRET          = 'test-secret-admin';
const userToken        = jwt.sign({ userId: 'user-1',  role: 'user'  }, SECRET);
const adminToken       = jwt.sign({ userId: 'admin-1', role: 'admin' }, SECRET);
const financeAdminTok  = jwt.sign({ userId: 'fadmin-1', role: 'admin' }, SECRET);

const {
  User, Booking, Property, Payment, AdminWallet, AdminTransaction, WithdrawalRequest,
} = require('../models');
const UserModel = require('../models/User');

const mockAdminUser       = { userId: 'admin-1',  role: 'admin', adminLevel: 0 };
const mockFinanceAdminUser = { userId: 'fadmin-1', role: 'admin', adminLevel: 1 };

const mockAdminWallet = () => ({
  adminId:          'fadmin-1',
  totalBalance:     '100000',
  availableBalance: '80000',
  pendingBalance:   '20000',
  totalReceived:    '150000',
  totalWithdrawn:   '50000',
  save:             jest.fn().mockResolvedValue(true),
});

const createApp = (isDbConnected = () => true) => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', require('../routes/admin')({ isDbConnected }));
  return app;
};

// ─── GET /stats ───────────────────────────────────────────────────────────────

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue(mockAdminUser);
    User.count.mockResolvedValue(10);
    Booking.count.mockResolvedValue(25);
    Booking.findAll.mockResolvedValue([{ total: '45000' }]);
    User.findAll.mockResolvedValue([
      { userId: 'u-1', displayName: 'Alice', email: 'a@b.com', membershipLevel: 'Gold', loyaltyPoints: 500 },
    ]);
    Property.findAll.mockResolvedValue([
      { id: 1, name: 'Стандарт' },
    ]);
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  test('403 для обычного пользователя', async () => {
    UserModel.findOne.mockResolvedValue({ userId: 'user-1', role: 'user' });
    const res = await request(createApp())
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(503);
  });

  test('200 возвращает статистику', async () => {
    const res = await request(createApp())
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.statsPerPeriod).toBeDefined();
    expect(Array.isArray(res.body.topUsers)).toBe(true);
    expect(Array.isArray(res.body.properties)).toBe(true);
  });
});

// ─── POST /ai-analysis ───────────────────────────────────────────────────────

describe('POST /api/admin/ai-analysis', () => {
  const validBody = { stats: { users: 10, purchases: 25, revenue: 45000 } };

  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue(mockAdminUser);
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).post('/api/admin/ai-analysis').send(validBody);
    expect(res.status).toBe(401);
  });

  test('503 когда OPENROUTER_API_KEY не настроен', async () => {
    const saved = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    const res = await request(createApp())
      .post('/api/admin/ai-analysis')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody);
    process.env.OPENROUTER_API_KEY = saved;
    expect(res.status).toBe(503);
  });

  test('400 без stats', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test-key';
    const res = await request(createApp())
      .post('/api/admin/ai-analysis')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    delete process.env.OPENROUTER_API_KEY;
    expect(res.status).toBe(400);
  });

  test('200 возвращает AI-анализ', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Анализ готов.' } }],
        model: 'gpt-4o-mini',
      }),
    });

    const res = await request(createApp())
      .post('/api/admin/ai-analysis')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody);

    delete process.env.OPENROUTER_API_KEY;
    delete global.fetch;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.analysis).toBe('string');
  });
});

// ─── GET /finances/summary ────────────────────────────────────────────────────

describe('GET /api/admin/finances/summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue(mockFinanceAdminUser);
    User.findOne.mockResolvedValue({ userId: 'fadmin-1', email: 'fa@ex.com', displayName: 'Finance', adminLevel: 1 });
    AdminWallet.findOne.mockResolvedValue(mockAdminWallet());
    Payment.count.mockResolvedValue(5);
    Payment.sum.mockResolvedValue(10000);
    Payment.findAll.mockResolvedValue([]);
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).get('/api/admin/finances/summary');
    expect(res.status).toBe(401);
  });

  test('403 для adminLevel 0 (не финансовый адмн)', async () => {
    UserModel.findOne.mockResolvedValue(mockAdminUser);
    const res = await request(createApp())
      .get('/api/admin/finances/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .get('/api/admin/finances/summary')
      .set('Authorization', `Bearer ${financeAdminTok}`);
    expect(res.status).toBe(503);
  });

  test('404 кошелёк не найден', async () => {
    AdminWallet.findOne.mockResolvedValue(null);
    const res = await request(createApp())
      .get('/api/admin/finances/summary')
      .set('Authorization', `Bearer ${financeAdminTok}`);
    expect(res.status).toBe(404);
  });

  test('200 возвращает финансовую сводку', async () => {
    const res = await request(createApp())
      .get('/api/admin/finances/summary')
      .set('Authorization', `Bearer ${financeAdminTok}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.wallet).toBeDefined();
    expect(res.body.statistics).toBeDefined();
  });
});

// ─── GET /finances/transactions ───────────────────────────────────────────────

describe('GET /api/admin/finances/transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue(mockFinanceAdminUser);
    AdminTransaction.findAll.mockResolvedValue([]);
    AdminTransaction.count.mockResolvedValue(0);
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).get('/api/admin/finances/transactions');
    expect(res.status).toBe(401);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .get('/api/admin/finances/transactions')
      .set('Authorization', `Bearer ${financeAdminTok}`);
    expect(res.status).toBe(503);
  });

  test('200 возвращает транзакции', async () => {
    const res = await request(createApp())
      .get('/api/admin/finances/transactions')
      .set('Authorization', `Bearer ${financeAdminTok}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.transactions)).toBe(true);
  });
});

// ─── POST /finances/withdrawal ────────────────────────────────────────────────

describe('POST /api/admin/finances/withdrawal', () => {
  const validBody = { amount: 5000, bankAccount: 'RU12 3456 7890 1234', reason: 'Вывод' };

  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue(mockFinanceAdminUser);
    User.findOne.mockResolvedValue({ userId: 'fadmin-1', adminLevel: 1 });
    AdminWallet.findOne.mockResolvedValue(mockAdminWallet());
    WithdrawalRequest.create.mockResolvedValue({ id: 'wr-1', ...validBody, status: 'pending' });
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).post('/api/admin/finances/withdrawal').send(validBody);
    expect(res.status).toBe(401);
  });

  test('400 без amount или bankAccount', async () => {
    const res = await request(createApp())
      .post('/api/admin/finances/withdrawal')
      .set('Authorization', `Bearer ${financeAdminTok}`)
      .send({ amount: 1000 });
    expect(res.status).toBe(400);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/admin/finances/withdrawal')
      .set('Authorization', `Bearer ${financeAdminTok}`)
      .send(validBody);
    expect(res.status).toBe(503);
  });

  test('400 недостаточно средств', async () => {
    AdminWallet.findOne.mockResolvedValue({ ...mockAdminWallet(), availableBalance: '100', save: jest.fn() });
    const res = await request(createApp())
      .post('/api/admin/finances/withdrawal')
      .set('Authorization', `Bearer ${financeAdminTok}`)
      .send({ amount: 99999, bankAccount: 'RU12' });
    expect(res.status).toBe(400);
    expect(res.body.availableBalance).toBeDefined();
  });

  test('201 запрос на вывод создан', async () => {
    const res = await request(createApp())
      .post('/api/admin/finances/withdrawal')
      .set('Authorization', `Bearer ${financeAdminTok}`)
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.withdrawalRequest).toBeDefined();
    expect(res.body.updatedWallet).toBeDefined();
  });
});

// ─── GET /finances/withdrawals ────────────────────────────────────────────────

describe('GET /api/admin/finances/withdrawals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue(mockFinanceAdminUser);
    WithdrawalRequest.findAll.mockResolvedValue([]);
    WithdrawalRequest.count.mockResolvedValue(0);
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).get('/api/admin/finances/withdrawals');
    expect(res.status).toBe(401);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .get('/api/admin/finances/withdrawals')
      .set('Authorization', `Bearer ${financeAdminTok}`);
    expect(res.status).toBe(503);
  });

  test('200 возвращает список запросов с ?status фильтром', async () => {
    const res = await request(createApp())
      .get('/api/admin/finances/withdrawals?status=pending')
      .set('Authorization', `Bearer ${financeAdminTok}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.withdrawals)).toBe(true);
  });
});
