/**
 * Тесты маршрутов /api/payments/google-play.
 * Все обращения к Google Play API и БД замокированы.
 */

process.env.JWT_SECRET = 'test-secret-googleplay';
process.env.NODE_ENV   = 'test';

const jwt     = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// ─── Моки ────────────────────────────────────────────────────────────────────

jest.mock('../models', () => ({
  CardTopUp: { findOne: jest.fn() },
}));

// middleware/auth.js делает прямой require('../models/User') — нужен отдельный мок.
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

jest.mock('../services/googlePlayService', () => ({
  verifyPurchase:      jest.fn(),
  acknowledgePurchase: jest.fn().mockResolvedValue({ acknowledged: true }),
}));

jest.mock('../services/cardCreditService', () => ({
  creditCard:              jest.fn(),
  sendTopupNotifications:  jest.fn().mockResolvedValue(undefined),
}));

// ─── Хелперы ────────────────────────────────────────────────────────────────

const SECRET    = 'test-secret-googleplay';
const userToken = jwt.sign({ userId: 'user-1', role: 'user' }, SECRET);

const { sequelize }            = require('../db');
const { CardTopUp }            = require('../models');
const googlePlayService        = require('../services/googlePlayService');
const cardCreditService        = require('../services/cardCreditService');

const createApp = (isDbConnected = () => true) => {
  const app = express();
  app.use(express.json());
  app.use('/api/payments/google-play',
    require('../routes/googlePlay')({ isDbConnected }));
  return app;
};

// Длинный «реальный» purchaseToken — 700 символов (Google обычно 600–1000).
const LONG_TOKEN = 'a'.repeat(700);

// ─── POST /verify ────────────────────────────────────────────────────────────

describe('POST /api/payments/google-play/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(() => Promise.resolve(makeTxn()));
    CardTopUp.findOne.mockResolvedValue(null);
    googlePlayService.verifyPurchase.mockResolvedValue({
      verified: true,
      purchaseState: 0,
      orderId: 'GPA.0000-0000',
      purchaseTimeMillis: '1717500000000',
      priceAmountMicros: '100000000',
      priceCurrencyCode: 'RUB',
    });
    cardCreditService.creditCard.mockResolvedValue({
      topup:         { id: 42 },
      card:          { balance: '1500' },
      balanceBefore: 1000,
      balanceAfter:  2000,
      duplicate:     false,
    });
  });

  test('401 без токена', async () => {
    const res = await request(createApp())
      .post('/api/payments/google-play/verify')
      .send({ productId: 'prb_topup_1000', purchaseToken: 'tok' });
    expect(res.status).toBe(401);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/payments/google-play/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 'prb_topup_1000', purchaseToken: 'tok' });
    expect(res.status).toBe(503);
  });

  test('400 когда productId не передан', async () => {
    const res = await request(createApp())
      .post('/api/payments/google-play/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ purchaseToken: 'tok' });
    expect(res.status).toBe(400);
  });

  test('400 когда purchaseToken не передан', async () => {
    const res = await request(createApp())
      .post('/api/payments/google-play/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 'prb_topup_1000' });
    expect(res.status).toBe(400);
  });

  test('400 при неизвестном productId', async () => {
    const res = await request(createApp())
      .post('/api/payments/google-play/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 'prb_topup_999', purchaseToken: 'tok' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Неизвестный productId/);
  });

  test('200 idempotent: уже зачисленный purchaseToken возвращает duplicate', async () => {
    CardTopUp.findOne.mockResolvedValueOnce({
      id: 99,
      amount: '1000',
      status: 'completed',
    });

    const res = await request(createApp())
      .post('/api/payments/google-play/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 'prb_topup_1000', purchaseToken: 'tok-already' });

    expect(res.status).toBe(200);
    expect(res.body.duplicate).toBe(true);
    expect(res.body.topupId).toBe(99);
    expect(res.body.amountPRB).toBe(1000);
    // Не должны вызывать Google и creditCard
    expect(googlePlayService.verifyPurchase).not.toHaveBeenCalled();
    expect(cardCreditService.creditCard).not.toHaveBeenCalled();
  });

  test('402 когда Google вернул verified=false', async () => {
    googlePlayService.verifyPurchase.mockResolvedValueOnce({
      verified: false,
      purchaseState: 1,
    });

    const res = await request(createApp())
      .post('/api/payments/google-play/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 'prb_topup_1000', purchaseToken: 'tok-bad' });

    expect(res.status).toBe(402);
    expect(cardCreditService.creditCard).not.toHaveBeenCalled();
  });

  test('200 успешное зачисление вызывает creditCard и acknowledge', async () => {
    const res = await request(createApp())
      .post('/api/payments/google-play/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 'prb_topup_1000', purchaseToken: 'tok-ok' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.amountPRB).toBe(1000);
    expect(res.body.newBalance).toBe(2000);
    expect(res.body.duplicate).toBe(false);

    expect(cardCreditService.creditCard).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      amount: 1000,
      provider: 'google_play',
      providerSessionId: 'tok-ok',
      providerPaymentId: 'GPA.0000-0000',
    }));
    expect(googlePlayService.acknowledgePurchase).toHaveBeenCalledWith('prb_topup_1000', 'tok-ok');
    expect(cardCreditService.sendTopupNotifications).toHaveBeenCalled();
  });

  test('200 при duplicate из creditCard не шлёт нотификаций', async () => {
    cardCreditService.creditCard.mockResolvedValueOnce({
      topup:         { id: 7 },
      card:          { balance: '1000' },
      balanceBefore: 1000,
      balanceAfter:  1000,
      duplicate:     true,
    });

    const res = await request(createApp())
      .post('/api/payments/google-play/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 'prb_topup_500', purchaseToken: 'tok-dup' });

    expect(res.status).toBe(200);
    expect(res.body.duplicate).toBe(true);
    expect(cardCreditService.sendTopupNotifications).not.toHaveBeenCalled();
  });

  test('длинный purchaseToken (700 символов) проходит без проблем', async () => {
    const res = await request(createApp())
      .post('/api/payments/google-play/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 'prb_topup_3000', purchaseToken: LONG_TOKEN });

    expect(res.status).toBe(200);
    expect(cardCreditService.creditCard).toHaveBeenCalledWith(expect.objectContaining({
      providerSessionId: LONG_TOKEN,
      amount: 3000,
    }));
  });

  test('конвертация priceAmountMicros в priceCents', async () => {
    googlePlayService.verifyPurchase.mockResolvedValueOnce({
      verified: true,
      orderId: 'GPA.X',
      priceAmountMicros: '1234500000',  // 1234.50 RUB
      priceCurrencyCode: 'RUB',
    });

    await request(createApp())
      .post('/api/payments/google-play/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 'prb_topup_1000', purchaseToken: 'tok' });

    expect(cardCreditService.creditCard).toHaveBeenCalledWith(expect.objectContaining({
      originalAmount: 1234.5,
      originalCurrency: 'RUB',
    }));
  });

  test('500 + откат транзакции при ошибке creditCard', async () => {
    const txn = makeTxn();
    sequelize.transaction.mockResolvedValueOnce(txn);
    cardCreditService.creditCard.mockRejectedValueOnce(new Error('db boom'));

    const res = await request(createApp())
      .post('/api/payments/google-play/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 'prb_topup_1000', purchaseToken: 'tok-fail' });

    expect(res.status).toBe(500);
    expect(txn.rollback).toHaveBeenCalled();
    expect(txn.commit).not.toHaveBeenCalled();
    expect(googlePlayService.acknowledgePurchase).not.toHaveBeenCalled();
  });

  test('acknowledge fail не ломает успешный ответ', async () => {
    googlePlayService.acknowledgePurchase.mockRejectedValueOnce(new Error('ack down'));

    const res = await request(createApp())
      .post('/api/payments/google-play/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 'prb_topup_500', purchaseToken: 'tok-ack-fail' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── GET /products ───────────────────────────────────────────────────────────

describe('GET /api/payments/google-play/products', () => {
  test('401 без токена', async () => {
    const res = await request(createApp())
      .get('/api/payments/google-play/products');
    expect(res.status).toBe(401);
  });

  test('200 возвращает список SKU → PRB', async () => {
    const res = await request(createApp())
      .get('/api/payments/google-play/products')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBeGreaterThan(0);
    expect(res.body.products[0]).toHaveProperty('productId');
    expect(res.body.products[0]).toHaveProperty('amountPRB');
  });
});
