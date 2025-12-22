/**
 * Тесты mlJobs: проверяем логику обновления уровней и создания уведомлений
 * через моки mlClient и Sequelize-моделей. БД и ML-сервис не требуются.
 */
jest.mock('../services/mlClient');
jest.mock('../db', () => {
  const tx = (cb) => cb({ /* transaction stub */ });
  return {
    sequelize: {
      transaction: jest.fn(tx),
      fn: jest.fn(() => 'FN'),
      col: jest.fn(() => 'COL'),
    },
    DataTypes: {},
  };
});
jest.mock('../models/User', () => ({ update: jest.fn() }));
jest.mock('../models/LoyaltyCard', () => ({ findAll: jest.fn(), update: jest.fn() }));
jest.mock('../models/Notification', () => ({ bulkCreate: jest.fn(), findAll: jest.fn() }));
jest.mock('../models/Booking', () => ({ findAll: jest.fn() }));

const mlClient = require('../services/mlClient');
const User = require('../models/User');
const LoyaltyCard = require('../models/LoyaltyCard');
const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const mlJobs = require('../services/mlJobs');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('runRfmRecompute', () => {
  test('обновляет уровни и создаёт уведомления при повышении', async () => {
    mlClient.rfmRecompute.mockResolvedValue({
      ok: true,
      data: {
        user_levels: {
          u1: 'Gold',     // был Silver → upgrade
          u2: 'Silver',   // был Silver → без изменений
          u3: 'Bronze',   // был Gold   → downgrade
          u4: 'Platinum', // нет карты → пропускаем уведомление, обновляем
        },
        distribution: { Bronze: 1, Silver: 1, Gold: 1, Platinum: 1 },
        silhouette: 0.55,
      },
    });
    LoyaltyCard.findAll.mockResolvedValue([
      { userId: 'u1', membershipLevel: 'Silver' },
      { userId: 'u2', membershipLevel: 'Silver' },
      { userId: 'u3', membershipLevel: 'Gold' },
    ]);
    LoyaltyCard.update.mockResolvedValue([1]);
    User.update.mockResolvedValue([1]);
    Notification.bulkCreate.mockResolvedValue([]);

    const result = await mlJobs.runRfmRecompute();

    expect(result.ok).toBe(true);
    expect(result.updated).toBe(3); // u1, u3, u4 — изменились
    expect(result.upgrades).toBe(1); // u1
    expect(result.downgrades).toBe(1); // u3
    expect(LoyaltyCard.update).toHaveBeenCalled();
    expect(User.update).toHaveBeenCalled();
    expect(Notification.bulkCreate).toHaveBeenCalledTimes(1);
    const notifs = Notification.bulkCreate.mock.calls[0][0];
    expect(notifs).toHaveLength(1);
    expect(notifs[0].userId).toBe('u1');
    expect(notifs[0].type).toBe('level_upgrade');
    expect(notifs[0].data).toEqual({ from: 'Silver', to: 'Gold', source: 'rfm_recompute' });
  });

  test('возвращает ok=false при недоступности ML', async () => {
    mlClient.rfmRecompute.mockResolvedValue({ ok: false, error: 'ECONNREFUSED' });
    const result = await mlJobs.runRfmRecompute();
    expect(result.ok).toBe(false);
    expect(LoyaltyCard.update).not.toHaveBeenCalled();
    expect(User.update).not.toHaveBeenCalled();
  });

  test('пустой user_levels — корректный no-op', async () => {
    mlClient.rfmRecompute.mockResolvedValue({
      ok: true,
      data: { user_levels: {}, distribution: {}, silhouette: 0 },
    });
    const result = await mlJobs.runRfmRecompute();
    expect(result.ok).toBe(true);
    expect(result.updated).toBe(0);
    expect(LoyaltyCard.update).not.toHaveBeenCalled();
  });
});

describe('runChurnCheck', () => {
  test('создаёт retention-уведомления только для high-risk без свежего нотифа', async () => {
    Booking.findAll.mockResolvedValue([
      { userId: 'a' }, { userId: 'b' }, { userId: 'c' },
    ]);
    mlClient.churnPredict
      .mockResolvedValueOnce({ ok: true, data: { user_id: 'a', churn_probability: 0.85, risk: 'high' } })
      .mockResolvedValueOnce({ ok: true, data: { user_id: 'b', churn_probability: 0.5,  risk: 'medium' } })
      .mockResolvedValueOnce({ ok: true, data: { user_id: 'c', churn_probability: 0.9,  risk: 'high' } });
    // c уже получал retention 5 часов назад → не дублируем
    Notification.findAll.mockResolvedValue([{ userId: 'c' }]);
    Notification.bulkCreate.mockResolvedValue([]);

    const result = await mlJobs.runChurnCheck({ batchSize: 5 });

    expect(result.ok).toBe(true);
    expect(result.total).toBe(3);
    expect(result.highRisk).toBe(2);
    expect(result.mediumRisk).toBe(1);
    expect(result.lowRisk).toBe(0);
    expect(Notification.bulkCreate).toHaveBeenCalledTimes(1);
    const created = Notification.bulkCreate.mock.calls[0][0];
    expect(created).toHaveLength(1);
    expect(created[0].userId).toBe('a');
    expect(created[0].type).toBe('retention_offer');
  });

  test('считает failed при ошибках ML, не падает', async () => {
    Booking.findAll.mockResolvedValue([{ userId: 'x' }, { userId: 'y' }]);
    mlClient.churnPredict
      .mockResolvedValueOnce({ ok: false, error: 'timeout' })
      .mockResolvedValueOnce({ ok: true, data: { risk: 'low', churn_probability: 0.1 } });
    Notification.findAll.mockResolvedValue([]);

    const result = await mlJobs.runChurnCheck({ batchSize: 10 });

    expect(result.ok).toBe(true);
    expect(result.failed).toBe(1);
    expect(result.lowRisk).toBe(1);
    expect(Notification.bulkCreate).not.toHaveBeenCalled();
  });

  test('нет активных пользователей — корректный no-op', async () => {
    Booking.findAll.mockResolvedValue([]);
    const result = await mlJobs.runChurnCheck();
    expect(result.ok).toBe(true);
    expect(result.total).toBe(0);
    expect(mlClient.churnPredict).not.toHaveBeenCalled();
  });
});

describe('start/stop', () => {
  test('start() в NODE_ENV=test — no-op', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    expect(() => mlJobs.start()).not.toThrow();
    process.env.NODE_ENV = prev;
  });

  test('stop() безопасно вызывается без активных задач', () => {
    expect(() => mlJobs.stop()).not.toThrow();
  });
});
