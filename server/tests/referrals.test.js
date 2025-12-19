/**
 * Тесты маршрутов /api/referrals.
 */

process.env.JWT_SECRET = 'test-secret-referrals';
process.env.NODE_ENV   = 'test';

const jwt     = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// ─── Моки ────────────────────────────────────────────────────────────────────

const mockReferral = (overrides = {}) => ({
  id:             'ref-1',
  referralCode:   'REF_USER_ABC123',
  referrerId:     'user-1',
  referrerName:   'Test User',
  referredUserId: null,
  referredEmail:  null,
  status:         'pending',
  bonus:          0,
  completedAt:    null,
  update:         jest.fn().mockResolvedValue(true),
  ...overrides,
});

jest.mock('../models', () => ({
  Referral: {
    findOne: jest.fn(),
    create:  jest.fn(),
  },
  LoyaltyCard:  { findOne: jest.fn() },
  Transaction:  { create: jest.fn() },
  Notification: { create: jest.fn() },
}));

jest.mock('../models/User', () => ({ findOne: jest.fn() }));

jest.mock('../logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

// ─── Хелперы ────────────────────────────────────────────────────────────────

const SECRET     = 'test-secret-referrals';
const userToken  = jwt.sign({ userId: 'user-1', role: 'user'  }, SECRET);
const otherToken = jwt.sign({ userId: 'user-2', role: 'user'  }, SECRET);

const { Referral, LoyaltyCard, Transaction } = require('../models');

const createApp = (isDbConnected = () => true) => {
  const app = express();
  app.use(express.json());
  app.use('/api/referrals', require('../routes/referrals')({ isDbConnected }));
  return app;
};

// ─── POST /generate ───────────────────────────────────────────────────────────

describe('POST /api/referrals/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Referral.findOne.mockResolvedValue(null);
    Referral.create.mockResolvedValue(mockReferral());
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).post('/api/referrals/generate').send({});
    expect(res.status).toBe(401);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/referrals/generate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(res.status).toBe(503);
  });

  test('200 возвращает существующий код (идемпотентно)', async () => {
    Referral.findOne.mockResolvedValue(mockReferral());
    const res = await request(createApp())
      .post('/api/referrals/generate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userName: 'Test' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.referral).toBeDefined();
    expect(Referral.create).not.toHaveBeenCalled();
  });

  test('201 создаёт новый реферальный код', async () => {
    const res = await request(createApp())
      .post('/api/referrals/generate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userName: 'Test User' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.referral).toBeDefined();
    expect(Referral.create).toHaveBeenCalled();
  });
});

// ─── POST /apply ──────────────────────────────────────────────────────────────

describe('POST /api/referrals/apply', () => {
  const validBody = { referralCode: 'REF_USER_ABC123', newUserId: 'user-99', newUserEmail: 'new@example.com' };

  const mockCard = () => ({
    balance:      '1000',
    totalEarned:  '200',
    save:         jest.fn().mockResolvedValue(true),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Referral.findOne.mockResolvedValue(mockReferral());
    LoyaltyCard.findOne.mockResolvedValue(mockCard());
    Transaction.create.mockResolvedValue({ id: 'tx-1' });
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).post('/api/referrals/apply').send(validBody);
    expect(res.status).toBe(401);
  });

  test('400 когда referralCode или newUserId не переданы', async () => {
    const res = await request(createApp())
      .post('/api/referrals/apply')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ referralCode: 'REF_USER_ABC123' });
    expect(res.status).toBe(400);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/referrals/apply')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody);
    expect(res.status).toBe(503);
  });

  test('404 реферальный код не найден', async () => {
    Referral.findOne.mockResolvedValue(null);
    const res = await request(createApp())
      .post('/api/referrals/apply')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody);
    expect(res.status).toBe(404);
  });

  test('400 код уже использован', async () => {
    Referral.findOne.mockResolvedValue(mockReferral({ status: 'completed' }));
    const res = await request(createApp())
      .post('/api/referrals/apply')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/использован/);
  });

  test('200 код применён, бонус начислен реферреру', async () => {
    const res = await request(createApp())
      .post('/api/referrals/apply')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.bonus).toBe(500);
    expect(LoyaltyCard.findOne).toHaveBeenCalled();
    expect(Transaction.create).toHaveBeenCalled();
  });

  test('200 работает даже если карта реферрера не найдена', async () => {
    LoyaltyCard.findOne.mockResolvedValue(null);
    const res = await request(createApp())
      .post('/api/referrals/apply')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Transaction.create).not.toHaveBeenCalled();
  });
});

// ─── GET /user/:userId ────────────────────────────────────────────────────────

describe('GET /api/referrals/user/:userId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Referral.findOne.mockResolvedValue(mockReferral());
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).get('/api/referrals/user/user-1');
    expect(res.status).toBe(401);
  });

  test('403 при запросе чужой реферальной информации', async () => {
    const res = await request(createApp())
      .get('/api/referrals/user/user-1')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .get('/api/referrals/user/user-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(503);
  });

  test('200 возвращает null + нулевую статистику если реферала нет', async () => {
    Referral.findOne.mockResolvedValue(null);
    const res = await request(createApp())
      .get('/api/referrals/user/user-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.referral).toBeNull();
    expect(res.body.stats.total).toBe(0);
  });

  test('200 возвращает реферал и статистику', async () => {
    const res = await request(createApp())
      .get('/api/referrals/user/user-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.referral).toBeDefined();
    expect(res.body.stats).toBeDefined();
  });

  test('200 stats.completed = 1 для завершённого реферала', async () => {
    Referral.findOne.mockResolvedValue(mockReferral({ status: 'completed', bonus: '500' }));
    const res = await request(createApp())
      .get('/api/referrals/user/user-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.stats.completed).toBe(1);
    expect(res.body.stats.totalBonus).toBe(500);
  });
});
