import React, { createContext, useContext, useState, useCallback } from 'react';
import DatabaseService from '../services/DatabaseService';

const ReviewContext = createContext();

export const ReviewProvider = ({ children }) => {
  const [reviews, setReviews] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Получить все отзывы по свойству
  const getPropertyReviews = useCallback(async (propertyId, filter = 'all') => {
    setLoading(true);
    setError(null);
    try {
      const propertyReviews = await DatabaseService.getPropertyReviews(propertyId);
      
      let filtered = propertyReviews;
      if (filter === 'approved') {
        filtered = propertyReviews.filter(r => r.approved === true);
      } else if (filter === 'pending') {
        filtered = propertyReviews.filter(r => r.approved === false);
      }
      
      setReviews(filtered);
      return filtered;
    } catch (err) {
      console.error('Error fetching property reviews:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Получить отзывы пользователя
  const getUserReviews = useCallback(async (userId) => {
    setLoading(true);
    setError(null);
    try {
      const userReviewsList = await DatabaseService.getUserReviews(userId);
      setUserReviews(userReviewsList);
      return userReviewsList;
    } catch (err) {
      console.error('Error fetching user reviews:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Создать новый отзыв
  const createReview = useCallback(async (reviewData) => {
    setLoading(true);
    setError(null);
    try {
      const newReview = await DatabaseService.createReview(reviewData);
      setUserReviews([...userReviews, newReview]);
      return newReview;
    } catch (err) {
      console.error('Error creating review:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userReviews]);

  // Обновить отзыв
  const updateReview = useCallback(async (reviewId, updates) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await DatabaseService.updateReview(reviewId, updates);
      
      // Обновить в locальном состоянии
      setUserReviews(
        userReviews.map(r => r.id === reviewId ? { ...r, ...updates } : r)
      );
      setReviews(
        reviews.map(r => r.id === reviewId ? { ...r, ...updated } : r)
      );
      
      return updated;
    } catch (err) {
      console.error('Error updating review:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [reviews, userReviews]);

  // Удалить отзыв
  const deleteReview = useCallback(async (reviewId) => {
    setLoading(true);
    setError(null);
    try {
      await DatabaseService.deleteReview(reviewId);
      setUserReviews(userReviews.filter(r => r.id !== reviewId));
      setReviews(reviews.filter(r => r.id !== reviewId));
    } catch (err) {
      console.error('Error deleting review:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [reviews, userReviews]);

  // Получить среднюю оценку
  const getAverageRating = useCallback((reviewsList = reviews) => {
    if (reviewsList.length === 0) return 0;
    const sum = reviewsList.reduce((acc, r) => acc + (r.rating || 0), 0);
    return (sum / reviewsList.length).toFixed(1);
  }, [reviews]);

  // Получить распределение оценок
  const getRatingDistribution = useCallback((reviewsList = reviews) => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewsList.forEach(r => {
      const rating = Math.round(r.rating);
      if (distribution[rating] !== undefined) {
        distribution[rating]++;
      }
    });
    return distribution;
  }, [reviews]);

  // Получить полезные отзывы
  const getHelpfulReviews = useCallback((reviewsList = reviews, limit = 5) => {
    return reviewsList
      .sort((a, b) => (b.helpful || 0) - (a.helpful || 0))
      .slice(0, limit);
  }, [reviews]);

  // Отметить отзыв как полезный
  const markAsHelpful = useCallback(async (reviewId, userId) => {
    try {
      const review = reviews.find(r => r.id === reviewId);
      if (!review) return;

      const currentHelpful = review.helpful || 0;
      const hasMarked = review.helpfulBy && review.helpfulBy.includes(userId);

      const updated = await DatabaseService.updateReview(reviewId, {
        helpful: hasMarked ? currentHelpful - 1 : currentHelpful + 1,
        helpfulBy: hasMarked
          ? (review.helpfulBy || []).filter(id => id !== userId)
          : [...(review.helpfulBy || []), userId]
      });

      setReviews(
        reviews.map(r => r.id === reviewId ? { ...r, ...updated } : r)
      );
      
      return updated;
    } catch (err) {
      console.error('Error marking review as helpful:', err);
      setError(err.message);
      throw err;
    }
  }, [reviews]);

  // Получить статистику отзывов для свойства
  const getReviewStats = useCallback(async (propertyId) => {
    try {
      const propertyReviews = await DatabaseService.getPropertyReviews(propertyId);
      const approved = propertyReviews.filter(r => r.approved);
      
      return {
        total: propertyReviews.length,
        approved: approved.length,
        pending: propertyReviews.length - approved.length,
        average: getAverageRating(approved),
        distribution: getRatingDistribution(approved),
      };
    } catch (err) {
      console.error('Error fetching review stats:', err);
      return null;
    }
  }, [getAverageRating, getRatingDistribution]);

  const value = {
    // State
    reviews,
    userReviews,
    loading,
    error,

    // Methods
    getPropertyReviews,
    getUserReviews,
    createReview,
    updateReview,
    deleteReview,
    markAsHelpful,

    // Utilities
    getAverageRating,
    getRatingDistribution,
    getHelpfulReviews,
    getReviewStats,
  };

  return (
    <ReviewContext.Provider value={value}>
      {children}
    </ReviewContext.Provider>
  );
};

export const useReview = () => {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error('useReview must be used within ReviewProvider');
  }
  return context;
};
