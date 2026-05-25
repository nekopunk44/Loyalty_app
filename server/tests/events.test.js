/**
 * Тесты маршрутов /api/events.
 */

process.env.JWT_SECRET = 'test-secret-events';
process.env.NODE_ENV   = 'test';

const jwt     = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// ─── Моки ────────────────────────────────────────────────────────────────────

const mockEvent = (overrides = {}) => ({
  id:             'evt-1',
  title:          'Тест событие',
  description:    'Описание',
  startDate:      new Date('2025-07-01'),
  endDate:        new Date('2025-07-10'),
  location:       'Вилла Джаконда',
  imageUrl:       null,
  category:       'sport',
  status:         'active',
  prize:          '1000 PRB',
  eventType:      'cashback',
  allowedUsers:   'all',
  participants:   0,
  participantIds: [],
  save:           jest.fn().mockResolvedValue(true),
  destroy:        jest.fn().mockResolvedValue(true),
  ...overrides,
});

jest.mock('../models', () => ({
  Event: {
    findAll:  jest.fn(),
    findByPk: jest.fn(),
    create:   jest.fn(),
  },
}));

jest.mock('../models/User', () => ({ findOne: jest.fn() }));

jest.mock('../utils/dates', () => ({
  isoToRu: jest.fn((d) => d ? '01.07.2025' : null),
}));

jest.mock('../logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

jest.mock('../services/mlClient', () => ({
  recommendEvents: jest.fn(),
  rfmRecompute: jest.fn(),
  churnPredict: jest.fn(),
  health: jest.fn(),
}));
const mlClient = require('../services/mlClient');

// ─── Хелперы ────────────────────────────────────────────────────────────────

const SECRET     = 'test-secret-events';
const adminToken = jwt.sign({ userId: 'admin-1', role: 'admin' }, SECRET);
const userToken  = jwt.sign({ userId: 'user-1',  role: 'user'  }, SECRET);

const { Event } = require('../models');
const UserModel  = require('../models/User');

const createApp = (isDbConnected = () => true) => {
  const app = express();
  app.use(express.json());
  app.use('/api/events', require('../routes/events')({ isDbConnected }));
  return app;
};

// ─── GET / ───────────────────────────────────────────────────────────────────

describe('GET /api/events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Event.findAll.mockResolvedValue([mockEvent()]);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false)).get('/api/events');
    expect(res.status).toBe(503);
  });

  test('200 возвращает список событий', async () => {
    const res = await request(createApp()).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(res.body.personalized).toBe(false);
  });
});

// ─── GET /?personalized=true ────────────────────────────────────────────────

describe('GET /api/events?personalized=true', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Event.findAll.mockResolvedValue([
      mockEvent({ id: 1, title: 'A', startDate: new Date('2025-07-01') }),
      mockEvent({ id: 2, title: 'B', startDate: new Date('2025-07-05') }),
      mockEvent({ id: 3, title: 'C', startDate: new Date('2025-07-10') }),
    ]);
  });

  test('без токена — fallback к обычной сортировке с reason=no_auth', async () => {
    const res = await request(createApp()).get('/api/events?personalized=true');
    expect(res.status).toBe(200);
    expect(res.body.personalized).toBe(false);
    expect(res.body.reason).toBe('no_auth');
    expect(mlClient.recommendEvents).not.toHaveBeenCalled();
  });

  test('ML недоступен — fallback с reason=ml_unavailable', async () => {
    mlClient.recommendEvents.mockResolvedValue({ ok: false, error: 'ECONNREFUSED' });
    const res = await request(createApp())
      .get('/api/events?personalized=true')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.personalized).toBe(false);
    expect(res.body.reason).toBe('ml_unavailable');
    expect(res.body.events).toHaveLength(3);
  });

  test('переупорядочивает события по score, unscored — в конец', async () => {
    mlClient.recommendEvents.mockResolvedValue({
      ok: true,
      data: {
        recommendations: [
          { event_id: 3, score: 0.9 },
          { event_id: 1, score: 0.4 },
        ],
        fallback_used: false,
      },
    });
    const res = await request(createApp())
      .get('/api/events?personalized=true')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.personalized).toBe(true);
    expect(res.body.fallback_used).toBe(false);
    // event 3 (score 0.9) → event 1 (score 0.4) → event 2 (нет в ML, fallback по дате)
    expect(res.body.events.map((e) => e.title)).toEqual(['C', 'A', 'B']);
    expect(mlClient.recommendEvents).toHaveBeenCalledWith({ userId: 'user-1', k: 50 });
  });

  test('cold-start fallback ML возвращает fallback_used=true в payload', async () => {
    mlClient.recommendEvents.mockResolvedValue({
      ok: true,
      data: {
        recommendations: [{ event_id: 1, score: 0.5 }, { event_id: 2, score: 0.3 }],
        fallback_used: true,
      },
    });
    const res = await request(createApp())
      .get('/api/events?personalized=true')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.personalized).toBe(true);
    expect(res.body.fallback_used).toBe(true);
  });

  test('k клампится до 50', async () => {
    mlClient.recommendEvents.mockResolvedValue({
      ok: true,
      data: { recommendations: [], fallback_used: false },
    });
    await request(createApp())
      .get('/api/events?personalized=true&k=9999')
      .set('Authorization', `Bearer ${userToken}`);
    expect(mlClient.recommendEvents).toHaveBeenCalledWith({ userId: 'user-1', k: 50 });
  });
});

// ─── GET /:eventId ───────────────────────────────────────────────────────────

describe('GET /api/events/:eventId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Event.findByPk.mockResolvedValue(mockEvent());
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false)).get('/api/events/evt-1');
    expect(res.status).toBe(503);
  });

  test('404 событие не найдено', async () => {
    Event.findByPk.mockResolvedValue(null);
    const res = await request(createApp()).get('/api/events/ghost-id');
    expect(res.status).toBe(404);
  });

  test('200 возвращает событие', async () => {
    const res = await request(createApp()).get('/api/events/evt-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.event).toBeDefined();
  });
});

// ─── POST / (admin) ──────────────────────────────────────────────────────────

describe('POST /api/events (только для админа)', () => {
  const body = { title: 'Новое событие', startDate: '01.07.2025' };

  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue({ userId: 'admin-1', role: 'admin' });
    Event.create.mockResolvedValue(mockEvent());
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).post('/api/events').send(body);
    expect(res.status).toBe(401);
  });

  test('403 для обычного пользователя', async () => {
    UserModel.findOne.mockResolvedValue({ userId: 'user-1', role: 'user' });
    const res = await request(createApp())
      .post('/api/events')
      .set('Authorization', `Bearer ${userToken}`)
      .send(body);
    expect(res.status).toBe(403);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);
    expect(res.status).toBe(503);
  });

  test('400 без title', async () => {
    const res = await request(createApp())
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ startDate: '01.07.2025' });
    expect(res.status).toBe(400);
  });

  test('201 событие создано', async () => {
    const res = await request(createApp())
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.event).toBeDefined();
  });
});

// ─── PUT /:eventId (admin) ────────────────────────────────────────────────────

describe('PUT /api/events/:eventId (только для админа)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue({ userId: 'admin-1', role: 'admin' });
    Event.findByPk.mockResolvedValue(mockEvent());
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).put('/api/events/evt-1').send({});
    expect(res.status).toBe(401);
  });

  test('200 local_* ID — no-op без БД', async () => {
    const res = await request(createApp())
      .put('/api/events/local_abc123')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Обновлено' });
    expect(res.status).toBe(200);
    expect(Event.findByPk).not.toHaveBeenCalled();
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .put('/api/events/evt-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Обновлено' });
    expect(res.status).toBe(503);
  });

  test('404 событие не найдено', async () => {
    Event.findByPk.mockResolvedValue(null);
    const res = await request(createApp())
      .put('/api/events/ghost-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Обновлено' });
    expect(res.status).toBe(404);
  });

  test('200 событие обновлено', async () => {
    const res = await request(createApp())
      .put('/api/events/evt-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Новое название', status: 'inactive' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── DELETE /:eventId (admin) ─────────────────────────────────────────────────

describe('DELETE /api/events/:eventId (только для админа)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue({ userId: 'admin-1', role: 'admin' });
    Event.findByPk.mockResolvedValue(mockEvent());
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).delete('/api/events/evt-1');
    expect(res.status).toBe(401);
  });

  test('200 local_* ID — no-op без БД', async () => {
    const res = await request(createApp())
      .delete('/api/events/local_abc123')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Event.findByPk).not.toHaveBeenCalled();
  });

  test('404 событие не найдено', async () => {
    Event.findByPk.mockResolvedValue(null);
    const res = await request(createApp())
      .delete('/api/events/ghost-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  test('200 событие удалено', async () => {
    const res = await request(createApp())
      .delete('/api/events/evt-1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── POST /:eventId/join ──────────────────────────────────────────────────────

describe('POST /api/events/:eventId/join', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Event.findByPk.mockResolvedValue(mockEvent());
  });

  test('401 без токена', async () => {
    const res = await request(createApp()).post('/api/events/evt-1/join');
    expect(res.status).toBe(401);
  });

  test('503 когда БД недоступна', async () => {
    const res = await request(createApp(() => false))
      .post('/api/events/evt-1/join')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(503);
  });

  test('404 событие не найдено', async () => {
    Event.findByPk.mockResolvedValue(null);
    const res = await request(createApp())
      .post('/api/events/ghost-id/join')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(404);
  });

  test('409 пользователь уже участвует', async () => {
    Event.findByPk.mockResolvedValue(mockEvent({ participantIds: ['user-1'] }));
    const res = await request(createApp())
      .post('/api/events/evt-1/join')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(409);
    expect(res.body.alreadyJoined).toBe(true);
  });

  test('200 пользователь вступил в событие', async () => {
    const res = await request(createApp())
      .post('/api/events/evt-1/join')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
