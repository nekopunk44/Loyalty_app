/**
 * Smoke-тесты ML-клиента. Требуют запущенного FastAPI на ML_SERVICE_URL.
 * Если сервис недоступен — тесты помечаются как skipped (а не падают),
 * чтобы CI на машине без Python не валился.
 */
const mlClient = require('../services/mlClient');

const RUN_ML_TESTS = process.env.RUN_ML_TESTS === '1';
const describeIfMl = RUN_ML_TESTS ? describe : describe.skip;

describeIfMl('mlClient (live FastAPI on :8001)', () => {
  jest.setTimeout(15000);

  test('health() returns ok with both models loaded', async () => {
    const res = await mlClient.health();
    expect(res.ok).toBe(true);
    expect(res.data.status).toBe('ok');
    expect(res.data.churn_loaded).toBe(true);
    expect(res.data.recsys_loaded).toBe(true);
  });

  test('rfmRecompute() returns four-level distribution', async () => {
    const res = await mlClient.rfmRecompute({ windowDays: 365 });
    expect(res.ok).toBe(true);
    const keys = Object.keys(res.data.distribution).sort();
    expect(keys).toEqual(['Bronze', 'Gold', 'Platinum', 'Silver']);
    expect(res.data.n_users).toBeGreaterThan(0);
  });

  test('churnPredict() returns probability and risk for inline features', async () => {
    const res = await mlClient.churnPredict({
      userId: 'u_test',
      features: {
        days_since_registration: 365,
        days_since_last_booking: 200,
        days_since_last_payment: 200,
        days_since_last_login: 180,
        total_bookings_count: 2,
        total_payments_count: 1,
        total_spent: 15000,
        avg_booking_value: 7500,
        cancelled_bookings_ratio: 0.5,
        loyalty_balance: 0,
        referrals_count: 0,
        notifications_read_ratio: 0.05,
        membership_level_numeric: 1,
        days_since_level_change: 200,
      },
    });
    expect(res.ok).toBe(true);
    expect(res.data.churn_probability).toBeGreaterThanOrEqual(0);
    expect(res.data.churn_probability).toBeLessThanOrEqual(1);
    expect(['low', 'medium', 'high']).toContain(res.data.risk);
  });

  test('recommendEvents() falls back to popular for unknown user', async () => {
    const res = await mlClient.recommendEvents({ userId: 'unknown_user_xyz', k: 5 });
    expect(res.ok).toBe(true);
    expect(res.data.fallback_used).toBe(true);
    expect(res.data.recommendations.length).toBeGreaterThan(0);
  });

  test('returns ok=false on bad URL (graceful fallback)', async () => {
    const prevUrl = process.env.ML_SERVICE_URL;
    process.env.ML_SERVICE_URL = 'http://127.0.0.1:1';
    jest.resetModules();
    const isolated = require('../services/mlClient');
    const res = await isolated.health();
    expect(res.ok).toBe(false);
    process.env.ML_SERVICE_URL = prevUrl;
  });
});

describe('mlClient (no service)', () => {
  test('module loads without throwing', () => {
    expect(typeof mlClient.health).toBe('function');
    expect(typeof mlClient.rfmRecompute).toBe('function');
    expect(typeof mlClient.churnPredict).toBe('function');
    expect(typeof mlClient.recommendEvents).toBe('function');
  });

  test('churnPredict rejects empty userId', async () => {
    const res = await mlClient.churnPredict({ userId: '' });
    expect(res.ok).toBe(false);
  });

  test('recommendEvents rejects empty userId', async () => {
    const res = await mlClient.recommendEvents({ userId: '' });
    expect(res.ok).toBe(false);
  });
});
