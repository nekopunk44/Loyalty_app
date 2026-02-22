/**
 * Примеры использования API
 */

import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  API_ENDPOINTS,
} from '../utils/api';

/**
 * 1️⃣ Получить занятые даты для объекта
 */
export const getBookedDates = async (propertyId) => {
  try {
    const response = await apiGet(
      API_ENDPOINTS.BOOKINGS.PROPERTY_BOOKED_DATES(propertyId)
    );
    return response.bookedDates;
  } catch (error) {
    console.error('Ошибка получения занятых дат:', error);
    return [];
  }
};

/**
 * 2️⃣ Создать новое бронирование
 */
export const createBooking = async (bookingData) => {
  try {
    const response = await apiPost(API_ENDPOINTS.BOOKINGS.CREATE, {
      propertyId: bookingData.propertyId,
      userId: bookingData.userId,
      checkInDate: bookingData.checkInDate, // формат: ДД.MM.ГГГГ
      checkOutDate: bookingData.checkOutDate, // формат: ДД.MM.ГГГГ
      guests: parseInt(bookingData.guests),
      notes: bookingData.notes || '',
      totalPrice: parseFloat(bookingData.totalPrice) || 0,
    });

    if (response.success) {
      return {
        success: true,
        bookingId: response.bookingId,
        message: response.message,
      };
    }
  } catch (error) {
    console.error('Ошибка создания бронирования:', error);
    throw error;
  }
};

/**
 * 3️⃣ Получить информацию о бронировании
 */
export const getBooking = async (bookingId) => {
  try {
    const response = await apiGet(API_ENDPOINTS.BOOKINGS.GET(bookingId));
    return response.booking;
  } catch (error) {
    console.error('Ошибка получения бронирования:', error);
    throw error;
  }
};

/**
 * 4️⃣ Обновить бронирование
 */
export const updateBooking = async (bookingId, updates) => {
  try {
    const response = await apiPatch(
      API_ENDPOINTS.BOOKINGS.UPDATE(bookingId),
      updates
    );
    return response;
  } catch (error) {
    console.error('Ошибка обновления бронирования:', error);
    throw error;
  }
};

/**
 * 5️⃣ Отменить бронирование
 */
export const cancelBooking = async (bookingId) => {
  try {
    const response = await apiDelete(API_ENDPOINTS.BOOKINGS.DELETE(bookingId));
    return response;
  } catch (error) {
    console.error('Ошибка отмены бронирования:', error);
    throw error;
  }
};

/**
 * 6️⃣ Получить все бронирования пользователя
 */
export const getUserBookings = async (userId) => {
  try {
    const response = await apiGet(API_ENDPOINTS.BOOKINGS.USER_BOOKINGS(userId));
    return response.bookings;
  } catch (error) {
    console.error('Ошибка получения бронирований пользователя:', error);
    return [];
  }
};

/**
 * 7️⃣ Получить все объекты
 */
export const getProperties = async () => {
  try {
    const response = await apiGet(API_ENDPOINTS.PROPERTIES.LIST);
    return response.properties;
  } catch (error) {
    console.error('Ошибка получения объектов:', error);
    return [];
  }
};

/**
 * 8️⃣ Получить один объект
 */
export const getProperty = async (propertyId) => {
  try {
    const response = await apiGet(API_ENDPOINTS.PROPERTIES.GET(propertyId));
    return response.property;
  } catch (error) {
    console.error('Ошибка получения объекта:', error);
    throw error;
  }
};

// ==================== Примеры использования в компонентах ====================

/**
 * Пример в React компоненте:
 */

/*
import { useEffect, useState } from 'react';
import { getBookedDates, createBooking } from './apiExamples';

function BookingComponent() {
  const [bookedDates, setBookedDates] = useState([]);

  useEffect(() => {
    // Загружаем занятые даты
    const loadDates = async () => {
      const dates = await getBookedDates('property-id-123');
      setBookedDates(dates);
    };
    loadDates();
  }, []);

  const handleBooking = async () => {
    try {
      const result = await createBooking({
        propertyId: 'property-id-123',
        userId: 'user-id-456',
        checkInDate: '25.12.2025',
        checkOutDate: '27.12.2025',
        guests: 2,
        notes: 'Нужна детская кровать',
        totalPrice: 400,
      });

      if (result.success) {
        alert('✅ Бронирование создано! ID: ' + result.bookingId);
      }
    } catch (error) {
      alert('❌ Ошибка: ' + error.message);
    }
  };

  return (
    <div>
      <p>Занятые даты: {bookedDates.join(', ')}</p>
      <button onClick={handleBooking}>Забронировать</button>
    </div>
  );
}
*/
