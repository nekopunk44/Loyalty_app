/*
 * API для работы с объектами (properties)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  API_ENDPOINTS,
  apiCall,
  apiPost,
  apiPatch,
  apiDelete,
} from '../utils/api';

const AUTH_TOKEN_KEY = '@auth_token';

export const PropertyService = {
  /* Получить все доступные объекты (публично) */
  getAllProperties: async () => {
    try {
      const response = await apiCall(API_ENDPOINTS.PROPERTIES.LIST);
      if (response.success) {
        return response.properties || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      throw error;
    }
  },

  /* Все объекты включая unavailable — для админ-экрана */
  getAllForAdmin: async () => {
    const response = await apiCall(API_ENDPOINTS.PROPERTIES.ADMIN_LIST);
    if (response.success) return response.properties || [];
    throw new Error(response.error || 'Не удалось получить список номеров');
  },

  /* Получить информацию об объекте по ID */
  getPropertyById: async (propertyId) => {
    try {
      const response = await apiCall(API_ENDPOINTS.PROPERTIES.GET(propertyId));
      if (response.success) {
        return response.property;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch property:', error);
      throw error;
    }
  },

  /* Получить занятые даты для объекта */
  getBookedDates: async (propertyId) => {
    try {
      const response = await apiCall(
        API_ENDPOINTS.BOOKINGS.PROPERTY_BOOKED_DATES(propertyId)
      );
      if (response.success) {
        return response.bookedDates || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch booked dates:', error);
      return [];
    }
  },

  /* ───── Админ-CRUD ───── */

  createProperty: async (payload) => {
    const response = await apiPost(API_ENDPOINTS.PROPERTIES.CREATE, payload);
    if (response.success) return response.property;
    throw new Error(response.error || 'Не удалось создать номер');
  },

  updateProperty: async (propertyId, payload) => {
    const response = await apiPatch(API_ENDPOINTS.PROPERTIES.UPDATE(propertyId), payload);
    if (response.success) return response.property;
    throw new Error(response.error || 'Не удалось обновить номер');
  },

  deleteProperty: async (propertyId) => {
    const response = await apiDelete(API_ENDPOINTS.PROPERTIES.DELETE(propertyId));
    if (response.success) return true;
    throw new Error(response.error || 'Не удалось удалить номер');
  },

  /*
   * Multipart-загрузка N фото. assets — массив { uri, fileName?, mimeType? }
   * из expo-image-picker. Браузерный fetch на web принимает FormData с blob;
   * на нативе FormData умеет принимать { uri, name, type }.
   */
  uploadPhotos: async (propertyId, assets) => {
    const url = API_ENDPOINTS.PROPERTIES.PHOTOS_UPLOAD(propertyId);
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

    const form = new FormData();
    assets.forEach((asset, idx) => {
      const name = asset.fileName || asset.name || `photo-${Date.now()}-${idx}.jpg`;
      const type = asset.mimeType || asset.type || 'image/jpeg';
      // На вебе uri обычно blob:..., FormData умеет такой URL через fetch+blob.
      if (typeof window !== 'undefined' && asset.uri?.startsWith('blob:')) {
        // На web соберём blob отдельно ниже
      }
      form.append('photos', { uri: asset.uri, name, type });
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.error || `Не удалось загрузить фото (HTTP ${response.status})`);
    }
    return data.property;
  },

  deletePhoto: async (propertyId, photo) => {
    const url = API_ENDPOINTS.PROPERTIES.PHOTOS_DELETE(propertyId);
    const response = await apiCall(url, {
      method: 'DELETE',
      body: JSON.stringify({ photo }),
    });
    if (response.success) return response.property;
    throw new Error(response.error || 'Не удалось удалить фото');
  },
};

export default PropertyService;
