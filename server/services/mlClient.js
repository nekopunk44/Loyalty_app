/**
 * HTTP-клиент к ML-микросервису (FastAPI на server/ml/, по умолчанию :8001).
 *
 * Конфиг через .env:
 *   ML_SERVICE_URL   — базовый URL (default: http://localhost:8001)
 *   ML_SERVICE_TOKEN — Bearer-токен (должен совпадать с server/ml/.env)
 *   ML_TIMEOUT_MS    — таймаут запроса в мс (default: 8000)
 *   ML_RETRIES       — число повторов на сетевую ошибку или 5xx (default: 2)
 *
 * Все методы возвращают `{ ok: true, data }` или `{ ok: false, error, status? }`,
 * чтобы вызывающий код мог легко применять graceful fallback вместо try/catch.
 */
const logger = require('../logger');

const BASE_URL = (process.env.ML_SERVICE_URL || 'http://localhost:8001').replace(/\/$/, '');
const TOKEN = process.env.ML_SERVICE_TOKEN || 'dev-token';
const TIMEOUT_MS = parseInt(process.env.ML_TIMEOUT_MS || '8000', 10);
const RETRIES = parseInt(process.env.ML_RETRIES || '2', 10);
const RETRY_BACKOFF_MS = 250;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callWithRetry(path, { method = 'GET', body } = {}) {
  const url = `${BASE_URL}${path}`;
  let lastError = null;

  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const startedAt = Date.now();

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TOKEN}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const durationMs = Date.now() - startedAt;

      if (!res.ok) {
        // 5xx → ретраим; 4xx → отдаём наверх сразу (битый payload, нет смысла повторять)
        const text = await res.text().catch(() => '');
        if (res.status >= 500 && attempt < RETRIES) {
          logger.warn('ML 5xx, retrying', { url, status: res.status, attempt });
          await sleep(RETRY_BACKOFF_MS * (attempt + 1));
          continue;
        }
        return { ok: false, status: res.status, error: text || res.statusText };
      }

      const data = await res.json();
      logger.debug('ML call ok', { url, durationMs, attempt });
      return { ok: true, data };
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      const isAbort = err.name === 'AbortError';
      logger.warn('ML call failed', {
        url,
        attempt,
        error: isAbort ? 'timeout' : err.message,
      });
      if (attempt < RETRIES) {
        await sleep(RETRY_BACKOFF_MS * (attempt + 1));
      }
    }
  }

  return { ok: false, error: lastError ? lastError.message : 'unknown' };
}

async function health() {
  return callWithRetry('/health', { method: 'GET' });
}

/**
 * Пересчитать RFM-сегментацию для всех активных пользователей.
 * Возвращает { distribution: {Bronze, Silver, Gold, Platinum}, silhouette, n_users, assignments: {user_id: level} }.
 */
async function rfmRecompute({ windowDays = 365 } = {}) {
  return callWithRetry(`/rfm/recompute?window_days=${windowDays}`, { method: 'POST' });
}

/**
 * Прогноз оттока для одного пользователя.
 * features можно не передавать — тогда ML возьмёт фичи из своей загрузки.
 * Возвращает { user_id, churn_probability, risk: 'low'|'medium'|'high' }.
 */
async function churnPredict({ userId, features = null }) {
  if (!userId) {
    return { ok: false, error: 'userId is required' };
  }
  const body = { user_id: String(userId) };
  if (features) body.features = features;
  return callWithRetry('/churn/predict', { method: 'POST', body });
}

/**
 * Рекомендации событий для пользователя.
 * Возвращает { recommendations: [{event_id, score}], fallback_used }.
 */
async function recommendEvents({ userId, k = 10 }) {
  if (!userId) {
    return { ok: false, error: 'userId is required' };
  }
  return callWithRetry('/recommend/events', {
    method: 'POST',
    body: { user_id: String(userId), k },
  });
}

/**
 * Прогноз годового LTV (annual ARPU в PRB) для одного пользователя.
 * Возвращает { user_id, predicted_ltv, tier: 'low'|'mid'|'high' }.
 */
async function ltvPredict({ userId, features = null }) {
  if (!userId) {
    return { ok: false, error: 'userId is required' };
  }
  const body = { user_id: String(userId) };
  if (features) body.features = features;
  return callWithRetry('/ltv/predict', { method: 'POST', body });
}

/**
 * Топ-N клиентов по предсказанному LTV.
 * Возвращает { n, items: [{user_id, predicted_ltv, total_spent}] }.
 */
async function ltvTop({ n = 20 } = {}) {
  const safeN = Math.max(1, Math.min(parseInt(n, 10) || 20, 100));
  return callWithRetry(`/ltv/top?n=${safeN}`, { method: 'GET' });
}

/**
 * Прогноз ежедневной выручки на horizon дней по window_days истории.
 * Возвращает { horizon, total, daily, lower, upper, method, history_days }.
 */
async function forecastRevenue({ horizon = 30, windowDays = 180 } = {}) {
  const safeH = Math.max(1, Math.min(parseInt(horizon, 10) || 30, 180));
  const safeW = Math.max(14, Math.min(parseInt(windowDays, 10) || 180, 730));
  return callWithRetry(
    `/forecast/revenue?horizon=${safeH}&window_days=${safeW}`,
    { method: 'GET' },
  );
}

/**
 * Скоринг последних транзакций IsolationForest.
 * Возвращает { n_total, n_anomalies, items: [{user_id, amount, created_at, anomaly_score, is_anomaly}] }.
 */
async function detectAnomalies({ limit = 200, windowDays = 30 } = {}) {
  const safeL = Math.max(1, Math.min(parseInt(limit, 10) || 200, 1000));
  const safeW = Math.max(1, Math.min(parseInt(windowDays, 10) || 30, 365));
  return callWithRetry(
    `/anomaly/transactions?limit=${safeL}&window_days=${safeW}`,
    { method: 'GET' },
  );
}

module.exports = {
  health,
  rfmRecompute,
  churnPredict,
  recommendEvents,
  ltvPredict,
  ltvTop,
  forecastRevenue,
  detectAnomalies,
  // экспортируем для тестов
  _internals: { BASE_URL, TIMEOUT_MS, RETRIES },
};
