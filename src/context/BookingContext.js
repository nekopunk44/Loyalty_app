import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BookingContext = createContext();

export const BookingProvider = ({ children }) => {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load bookings from storage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('@bookings');
        if (saved) {
          setBookings(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load bookings', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Save bookings to storage
  const addBooking = async (booking) => {
    try {
      const newBooking = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        rating: 0,
        review: '',
        status: 'active',
        ...booking,
      };
      const updated = [newBooking, ...bookings];
      setBookings(updated);
      await AsyncStorage.setItem('@bookings', JSON.stringify(updated));
      return newBooking;
    } catch (e) {
      console.error('Failed to add booking', e);
    }
  };

  // Update booking rating and review
  const updateBookingReview = async (bookingId, rating, review) => {
    try {
      const updated = bookings.map(b =>
        b.id === bookingId ? { ...b, rating, review, status: 'completed' } : b
      );
      setBookings(updated);
      await AsyncStorage.setItem('@bookings', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update booking review', e);
    }
  };

  // Cancel booking
  const cancelBooking = async (bookingId) => {
    try {
      const updated = bookings.filter(b => b.id !== bookingId);
      setBookings(updated);
      await AsyncStorage.setItem('@bookings', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to cancel booking', e);
    }
  };

  return (
    <BookingContext.Provider value={{
      bookings,
      isLoading,
      addBooking,
      updateBookingReview,
      cancelBooking,
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
