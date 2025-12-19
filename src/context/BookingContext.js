import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, apiCall } from '../utils/api';
import { useAuth } from './AuthContext';

const BookingContext = createContext();

export const BookingProvider = ({ children }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = user?.id;

  // Load user bookings from API
  useEffect(() => {
    if (user?.role === 'admin') {
      setBookings([]);
      setIsLoading(false);
      return;
    }
    if (!userId) {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        setIsLoading(true);
        const response = await apiCall(API_ENDPOINTS.BOOKINGS.USER_BOOKINGS(userId));
        if (response.success) {
          setBookings(response.bookings || []);
          setError(null);
        } else {
          setError(response.error || 'Failed to load bookings');
        }
      } catch (e) {
        console.error('BookingContext: ошибка загрузки бронирований:', e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [userId, user?.role]);

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

  // Update booking rating and review via API
  const updateBookingReview = async (bookingId, rating, review) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        await apiCall(API_ENDPOINTS.REVIEWS.CREATE, {
          method: 'POST',
          body: JSON.stringify({
            propertyId: booking.propertyId,
            userId,
            rating,
            text: review,
          }),
        });
      }

      const updated = bookings.map(b =>
        b.id === bookingId ? { ...b, rating, review, status: 'completed' } : b
      );
      setBookings(updated);
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
      const response = await apiCall(API_ENDPOINTS.BOOKINGS.CANCEL(bookingId), {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      if (!response.success) {
        throw new Error(response.error || 'Не удалось отменить бронирование');
      }
      setBookings(prev => prev.filter(b => b.id !== bookingId));
      setError(null);
      return response;
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
    if (!userId) return;
    try {
      setIsLoading(true);
      const response = await apiCall(API_ENDPOINTS.BOOKINGS.USER_BOOKINGS(userId));
      if (response.success) {
        setBookings(response.bookings || []);
        setError(null);
      } else {
        setError(response.error || 'Failed to load bookings');
      }
    } catch (e) {
      console.error('refreshBookings: ошибка:', e);
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
