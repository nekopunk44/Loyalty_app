/**
 * Клиент Google Play Developer API для верификации In-App Purchase'ов.
 *
 * Поток:
 *   1. Мобильный клиент через react-native-iap покупает SKU (consumable).
 *   2. Google возвращает { productId, purchaseToken, transactionId } клиенту.
 *   3. Клиент шлёт это на наш endpoint POST /api/payments/google-play/verify.
 *   4. Сервер вызывает Google Play API `purchases.products.get` для проверки,
 *      что покупка действительно совершена и не отменена.
 *   5. Если ок — `creditCard()` начисляет PRB.
 *   6. Сервер вызывает `purchases.products.acknowledge`, чтобы Google не вернул
 *      деньги пользователю автоматически (по правилам Google в течение 3 дней).
 *   7. Клиент вызывает finishTransaction() — товар «потреблён», можно купить снова.
 *
 * Конфигурация:
 *   - GOOGLE_PLAY_PACKAGE_NAME — applicationId Android-приложения.
 *   - GOOGLE_PLAY_SERVICE_ACCOUNT_JSON — содержимое сервис-аккаунт JSON
 *     одной строкой (Railway-friendly). Если переменная не задана:
 *       • в dev (NODE_ENV !== 'production') возвращаем заглушку,
 *         чтобы можно было тестировать без Play Console;
 *       • в production бросаем ошибку — это критическая мискнфигурация.
 */
const logger = require('../logger');

let cachedAuth = null;
let cachedAndroidPublisher = null;

function isProduction() {
  return (process.env.NODE_ENV || 'development') === 'production';
}

function getPackageName() {
  const pkg = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!pkg) {
    throw new Error('GOOGLE_PLAY_PACKAGE_NAME is not set');
  }
  return pkg;
}

function loadServiceAccountCredentials() {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON parse error: ${err.message}`);
  }
}

/**
 * Лениво создаёт авторизованный клиент androidpublisher.
 * @returns {Promise<import('googleapis').androidpublisher_v3.Androidpublisher>}
 */
async function getAndroidPublisher() {
  if (cachedAndroidPublisher) return cachedAndroidPublisher;

  const credentials = loadServiceAccountCredentials();
  if (!credentials) {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not set');
  }

  const { google } = require('googleapis');
  cachedAuth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  cachedAndroidPublisher = google.androidpublisher({ version: 'v3', auth: cachedAuth });
  return cachedAndroidPublisher;
}

/**
 * Проверяет в Google Play, что покупка действительна.
 *
 * @param {string} productId    SKU из Play Console (например 'prb_topup_1000')
 * @param {string} purchaseToken Токен, выданный клиенту при покупке
 * @returns {Promise<{
 *   verified: boolean,
 *   purchaseState?: number,
 *   acknowledgementState?: number,
 *   orderId?: string,
 *   purchaseTimeMillis?: string,
 *   priceAmountMicros?: string,
 *   priceCurrencyCode?: string,
 *   devFallback?: boolean,
 *   raw?: Object,
 * }>}
 */
async function verifyPurchase(productId, purchaseToken) {
  if (!productId || !purchaseToken) {
    throw new Error('verifyPurchase: productId and purchaseToken required');
  }

  // В dev — без Play Console — возвращаем заглушку, чтобы UI-поток можно было
  // протестировать целиком. В prod без сервис-аккаунта роняем ошибку.
  if (!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
    if (isProduction()) {
      throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not set in production');
    }
    logger.warn('google-play verifyPurchase: dev fallback (no service account)', {
      productId,
      tokenPrefix: String(purchaseToken).slice(0, 12),
    });
    return {
      verified: true,
      purchaseState: 0,            // 0 = purchased
      acknowledgementState: 0,     // 0 = yet to be acknowledged
      orderId: `DEV_${Date.now()}`,
      purchaseTimeMillis: String(Date.now()),
      devFallback: true,
    };
  }

  const publisher = await getAndroidPublisher();
  const packageName = getPackageName();

  let response;
  try {
    response = await publisher.purchases.products.get({
      packageName,
      productId,
      token: purchaseToken,
    });
  } catch (err) {
    logger.warn('google-play verifyPurchase failed', {
      productId,
      tokenPrefix: String(purchaseToken).slice(0, 12),
      status: err.code || err.status,
      message: err.message,
    });
    return { verified: false, raw: { error: err.message } };
  }

  const data = response.data || {};
  // purchaseState: 0 — purchased, 1 — cancelled, 2 — pending
  const isPurchased = data.purchaseState === 0;

  return {
    verified: isPurchased,
    purchaseState: data.purchaseState,
    acknowledgementState: data.acknowledgementState,
    orderId: data.orderId,
    purchaseTimeMillis: data.purchaseTimeMillis,
    priceAmountMicros: data.priceAmountMicros,
    priceCurrencyCode: data.priceCurrencyCode,
    raw: data,
  };
}

/**
 * Acknowledge покупки. Должен быть выполнен в течение 3 дней, иначе Google
 * автоматически вернёт деньги пользователю.
 *
 * @param {string} productId
 * @param {string} purchaseToken
 * @returns {Promise<{ acknowledged: boolean, devFallback?: boolean }>}
 */
async function acknowledgePurchase(productId, purchaseToken) {
  if (!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
    if (isProduction()) {
      throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not set in production');
    }
    return { acknowledged: true, devFallback: true };
  }

  const publisher = await getAndroidPublisher();
  const packageName = getPackageName();

  try {
    await publisher.purchases.products.acknowledge({
      packageName,
      productId,
      token: purchaseToken,
    });
    return { acknowledged: true };
  } catch (err) {
    // Если уже acknowledged — Google возвращает 400 'The purchase is already acknowledged.'
    // Это не ошибка для нас.
    const msg = err.message || '';
    if (err.code === 400 && /already acknowledged/i.test(msg)) {
      return { acknowledged: true };
    }
    logger.error('google-play acknowledge failed', {
      productId,
      tokenPrefix: String(purchaseToken).slice(0, 12),
      status: err.code,
      message: msg,
    });
    return { acknowledged: false };
  }
}

module.exports = {
  verifyPurchase,
  acknowledgePurchase,
};
