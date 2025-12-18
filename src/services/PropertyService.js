/*
 * API для работы с объектами (properties)
 */

import { API_ENDPOINTS, apiCall } from '../utils/api';

export const PropertyService = {
  /*Получить все доступные объекты*/
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

  /*Получить занятые даты для объекта*/
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
};

export default PropertyService;
