/**
 * API Configuration
 * URLs и endpoints для взаимодействия с сервером
 */

import { getApiUrl } from './apiUrl';

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
    CONFIRM_PAYMENT: (bookingId) => `${getApiUrl()}/bookings/${bookingId}/confirm-payment`,
    CANCEL: (bookingId) => `${getApiUrl()}/bookings/${bookingId}/cancel`,
  },

  // Properties
  PROPERTIES: {
    LIST: `${getApiUrl()}/properties`,
    GET: (propertyId) => `${getApiUrl()}/properties/${propertyId}`,
  },

  // Users
  USERS: {
    LIST: `${getApiUrl()}/users`,
    GET: (userId) => `${getApiUrl()}/users/${userId}`,
    UPDATE: (userId) => `${getApiUrl()}/users/${userId}`,
    DELETE: (userId) => `${getApiUrl()}/users/${userId}`,
  },
});

// Для обратной совместимости - getter функция
export const API_ENDPOINTS = new Proxy({}, {
  get: (target, prop) => {
    const endpoints = getAPIEndpoints();
    return endpoints[prop];
  },
});

/**
 * Fetch wrapper с обработкой ошибок
 */
export const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP Error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * GET запрос
 */
export const apiGet = (url) => apiCall(url, { method: 'GET' });

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
