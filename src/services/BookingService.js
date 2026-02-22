/**
 * Booking Service
 * API для работы с бронированиями и оплатой
 */

import { API_ENDPOINTS, apiCall } from '../utils/api';
import LoyaltyCardService from './LoyaltyCardService';

export const BookingService = {
  /**
   * Создать новое бронирование с проверкой баланса карты лояльности
   */
  createBooking: async (bookingData) => {
    try {
      const userId = bookingData.userId || 'anonymous';
      const totalPrice = bookingData.totalPrice || 0;

      // Проверяем баланс карты лояльности перед бронированием
      if (userId !== 'anonymous' && totalPrice > 0) {
        try {
          const hasEnough = await LoyaltyCardService.hasEnoughBalance(userId, totalPrice);
          if (!hasEnough) {
            const card = await LoyaltyCardService.getCard(userId);
            const deficit = totalPrice - card.balance;
            throw new Error(
              `Недостаточно средств. Баланс: ${card.balance}PRB, нужно: ${totalPrice}PRB (не хватает ${deficit}PRB)`
            );
          }
        } catch (error) {
          // Если ошибка - пробуем создать бронирование всё равно (сервер тоже проверит)
          console.warn('⚠️ Предварительная проверка баланса:', error.message);
        }
      }

      const response = await apiCall(API_ENDPOINTS.BOOKINGS.CREATE, {
        method: 'POST',
        body: JSON.stringify({
          propertyId: bookingData.propertyId?.toString() || '',
          userId: userId,
          checkInDate: bookingData.checkInDate || '',
          checkOutDate: bookingData.checkOutDate || '',
          guests: parseInt(bookingData.guests) || 1,
          notes: bookingData.notes || '',
          totalPrice: totalPrice,
          // Дополнительные услуги
          saunaHours: parseInt(bookingData.saunaHours) || 0,
          kitchenware: bookingData.kitchenware || false,
        }),
      });

      if (response.success) {
        console.log(`✅ Бронирование создано, списано ${totalPrice}PRB с карты лояльности`);
        return response.booking;
      }

      // Обработка ошибки недостатка средств
      if (response.error && response.error.includes('Недостаточно')) {
        throw new Error(response.error);
      }

      throw new Error(response.error || 'Failed to create booking');
    } catch (error) {
      console.error('❌ Ошибка создания бронирования:', error.message);
      throw error;
    }
  },

  /**
   * Получить информацию о бронировании
   */
  getBooking: async (bookingId) => {
    try {
      const response = await apiCall(API_ENDPOINTS.BOOKINGS.GET(bookingId));
      if (response.success) {
        return response.booking;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch booking:', error);
      throw error;
    }
  },

  /**
   * Получить все бронирования пользователя
   */
  getUserBookings: async (userId) => {
    try {
      const response = await apiCall(API_ENDPOINTS.BOOKINGS.USER_BOOKINGS(userId));
      if (response.success) {
        return response.bookings || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch user bookings:', error);
      throw error;
    }
  },

  /**
   * Получить занятые даты для объекта
   */
  getPropertyBookedDates: async (propertyId) => {
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

  /**
   * Подтвердить платеж и активировать бронирование
   */
  confirmPayment: async (bookingId) => {
    try {
      const response = await apiCall(
        API_ENDPOINTS.BOOKINGS.CONFIRM_PAYMENT(bookingId),
        {
          method: 'POST',
        }
      );
      if (response.success) {
        console.log(`✅ Платеж подтвержден для бронирования ${bookingId}`);
        return response.booking;
      }
      throw new Error(response.error || 'Failed to confirm payment');
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      throw error;
    }
  },

  /**
   * Отменить бронирование (только если статус pending)
   */
  cancelBooking: async (bookingId) => {
    try {
      const response = await apiCall(
        API_ENDPOINTS.BOOKINGS.CANCEL(bookingId),
        {
          method: 'POST',
        }
      );
      if (response.success) {
        console.log(`❌ Бронирование ${bookingId} отменено`);
        return response.booking;
      }
      throw new Error(response.error || 'Failed to cancel booking');
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      throw error;
    }
  },
};

export default BookingService;
