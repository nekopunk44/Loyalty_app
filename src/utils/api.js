/**
 * API Configuration
 * URLs и endpoints для взаимодействия с сервером
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from './apiUrl';
import { updateBiometricToken } from './biometricAuth';

const AUTH_TOKEN_KEY    = '@auth_token';
const REFRESH_TOKEN_KEY = '@refresh_token';

// Флаг — предотвращает параллельные попытки refresh (один запрос в очереди)
let _refreshPromise = null;

const getAuthHeader = async () => {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Тихое обновление access-токена через refresh-токен.
 * Возвращает новый access-токен или null при неудаче.
 * Гарантирует, что одновременно идёт максимум один запрос на обновление.
 */
const refreshAccessToken = async () => {
  // Если обновление уже идёт — ждём его результата
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) return null;

      const response = await fetch(`${getApiUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh-токен недействителен — очищаем сессию
        await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY]);
        return null;
      }

      const data = await response.json();
      const { token: newAccess, refreshToken: newRefresh } = data;

      await AsyncStorage.setItem(AUTH_TOKEN_KEY, newAccess);
      if (newRefresh) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
        // Этот путь ротации тоже должен обновлять биометрическую копию токена,
        // иначе в SecureStore останется инвалидированный refresh и вход по
        // биометрии будет падать (откатываясь на пароль).
        updateBiometricToken(newRefresh);
      }

      return newAccess;
    } catch {
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
};

export const getAPIEndpoints = () => ({
  // Bookings
  BOOKINGS: {
    CREATE: `${getApiUrl()}/bookings`,
    GET: (bookingId) => `${getApiUrl()}/bookings/${bookingId}`,
    UPDATE: (bookingId) => `${getApiUrl()}/bookings/${bookingId}`,
    DELETE: (bookingId) => `${getApiUrl()}/bookings/${bookingId}`,
    UPDATE_STATUS: (bookingId) => `${getApiUrl()}/bookings/${bookingId}/status`,
    USER_BOOKINGS: (userId) => `${getApiUrl()}/bookings/user/${userId}`,
    PROPERTY_BOOKED_DATES: (propertyId) =>
      `${getApiUrl()}/bookings/property/${propertyId}/booked-dates`,
    CONFIRM_PAYMENT: (bookingId) => `${getApiUrl()}/bookings/${bookingId}/confirm-payment`, // deprecated → 410
    PAY_DEPOSIT:   (bookingId) => `${getApiUrl()}/bookings/${bookingId}/pay-deposit`,
    PAY_REMAINING: (bookingId) => `${getApiUrl()}/bookings/${bookingId}/pay-remaining`,
    CANCEL: (bookingId) => `${getApiUrl()}/bookings/${bookingId}/cancel`,
  },

  // Properties
  PROPERTIES: {
    LIST: `${getApiUrl()}/properties`,
    ADMIN_LIST: `${getApiUrl()}/properties/admin/all`,
    GET: (propertyId) => `${getApiUrl()}/properties/${propertyId}`,
    CREATE: `${getApiUrl()}/properties`,
    UPDATE: (propertyId) => `${getApiUrl()}/properties/${propertyId}`,
    DELETE: (propertyId) => `${getApiUrl()}/properties/${propertyId}`,
    PHOTOS_UPLOAD: (propertyId) => `${getApiUrl()}/properties/${propertyId}/photos`,
    PHOTOS_DELETE: (propertyId) => `${getApiUrl()}/properties/${propertyId}/photos`,
  },

  // Users
  USERS: {
    LIST: `${getApiUrl()}/users`,
    GET: (userId) => `${getApiUrl()}/users/${userId}`,
    UPDATE: (userId) => `${getApiUrl()}/users/${userId}`,
    DELETE: (userId) => `${getApiUrl()}/users/${userId}`,
  },

  // Reviews
  REVIEWS: {
    CREATE: `${getApiUrl()}/reviews`,
    BY_PROPERTY: (propertyId) => `${getApiUrl()}/reviews/property/${propertyId}`,
    UPDATE: (reviewId) => `${getApiUrl()}/reviews/${reviewId}`,
    DELETE: (reviewId) => `${getApiUrl()}/reviews/${reviewId}`,
  },

  // Analytics
  ANALYTICS: {
    TRACK: `${getApiUrl()}/analytics`,
  },
});

// Для обратной совместимости - getter функция
export const API_ENDPOINTS = new Proxy({}, {
  get: (target, prop) => {
    const endpoints = getAPIEndpoints();
    return endpoints[prop];
  },
});

const FETCH_TIMEOUT_MS = 30_000;

/**
 * Fetch wrapper с автоматическим обновлением токена при 401.
 * При первом 401 пробует тихо обновить access-токен и повторяет запрос.
 * При повторном 401 возвращает ошибку без бесконечного цикла.
 */
export const apiCall = async (url, options = {}, _isRetry = false) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const authHeader = await getAuthHeader();
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...options.headers,
      },
      ...options,
    });
    clearTimeout(timeoutId);

    // Тихое обновление при 401 (только один раз, не для /auth/refresh)
    if (response.status === 401 && !_isRetry && !url.includes('/auth/refresh')) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Повторяем запрос с новым токеном
        return apiCall(url, options, true);
      }
      // Refresh не удался — сессия истекла
      return { success: false, error: 'Сессия истекла. Войдите снова.', sessionExpired: true };
    }

    // Проверяем тип контента
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.warn(`API вернул non-JSON контент (${contentType}):`, text.substring(0, 200));
      data = { error: text || 'Non-JSON response from server' };
    }

    if (!response.ok) {
      // details на 5xx — техническая причина, не показываем юзеру, но логируем
      // и кладём в свойство ошибки, чтобы видеть в Sentry / console.error.
      const detailStr = typeof data.details === 'string' ? data.details : '';
      const err = new Error(data.error || `HTTP Error: ${response.status}`);
      err.status = response.status;
      err.data = data;
      if (detailStr) err.details = detailStr;
      throw err;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { success: false, error: 'Превышено время ожидания ответа от сервера' };
    }
    if (error.status === 429) {
      console.warn('API rate-limited (429):', url);
      return { success: false, error: error.message, rateLimited: true, data: error.data };
    }
    console.error('API Error:', error, error.details ? `[details: ${error.details}]` : '');
    return {
      success: false,
      error:   error.message,
      details: error.details,
      status:  error.status,
      data:    error.data,
    };
  }
};

/**
 * GET запрос с базовым rate limiting
 */
const requestDelay = new Map();

export const apiGet = async (url, options = {}) => {
  const lastCallTime = requestDelay.get(url) || 0;
  const timeSinceLastCall = Date.now() - lastCallTime;
  const minDelayMs = 300;

  if (timeSinceLastCall < minDelayMs) {
    const waitTime = minDelayMs - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  requestDelay.set(url, Date.now());
  return apiCall(url, { method: 'GET', ...options });
};

/**
 * POST запрос
 */
export const apiPost = (url, data) =>
  apiCall(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });

/**
 * PATCH запрос
 */
export const apiPatch = (url, data) =>
  apiCall(url, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

/**
 * DELETE запрос
 */
export const apiDelete = (url) => apiCall(url, { method: 'DELETE' });
