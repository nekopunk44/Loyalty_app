import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, apiCall } from '../utils/api';
import { useAuth } from './AuthContext';

const BookingContext = createContext();

export const BookingProvider = ({ children }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Используем userId из AuthContext (user.id)
  const userId = user?.id;

  // Load user bookings from API
  useEffect(() => {
    console.log('🔄 BookingContext: useEffect - userId изменился:', userId);
    if (!userId) {
      console.log('⚠️ BookingContext: userId не установлен');
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        setIsLoading(true);
        console.log('🔄 BookingContext: загружаем бронирования для userId:', userId);
        const response = await apiCall(API_ENDPOINTS.BOOKINGS.USER_BOOKINGS(userId));
        console.log('✅ BookingContext: получены бронирования:', response);
        if (response.success) {
          setBookings(response.bookings || []);
          setError(null);
        } else {
          console.log('❌ BookingContext: ошибка в ответе:', response.error);
          setError(response.error || 'Failed to load bookings');
        }
      } catch (e) {
        console.error('❌ BookingContext: ошибка загрузки бронирований:', e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [userId]);

  // Create booking via API
  const addBooking = async (booking) => {
    try {
      setIsLoading(true);
      const payload = {
        propertyId: booking.propertyId?.toString() || '',
        userId: userId || 'anonymous',
        checkInDate: booking.checkInDate || '',
        checkOutDate: booking.checkOutDate || '',
        guests: booking.guests || 1,
        notes: booking.notes || '',
        totalPrice: booking.totalPrice || 0,
        saunaHours: booking.saunaHours || 0,
        kitchenware: booking.kitchenware || false,
      };

      const response = await apiCall(API_ENDPOINTS.BOOKINGS.CREATE, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        const newBooking = {
          ...response.booking,
          rating: 0,
          review: '',
        };
        setBookings([newBooking, ...bookings]);
        setError(null);
        return newBooking;
      } else {
        setError(response.error || 'Failed to create booking');
        throw new Error(response.error);
      }
    } catch (e) {
      console.error('Failed to add booking', e);
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  // Update booking rating and review (keep in local storage for now)
  const updateBookingReview = async (bookingId, rating, review) => {
    try {
      const updated = bookings.map(b =>
        b.id === bookingId ? { ...b, rating, review, status: 'completed' } : b
      );
      setBookings(updated);
      // Save reviews to local storage
      await AsyncStorage.setItem('@bookingReviews', JSON.stringify(updated));
      setError(null);
    } catch (e) {
      console.error('Failed to update booking review', e);
      setError(e.message);
    }
  };

  // Cancel booking via API
  const cancelBooking = async (bookingId) => {
    try {
      setIsLoading(true);
      // For now, just remove from local state
      // In future, could add DELETE endpoint to API
      const updated = bookings.filter(b => b.id !== bookingId);
      setBookings(updated);
      setError(null);
    } catch (e) {
      console.error('Failed to cancel booking', e);
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  // Get booked dates for property
  const getBookedDates = async (propertyId) => {
    try {
      const response = await apiCall(
        API_ENDPOINTS.BOOKINGS.PROPERTY_BOOKED_DATES(propertyId)
      );
      if (response.success) {
        return response.bookedDates || [];
      }
      return [];
    } catch (e) {
      console.error('Failed to get booked dates', e);
      return [];
    }
  };

  // Обновить список бронирований (refresh)
  const refreshBookings = useCallback(async () => {
    console.log('🔄 refreshBookings вызвана, userId:', userId);
    if (!userId) {
      console.log('⚠️ refreshBookings: userId не установлен');
      return;
    }
    try {
      setIsLoading(true);
      console.log('🔄 refreshBookings: загружаем с сервера для userId:', userId);
      const response = await apiCall(API_ENDPOINTS.BOOKINGS.USER_BOOKINGS(userId));
      console.log('✅ refreshBookings: получены бронирования:', response);
      if (response.success) {
        setBookings(response.bookings || []);
        setError(null);
      } else {
        console.log('❌ refreshBookings: ошибка в ответе:', response.error);
        setError(response.error || 'Failed to load bookings');
      }
    } catch (e) {
      console.error('❌ refreshBookings: ошибка:', e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return (
    <BookingContext.Provider value={{
      bookings,
      isLoading,
      error,
      userId,
      addBooking,
      updateBookingReview,
      cancelBooking,
      getBookedDates,
      refreshBookings,
    }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBookings = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBookings must be used within BookingProvider');
  }
  return context;
};
