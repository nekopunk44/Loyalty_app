import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as DatabaseService from '../services/DatabaseService';

const UserDataContext = createContext();

export const UserDataProvider = ({ children }) => {
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState(user?.balance || 0);
  const [walletBalance, setWalletBalance] = useState(user?.walletBalance || 0);
  const [userStats, setUserStats] = useState(user?.stats || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Загрузить актуальные данные пользователя
  const refreshUserData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const updatedUser = await DatabaseService.getUser(user.id);
      if (updatedUser) {
        setUserBalance(updatedUser.balance || 0);
        setWalletBalance(updatedUser.walletBalance || 0);
        setUserStats(updatedUser.stats || {});
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки данных пользователя:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Добавить средства на баланс
  const addBalance = useCallback(async (amount, description = '') => {
    if (!user?.id || amount <= 0) return false;
    
    try {
      setLoading(true);
      await DatabaseService.addToBalance(user.id, amount);
      setUserBalance((prev) => prev + amount);
      
      console.log(`✅ Добавлено ${amount} на баланс. ${description}`);
      return true;
    } catch (err) {
      console.error('❌ Ошибка добавления на баланс:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Вычесть средства с баланса
  const deductBalance = useCallback(async (amount, description = '') => {
    if (!user?.id || amount <= 0) return false;
    
    try {
      setLoading(true);
      await DatabaseService.deductFromBalance(user.id, amount);
      setUserBalance((prev) => prev - amount);
      
      console.log(`✅ Снято ${amount} с баланса. ${description}`);
      return true;
    } catch (err) {
      console.error('❌ Ошибка вычитания с баланса:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Обновить баланс кошелька
  const updateWallet = useCallback(async (newBalance) => {
    if (!user?.id) return false;
    
    try {
      setLoading(true);
      await DatabaseService.updateWalletBalance(user.id, newBalance);
      setWalletBalance(newBalance);
      return true;
    } catch (err) {
      console.error('❌ Ошибка обновления кошелька:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Увеличить количество бронирований
  const incrementBookings = useCallback(async () => {
    if (!user?.id) return false;
    
    try {
      setLoading(true);
      await DatabaseService.incrementTotalBookings(user.id);
      setUserStats((prev) => ({
        ...prev,
        totalBookings: (prev.totalBookings || 0) + 1,
        lastBookingDate: new Date(),
      }));
      return true;
    } catch (err) {
      console.error('❌ Ошибка увеличения количества бронирований:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Добавить потраченную сумму
  const addSpentAmount = useCallback(async (amount) => {
    if (!user?.id || amount <= 0) return false;
    
    try {
      setLoading(true);
      await DatabaseService.incrementTotalSpent(user.id, amount);
      setUserStats((prev) => ({
        ...prev,
        totalSpent: (prev.totalSpent || 0) + amount,
      }));
      return true;
    } catch (err) {
      console.error('❌ Ошибка добавления потраченной суммы:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Добавить заработанную сумму от рефералов
  const addEarnedFromReferral = useCallback(async (amount) => {
    if (!user?.id || amount <= 0) return false;
    
    try {
      setLoading(true);
      await DatabaseService.incrementTotalEarned(user.id, amount);
      setUserStats((prev) => ({
        ...prev,
        totalEarned: (prev.totalEarned || 0) + amount,
      }));
      setUserBalance((prev) => prev + amount);
      return true;
    } catch (err) {
      console.error('❌ Ошибка добавления заработанной суммы:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Добавить отзыв в статистику
  const addReview = useCallback(async (rating) => {
    if (!user?.id) return false;
    
    try {
      setLoading(true);
      await DatabaseService.incrementReviewsCount(user.id, rating);
      setUserStats((prev) => {
        const currentCount = prev.reviewsCount || 0;
        const currentAverage = prev.averageRating || 0;
        const newCount = currentCount + 1;
        const newAverage = ((currentAverage * currentCount) + rating) / newCount;
        
        return {
          ...prev,
          reviewsCount: newCount,
          averageRating: Math.round(newAverage * 10) / 10,
        };
      });
      return true;
    } catch (err) {
      console.error('❌ Ошибка добавления отзыва:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Обновить статус бронирования
  const updateBookingStatus = useCallback(async (status) => {
    if (!user?.id) return false;
    
    try {
      setLoading(true);
      await DatabaseService.updateBookingStats(user.id, status);
      
      if (status === 'completed') {
        setUserStats((prev) => ({
          ...prev,
          completedBookings: (prev.completedBookings || 0) + 1,
        }));
      } else if (status === 'cancelled') {
        setUserStats((prev) => ({
          ...prev,
          cancelledBookings: (prev.cancelledBookings || 0) + 1,
        }));
      }
      return true;
    } catch (err) {
      console.error('❌ Ошибка обновления статуса бронирования:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const value = {
    // Данные
    userBalance,
    walletBalance,
    userStats,
    loading,
    error,
    
    // Методы
    refreshUserData,
    addBalance,
    deductBalance,
    updateWallet,
    incrementBookings,
    addSpentAmount,
    addEarnedFromReferral,
    addReview,
    updateBookingStatus,
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
};

export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within UserDataProvider');
  }
  return context;
};
