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
  User:                { count: jest.fn(), findOne: jest.fn(), findAll: jest.fn() },
  Booking:             { count: jest.fn(), findAll: jest.fn() },
  Property:            { findAll: jest.fn() },
  Payment:             { count: jest.fn(), sum: jest.fn(), findAll: jest.fn() },
  AdminWallet:         { findOne: jest.fn() },
  AdminTransaction:    { findAll: jest.fn(), count: jest.fn(), create: jest.fn() },
  WithdrawalRequest:   { create: jest.fn(), findAll: jest.fn(), findByPk: jest.fn(), count: jest.fn() },
  WithdrawalAuditLog:  { create: jest.fn(), findAll: jest.fn() },
  LoyaltyCard:         { findOne: jest.fn() },
  Transaction:         { create: jest.fn() },
  Notification:        { create: jest.fn() },
}));

jest.mock('../models/User', () => ({ findOne: jest.fn() }));

const makeTxn = () => ({
  LOCK:     { UPDATE: 'UPDATE' },
  commit:   jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
});

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

jest.mock('../services/mlClient', () => ({
  churnPredict: jest.fn(),
  rfmRecompute: jest.fn(),
  recommendEvents: jest.fn(),
  health: jest.fn(),
}));
const mlClient = require('../services/mlClient');

// ─── Хелперы ────────────────────────────────────────────────────────────────

const SECRET          = 'test-secret-admin';
const userToken        = jwt.sign({ userId: 'user-1',  role: 'user'  }, SECRET);
const adminToken       = jwt.sign({ userId: 'admin-1', role: 'admin' }, SECRET);
const financeAdminTok  = jwt.sign({ userId: 'fadmin-1', role: 'admin' }, SECRET);

const {
  User, Booking, Property, Payment, AdminWallet, AdminTransaction, WithdrawalRequest, WithdrawalAuditLog,
  LoyaltyCard, Transaction, Notification,
} = require('../models');
const UserModel = require('../models/User');
const { sequelize } = require('../db');

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
    sequelize.transaction.mockResolvedValue(makeTxn());
    UserModel.findOne.mockResolvedValue(mockFinanceAdminUser);
    User.findOne.mockResolvedValue({ userId: 'fadmin-1', adminLevel: 1 });
    AdminWallet.findOne.mockResolvedValue(mockAdminWallet());
    WithdrawalRequest.create.mockResolvedValue({ id: 'wr-1', ...validBody, status: 'pending' });
    WithdrawalAuditLog.create.mockResolvedValue({ id: 'wal-1' });
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

// ─── GET /churn-risk ─────────────────────────────────────────────────────────

describe('GET /api/admin/churn-risk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue(mockAdminUser);
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).get('/api/admin/churn-risk');
    expect(res.status).toBe(401);
  });

  test('403 для обычного пользователя', async () => {
    UserModel.findOne.mockResolvedValue({ userId: 'user-1', role: 'user' });
    const res = await request(createApp())
      .get('/api/admin/churn-risk')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .get('/api/admin/churn-risk')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(503);
  });

  test('пусто если нет активных пользователей', async () => {
    Booking.findAll.mockResolvedValue([]);
    const res = await request(createApp())
      .get('/api/admin/churn-risk')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(mlClient.churnPredict).not.toHaveBeenCalled();
  });

  test('возвращает сортированный список с профилями', async () => {
    Booking.findAll.mockResolvedValue([
      { userId: 'u-low' }, { userId: 'u-med' }, { userId: 'u-high' },
    ]);
    mlClient.churnPredict
      .mockResolvedValueOnce({ ok: true, data: { user_id: 'u-low',  churn_probability: 0.10, risk: 'low' } })
      .mockResolvedValueOnce({ ok: true, data: { user_id: 'u-med',  churn_probability: 0.55, risk: 'medium' } })
      .mockResolvedValueOnce({ ok: true, data: { user_id: 'u-high', churn_probability: 0.90, risk: 'high' } });
    User.findAll.mockResolvedValue([
      { userId: 'u-high', displayName: 'Alice', email: 'a@b', membershipLevel: 'Silver' },
      { userId: 'u-med',  displayName: 'Bob',   email: 'b@b', membershipLevel: 'Bronze' },
      { userId: 'u-low',  displayName: 'Carol', email: 'c@b', membershipLevel: 'Gold' },
    ]);

    const res = await request(createApp())
      .get('/api/admin/churn-risk')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(3);
    expect(res.body.items.map((i) => i.userId)).toEqual(['u-high', 'u-med', 'u-low']);
    expect(res.body.items[0].displayName).toBe('Alice');
    expect(res.body.items[0].probability).toBe(0.9);
    expect(res.body.meta.counts).toEqual({ high: 1, medium: 1, low: 1 });
    expect(res.body.meta.scanned).toBe(3);
    expect(res.body.meta.predicted).toBe(3);
    expect(res.body.meta.failed).toBe(0);
  });

  test('фильтр ?risk=high оставляет только high', async () => {
    Booking.findAll.mockResolvedValue([{ userId: 'u-a' }, { userId: 'u-b' }]);
    mlClient.churnPredict
      .mockResolvedValueOnce({ ok: true, data: { risk: 'low',  churn_probability: 0.1 } })
      .mockResolvedValueOnce({ ok: true, data: { risk: 'high', churn_probability: 0.85 } });
    User.findAll.mockResolvedValue([{ userId: 'u-b', displayName: 'X', email: 'x@x', membershipLevel: 'Bronze' }]);

    const res = await request(createApp())
      .get('/api/admin/churn-risk?risk=high')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].risk).toBe('high');
  });

  test('503 partial когда ML полностью недоступен', async () => {
    Booking.findAll.mockResolvedValue([{ userId: 'u-a' }, { userId: 'u-b' }]);
    mlClient.churnPredict.mockResolvedValue({ ok: false, error: 'ECONNREFUSED' });
    const res = await request(createApp())
      .get('/api/admin/churn-risk')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(503);
    expect(res.body.partial).toBe(true);
    expect(res.body.failed).toBe(2);
  });

  test('limit клампится в [1, 500]', async () => {
    Booking.findAll.mockResolvedValue([]);
    await request(createApp())
      .get('/api/admin/churn-risk?limit=99999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(Booking.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 500 }),
    );

    await request(createApp())
      .get('/api/admin/churn-risk?limit=0')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(Booking.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 1 }),
    );
  });
});

// ─── POST /users/:userId/adjust-balance ───────────────────────────────────────

describe('POST /api/admin/users/:userId/adjust-balance', () => {
  const VALID_BODY = {
    amount: 500,
    reason: 'compensation',
    description: 'Компенсация за неудобства при бронировании #42',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue(mockFinanceAdminUser);
    sequelize.transaction.mockResolvedValue(makeTxn());
  });

  test('403 если не финансовый админ (adminLevel != 1)', async () => {
    UserModel.findOne.mockResolvedValue(mockAdminUser);
    const res = await request(createApp())
      .post('/api/admin/users/u-target/adjust-balance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(VALID_BODY);
    expect(res.status).toBe(403);
  });

  test('401 без токена', async () => {
    const res = await request(createApp())
      .post('/api/admin/users/u-target/adjust-balance')
      .send(VALID_BODY);
    expect(res.status).toBe(401);
  });

  test('400 при невалидной сумме (0)', async () => {
    const res = await request(createApp())
      .post('/api/admin/users/u-target/adjust-balance')
      .set('Authorization', `Bearer ${financeAdminTok}`)
      .send({ ...VALID_BODY, amount: 0 });
    expect(res.status).toBe(400);
  });

  test('400 при неизвестном reason', async () => {
    const res = await request(createApp())
      .post('/api/admin/users/u-target/adjust-balance')
      .set('Authorization', `Bearer ${financeAdminTok}`)
      .send({ ...VALID_BODY, reason: 'bogus' });
    expect(res.status).toBe(400);
  });

  test('404 если пользователь не найден', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(createApp())
      .post('/api/admin/users/u-missing/adjust-balance')
      .set('Authorization', `Bearer ${financeAdminTok}`)
      .send(VALID_BODY);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Пользователь/);
  });

  test('400 если целевой — админ', async () => {
    User.findOne.mockResolvedValue({ userId: 'admin-2', role: 'admin', email: 'a2@x.com' });
    const res = await request(createApp())
      .post('/api/admin/users/admin-2/adjust-balance')
      .set('Authorization', `Bearer ${financeAdminTok}`)
      .send(VALID_BODY);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/админа/);
  });

  test('404 если карта не найдена', async () => {
    User.findOne.mockResolvedValue({ userId: 'u-target', role: 'user', email: 'u@x.com' });
    LoyaltyCard.findOne.mockResolvedValue(null);
    const res = await request(createApp())
      .post('/api/admin/users/u-target/adjust-balance')
      .set('Authorization', `Bearer ${financeAdminTok}`)
      .send(VALID_BODY);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Карта/);
  });

  test('409 при списании больше баланса карты', async () => {
    User.findOne.mockResolvedValue({ userId: 'u-target', role: 'user', email: 'u@x.com' });
    LoyaltyCard.findOne.mockResolvedValue({
      userId: 'u-target',
      balance: '100',
      update: jest.fn().mockResolvedValue(true),
    });
    AdminWallet.findOne.mockResolvedValue({
      adminId: 'fadmin-1',
      totalBalance: '50000',
      availableBalance: '40000',
      update: jest.fn().mockResolvedValue(true),
    });

    const res = await request(createApp())
      .post('/api/admin/users/u-target/adjust-balance')
      .set('Authorization', `Bearer ${financeAdminTok}`)
      .send({ ...VALID_BODY, amount: -500, reason: 'penalty' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Недостаточно средств на карте/);
    expect(Transaction.create).not.toHaveBeenCalled();
  });

  test('409 при зачислении больше доступного в кошельке админа', async () => {
    User.findOne.mockResolvedValue({ userId: 'u-target', role: 'user', email: 'u@x.com' });
    LoyaltyCard.findOne.mockResolvedValue({
      userId: 'u-target',
      balance: '100',
      update: jest.fn().mockResolvedValue(true),
    });
    AdminWallet.findOne.mockResolvedValue({
      adminId: 'fadmin-1',
      totalBalance: '300',
      availableBalance: '200',
      update: jest.fn().mockResolvedValue(true),
    });

    const res = await request(createApp())
      .post('/api/admin/users/u-target/adjust-balance')
      .set('Authorization', `Bearer ${financeAdminTok}`)
      .send({ ...VALID_BODY, amount: 500 });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Недостаточно доступных средств/);
    expect(Transaction.create).not.toHaveBeenCalled();
  });

  test('успех при положительной корректировке: AdminWallet ↓, LoyaltyCard ↑, аудит', async () => {
    User.findOne.mockResolvedValue({ userId: 'u-target', role: 'user', email: 'u@x.com' });

    const cardUpdate = jest.fn().mockResolvedValue(true);
    LoyaltyCard.findOne.mockResolvedValue({
      userId: 'u-target',
      balance: '1000',
      update: cardUpdate,
    });
    const walletUpdate = jest.fn().mockResolvedValue(true);
    AdminWallet.findOne.mockResolvedValue({
      adminId: 'fadmin-1',
      totalBalance: '50000',
      availableBalance: '40000',
      update: walletUpdate,
    });

    Transaction.create.mockResolvedValue({});
    AdminTransaction.create.mockResolvedValue({});
    Notification.create.mockResolvedValue({});

    const res = await request(createApp())
      .post('/api/admin/users/u-target/adjust-balance')
      .set('Authorization', `Bearer ${financeAdminTok}`)
      .send(VALID_BODY);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.userBalanceBefore).toBe(1000);
    expect(res.body.userBalanceAfter).toBe(1500);
    expect(res.body.walletBalanceAfter).toBe(49500);

    expect(cardUpdate).toHaveBeenCalledWith({ balance: 1500 }, expect.any(Object));
    expect(walletUpdate).toHaveBeenCalledWith({
      totalBalance: 49500,
      availableBalance: 39500,
    }, expect.any(Object));

    expect(Transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u-target',
        type: 'credit',
        category: 'admin_adjustment',
        amount: 500,
        balanceBefore: 1000,
        balanceAfter: 1500,
        performedBy: 'fadmin-1',
        relatedType: 'admin_adjustment',
      }),
      expect.any(Object),
    );
    expect(AdminTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 'fadmin-1',
        type: 'adjustment',
        amount: 500,
      }),
      expect.any(Object),
    );
    expect(Notification.create).toHaveBeenCalled();
  });

  test('успех при отрицательной корректировке: LoyaltyCard ↓, AdminWallet ↑', async () => {
    User.findOne.mockResolvedValue({ userId: 'u-target', role: 'user', email: 'u@x.com' });

    const cardUpdate = jest.fn().mockResolvedValue(true);
    LoyaltyCard.findOne.mockResolvedValue({
      userId: 'u-target',
      balance: '2000',
      update: cardUpdate,
    });
    const walletUpdate = jest.fn().mockResolvedValue(true);
    AdminWallet.findOne.mockResolvedValue({
      adminId: 'fadmin-1',
      totalBalance: '10000',
      availableBalance: '8000',
      update: walletUpdate,
    });

    Transaction.create.mockResolvedValue({});
    AdminTransaction.create.mockResolvedValue({});
    Notification.create.mockResolvedValue({});

    const res = await request(createApp())
      .post('/api/admin/users/u-target/adjust-balance')
      .set('Authorization', `Bearer ${financeAdminTok}`)
      .send({ amount: -300, reason: 'penalty', description: 'Штраф за no-show' });

    expect(res.status).toBe(200);
    expect(res.body.userBalanceAfter).toBe(1700);
    expect(res.body.walletBalanceAfter).toBe(10300);

    expect(cardUpdate).toHaveBeenCalledWith({ balance: 1700 }, expect.any(Object));
    expect(walletUpdate).toHaveBeenCalledWith({
      totalBalance: 10300,
      availableBalance: 8300,
    }, expect.any(Object));

    expect(Transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'debit',
        category: 'admin_adjustment',
        amount: 300,
        balanceBefore: 2000,
        balanceAfter: 1700,
      }),
      expect.any(Object),
    );
  });

  test('rollback при ошибке БД во время записи в Transaction', async () => {
    User.findOne.mockResolvedValue({ userId: 'u-target', role: 'user', email: 'u@x.com' });
    LoyaltyCard.findOne.mockResolvedValue({
      userId: 'u-target',
      balance: '1000',
      update: jest.fn().mockResolvedValue(true),
    });
    AdminWallet.findOne.mockResolvedValue({
      adminId: 'fadmin-1',
      totalBalance: '50000',
      availableBalance: '40000',
      update: jest.fn().mockResolvedValue(true),
    });

    const txn = makeTxn();
    sequelize.transaction.mockResolvedValue(txn);
    Transaction.create.mockRejectedValue(new Error('insert failed'));

    const res = await request(createApp())
      .post('/api/admin/users/u-target/adjust-balance')
      .set('Authorization', `Bearer ${financeAdminTok}`)
      .send(VALID_BODY);

    expect(res.status).toBe(500);
    expect(txn.rollback).toHaveBeenCalled();
  });
});
