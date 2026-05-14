/**
 * Тесты маршрутов /api/users.
 * Все обращения к БД замокированы.
 */

process.env.JWT_SECRET = 'test-secret-users';
process.env.NODE_ENV   = 'test';

const jwt     = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// ─── Моки ────────────────────────────────────────────────────────────────────

const mockUserRecord = (overrides = {}) => ({
  userId:          'user-1',
  email:           'user@example.com',
  displayName:     'Тест Пользователь',
  phone:           null,
  avatar:          null,
  address:         null,
  role:            'user',
  membershipLevel: 'Bronze',
  loyaltyPoints:   0,
  createdAt:       new Date('2025-01-01'),
  update:          jest.fn().mockResolvedValue(true),
  destroy:         jest.fn().mockResolvedValue(true),
  ...overrides,
});

jest.mock('../models', () => ({
  User: {
    findAll:  jest.fn(),
    findOne:  jest.fn(),
    update:   jest.fn(),
    destroy:  jest.fn(),
  },
  Booking:      { count: jest.fn(), destroy: jest.fn() },
  LoyaltyCard:  { findOne: jest.fn(), destroy: jest.fn() },
  Transaction:  { destroy: jest.fn() },
  Notification: { destroy: jest.fn() },
}));

// verifyAdmin обращается к ../models/User напрямую
jest.mock('../models/User', () => ({ findOne: jest.fn() }));

jest.mock('../utils/onlineUsers', () => ({
  isUserOnline: jest.fn(() => false),
  markUserOffline: jest.fn(),
}));

jest.mock('../logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

// ─── Хелперы ────────────────────────────────────────────────────────────────

const SECRET     = 'test-secret-users';
const userToken  = jwt.sign({ userId: 'user-1', role: 'user' },  SECRET);
const adminToken = jwt.sign({ userId: 'admin-1', role: 'admin' }, SECRET);
const otherToken = jwt.sign({ userId: 'user-2', role: 'user' },  SECRET);

const { User, Booking, LoyaltyCard } = require('../models');
const UserModel = require('../models/User');

const createApp = (isDbConnected = () => true) => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', require('../routes/users')({ isDbConnected }));
  return app;
};

// ─── GET / — список пользователей [admin] ─────────────────────────────────────

describe('GET /api/users (только для админа)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue({ userId: 'admin-1', role: 'admin' });
    User.findAll.mockResolvedValue([
      { userId: 'u-1', email: 'a@b.com', displayName: 'Alice', role: 'user',
        membershipLevel: 'Bronze', loyaltyPoints: 0, phone: null, avatar: null,
        createdAt: new Date() },
    ]);
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).get('/api/users');
    expect(res.status).toBe(401);
  });

  test('403 для обычного пользователя', async () => {
    UserModel.findOne.mockResolvedValue({ userId: 'user-1', role: 'user' });
    const res = await request(createApp())
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(503);
  });

  test('200 возвращает список пользователей для администратора', async () => {
    const res = await request(createApp())
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  test('200 фильтрует по ?role=admin', async () => {
    User.findAll.mockResolvedValue([]);
    const res = await request(createApp())
      .get('/api/users?role=admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(User.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: 'admin' } })
    );
  });
});

// ─── GET /:userId — профиль пользователя ─────────────────────────────────────

describe('GET /api/users/:userId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findOne.mockResolvedValue(mockUserRecord());
    Booking.count.mockResolvedValue(3);
    LoyaltyCard.findOne.mockResolvedValue({ balance: '1500', totalEarned: '300' });
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).get('/api/users/user-1');
    expect(res.status).toBe(401);
  });

  test('403 при запросе чужого профиля (не владелец и не админ)', async () => {
    const res = await request(createApp())
      .get('/api/users/user-1')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .get('/api/users/user-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(503);
  });

  test('404 когда пользователь не найден', async () => {
    User.findOne.mockResolvedValue(null);
    UserModel.findOne.mockResolvedValue({ userId: 'admin-1', role: 'admin' });
    const res = await request(createApp())
      .get('/api/users/ghost-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  test('200 владелец получает свой профиль', async () => {
    const res = await request(createApp())
      .get('/api/users/user-1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('user@example.com');
  });
});

// ─── PATCH /:userId — обновление профиля ─────────────────────────────────────

describe('PATCH /api/users/:userId', () => {
  const updateBody = { displayName: 'Новое Имя', phone: '+7 999 123-45-67' };

  beforeEach(() => {
    jest.clearAllMocks();
    User.findOne.mockResolvedValue(mockUserRecord());
  });

  test('401 без токена', async () => {
    const res = await request(createApp())
      .patch('/api/users/user-1')
      .send(updateBody);
    expect(res.status).toBe(401);
  });

  test('403 при попытке изменить чужой профиль', async () => {
    const res = await request(createApp())
      .patch('/api/users/user-1')
      .set('Authorization', `Bearer ${otherToken}`)
      .send(updateBody);
    expect(res.status).toBe(403);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .patch('/api/users/user-1')
      .set('Authorization', `Bearer ${userToken}`)
      .send(updateBody);
    expect(res.status).toBe(503);
  });

  test('200 пользователь обновляет собственный профиль', async () => {
    const res = await request(createApp())
      .patch('/api/users/user-1')
      .set('Authorization', `Bearer ${userToken}`)
      .send(updateBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── DELETE /:userId ──────────────────────────────────────────────────────────

describe('DELETE /api/users/:userId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue({ userId: 'admin-1', role: 'admin' });
    User.findOne.mockResolvedValue(mockUserRecord());
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).delete('/api/users/user-1');
    expect(res.status).toBe(401);
  });

  test('403 обычный пользователь не может удалить чужой аккаунт', async () => {
    UserModel.findOne.mockResolvedValue({ userId: 'user-2', role: 'user' });
    const res = await request(createApp())
      .delete('/api/users/user-1')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  test('404 удаление несуществующего пользователя', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(createApp())
      .delete('/api/users/ghost-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  test('200 администратор удаляет пользователя', async () => {
    const res = await request(createApp())
      .delete('/api/users/user-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
