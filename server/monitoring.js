/**
 * Инициализация Sentry.
 * ВАЖНО: этот файл должен быть подключён первым в index.js,
 * до любых других require — иначе Sentry не перехватит все ошибки.
 */

const Sentry = require('@sentry/node');
const logger = require('./logger');

const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV   = process.env.NODE_ENV || 'development';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    // Трассировка производительности: 10% в production, 100% в dev/staging
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    // Не отправляем события в dev без явного DSN
    enabled: !!SENTRY_DSN,
    beforeSend(event) {
      // Не отправляем 4xx — это ошибки клиента, не баги сервера
      const status = event.extra?.status || event.contexts?.response?.status_code;
      if (status && status >= 400 && status < 500) return null;
      return event;
    },
  });
  logger.info('Sentry инициализирован', { env: NODE_ENV });
} else {
  if (NODE_ENV === 'production') {
    logger.warn('SENTRY_DSN не задан — мониторинг ошибок отключён');
  }
}

module.exports = Sentry;
