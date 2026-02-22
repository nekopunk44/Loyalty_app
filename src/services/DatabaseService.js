/**
 * Database Service - PostgreSQL API Version
 * Замена Firestore на PostgreSQL API
 * Все операции идут через REST API на Node.js сервер
 */

import { getApiUrl } from '../utils/apiUrl';

// ==================== USERS ====================

export const createUser = async (userId, userData) => {
  const user = {
    id: userId,
    email: userData.email,
    displayName: userData.displayName || '',
    avatar: userData.avatar || null,
    phone: userData.phone || '',
    address: userData.address || '',
    role: userData.role || 'user',
    loyaltyPoints: userData.loyaltyPoints || 0,
    membershipLevel: userData.membershipLevel || 'Bronze',
    stats: {
      totalBookings: 0,
      totalSpent: 0,
      completedBookings: 0,
      cancelledBookings: 0,
    },
    createdAt: new Date(),
  };
  return user;
};

export const getUser = async (userId) => {
  try {
    const response = await fetch(`${getApiUrl()}/users/${userId}`);
    const data = await response.json();
    return data.user || null;
  } catch (error) {
    console.warn('Failed to fetch user:', error);
    return null;
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const response = await fetch(`${getApiUrl()}/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    return data.user || userData;
  } catch (error) {
    console.error('Failed to update user:', error);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    await fetch(`${getApiUrl()}/users/${userId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('Failed to delete user:', error);
    return false;
  }
};

export const getUserByEmail = async (email) => {
  try {
    const response = await fetch(`${getApiUrl()}/users/email/${email}`);
    const data = await response.json();
    return data.user || null;
  } catch (error) {
    console.warn('User not found:', error);
    return null;
  }
};

export const getAllUsers = async () => {
  try {
    const response = await fetch(`${getApiUrl()}/users`);
    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return [];
  }
};

export const getUsersByRole = async (role) => {
  try {
    const response = await fetch(`${getApiUrl()}/users?role=${role}`);
    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('Failed to fetch users by role:', error);
    return [];
  }
};

export const updateUserLoyalty = async (userId, points, level) => {
  return updateUser(userId, {
    loyaltyPoints: points,
    membershipLevel: level,
  });
};

export const updateUserBalance = async (userId, newBalance) => {
  return updateUser(userId, { balance: newBalance });
};

export const updateWalletBalance = async (userId, newBalance) => {
  return updateUser(userId, { walletBalance: newBalance });
};

export const addToBalance = async (userId, amount) => {
  const user = await getUser(userId);
  if (!user) throw new Error('Пользователь не найден');
  const newBalance = (user.balance || 0) + amount;
  return updateUserBalance(userId, newBalance);
};

export const deductFromBalance = async (userId, amount) => {
  const user = await getUser(userId);
  if (!user) throw new Error('Пользователь не найден');
  const newBalance = (user.balance || 0) - amount;
  if (newBalance < 0) throw new Error('Недостаточно средств');
  return updateUserBalance(userId, newBalance);
};

export const updateUserStats = async (userId, statsUpdates) => {
  const user = await getUser(userId);
  if (!user) throw new Error('Пользователь не найден');
  const updatedStats = { ...user.stats, ...statsUpdates };
  return updateUser(userId, { stats: updatedStats });
};

export const incrementTotalBookings = async (userId, amount = 1) => {
  const user = await getUser(userId);
  if (!user) throw new Error('Пользователь не найден');
  const newTotal = (user.stats?.totalBookings || 0) + amount;
  return updateUserStats(userId, {
    totalBookings: newTotal,
    lastBookingDate: new Date(),
  });
};

export const incrementTotalSpent = async (userId, amount) => {
  const user = await getUser(userId);
  if (!user) throw new Error('Пользователь не найден');
  const newTotal = (user.stats?.totalSpent || 0) + amount;
  return updateUserStats(userId, { totalSpent: newTotal });
};

export const incrementTotalEarned = async (userId, amount) => {
  const user = await getUser(userId);
  if (!user) throw new Error('Пользователь не найден');
  const newTotal = (user.stats?.totalEarned || 0) + amount;
  const newBalance = (user.balance || 0) + amount;
  return updateUser(userId, {
    stats: { ...user.stats, totalEarned: newTotal },
    balance: newBalance,
  });
};

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

// ==================== PROPERTIES ====================

export const createProperty = async (propertyData) => {
  try {
    const response = await fetch(`${getApiUrl()}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(propertyData),
    });
    const data = await response.json();
    return data.property || propertyData;
  } catch (error) {
    console.error('Failed to create property:', error);
    throw error;
  }
};

export const getProperty = async (propertyId) => {
  try {
    const response = await fetch(`${getApiUrl()}/properties/${propertyId}`);
    const data = await response.json();
    return data.property || null;
  } catch (error) {
    console.error('Failed to fetch property:', error);
    return null;
  }
};

export const updateProperty = async (propertyId, propertyData) => {
  try {
    const response = await fetch(`${getApiUrl()}/properties/${propertyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(propertyData),
    });
    const data = await response.json();
    return data.property || propertyData;
  } catch (error) {
    console.error('Failed to update property:', error);
    throw error;
  }
};

export const deleteProperty = async (propertyId) => {
  try {
    await fetch(`${getApiUrl()}/properties/${propertyId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('Failed to delete property:', error);
    return false;
  }
};

export const getAllProperties = async () => {
  try {
    const response = await fetch(`${getApiUrl()}/properties`);
    const data = await response.json();
    return data.properties || [];
  } catch (error) {
    console.error('Failed to fetch properties:', error);
    return [];
  }
};

export const getPropertiesByStatus = async (status) => {
  try {
    const response = await fetch(`${getApiUrl()}/properties?status=${status}`);
    const data = await response.json();
    return data.properties || [];
  } catch (error) {
    console.error('Failed to fetch properties by status:', error);
    return [];
  }
};

export const getPropertiesByPriceRange = async (minPrice, maxPrice) => {
  try {
    const response = await fetch(
      `${getApiUrl()}/properties?minPrice=${minPrice}&maxPrice=${maxPrice}`
    );
    const data = await response.json();
    return data.properties || [];
  } catch (error) {
    console.error('Failed to fetch properties by price:', error);
    return [];
  }
};

// ==================== BOOKINGS ====================

export const createBooking = async (bookingData, userId) => {
  try {
    const payload = { userId, ...bookingData };
    const response = await fetch(`${getApiUrl()}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data.booking || payload;
  } catch (error) {
    console.error('Failed to create booking:', error);
    throw error;
  }
};

export const getBooking = async (bookingId) => {
  try {
    const response = await fetch(`${getApiUrl()}/bookings/${bookingId}`);
    const data = await response.json();
    return data.booking || null;
  } catch (error) {
    console.error('Failed to fetch booking:', error);
    return null;
  }
};

export const updateBooking = async (bookingId, bookingData) => {
  try {
    const response = await fetch(`${getApiUrl()}/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    });
    const data = await response.json();
    return data.booking || bookingData;
  } catch (error) {
    console.error('Failed to update booking:', error);
    throw error;
  }
};

export const deleteBooking = async (bookingId) => {
  try {
    await fetch(`${getApiUrl()}/bookings/${bookingId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('Failed to delete booking:', error);
    return false;
  }
};

export const getUserBookings = async (userId) => {
  try {
    const response = await fetch(`${getApiUrl()}/bookings/user/${userId}`);
    const data = await response.json();
    return data.bookings || [];
  } catch (error) {
    console.error('Failed to fetch user bookings:', error);
    return [];
  }
};

export const getPropertyBookings = async (propertyId) => {
  try {
    const response = await fetch(`${getApiUrl()}/bookings/property/${propertyId}`);
    const data = await response.json();
    return data.bookings || [];
  } catch (error) {
    console.error('Failed to fetch property bookings:', error);
    return [];
  }
};

export const getBookingsByStatus = async (status) => {
  try {
    const response = await fetch(`${getApiUrl()}/bookings?status=${status}`);
    const data = await response.json();
    return data.bookings || [];
  } catch (error) {
    console.error('Failed to fetch bookings by status:', error);
    return [];
  }
};

export const getPropertyBookedDates = async (propertyId) => {
  try {
    const response = await fetch(
      `${getApiUrl()}/bookings/property/${propertyId}/booked-dates`
    );
    const data = await response.json();
    return data.bookedDates || [];
  } catch (error) {
    console.error('Failed to fetch booked dates:', error);
    return [];
  }
};

export const confirmBookingPayment = async (bookingId) => {
  try {
    const response = await fetch(`${getApiUrl()}/bookings/${bookingId}/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    return data.booking || null;
  } catch (error) {
    console.error('Failed to confirm payment:', error);
    throw error;
  }
};

export const cancelBooking = async (bookingId, reason = '') => {
  try {
    const response = await fetch(`${getApiUrl()}/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await response.json();
    return data.booking || null;
  } catch (error) {
    console.error('Failed to cancel booking:', error);
    throw error;
  }
};

// ==================== REVIEWS ====================

export const createReview = async (reviewData) => {
  try {
    const response = await fetch(`${getApiUrl()}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData),
    });
    const data = await response.json();
    return data.review || reviewData;
  } catch (error) {
    console.error('Failed to create review:', error);
    throw error;
  }
};

export const getReview = async (reviewId) => {
  try {
    const response = await fetch(`${getApiUrl()}/reviews/${reviewId}`);
    const data = await response.json();
    return data.review || null;
  } catch (error) {
    console.error('Failed to fetch review:', error);
    return null;
  }
};

export const updateReview = async (reviewId, reviewData) => {
  try {
    const response = await fetch(`${getApiUrl()}/reviews/${reviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData),
    });
    const data = await response.json();
    return data.review || reviewData;
  } catch (error) {
    console.error('Failed to update review:', error);
    throw error;
  }
};

export const deleteReview = async (reviewId) => {
  try {
    await fetch(`${getApiUrl()}/reviews/${reviewId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('Failed to delete review:', error);
    return false;
  }
};

export const getPropertyReviews = async (propertyId) => {
  try {
    const response = await fetch(`${getApiUrl()}/reviews/property/${propertyId}`);
    const data = await response.json();
    return data.reviews || [];
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return [];
  }
};

export const getUserReviews = async (userId) => {
  try {
    const response = await fetch(`${getApiUrl()}/reviews/user/${userId}`);
    const data = await response.json();
    return data.reviews || [];
  } catch (error) {
    console.error('Failed to fetch user reviews:', error);
    return [];
  }
};

export const getApprovedReviews = async (propertyId) => {
  try {
    const response = await fetch(
      `${getApiUrl()}/reviews/property/${propertyId}?status=approved`
    );
    const data = await response.json();
    return data.reviews || [];
  } catch (error) {
    console.error('Failed to fetch approved reviews:', error);
    return [];
  }
};

// ==================== PAYMENTS ====================

export const createPayment = async (paymentData, userId) => {
  try {
    const payload = { userId, ...paymentData };
    const response = await fetch(`${getApiUrl()}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data.payment || payload;
  } catch (error) {
    console.error('Failed to create payment:', error);
    throw error;
  }
};

export const getPayment = async (paymentId) => {
  try {
    const response = await fetch(`${getApiUrl()}/payments/${paymentId}`);
    const data = await response.json();
    return data.payment || null;
  } catch (error) {
    console.error('Failed to fetch payment:', error);
    return null;
  }
};

export const updatePayment = async (paymentId, paymentData) => {
  try {
    const response = await fetch(`${getApiUrl()}/payments/${paymentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData),
    });
    const data = await response.json();
    return data.payment || paymentData;
  } catch (error) {
    console.error('Failed to update payment:', error);
    throw error;
  }
};

export const deletePayment = async (paymentId) => {
  try {
    await fetch(`${getApiUrl()}/payments/${paymentId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('Failed to delete payment:', error);
    return false;
  }
};

export const getUserPayments = async (userId) => {
  try {
    const response = await fetch(`${getApiUrl()}/payments/user/${userId}`);
    const data = await response.json();
    return data.payments || [];
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    return [];
  }
};

export const getPaymentsByStatus = async (status) => {
  try {
    const response = await fetch(`${getApiUrl()}/payments?status=${status}`);
    const data = await response.json();
    return data.payments || [];
  } catch (error) {
    console.error('Failed to fetch payments by status:', error);
    return [];
  }
};

export const getPaymentsByMethod = async (method) => {
  try {
    const response = await fetch(`${getApiUrl()}/payments?method=${method}`);
    const data = await response.json();
    return data.payments || [];
  } catch (error) {
    console.error('Failed to fetch payments by method:', error);
    return [];
  }
};

// ==================== NOTIFICATIONS ====================

export const createNotification = async (notificationData) => {
  try {
    const response = await fetch(`${getApiUrl()}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationData),
    });
    const data = await response.json();
    return data.notification || notificationData;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
};

export const getUserNotifications = async (userId) => {
  try {
    const response = await fetch(`${getApiUrl()}/notifications/user/${userId}`);
    const data = await response.json();
    return data.notifications || [];
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }
};

export const getUserUnreadNotifications = async (userId) => {
  try {
    const response = await fetch(`${getApiUrl()}/notifications/user/${userId}?read=false`);
    const data = await response.json();
    return data.notifications || [];
  } catch (error) {
    console.error('Failed to fetch unread notifications:', error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    await fetch(`${getApiUrl()}/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
    return true;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }
};

// ==================== LOYALTY ====================

export const getLoyaltyCard = async (userId) => {
  try {
    const response = await fetch(`${getApiUrl()}/loyalty-card/${userId}`);
    const data = await response.json();
    return data.card || null;
  } catch (error) {
    console.error('Failed to fetch loyalty card:', error);
    return null;
  }
};

export const topUpLoyaltyCard = async (userId, amount) => {
  try {
    const response = await fetch(`${getApiUrl()}/loyalty-card/${userId}/top-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    const data = await response.json();
    return data.card || null;
  } catch (error) {
    console.error('Failed to top up loyalty card:', error);
    throw error;
  }
};

export const getLoyaltyTransactions = async (userId) => {
  try {
    const response = await fetch(`${getApiUrl()}/loyalty-card/${userId}/transactions`);
    const data = await response.json();
    return data.transactions || [];
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return [];
  }
};

export const createLoyaltyTier = async (tierData) => {
  try {
    const response = await fetch(`${getApiUrl()}/loyalty-tiers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tierData),
    });
    const data = await response.json();
    return data.tier || tierData;
  } catch (error) {
    console.error('Failed to create loyalty tier:', error);
    throw error;
  }
};

export const getLoyaltyTiers = async () => {
  try {
    const response = await fetch(`${getApiUrl()}/loyalty-tiers`);
    const data = await response.json();
    return data.tiers || [];
  } catch (error) {
    console.error('Failed to fetch loyalty tiers:', error);
    return [];
  }
};

// ==================== PROMOTIONS ====================

export const createPromotion = async (promotionData) => {
  try {
    const response = await fetch(`${getApiUrl()}/promotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promotionData),
    });
    const data = await response.json();
    return data.promotion || promotionData;
  } catch (error) {
    console.error('Failed to create promotion:', error);
    throw error;
  }
};

export const getPromoByCode = async (code) => {
  try {
    const response = await fetch(`${getApiUrl()}/promotions/code/${code}`);
    const data = await response.json();
    return data.promotion || null;
  } catch (error) {
    console.warn('Promotion not found:', error);
    return null;
  }
};

export const getAllPromotions = async () => {
  try {
    const response = await fetch(`${getApiUrl()}/promotions`);
    const data = await response.json();
    return data.promotions || [];
  } catch (error) {
    console.error('Failed to fetch promotions:', error);
    return [];
  }
};

// ==================== SUPPORT ====================

export const createSupportTicket = async (ticketData) => {
  try {
    const response = await fetch(`${getApiUrl()}/support-tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticketData),
    });
    const data = await response.json();
    return data.ticket || ticketData;
  } catch (error) {
    console.error('Failed to create support ticket:', error);
    throw error;
  }
};

export const getUserSupportTickets = async (userId) => {
  try {
    const response = await fetch(`${getApiUrl()}/support-tickets/user/${userId}`);
    const data = await response.json();
    return data.tickets || [];
  } catch (error) {
    console.error('Failed to fetch user tickets:', error);
    return [];
  }
};

export const getAllSupportTickets = async () => {
  try {
    const response = await fetch(`${getApiUrl()}/support-tickets`);
    const data = await response.json();
    return data.tickets || [];
  } catch (error) {
    console.error('Failed to fetch support tickets:', error);
    return [];
  }
};

// ==================== ANALYTICS ====================

export const recordAnalyticsEvent = async (eventData) => {
  try {
    await fetch(`${getApiUrl()}/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
  } catch (error) {
    console.error('Failed to record analytics:', error);
  }
};

// ==================== EVENTS ====================

export const createEvent = async (eventData) => {
  try {
    const response = await fetch(`${getApiUrl()}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.event || eventData;
  } catch (error) {
    console.error('Failed to create event:', error);
    throw error;
  }
};

export const getEvent = async (eventId) => {
  try {
    const response = await fetch(`${getApiUrl()}/events/${eventId}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.event || null;
  } catch (error) {
    console.error('Failed to fetch event:', error);
    return null;
  }
};

export const updateEvent = async (eventId, eventData) => {
  try {
    const response = await fetch(`${getApiUrl()}/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.event || eventData;
  } catch (error) {
    console.error('Failed to update event:', error);
    throw error;
  }
};

export const deleteEvent = async (eventId) => {
  try {
    const response = await fetch(`${getApiUrl()}/events/${eventId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Failed to delete event:', error);
    return false;
  }
};

// Функция для добавления пользователя участником события
export const joinEvent = async (eventId, userId) => {
  try {
    const response = await fetch(`${getApiUrl()}/events/${eventId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.event || null;
  } catch (error) {
    console.error('Failed to join event:', error);
    return null;
  }
};


// ==================== HELPER FUNCTIONS ====================

// Функция для перевода статуса на русский
const translateEventStatus = (status) => {
  const statusMap = {
    'active': 'Активный',
    'upcoming': 'Скоро',
    'completed': 'Завершён',
    'Активный': 'Активный',
    'Скоро': 'Скоро',
    'Завершён': 'Завершён',
  };
  return statusMap[status] || status;
};

// ==================== EVENTS ====================

export const getAllEvents = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 сек timeout
    
    const response = await fetch(`${getApiUrl()}/events`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const data = await response.json();
    // Переводим статус на русский
    const events = (data.events || []).map(event => ({
      ...event,
      status: translateEventStatus(event.status),
    }));
    return events;
  } catch (error) {
    // Подавляем логи при сетевых ошибках - возвращаем пустой массив
    return [];
  }
};

export const getEventsByStatus = async (status) => {
  try {
    const response = await fetch(`${getApiUrl()}/events?status=${status}`);
    const data = await response.json();
    // Переводим статус на русский
    const events = (data.events || []).map(event => ({
      ...event,
      status: translateEventStatus(event.status),
    }));
    return events;
  } catch (error) {
    console.error('Failed to fetch events by status:', error);
    return [];
  }
};

export const listenToEvents = (callback) => {
  let isServerAvailable = true;
  let failureCount = 0;
  const MAX_FAILURES = 3; // После 3 ошибок прекращаем попытки
  
  // Первый вызов сразу
  getAllEvents().then(events => {
    callback(events);
    if (events.length > 0) {
      isServerAvailable = true;
      failureCount = 0;
    }
  }).catch(err => {
    failureCount++;
  });
  
  // Периодически проверяем обновления каждые 20 секунд (баланс между скоростью и стабильностью)
  // с exponential backoff если сервер недоступен
  let interval = setInterval(() => {
    if (failureCount >= MAX_FAILURES) {
      console.warn('⚠️ DatabaseService: прекращаю попытки подключения к серверу после', MAX_FAILURES, 'ошибок');
      clearInterval(interval);
      return;
    }
    
    getAllEvents()
      .then(events => {
        if (isServerAvailable === false) {
          console.log('✅ DatabaseService: сервер восстановлен');
        }
        isServerAvailable = true;
        failureCount = 0;
        callback(events);
      })
      .catch(err => {
        failureCount++;
        if (!isServerAvailable) {
          return;
        }
        isServerAvailable = false;
        console.warn('⚠️ DatabaseService: сервер недоступен (' + failureCount + '/' + MAX_FAILURES + ')');
      });
  }, 20000); // 20 секунд для стабильности при долгих сессиях
  
  // Возвращаем функцию для отписки
  return () => {
    clearInterval(interval);
  };
};

// ==================== EXPORT ====================

export default {
  createUser, getUser, updateUser, deleteUser, getUserByEmail, getAllUsers, getUsersByRole,
  updateUserLoyalty, updateUserBalance, updateWalletBalance, addToBalance, deductFromBalance,
  updateUserStats, incrementTotalBookings, incrementTotalSpent, incrementTotalEarned,
  incrementReviewsCount, updateBookingStats,
  
  createProperty, getProperty, updateProperty, deleteProperty, getAllProperties,
  getPropertiesByStatus, getPropertiesByPriceRange,
  
  createBooking, getBooking, updateBooking, deleteBooking, getUserBookings,
  getPropertyBookings, getBookingsByStatus, getPropertyBookedDates,
  confirmBookingPayment, cancelBooking,
  
  createReview, getReview, updateReview, deleteReview, getPropertyReviews,
  getUserReviews, getApprovedReviews,
  
  createPayment, getPayment, updatePayment, deletePayment, getUserPayments,
  getPaymentsByStatus, getPaymentsByMethod,
  
  createNotification, getUserNotifications, getUserUnreadNotifications,
  markNotificationAsRead,
  
  getLoyaltyCard, topUpLoyaltyCard, getLoyaltyTransactions, createLoyaltyTier,
  getLoyaltyTiers,
  
  createPromotion, getPromoByCode, getAllPromotions,
  
  createSupportTicket, getUserSupportTickets, getAllSupportTickets,
  
  recordAnalyticsEvent,
  
  createEvent, getEvent, updateEvent, deleteEvent, getAllEvents,
  getEventsByStatus, listenToEvents, joinEvent,
};
