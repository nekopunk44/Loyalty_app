/**
 * Обёртка над expo-iap для Google Play Billing.
 *
 * Работает только на физическом Android-устройстве с приложением, установленным
 * из Google Play (включая Internal Testing). В iOS / Web / Expo Go вернёт
 * { available: false }, и UI должен скрыть Google Play как способ оплаты.
 *
 * Поток покупки:
 *   1. initConnection() — однократно при mount компонента
 *   2. fetchProducts({ skus, type: 'in-app' }) — подгрузить цены и название из Play
 *   3. requestPurchase({ request: { android: { skus } }, type: 'in-app' }) — открывает нативный диалог
 *   4. purchase event приходит через purchaseUpdatedListener
 *   5. Серверная валидация через /api/payments/google-play/verify
 *   6. finishTransaction({ purchase, isConsumable: true }) — «потребляем» товар
 *
 * SKU должны быть созданы как Consumable in-app products в Play Console:
 *   prb_topup_500, prb_topup_1000, prb_topup_3000,
 *   prb_topup_5000, prb_topup_10000, prb_topup_25000
 */
import { Platform } from 'react-native';

let IAP = null;
let isAvailableCached = null;

const SKUS = [
  'prb_topup_500',
  'prb_topup_1000',
  'prb_topup_3000',
  'prb_topup_5000',
  'prb_topup_10000',
  'prb_topup_25000',
];

const SKU_TO_PRB = {
  prb_topup_500:   500,
  prb_topup_1000:  1000,
  prb_topup_3000:  3000,
  prb_topup_5000:  5000,
  prb_topup_10000: 10000,
  prb_topup_25000: 25000,
};

/**
 * Преобразует сумму PRB в подходящий SKU.
 * @param {number} amountPRB
 * @returns {string|null} productId или null, если суммы нет среди преcетов
 */
export function prbToSku(amountPRB) {
  const entry = Object.entries(SKU_TO_PRB).find(([, v]) => v === amountPRB);
  return entry ? entry[0] : null;
}

export function getAvailableSkus() {
  return [...SKUS];
}

export function getSkuMap() {
  return { ...SKU_TO_PRB };
}

/**
 * Проверяет, доступен ли Google Play Billing в текущей сборке.
 * Возвращает false на iOS/Web и в Expo Go (нативный модуль не подключён).
 */
export function isGooglePlayAvailable() {
  if (isAvailableCached !== null) return isAvailableCached;
  if (Platform.OS !== 'android') {
    isAvailableCached = false;
    return false;
  }
  try {
    // eslint-disable-next-line global-require
    IAP = require('expo-iap');
    isAvailableCached = !!(IAP && typeof IAP.initConnection === 'function');
  } catch (_) {
    isAvailableCached = false;
  }
  return isAvailableCached;
}

let connectionPromise = null;
let purchaseListener = null;
let errorListener = null;

/**
 * Инициализирует подключение к Google Play Billing.
 * Идемпотентно — повторные вызовы возвращают тот же промис.
 */
export async function initIAP() {
  if (!isGooglePlayAvailable()) {
    throw new Error('Google Play Billing недоступен на этом устройстве');
  }
  if (!connectionPromise) {
    connectionPromise = IAP.initConnection();
  }
  return connectionPromise;
}

/**
 * Закрывает подключение. Вызывать при unmount экрана пополнения,
 * чтобы не держать нативный сервис.
 */
export async function endIAP() {
  if (!isGooglePlayAvailable()) return;
  try {
    if (purchaseListener) {
      purchaseListener.remove();
      purchaseListener = null;
    }
    if (errorListener) {
      errorListener.remove();
      errorListener = null;
    }
    await IAP.endConnection();
  } catch (_) { /* noop */ }
  connectionPromise = null;
}

/**
 * Загружает SKU с ценами из Play Console.
 * Если SKU не настроены в Play Console — вернёт пустой массив.
 */
export async function fetchProducts() {
  if (!isGooglePlayAvailable()) return [];
  await initIAP();
  try {
    const products = await IAP.fetchProducts({ skus: SKUS, type: 'in-app' });
    return Array.isArray(products) ? products : [];
  } catch (err) {
    if (__DEV__) {
      // В Expo Go или Internal Test до настройки SKU это нормально.
      // eslint-disable-next-line no-console
      console.warn('[googlePlayIAP] fetchProducts failed:', err.message);
    }
    return [];
  }
}

/**
 * Подписывает слушателей на purchaseUpdated/purchaseError.
 * @param {(purchase: any) => void} onPurchase
 * @param {(error: any) => void} onError
 * @returns {() => void} unsubscribe
 */
export function attachPurchaseListeners(onPurchase, onError) {
  if (!isGooglePlayAvailable()) return () => {};
  purchaseListener = IAP.purchaseUpdatedListener(onPurchase);
  errorListener = IAP.purchaseErrorListener(onError);
  return () => {
    if (purchaseListener) { purchaseListener.remove(); purchaseListener = null; }
    if (errorListener)    { errorListener.remove();    errorListener = null; }
  };
}

/**
 * Запрашивает покупку SKU. Результат придёт через purchaseUpdatedListener.
 */
export async function requestPurchase(productId) {
  if (!isGooglePlayAvailable()) {
    throw new Error('Google Play Billing недоступен');
  }
  await initIAP();
  return IAP.requestPurchase({
    request: { android: { skus: [productId] } },
    type: 'in-app',
  });
}

/**
 * Завершает (consume) транзакцию после успешной серверной валидации.
 * Обязательно для consumable-товаров — иначе нельзя купить повторно.
 */
export async function finishPurchase(purchase) {
  if (!isGooglePlayAvailable()) return;
  try {
    await IAP.finishTransaction({ purchase, isConsumable: true });
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[googlePlayIAP] finishTransaction failed:', err.message);
    }
  }
}
