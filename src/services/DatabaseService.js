/**
 * Database Service
 * CRUD операции для всех сущностей (Users, Properties, Bookings, Reviews, Payments и т.д.)
 */

import {
  getDocument,
  setDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  getAllDocuments,
  generateDocId,
  batchWrite,
} from './FirebaseService';
import { FIRESTORE_COLLECTIONS } from '../utils/firebaseConfig';

/**
 * USERS Collection
 */

export const createUser = async (userId, userData) => {
  const defaultData = {
    id: userId,
    email: userData.email,
    displayName: userData.displayName || '',
    avatar: userData.avatar || null,
    phone: userData.phone || '',
    address: userData.address || '',
    role: userData.role || 'user', // 'user' или 'admin'
    status: 'active',
    membershipLevel: userData.membershipLevel || 'Bronze',
    loyaltyPoints: userData.loyaltyPoints || 0,
    referralCode: generateReferralCode(userId),
    preferences: {
      notifications: true,
      newsletter: true,
      darkMode: false,
    },
    stats: {
      totalBookings: 0,
      totalSpent: 0,
      reviewsCount: 0,
    },
  };

  return setDocument(FIRESTORE_COLLECTIONS.USERS, userId, defaultData);
};

export const getUser = async (userId) => {
  return getDocument(FIRESTORE_COLLECTIONS.USERS, userId);
};

export const updateUser = async (userId, userData) => {
  return updateDocument(FIRESTORE_COLLECTIONS.USERS, userId, userData);
};

export const deleteUser = async (userId) => {
  return deleteDocument(FIRESTORE_COLLECTIONS.USERS, userId);
};

export const getUserByEmail = async (email) => {
  const users = await queryDocuments(FIRESTORE_COLLECTIONS.USERS, [
    { field: 'email', operator: '==', value: email },
  ]);
  return users.length > 0 ? users[0] : null;
};

export const getAllUsers = async () => {
  return getAllDocuments(FIRESTORE_COLLECTIONS.USERS);
};

export const getUsersByRole = async (role) => {
  return queryDocuments(FIRESTORE_COLLECTIONS.USERS, [
    { field: 'role', operator: '==', value: role },
  ]);
};

export const updateUserLoyalty = async (userId, points, level) => {
  return updateDocument(FIRESTORE_COLLECTIONS.USERS, userId, {
    loyaltyPoints: points,
    membershipLevel: level,
  });
};

/**
 * PROPERTIES Collection
 */

export const createProperty = async (propertyData) => {
  const propertyId = generateDocId(FIRESTORE_COLLECTIONS.PROPERTIES);
  const defaultData = {
    id: propertyId,
    name: propertyData.name,
    description: propertyData.description || '',
    location: propertyData.location || {},
    price: propertyData.price || 0,
    currency: propertyData.currency || 'USD',
    images: propertyData.images || [],
    amenities: propertyData.amenities || [],
    capacity: propertyData.capacity || 1,
    rooms: propertyData.rooms || 1,
    rating: 0,
    reviewsCount: 0,
    status: propertyData.status || 'active',
    availability: propertyData.availability || {},
  };

  return setDocument(FIRESTORE_COLLECTIONS.PROPERTIES, propertyId, defaultData).then(() => propertyId);
};

export const getProperty = async (propertyId) => {
  return getDocument(FIRESTORE_COLLECTIONS.PROPERTIES, propertyId);
};

export const updateProperty = async (propertyId, propertyData) => {
  return updateDocument(FIRESTORE_COLLECTIONS.PROPERTIES, propertyId, propertyData);
};

export const deleteProperty = async (propertyId) => {
  return deleteDocument(FIRESTORE_COLLECTIONS.PROPERTIES, propertyId);
};

export const getAllProperties = async () => {
  return getAllDocuments(FIRESTORE_COLLECTIONS.PROPERTIES);
};

export const getPropertiesByStatus = async (status) => {
  return queryDocuments(FIRESTORE_COLLECTIONS.PROPERTIES, [
    { field: 'status', operator: '==', value: status },
  ]);
};

export const getPropertiesByPriceRange = async (minPrice, maxPrice) => {
  return queryDocuments(FIRESTORE_COLLECTIONS.PROPERTIES, [
    { field: 'price', operator: '>=', value: minPrice },
    { field: 'price', operator: '<=', value: maxPrice },
  ]);
};

/**
 * BOOKINGS Collection
 */

export const createBooking = async (bookingData, userId) => {
  const bookingId = generateDocId(FIRESTORE_COLLECTIONS.BOOKINGS);
  const defaultData = {
    id: bookingId,
    userId,
    propertyId: bookingData.propertyId,
    checkInDate: bookingData.checkInDate,
    checkOutDate: bookingData.checkOutDate,
    guests: bookingData.guests || 1,
    totalPrice: bookingData.totalPrice,
    status: 'pending', // 'pending', 'confirmed', 'completed', 'cancelled'
    specialRequests: bookingData.specialRequests || '',
    paymentId: null,
    reviewId: null,
  };

  return setDocument(FIRESTORE_COLLECTIONS.BOOKINGS, bookingId, defaultData).then(() => bookingId);
};

export const getBooking = async (bookingId) => {
  return getDocument(FIRESTORE_COLLECTIONS.BOOKINGS, bookingId);
};

export const updateBooking = async (bookingId, bookingData) => {
  return updateDocument(FIRESTORE_COLLECTIONS.BOOKINGS, bookingId, bookingData);
};

export const deleteBooking = async (bookingId) => {
  return deleteDocument(FIRESTORE_COLLECTIONS.BOOKINGS, bookingId);
};

export const getUserBookings = async (userId) => {
  return queryDocuments(FIRESTORE_COLLECTIONS.BOOKINGS, [
    { field: 'userId', operator: '==', value: userId },
  ]);
};

export const getPropertyBookings = async (propertyId) => {
  return queryDocuments(FIRESTORE_COLLECTIONS.BOOKINGS, [
    { field: 'propertyId', operator: '==', value: propertyId },
  ]);
};

export const getBookingsByStatus = async (status) => {
  return queryDocuments(FIRESTORE_COLLECTIONS.BOOKINGS, [
    { field: 'status', operator: '==', value: status },
  ]);
};

/**
 * REVIEWS Collection
 */

export const createReview = async (reviewData) => {
  const reviewId = generateDocId(FIRESTORE_COLLECTIONS.REVIEWS);
  const defaultData = {
    id: reviewId,
    userId: reviewData.userId,
    propertyId: reviewData.propertyId,
    bookingId: reviewData.bookingId,
    rating: reviewData.rating, // 1-5 stars
    title: reviewData.title,
    comment: reviewData.comment,
    images: reviewData.images || [],
    category: reviewData.category || 'overall', // 'overall', 'room', 'service', 'food', 'cleanliness'
    helpful: 0,
    adminResponse: null,
    status: 'pending', // 'pending', 'approved', 'rejected'
  };

  return setDocument(FIRESTORE_COLLECTIONS.REVIEWS, reviewId, defaultData).then(() => reviewId);
};

export const getReview = async (reviewId) => {
  return getDocument(FIRESTORE_COLLECTIONS.REVIEWS, reviewId);
};

export const updateReview = async (reviewId, reviewData) => {
  return updateDocument(FIRESTORE_COLLECTIONS.REVIEWS, reviewId, reviewData);
};

export const deleteReview = async (reviewId) => {
  return deleteDocument(FIRESTORE_COLLECTIONS.REVIEWS, reviewId);
};

export const getPropertyReviews = async (propertyId) => {
  return queryDocuments(FIRESTORE_COLLECTIONS.REVIEWS, [
    { field: 'propertyId', operator: '==', value: propertyId },
  ]);
};

export const getUserReviews = async (userId) => {
  return queryDocuments(FIRESTORE_COLLECTIONS.REVIEWS, [
    { field: 'userId', operator: '==', value: userId },
  ]);
};

export const getApprovedReviews = async (propertyId) => {
  return queryDocuments(FIRESTORE_COLLECTIONS.REVIEWS, [
    { field: 'propertyId', operator: '==', value: propertyId },
    { field: 'status', operator: '==', value: 'approved' },
  ]);
};

/**
 * PAYMENTS Collection
 */

export const createPayment = async (paymentData, userId) => {
  const paymentId = generateDocId(FIRESTORE_COLLECTIONS.PAYMENTS);
  const defaultData = {
    id: paymentId,
    userId,
    bookingId: paymentData.bookingId,
    amount: paymentData.amount,
    currency: paymentData.currency || 'USD',
    method: paymentData.method, // 'paypal', 'visa', 'crypto', 'stripe', 'yandex'
    status: 'pending', // 'pending', 'completed', 'failed', 'refunded'
    transactionId: paymentData.transactionId || null,
    description: paymentData.description || '',
    fee: paymentData.fee || 0,
    netAmount: paymentData.amount - (paymentData.fee || 0),
  };

  return setDocument(FIRESTORE_COLLECTIONS.PAYMENTS, paymentId, defaultData).then(() => paymentId);
};

export const getPayment = async (paymentId) => {
  return getDocument(FIRESTORE_COLLECTIONS.PAYMENTS, paymentId);
};

export const updatePayment = async (paymentId, paymentData) => {
  return updateDocument(FIRESTORE_COLLECTIONS.PAYMENTS, paymentId, paymentData);
};

export const deletePayment = async (paymentId) => {
  return deleteDocument(FIRESTORE_COLLECTIONS.PAYMENTS, paymentId);
};

export const getUserPayments = async (userId) => {
  return queryDocuments(FIRESTORE_COLLECTIONS.PAYMENTS, [
    { field: 'userId', operator: '==', value: userId },
  ]);
};

export const getPaymentsByStatus = async (status) => {
  return queryDocuments(FIRESTORE_COLLECTIONS.PAYMENTS, [
    { field: 'status', operator: '==', value: status },
  ]);
};

export const getPaymentsByMethod = async (method) => {
  return queryDocuments(FIRESTORE_COLLECTIONS.PAYMENTS, [
    { field: 'method', operator: '==', value: method },
  ]);
};

/**
 * NOTIFICATIONS Collection
 */

export const createNotification = async (notificationData) => {
  const notificationId = generateDocId(FIRESTORE_COLLECTIONS.NOTIFICATIONS);
  const defaultData = {
    id: notificationId,
    userId: notificationData.userId,
    type: notificationData.type, // 'booking', 'payment', 'review', 'referral', 'promotion'
    title: notificationData.title,
    message: notificationData.message,
    data: notificationData.data || {},
    read: false,
    status: 'sent',
  };

  return setDocument(FIRESTORE_COLLECTIONS.NOTIFICATIONS, notificationId, defaultData).then(
    () => notificationId
  );
};

export const getUserNotifications = async (userId) => {
  return queryDocuments(FIRESTORE_COLLECTIONS.NOTIFICATIONS, [
    { field: 'userId', operator: '==', value: userId },
  ]);
};

export const getUserUnreadNotifications = async (userId) => {
  return queryDocuments(FIRESTORE_COLLECTIONS.NOTIFICATIONS, [
    { field: 'userId', operator: '==', value: userId },
    { field: 'read', operator: '==', value: false },
  ]);
};

export const markNotificationAsRead = async (notificationId) => {
  return updateDocument(FIRESTORE_COLLECTIONS.NOTIFICATIONS, notificationId, { read: true });
};

/**
 * LOYALTY_TIERS Collection
 */

export const createLoyaltyTier = async (tierData) => {
  const tierId = generateDocId(FIRESTORE_COLLECTIONS.LOYALTY_TIERS);
  const defaultData = {
    id: tierId,
    name: tierData.name, // 'Bronze', 'Silver', 'Gold', 'Platinum'
    minPoints: tierData.minPoints,
    maxPoints: tierData.maxPoints || null,
    discountPercent: tierData.discountPercent,
    monthlyBonus: tierData.monthlyBonus,
    benefits: tierData.benefits || [],
  };

  return setDocument(FIRESTORE_COLLECTIONS.LOYALTY_TIERS, tierId, defaultData).then(() => tierId);
};

export const getLoyaltyTiers = async () => {
  return getAllDocuments(FIRESTORE_COLLECTIONS.LOYALTY_TIERS);
};

/**
 * PROMOTIONS Collection
 */

export const createPromotion = async (promotionData) => {
  const promotionId = generateDocId(FIRESTORE_COLLECTIONS.PROMOTIONS);
  const defaultData = {
    id: promotionId,
    code: promotionData.code,
    type: promotionData.type, // 'percentage', 'fixed', 'free'
    value: promotionData.value,
    description: promotionData.description || '',
    maxUses: promotionData.maxUses || null,
    currentUses: 0,
    expiryDate: promotionData.expiryDate,
    applicableProperties: promotionData.applicableProperties || [],
    minAmount: promotionData.minAmount || 0,
    status: 'active',
  };

  return setDocument(FIRESTORE_COLLECTIONS.PROMOTIONS, promotionId, defaultData).then(
    () => promotionId
  );
};

export const getPromoByCode = async (code) => {
  const promos = await queryDocuments(FIRESTORE_COLLECTIONS.PROMOTIONS, [
    { field: 'code', operator: '==', value: code.toUpperCase() },
  ]);
  return promos.length > 0 ? promos[0] : null;
};

export const getAllPromotions = async () => {
  return getAllDocuments(FIRESTORE_COLLECTIONS.PROMOTIONS);
};

/**
 * SUPPORT_TICKETS Collection
 */

export const createSupportTicket = async (ticketData) => {
  const ticketId = generateDocId(FIRESTORE_COLLECTIONS.SUPPORT_TICKETS);
  const defaultData = {
    id: ticketId,
    userId: ticketData.userId,
    subject: ticketData.subject,
    description: ticketData.description,
    type: ticketData.type || 'general', // 'general', 'complaint', 'suggestion', 'bug'
    priority: ticketData.priority || 'normal', // 'low', 'normal', 'high', 'urgent'
    status: 'open', // 'open', 'in_progress', 'resolved', 'closed'
    messages: [],
  };

  return setDocument(FIRESTORE_COLLECTIONS.SUPPORT_TICKETS, ticketId, defaultData).then(
    () => ticketId
  );
};

export const getUserSupportTickets = async (userId) => {
  return queryDocuments(FIRESTORE_COLLECTIONS.SUPPORT_TICKETS, [
    { field: 'userId', operator: '==', value: userId },
  ]);
};

export const getAllSupportTickets = async () => {
  return getAllDocuments(FIRESTORE_COLLECTIONS.SUPPORT_TICKETS);
};

/**
 * ANALYTICS Collection
 */

export const recordAnalyticsEvent = async (eventData) => {
  const eventId = generateDocId(FIRESTORE_COLLECTIONS.ANALYTICS);
  const defaultData = {
    id: eventId,
    userId: eventData.userId,
    eventType: eventData.eventType,
    eventData: eventData.eventData || {},
    userAgent: eventData.userAgent || '',
    ipAddress: eventData.ipAddress || '',
  };

  return setDocument(FIRESTORE_COLLECTIONS.ANALYTICS, eventId, defaultData).then(() => eventId);
};

/**
 * Utility Functions
 */

const generateReferralCode = (userId) => {
  return `REF_${userId.substring(0, 8).toUpperCase()}_${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
};

// Пакетная операция для сложных операций
export const performBatchOperation = async (operations) => {
  return batchWrite(operations);
};

export default {
  // Users
  createUser,
  getUser,
  updateUser,
  deleteUser,
  getUserByEmail,
  getAllUsers,
  getUsersByRole,
  updateUserLoyalty,

  // Properties
  createProperty,
  getProperty,
  updateProperty,
  deleteProperty,
  getAllProperties,
  getPropertiesByStatus,
  getPropertiesByPriceRange,

  // Bookings
  createBooking,
  getBooking,
  updateBooking,
  deleteBooking,
  getUserBookings,
  getPropertyBookings,
  getBookingsByStatus,

  // Reviews
  createReview,
  getReview,
  updateReview,
  deleteReview,
  getPropertyReviews,
  getUserReviews,
  getApprovedReviews,

  // Payments
  createPayment,
  getPayment,
  updatePayment,
  deletePayment,
  getUserPayments,
  getPaymentsByStatus,
  getPaymentsByMethod,

  // Notifications
  createNotification,
  getUserNotifications,
  getUserUnreadNotifications,
  markNotificationAsRead,

  // Loyalty
  createLoyaltyTier,
  getLoyaltyTiers,

  // Promotions
  createPromotion,
  getPromoByCode,
  getAllPromotions,

  // Support
  createSupportTicket,
  getUserSupportTickets,
  getAllSupportTickets,

  // Analytics
  recordAnalyticsEvent,

  // Utility
  performBatchOperation,
};
