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
import { collection, onSnapshot } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../utils/firebaseConfig';

// Инициализируем db один раз
let db = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.warn('Firebase already initialized:', error.code);
  db = getFirestore();
}

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
    balance: userData.balance || 0, // Остаток на счёте
    walletBalance: userData.walletBalance || 0, // Баланс кошелька
    referralCode: generateReferralCode(userId),
    preferences: {
      notifications: true,
      newsletter: true,
      darkMode: false,
    },
    stats: {
      totalBookings: 0,
      totalSpent: 0,
      totalEarned: 0, // Всего заработано от рефералов
      reviewsCount: 0,
      averageRating: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      lastBookingDate: null,
    },
    paymentMethods: [], // Сохранённые методы оплаты
    createdAt: new Date(),
    updatedAt: new Date(),
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
    updatedAt: new Date(),
  });
};

// Обновить баланс пользователя
export const updateUserBalance = async (userId, newBalance) => {
  return updateDocument(FIRESTORE_COLLECTIONS.USERS, userId, {
    balance: newBalance,
    updatedAt: new Date(),
  });
};

// Обновить баланс кошелька
export const updateWalletBalance = async (userId, newBalance) => {
  return updateDocument(FIRESTORE_COLLECTIONS.USERS, userId, {
    walletBalance: newBalance,
    updatedAt: new Date(),
  });
};

// Увеличить баланс на сумму
export const addToBalance = async (userId, amount) => {
  const user = await getUser(userId);
  if (!user) throw new Error('Пользователь не найден');
  
  const newBalance = (user.balance || 0) + amount;
  return updateUserBalance(userId, newBalance);
};

// Уменьшить баланс на сумму
export const deductFromBalance = async (userId, amount) => {
  const user = await getUser(userId);
  if (!user) throw new Error('Пользователь не найден');
  
  const newBalance = (user.balance || 0) - amount;
  if (newBalance < 0) throw new Error('Недостаточно средств');
  
  return updateUserBalance(userId, newBalance);
};

// Обновить статистику пользователя
export const updateUserStats = async (userId, statsUpdates) => {
  const user = await getUser(userId);
  if (!user) throw new Error('Пользователь не найден');
  
  const updatedStats = {
    ...user.stats,
    ...statsUpdates,
    updatedAt: new Date(),
  };
  
  return updateDocument(FIRESTORE_COLLECTIONS.USERS, userId, {
    stats: updatedStats,
    updatedAt: new Date(),
  });
};

// Увеличить количество бронирований
export const incrementTotalBookings = async (userId, amount = 1) => {
  const user = await getUser(userId);
  if (!user) throw new Error('Пользователь не найден');
  
  const newTotal = (user.stats?.totalBookings || 0) + amount;
  return updateUserStats(userId, {
    totalBookings: newTotal,
    lastBookingDate: new Date(),
  });
};

// Увеличить сумму потрачена
export const incrementTotalSpent = async (userId, amount) => {
  const user = await getUser(userId);
  if (!user) throw new Error('Пользователь не найден');
  
  const newTotal = (user.stats?.totalSpent || 0) + amount;
  return updateUserStats(userId, {
    totalSpent: newTotal,
  });
};

// Увеличить сумму заработана через рефералы
export const incrementTotalEarned = async (userId, amount) => {
  const user = await getUser(userId);
  if (!user) throw new Error('Пользователь не найден');
  
  const newTotal = (user.stats?.totalEarned || 0) + amount;
  const newBalance = (user.balance || 0) + amount;
  
  return updateDocument(FIRESTORE_COLLECTIONS.USERS, userId, {
    stats: {
      ...user.stats,
      totalEarned: newTotal,
    },
    balance: newBalance,
    updatedAt: new Date(),
  });
};

// Обновить количество отзывов
export const incrementReviewsCount = async (userId, rating) => {
  const user = await getUser(userId);
  if (!user) throw new Error('Пользователь не найден');
  
  const currentCount = user.stats?.reviewsCount || 0;
  const currentAverage = user.stats?.averageRating || 0;
  
  const newCount = currentCount + 1;
  const newAverage = ((currentAverage * currentCount) + rating) / newCount;
  
  return updateUserStats(userId, {
    reviewsCount: newCount,
    averageRating: Math.round(newAverage * 10) / 10,
  });
};

// Обновить статус бронирования в статистике
export const updateBookingStats = async (userId, bookingStatus) => {
  const user = await getUser(userId);
  if (!user) throw new Error('Пользователь не найден');
  
  const stats = { ...user.stats };
  
  if (bookingStatus === 'completed') {
    stats.completedBookings = (stats.completedBookings || 0) + 1;
  } else if (bookingStatus === 'cancelled') {
    stats.cancelledBookings = (stats.cancelledBookings || 0) + 1;
  }
  
  return updateUserStats(userId, stats);
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

// EVENTS Collection
export const createEvent = async (eventData) => {
  const eventId = generateDocId(FIRESTORE_COLLECTIONS.EVENTS);
  const defaultData = {
    id: eventId,
    title: eventData.title || '',
    description: eventData.description || '',
    status: eventData.status || 'Активный',
    icon: eventData.icon || 'event',
    color: eventData.color || '#FF6B35',
    participants: eventData.participants || 0,
    prize: eventData.prize || null,
    reward: eventData.reward || null,
    startBid: eventData.startBid || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  console.log('🟡 DatabaseService: createEvent начало, ID:', eventId);
  
  // Добавляем timeout для Firebase операции
  return Promise.race([
    new Promise(async (resolve, reject) => {
      try {
        console.log('🟡 DatabaseService: отправляю в setDocument...');
        await setDocument(FIRESTORE_COLLECTIONS.EVENTS, eventId, defaultData);
        console.log('✅ DatabaseService: setDocument успешно');
        resolve(eventId);
      } catch (error) {
        console.error('❌ DatabaseService: ошибка в setDocument:', error);
        reject(error);
      }
    }),
    new Promise((_, reject) => 
      setTimeout(() => {
        console.error('❌ DatabaseService: Firebase timeout (10 сек)');
        reject(new Error('Firebase timeout - operation exceeded 10 seconds'));
      }, 10000) // 10 сек timeout
    )
  ]);
};

export const getEvent = (eventId) => {
  return getDocument(FIRESTORE_COLLECTIONS.EVENTS, eventId);
};

export const updateEvent = (eventId, eventData) => {
  return updateDocument(FIRESTORE_COLLECTIONS.EVENTS, eventId, {
    ...eventData,
    updatedAt: new Date(),
  });
};

export const deleteEvent = (eventId) => {
  return deleteDocument(FIRESTORE_COLLECTIONS.EVENTS, eventId);
};

export const getAllEvents = () => {
  return getAllDocuments(FIRESTORE_COLLECTIONS.EVENTS);
};

export const getEventsByStatus = (status) => {
  return queryDocuments(FIRESTORE_COLLECTIONS.EVENTS, [
    ['status', '==', status],
  ]);
};

export const listenToEvents = (callback) => {
  try {
    if (!db) {
      console.error('Database not initialized');
      callback([]);
      return () => {};
    }
    
    const unsubscribe = onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.EVENTS), 
      (snapshot) => {
        const eventsData = snapshot.docs.map(doc => {
          const data = doc.data();
          // Гарантируем, что все нужные поля имеют значения
          return {
            id: data.id || doc.id,
            title: data.title || '',
            description: data.description || '',
            status: data.status || 'Активный',
            icon: data.icon || 'event',
            color: data.color || '#FF6B35',
            participants: data.participants || 0,
            prize: data.prize || null,
            reward: data.reward || null,
            startBid: data.startBid || null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            participantsCount: data.participants || 0, // Добавляем для AdminEvents совместимости
          };
        });
        callback(eventsData);
      }, 
      (error) => {
        console.error('❌ Ошибка слушания событий:', error);
        // ⚠️ ВАЖНО: Не вызываем callback([]) при ошибке!
        // Это сохранит существующие события (локальные или кэшированные)
        // callback([]);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.error('Ошибка инициализации слушателя:', error);
    callback([]);
    return () => {}; // Возвращаем пустую функцию если ошибка
  }
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

  // Events
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  getAllEvents,
  getEventsByStatus,
  listenToEvents,

  // Utility
  performBatchOperation,
};
