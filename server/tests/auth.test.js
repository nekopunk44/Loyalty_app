/**
 * Тесты маршрутов /api/auth.
 * Все обращения к БД, email и bcrypt замокированы.
 */

process.env.JWT_SECRET = 'test-secret-auth';
process.env.NODE_ENV   = 'test';
// emailSent в /register-admin теперь отражает «настроен ли SMTP», а не результат
// отправки (письмо уходит fire-and-forget). Чтобы тесты видели emailSent=true,
// эмулируем настроенный SMTP.
process.env.SMTP_USER = process.env.SMTP_USER || 'test@example.com';
process.env.SMTP_PASS = process.env.SMTP_PASS || 'test-pass';

const jwt     = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// ─── Моки ────────────────────────────────────────────────────────────────────

const mockUser = (overrides = {}) => ({
  userId:               'user-1',
  email:                'user@example.com',
  displayName:          'Test User',
  passwordHash:         'hashed_pw',
  role:                 'user',
  membershipLevel:      'Bronze',
  loyaltyPoints:        0,
  phone:                null,
  avatar:               null,
  address:              null,
  refreshToken:         null,
  refreshTokenExpires:  null,
  resetPasswordToken:   null,
  resetPasswordExpires: null,
  update:               jest.fn().mockResolvedValue(true),
  ...overrides,
});

jest.mock('../models', () => ({
  User: {
    findOne:  jest.fn(),
    findAll:  jest.fn(),
    create:   jest.fn(),
    update:   jest.fn(),
  },
  LoyaltyCard: { create: jest.fn() },
  Notification: { create: jest.fn() },
}));

jest.mock('../models/User', () => ({ findOne: jest.fn() }));

jest.mock('bcryptjs', () => ({
  hash:    jest.fn().mockResolvedValue('hashed_new_pw'),
  compare: jest.fn(),
}));

jest.mock('../utils/onlineUsers', () => ({
  markUserOnline:  jest.fn(),
  markUserOffline: jest.fn(),
}));

jest.mock('../logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

// Validation — пропускаем все схемы насквозь в тестах
jest.mock('../validation', () => ({
  validate: () => (req, res, next) => next(),
  schemas:  { login: {}, refreshToken: {}, resetPassword: {}, setNewPassword: {} },
}));

// ─── Хелперы ────────────────────────────────────────────────────────────────

const SECRET    = 'test-secret-auth';
const adminToken = jwt.sign({ userId: 'admin-1', role: 'admin' }, SECRET);
const userToken  = jwt.sign({ userId: 'user-1',  role: 'user'  }, SECRET);

const bcrypt   = require('bcryptjs');
const { User, LoyaltyCard } = require('../models');
const UserModel = require('../models/User');

const noop = (req, res, next) => next();

let lastSendWelcomeEmail = null;

const createApp = (isDbConnected = () => true) => {
  const app = express();
  app.use(express.json());
  lastSendWelcomeEmail = jest.fn().mockResolvedValue(undefined);
  app.use('/api/auth', require('../routes/auth')({
    authLimiter:            noop,
    authSlowDown:           noop,
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendWelcomeEmail:       lastSendWelcomeEmail,
    isDbConnected,
  }));
  return app;
};

// ─── POST /register ───────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  test('403 самостоятельная регистрация отключена', async () => {
    const res = await request(createApp())
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'Pass1234' });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// ─── POST /register-admin ────────────────────────────────────────────────────

describe('POST /api/auth/register-admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue({ userId: 'admin-1', role: 'admin' });
    User.findOne.mockResolvedValue(null); // email не занят
    User.create.mockResolvedValue(mockUser());
    LoyaltyCard.create.mockResolvedValue({});
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).post('/api/auth/register-admin').send({});
    expect(res.status).toBe(401);
  });

  test('403 обычный пользователь не может создавать аккаунты', async () => {
    UserModel.findOne.mockResolvedValue({ userId: 'user-1', role: 'user' });
    const res = await request(createApp())
      .post('/api/auth/register-admin')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ email: 'new@ex.com', password: 'Pass1234' });
    expect(res.status).toBe(403);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/auth/register-admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'new@ex.com', password: 'Pass1234' });
    expect(res.status).toBe(503);
  });

  test('400 email уже зарегистрирован', async () => {
    User.findOne.mockResolvedValue(mockUser());
    const res = await request(createApp())
      .post('/api/auth/register-admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'user@example.com', password: 'Pass1234' });
    expect(res.status).toBe(400);
  });

  test('201 успешное создание пользователя', async () => {
    const res = await request(createApp())
      .post('/api/auth/register-admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'new@example.com', displayName: 'New User' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
  });

  test('отправляет welcome-письмо и сохраняет setupToken', async () => {
    let createdAttrs = null;
    User.create.mockImplementation(async (attrs) => {
      createdAttrs = attrs;
      return mockUser();
    });
    const res = await request(createApp())
      .post('/api/auth/register-admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'new@example.com', displayName: 'New User' });
    expect(res.status).toBe(201);
    expect(res.body.emailSent).toBe(true);
    // токен сохранён в БД
    expect(createdAttrs.resetPasswordToken).toBeTruthy();
    expect(createdAttrs.resetPasswordExpires).toBeInstanceOf(Date);
    // письмо отправлено с тем же токеном (displayName приходит из созданного User)
    expect(lastSendWelcomeEmail).toHaveBeenCalledWith(
      'new@example.com',
      createdAttrs.resetPasswordToken,
      expect.any(String),
    );
  });

  test('400 без email', async () => {
    const res = await request(createApp())
      .post('/api/auth/register-admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ displayName: 'No Email' });
    expect(res.status).toBe(400);
  });

  test('создание не падает, если письмо не ушло', async () => {
    const app = express();
    app.use(express.json());
    // sendWelcomeEmail вызывается fire-and-forget — отклонение не должно
    // ронять запрос. Проверяем, что ответ 201 приходит, и .catch() в роуте
    // молча перехватывает ошибку.
    const failingSend = jest.fn().mockRejectedValue(new Error('SMTP down'));
    app.use('/api/auth', require('../routes/auth')({
      authLimiter:            noop,
      authSlowDown:           noop,
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendWelcomeEmail:       failingSend,
      isDbConnected:          () => true,
    }));
    const res = await request(app)
      .post('/api/auth/register-admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'new@example.com', displayName: 'New User' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(failingSend).toHaveBeenCalled();
  });

  test('emailSent=false когда почта не настроена', async () => {
    const savedUser = process.env.SMTP_USER;
    const savedPass = process.env.SMTP_PASS;
    const savedResend = process.env.RESEND_API_KEY;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.RESEND_API_KEY;
    try {
      const res = await request(createApp())
        .post('/api/auth/register-admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new@example.com', displayName: 'New User' });
      expect(res.status).toBe(201);
      expect(res.body.emailSent).toBe(false);
    } finally {
      process.env.SMTP_USER = savedUser;
      process.env.SMTP_PASS = savedPass;
      if (savedResend !== undefined) process.env.RESEND_API_KEY = savedResend;
    }
  });
});

// ─── POST /resend-invite ─────────────────────────────────────────────────────

describe('POST /api/auth/resend-invite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue({ userId: 'admin-1', role: 'admin' });
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).post('/api/auth/resend-invite').send({ userId: 'u-1' });
    expect(res.status).toBe(401);
  });

  test('400 без userId', async () => {
    const res = await request(createApp())
      .post('/api/auth/resend-invite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('404 если юзер не найден', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(createApp())
      .post('/api/auth/resend-invite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: 'missing' });
    expect(res.status).toBe(404);
  });

  test('200 + ротация setupToken + повторная отправка', async () => {
    const target = mockUser({ userId: 'u-1', email: 'target@example.com' });
    User.findOne.mockImplementation(async ({ where }) => {
      if (where && where.userId === 'u-1') return target;
      return null;
    });
    const res = await request(createApp())
      .post('/api/auth/resend-invite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: 'u-1' });
    expect(res.status).toBe(200);
    expect(res.body.emailSent).toBe(true);
    // токен ротирован и сохранён
    expect(target.update).toHaveBeenCalledWith(expect.objectContaining({
      resetPasswordToken: expect.any(String),
      resetPasswordExpires: expect.any(Date),
    }));
    // письмо отправлено на текущий email юзера, с новым токеном
    const [calledEmail, calledToken] = lastSendWelcomeEmail.mock.calls[0];
    expect(calledEmail).toBe('target@example.com');
    expect(calledToken).toBe(target.update.mock.calls[0][0].resetPasswordToken);
  });
});

// ─── POST /login ─────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  const validBody = { email: 'user@example.com', password: 'Pass1234' };

  beforeEach(() => {
    jest.clearAllMocks();
    const user = mockUser();
    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/auth/login')
      .send(validBody);
    expect(res.status).toBe(503);
  });

  test('401 пользователь не найден', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(createApp())
      .post('/api/auth/login')
      .send(validBody);
    expect(res.status).toBe(401);
  });

  test('401 неверный пароль', async () => {
    bcrypt.compare.mockResolvedValue(false);
    const res = await request(createApp())
      .post('/api/auth/login')
      .send(validBody);
    expect(res.status).toBe(401);
  });

  test('200 успешный вход', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.token).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.user).toBeDefined();
  });
});

// ─── POST /heartbeat ─────────────────────────────────────────────────────────

describe('POST /api/auth/heartbeat', () => {
  test('401 без токена', async () => {
    const res = await request(createApp()).post('/api/auth/heartbeat');
    expect(res.status).toBe(401);
  });

  test('200 с действующим токеном', async () => {
    const res = await request(createApp())
      .post('/api/auth/heartbeat')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── POST /refresh ───────────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  beforeEach(() => jest.clearAllMocks());

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/auth/refresh')
      .send({ refreshToken: 'tok' });
    expect(res.status).toBe(503);
  });

  test('401 refresh-токен не найден / истёк', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(createApp())
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid-token' });
    expect(res.status).toBe(401);
  });

  test('200 успешное обновление токена', async () => {
    User.findOne.mockResolvedValue(mockUser());
    const res = await request(createApp())
      .post('/api/auth/refresh')
      .send({ refreshToken: 'valid-refresh' });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
  });
});

// ─── POST /logout ─────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.update.mockResolvedValue([1]);
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });

  test('200 успешный выход', async () => {
    const res = await request(createApp())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── POST /reset-password ─────────────────────────────────────────────────────

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => jest.clearAllMocks());

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/auth/reset-password')
      .send({ email: 'user@example.com' });
    expect(res.status).toBe(503);
  });

  test('200 email не найден — ответ одинаковый (anti-enumeration)', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(createApp())
      .post('/api/auth/reset-password')
      .send({ email: 'ghost@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('200 письмо отправлено', async () => {
    User.findOne.mockResolvedValue(mockUser());
    const res = await request(createApp())
      .post('/api/auth/reset-password')
      .send({ email: 'user@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── POST /set-new-password ───────────────────────────────────────────────────

describe('POST /api/auth/set-new-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findAll.mockResolvedValue([]);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/auth/set-new-password')
      .send({ token: 'tok', newPassword: 'NewPass1' });
    expect(res.status).toBe(503);
  });

  test('400 токен недействителен или истёк', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(createApp())
      .post('/api/auth/set-new-password')
      .send({ token: 'bad-token', newPassword: 'NewPass1' });
    expect(res.status).toBe(400);
  });

  test('200 пароль успешно изменён', async () => {
    User.findOne.mockResolvedValue(mockUser());
    const res = await request(createApp())
      .post('/api/auth/set-new-password')
      .send({ token: 'valid-token', newPassword: 'NewPass1' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── POST /verify-email ───────────────────────────────────────────────────────

describe('POST /api/auth/verify-email', () => {
  beforeEach(() => jest.clearAllMocks());

  test('400 token не передан', async () => {
    const res = await request(createApp()).post('/api/auth/verify-email').send({});
    expect(res.status).toBe(400);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/auth/verify-email')
      .send({ token: 'tok' });
    expect(res.status).toBe(503);
  });

  test('400 токен недействителен', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(createApp())
      .post('/api/auth/verify-email')
      .send({ token: 'bad-token' });
    expect(res.status).toBe(400);
  });

  test('200 email подтверждён', async () => {
    User.findOne.mockResolvedValue(mockUser());
    const res = await request(createApp())
      .post('/api/auth/verify-email')
      .send({ token: 'valid-token' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
