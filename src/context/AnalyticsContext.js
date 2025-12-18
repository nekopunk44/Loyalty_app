import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AnalyticsContext = createContext();

export const AnalyticsProvider = ({ children }) => {
  const [analyticsData, setAnalyticsData] = useState({
    totalUsers: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalPayments: 0,
    totalReviews: 0,
    averageRating: 0,
    activeBookings: 0,
    completedBookings: 0,
    pendingPayments: 0,
    usersByTier: {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
    },
    monthlyRevenue: {},
    paymentMethods: {
      paypal: 0,
      visa: 0,
      crypto: 0,
    },
    topProperties: [],
    recentActivity: [],
  });

  // Загрузить аналитику
  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const saved = await AsyncStorage.getItem('@analytics');
      if (saved) {
        setAnalyticsData(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', error);
    }
  };

  // Сохранить аналитику
  const saveAnalytics = async (data) => {
    try {
      await AsyncStorage.setItem('@analytics', JSON.stringify(data));
      setAnalyticsData(data);
    } catch (error) {
      console.error('Ошибка сохранения аналитики:', error);
    }
  };

  // Записать событие
  const trackEvent = async (eventType, data) => {
    try {
      const event = {
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
      };

      const updated = {
        ...analyticsData,
        recentActivity: [event, ...analyticsData.recentActivity].slice(0, 100),
      };

      // Обновить соответствующую статистику
      switch (eventType) {
        case 'booking_created':
          updated.totalBookings += 1;
          updated.activeBookings += 1;
          if (data.amount) {
            updated.totalRevenue += data.amount;
            const month = new Date(data.timestamp).toISOString().slice(0, 7);
            updated.monthlyRevenue[month] = (updated.monthlyRevenue[month] || 0) + data.amount;
          }
          break;

        case 'booking_completed':
          updated.completedBookings += 1;
          updated.activeBookings = Math.max(0, updated.activeBookings - 1);
          break;

        case 'payment_processed':
          updated.totalPayments += 1;
          updated.pendingPayments = Math.max(0, updated.pendingPayments - 1);
          if (data.method) {
            updated.paymentMethods[data.method] = (updated.paymentMethods[data.method] || 0) + 1;
          }
          break;

        case 'review_submitted':
          updated.totalReviews += 1;
          if (data.rating) {
            updated.averageRating = (updated.averageRating * (updated.totalReviews - 1) + data.rating) / updated.totalReviews;
          }
          break;

        case 'user_registered':
          updated.totalUsers += 1;
          break;

        case 'tier_updated':
          if (data.oldTier) {
            updated.usersByTier[data.oldTier] = Math.max(0, updated.usersByTier[data.oldTier] - 1);
          }
          if (data.newTier) {
            updated.usersByTier[data.newTier] = (updated.usersByTier[data.newTier] || 0) + 1;
          }
          break;

        case 'property_viewed':
          const propIndex = updated.topProperties.findIndex(p => p.name === data.propertyName);
          if (propIndex >= 0) {
            updated.topProperties[propIndex].views += 1;
          } else {
            updated.topProperties.push({
              name: data.propertyName,
              views: 1,
              bookings: 0,
              revenue: 0,
            });
          }
          break;

        case 'property_booked':
          const propIndexB = updated.topProperties.findIndex(p => p.name === data.propertyName);
          if (propIndexB >= 0) {
            updated.topProperties[propIndexB].bookings += 1;
            if (data.amount) {
              updated.topProperties[propIndexB].revenue += data.amount;
            }
          }
          break;

        default:
          break;
      }

      await saveAnalytics(updated);
    } catch (error) {
      console.error('Ошибка записи события:', error);
    }
  };

  // Получить статистику за период
  const getStatsByPeriod = (startDate, endDate) => {
    const filtered = analyticsData.recentActivity.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= startDate && eventDate <= endDate;
    });

    return {
      totalEvents: filtered.length,
      bookings: filtered.filter(e => e.type === 'booking_created').length,
      payments: filtered.filter(e => e.type === 'payment_processed').length,
      reviews: filtered.filter(e => e.type === 'review_submitted').length,
      newUsers: filtered.filter(e => e.type === 'user_registered').length,
    };
  };

  // Получить популярные свойства
  const getTopProperties = (limit = 5) => {
    return analyticsData.topProperties
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  };

  // Получить доход по месяцам
  const getMonthlyRevenue = (months = 12) => {
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toISOString().slice(0, 7);
      result.push({
        month,
        revenue: analyticsData.monthlyRevenue[month] || 0,
      });
    }
    return result;
  };

  // Получить распределение платежей
  const getPaymentMethodStats = () => {
    const total = Object.values(analyticsData.paymentMethods).reduce((a, b) => a + b, 0) || 1;
    return {
      paypal: {
        count: analyticsData.paymentMethods.paypal,
        percentage: ((analyticsData.paymentMethods.paypal / total) * 100).toFixed(1),
      },
      visa: {
        count: analyticsData.paymentMethods.visa,
        percentage: ((analyticsData.paymentMethods.visa / total) * 100).toFixed(1),
      },
      crypto: {
        count: analyticsData.paymentMethods.crypto,
        percentage: ((analyticsData.paymentMethods.crypto / total) * 100).toFixed(1),
      },
    };
  };

  // Получить распределение уровней пользователей
  const getUserTierStats = () => {
    const total = Object.values(analyticsData.usersByTier).reduce((a, b) => a + b, 0) || 1;
    return {
      bronze: {
        count: analyticsData.usersByTier.bronze,
        percentage: ((analyticsData.usersByTier.bronze / total) * 100).toFixed(1),
      },
      silver: {
        count: analyticsData.usersByTier.silver,
        percentage: ((analyticsData.usersByTier.silver / total) * 100).toFixed(1),
      },
      gold: {
        count: analyticsData.usersByTier.gold,
        percentage: ((analyticsData.usersByTier.gold / total) * 100).toFixed(1),
      },
      platinum: {
        count: analyticsData.usersByTier.platinum,
        percentage: ((analyticsData.usersByTier.platinum / total) * 100).toFixed(1),
      },
    };
  };

  // Получить общую статистику
  const getDashboardStats = () => {
    return {
      kpis: {
        totalUsers: analyticsData.totalUsers,
        totalBookings: analyticsData.totalBookings,
        totalRevenue: analyticsData.totalRevenue,
        averageRating: analyticsData.averageRating.toFixed(1),
      },
      indicators: {
        activeBookings: analyticsData.activeBookings,
        completedBookings: analyticsData.completedBookings,
        pendingPayments: analyticsData.pendingPayments,
        totalReviews: analyticsData.totalReviews,
      },
      conversionRate: analyticsData.totalBookings > 0 
        ? ((analyticsData.completedBookings / analyticsData.totalBookings) * 100).toFixed(1)
        : 0,
      averageBookingValue: analyticsData.totalBookings > 0
        ? (analyticsData.totalRevenue / analyticsData.totalBookings).toFixed(0)
        : 0,
    };
  };

  // Сбросить аналитику
  const resetAnalytics = async () => {
    const resetData = {
      totalUsers: 0,
      totalBookings: 0,
      totalRevenue: 0,
      totalPayments: 0,
      totalReviews: 0,
      averageRating: 0,
      activeBookings: 0,
      completedBookings: 0,
      pendingPayments: 0,
      usersByTier: {
        bronze: 0,
        silver: 0,
        gold: 0,
        platinum: 0,
      },
      monthlyRevenue: {},
      paymentMethods: {
        paypal: 0,
        visa: 0,
        crypto: 0,
      },
      topProperties: [],
      recentActivity: [],
    };

    await saveAnalytics(resetData);
  };

  return (
    <AnalyticsContext.Provider
      value={{
        analyticsData,
        trackEvent,
        getStatsByPeriod,
        getTopProperties,
        getMonthlyRevenue,
        getPaymentMethodStats,
        getUserTierStats,
        getDashboardStats,
        resetAnalytics,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }
  return context;
};
