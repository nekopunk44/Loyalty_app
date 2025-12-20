/**
 * Тесты маршрутов /api/notifications.
 * Включает проверку SSE-стрима (GET /:userId/stream).
 */

process.env.JWT_SECRET = 'test-secret-notif';
process.env.NODE_ENV   = 'test';

const http    = require('http');
const jwt     = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// ─── Моки ────────────────────────────────────────────────────────────────────

jest.mock('../models', () => ({
  Notification: {
    findAll:  jest.fn(),
    findOne:  jest.fn(),
    create:   jest.fn(),
    destroy:  jest.fn(),
  },
  User: {
    findByPk: jest.fn().mockResolvedValue(null),
    update:   jest.fn().mockResolvedValue([1]),
  },
}));

jest.mock('../models/User', () => ({ findOne: jest.fn() }));

jest.mock('../utils/pagination', () => ({
  parsePagination: jest.fn(() => ({ limit: 20, offset: 0 })),
}));

jest.mock('../logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

// ─── Хелперы ────────────────────────────────────────────────────────────────

const SECRET    = 'test-secret-notif';
const userToken  = jwt.sign({ userId: 'user-1', role: 'user'  }, SECRET);
const otherToken = jwt.sign({ userId: 'user-2', role: 'user'  }, SECRET);

const { Notification } = require('../models');

const mockNotif = (overrides = {}) => ({
  id:        'n-1',
  userId:    'user-1',
  title:     'Тест',
  message:   'Тестовое уведомление',
  type:      'system',
  read:      false,
  createdAt: new Date(),
  save:      jest.fn().mockResolvedValue(true),
  destroy:   jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createApp = (isDbConnected = () => true) => {
  const app = express();
  app.use(express.json());
  app.use('/api/notifications', require('../routes/notifications')({ isDbConnected }));
  return app;
};

// ─── GET /:userId/stream — SSE ─────────────────────────────────────────────

describe('GET /api/notifications/:userId/stream (SSE)', () => {
  test('401 без токена', async () => {
    const res = await request(createApp()).get('/api/notifications/user-1/stream');
    expect(res.status).toBe(401);
  });

  test('403 при доступе к чужому потоку', async () => {
    const res = await request(createApp())
      .get('/api/notifications/user-1/stream')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  test('200 SSE-соединение устанавливается с правильными заголовками', (done) => {
    const app    = createApp();
    const server = http.createServer(app);

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();

      const req = http.get({
        hostname: '127.0.0.1',
        port,
        path:     '/api/notifications/user-1/stream',
        headers:  {
          Authorization: `Bearer ${userToken}`,
          Accept:        'text/event-stream',
        },
      }, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/event-stream/);
        expect(res.headers['cache-control']).toMatch(/no-cache/);

        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString();
          if (data.includes('event: connected')) {
            req.destroy();
            server.close(done);
          }
        });
      });

      req.on('error', () => server.close(done));
    });
  });
});

// ─── GET /:userId — список уведомлений ────────────────────────────────────

describe('GET /api/notifications/:userId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Notification.findAll.mockResolvedValue([mockNotif()]);
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).get('/api/notifications/user-1');
    expect(res.status).toBe(401);
  });

  test('403 при запросе чужих уведомлений', async () => {
    const res = await request(createApp())
      .get('/api/notifications/user-1')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .get('/api/notifications/user-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(503);
  });

  test('200 возвращает список уведомлений', async () => {
    const res = await request(createApp())
      .get('/api/notifications/user-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.notifications)).toBe(true);
  });
});

// ─── POST /:userId — создать уведомление ─────────────────────────────────

describe('POST /api/notifications/:userId', () => {
  const body = { title: 'Тест', message: 'Сообщение', type: 'system' };

  beforeEach(() => {
    jest.clearAllMocks();
    Notification.create.mockResolvedValue(mockNotif());
  });

  test('401 без токена', async () => {
    const res = await request(createApp())
      .post('/api/notifications/user-1')
      .send(body);
    expect(res.status).toBe(401);
  });

  test('403 при создании чужого уведомления', async () => {
    const res = await request(createApp())
      .post('/api/notifications/user-1')
      .set('Authorization', `Bearer ${otherToken}`)
      .send(body);
    expect(res.status).toBe(403);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/notifications/user-1')
      .set('Authorization', `Bearer ${userToken}`)
      .send(body);
    expect(res.status).toBe(503);
  });

  test('201 уведомление создано', async () => {
    const res = await request(createApp())
      .post('/api/notifications/user-1')
      .set('Authorization', `Bearer ${userToken}`)
      .send(body);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.notification).toBeDefined();
  });
});

// ─── PATCH /:userId/:notificationId — отметить как прочитанное ──────────

describe('PATCH /api/notifications/:userId/:notificationId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Notification.findOne.mockResolvedValue(mockNotif());
  });

  test('401 без токена', async () => {
    const res = await request(createApp())
      .patch('/api/notifications/user-1/n-1')
      .send({});
    expect(res.status).toBe(401);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .patch('/api/notifications/user-1/n-1')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(res.status).toBe(503);
  });

  test('404 уведомление не найдено', async () => {
    Notification.findOne.mockResolvedValue(null);
    const res = await request(createApp())
      .patch('/api/notifications/user-1/ghost-id')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(res.status).toBe(404);
  });

  test('200 уведомление помечено как прочитанное', async () => {
    const res = await request(createApp())
      .patch('/api/notifications/user-1/n-1')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── DELETE /:userId/:notificationId — удалить конкретное ───────────────

describe('DELETE /api/notifications/:userId/:notificationId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Notification.findOne.mockResolvedValue(mockNotif());
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).delete('/api/notifications/user-1/n-1');
    expect(res.status).toBe(401);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .delete('/api/notifications/user-1/n-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(503);
  });

  test('404 уведомление не найдено', async () => {
    Notification.findOne.mockResolvedValue(null);
    const res = await request(createApp())
      .delete('/api/notifications/user-1/ghost-id')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(404);
  });

  test('200 уведомление удалено', async () => {
    const res = await request(createApp())
      .delete('/api/notifications/user-1/n-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── DELETE /:userId — удалить все ──────────────────────────────────────

describe('DELETE /api/notifications/:userId (все)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Notification.destroy.mockResolvedValue(3);
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).delete('/api/notifications/user-1');
    expect(res.status).toBe(401);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .delete('/api/notifications/user-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(503);
  });

  test('200 все уведомления удалены', async () => {
    const res = await request(createApp())
      .delete('/api/notifications/user-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(3);
  });
});
