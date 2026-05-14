/**
 * Тесты маршрутов /api/properties.
 */

process.env.JWT_SECRET = 'test-secret-props';
process.env.NODE_ENV   = 'test';

const jwt     = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// ─── Моки ────────────────────────────────────────────────────────────────────

const mockProperty = (overrides = {}) => ({
  id:          1,
  name:        'Стандарт',
  description: 'Описание',
  price:       150,
  status:      'available',
  image:       'st1.png',
  amenities:   [],
  toJSON:      jest.fn().mockReturnValue({ id: 1, name: 'Стандарт', price: 150, image: 'st1.png' }),
  update:      jest.fn().mockResolvedValue(true),
  destroy:     jest.fn().mockResolvedValue(true),
  ...overrides,
});

jest.mock('../models', () => ({
  Property: {
    findAll:  jest.fn(),
    findByPk: jest.fn(),
    create:   jest.fn(),
  },
}));

jest.mock('../models/User', () => ({ findOne: jest.fn() }));

jest.mock('../logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

// ─── Хелперы ────────────────────────────────────────────────────────────────

const SECRET     = 'test-secret-props';
const adminToken = jwt.sign({ userId: 'admin-1', role: 'admin' }, SECRET);
const userToken  = jwt.sign({ userId: 'user-1',  role: 'user'  }, SECRET);

const { Property } = require('../models');
const UserModel     = require('../models/User');

const createApp = (isDbConnected = () => true) => {
  const app = express();
  app.use(express.json());
  app.use('/api/properties', require('../routes/properties')({ isDbConnected }));
  return app;
};

// ─── GET / ───────────────────────────────────────────────────────────────────

describe('GET /api/properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Property.findAll.mockResolvedValue([mockProperty()]);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false)).get('/api/properties');
    expect(res.status).toBe(503);
  });

  test('200 возвращает список объектов', async () => {
    const res = await request(createApp()).get('/api/properties');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.properties)).toBe(true);
    expect(typeof res.body.count).toBe('number');
  });
});

// ─── GET /:propertyId ────────────────────────────────────────────────────────

describe('GET /api/properties/:propertyId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Property.findByPk.mockResolvedValue(mockProperty());
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false)).get('/api/properties/1');
    expect(res.status).toBe(503);
  });

  test('404 объект не найден', async () => {
    Property.findByPk.mockResolvedValue(null);
    const res = await request(createApp()).get('/api/properties/999');
    expect(res.status).toBe(404);
  });

  test('200 возвращает объект', async () => {
    const res = await request(createApp()).get('/api/properties/1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.property).toBeDefined();
  });
});

// ─── POST / (admin) ──────────────────────────────────────────────────────────

describe('POST /api/properties (только для админа)', () => {
  const body = { name: 'Новый объект', price: 200 };

  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue({ userId: 'admin-1', role: 'admin' });
    Property.create.mockResolvedValue(mockProperty());
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).post('/api/properties').send(body);
    expect(res.status).toBe(401);
  });

  test('403 для обычного пользователя', async () => {
    UserModel.findOne.mockResolvedValue({ userId: 'user-1', role: 'user' });
    const res = await request(createApp())
      .post('/api/properties')
      .set('Authorization', `Bearer ${userToken}`)
      .send(body);
    expect(res.status).toBe(403);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/properties')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);
    expect(res.status).toBe(503);
  });

  test('400 без name или price', async () => {
    const res = await request(createApp())
      .post('/api/properties')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Только название' });
    expect(res.status).toBe(400);
  });

  test('201 объект создан', async () => {
    const res = await request(createApp())
      .post('/api/properties')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.property).toBeDefined();
  });
});

// ─── PATCH /:propertyId (admin) ───────────────────────────────────────────────

describe('PATCH /api/properties/:propertyId (только для админа)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue({ userId: 'admin-1', role: 'admin' });
    Property.findByPk.mockResolvedValue(mockProperty());
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).patch('/api/properties/1').send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .patch('/api/properties/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' });
    expect(res.status).toBe(503);
  });

  test('404 объект не найден', async () => {
    Property.findByPk.mockResolvedValue(null);
    const res = await request(createApp())
      .patch('/api/properties/999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  test('200 объект обновлён', async () => {
    const res = await request(createApp())
      .patch('/api/properties/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Обновлённое название', price: 300 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── DELETE /:propertyId (admin) ──────────────────────────────────────────────

describe('DELETE /api/properties/:propertyId (только для админа)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue({ userId: 'admin-1', role: 'admin' });
    Property.findByPk.mockResolvedValue(mockProperty());
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).delete('/api/properties/1');
    expect(res.status).toBe(401);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .delete('/api/properties/1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(503);
  });

  test('404 объект не найден', async () => {
    Property.findByPk.mockResolvedValue(null);
    const res = await request(createApp())
      .delete('/api/properties/999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  test('200 объект удалён', async () => {
    const res = await request(createApp())
      .delete('/api/properties/1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
