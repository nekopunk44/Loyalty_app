/**
 * Users routes:
 *   GET    /                 — список (админ)
 *   GET    /email/:email     — поиск по email (админ)
 *   GET    /:userId          — профиль (владелец или админ)
 *   PATCH  /:userId          — обновление профиля (только свой)
 *   DELETE /:userId          — удаление аккаунта (свой или админ удаляет кого угодно)
 *
 * ВАЖНО: порядок объявления роутов имеет значение — `/email/:email` должен идти
 * до `/:userId`, иначе второй перехватит и подумает что email — это userId.
 *
 * Фабрика принимает isDbConnected: () => boolean (флаг живёт в index.js).
 */
const express = require('express');

const logger = require('../logger');
const {
  User,
  Booking,
  LoyaltyCard,
  Transaction,
  Notification,
} = require('../models');
const {
  verifyToken,
  verifyAdmin,
  requireOwnerOrAdmin,
} = require('../middleware/auth');
const { isUserOnline } = require('../utils/onlineUsers');

const isDev = () => (process.env.NODE_ENV || 'development') === 'development';

// Длинная русская дата вида «1 июня 2026». Node ICU умеет ru-RU длинный
// month, fallback на короткий формат если что — но обычно ICU собран.
const formatJoinDate = (d) => {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return date.toLocaleDateString('ru-RU');
  }
};

const PUBLIC_USER_ATTRS = [
  'id',
  'userId',
  'email',
  'displayName',
  'phone',
  'avatar',
  'role',
  'membershipLevel',
  'loyaltyPoints',
  'birthDate',
  'createdAt',
];

module.exports = function createUsersRouter({ isDbConnected }) {
  const router = express.Router();

  /**
   * GET / — список пользователей. Опциональный фильтр ?role=admin|user.
   */
  router.get('/', verifyAdmin, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const { role } = req.query;
      const whereClause = role ? { role } : {};
      const users = await User.findAll({
        where: whereClause,
        attributes: ['id', 'userId', 'email', 'displayName', 'phone', 'avatar', 'role', 'membershipLevel', 'loyaltyPoints'],
        order: [['id', 'DESC']],
      });

      const formatted = users.map((u) => ({
        id: u.userId,
        name: u.displayName || u.email.split('@')[0],
        email: u.email,
        phone: u.phone,
        avatar: u.avatar,
        role: u.role,
        level: u.membershipLevel?.toLowerCase() || 'bronze',
        loyaltyPoints: u.loyaltyPoints || 0,
        joinDate: formatJoinDate(u.createdAt),
        status: isUserOnline(u.userId) ? 'online' : 'offline',
      }));

      return res.json({ success: true, users: formatted, count: formatted.length });
    } catch (error) {
      logger.error('users list error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении пользователей',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /email/:email — поиск пользователя по email (админ).
   * Возвращаем только публичные поля — passwordHash наружу не отдаём.
   */
  router.get('/email/:email', verifyAdmin, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'DB not connected' });
      }
      const user = await User.findOne({
        where: { email: req.params.email },
        attributes: PUBLIC_USER_ATTRS,
      });
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      return res.json({ success: true, user });
    } catch (error) {
      logger.error('users by-email error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Error fetching user by email' });
    }
  });

  /**
   * GET /:userId — профиль пользователя.
   * Для не-админов добавляются balance/cashback/totalBookings.
   */
  router.get('/:userId', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const user = await User.findOne({ where: { userId } });
      if (!user) {
        return res.status(404).json({ success: false, error: 'Пользователь не найден' });
      }

      let bookingsCount = 0;
      let balance = 0;
      let cashback = 0;

      if (user.role !== 'admin') {
        bookingsCount = await Booking.count({ where: { userId } });
        const card = await LoyaltyCard.findOne({ where: { userId } });
        if (card) {
          balance = parseFloat(card.balance) || 0;
          cashback = parseFloat(card.totalEarned) || 0;
        }
      }

      const isOnline = isUserOnline(userId);

      return res.status(200).json({
        success: true,
        user: {
          id: user.userId,
          email: user.email,
          displayName: user.displayName,
          avatar: user.avatar,
          phone: user.phone,
          address: user.address,
          role: user.role,
          membershipLevel: user.membershipLevel,
          loyaltyPoints: user.loyaltyPoints,
          birthDate: user.birthDate || null,
          walletBalance: balance,
          balance,
          totalBookings: bookingsCount,
          cashback,
          joinDate: formatJoinDate(user.createdAt),
          status: isOnline ? 'online' : 'offline',
        },
      });
    } catch (error) {
      logger.error('user profile error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении профиля',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * PATCH /:userId — обновление профиля. Только сам пользователь, не админ за чужой.
   */
  router.patch('/:userId', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      if (req.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only update your own profile',
        });
      }

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const user = await User.findOne({ where: { userId } });
      if (!user) {
        return res.status(404).json({ success: false, error: 'Пользователь не найден' });
      }

      // role и membershipLevel изменяет только администратор
      const isAdmin = req.role === 'admin';
      const allowedFields = ['displayName', 'avatar', 'phone', 'address', 'birthDate'];
      if (isAdmin) allowedFields.push('role', 'membershipLevel');

      const updateData = {};
      for (const field of allowedFields) {
        const v = req.body[field];
        if (v === undefined || v === null || v === '') continue;
        updateData[field] = field === 'membershipLevel'
          ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
          : v;
      }

      await user.update(updateData);

      return res.status(200).json({
        success: true,
        user: {
          id: user.userId,
          email: user.email,
          displayName: user.displayName,
          avatar: user.avatar,
          phone: user.phone,
          address: user.address,
          role: user.role,
          membershipLevel: user.membershipLevel,
          loyaltyPoints: user.loyaltyPoints,
          birthDate: user.birthDate || null,
        },
        message: 'Профиль успешно обновлён',
      });
    } catch (error) {
      logger.error('user update error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении профиля',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * POST /:userId/sign-house-rules — сохранить подпись правил дома.
   *
   * Тело: { paths: string[], signedAt?: ISO }
   * Подпись одноразовая для пользователя. Доступна только владельцу аккаунта —
   * админ не может подписать за пользователя.
   */
  router.post('/:userId/sign-house-rules', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      if (req.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only sign rules for your own account',
        });
      }

      const { paths, signedAt } = req.body || {};
      if (!Array.isArray(paths) || paths.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Подпись пустая',
        });
      }

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const user = await User.findOne({ where: { userId } });
      if (!user) {
        return res.status(404).json({ success: false, error: 'Пользователь не найден' });
      }

      const ts = signedAt ? new Date(signedAt) : new Date();
      if (Number.isNaN(ts.getTime())) {
        return res.status(400).json({ success: false, error: 'Некорректная дата подписи' });
      }

      await user.update({
        rulesSignature: JSON.stringify({ paths, signedAt: ts.toISOString() }),
        rulesSignedAt: ts,
      });

      return res.status(200).json({
        success: true,
        signedAt: ts.toISOString(),
      });
    } catch (error) {
      logger.error('sign house rules error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при сохранении подписи',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * DELETE /:userId — удаление аккаунта. Свой может удалить себя; админ — кого угодно.
   * Каскадно сносит Bookings, Transactions, Notifications.
   */
  router.delete('/:userId', verifyToken, async (req, res) => {
    try {
      const { userId } = req.params;

      if (req.userId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own account',
        });
      }

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const user = await User.findOne({ where: { userId } });
      if (!user) {
        return res.status(404).json({ success: false, error: 'Пользователь не найден' });
      }

      await Booking.destroy({ where: { userId } });
      await Transaction.destroy({ where: { userId } });
      await Notification.destroy({ where: { userId } });
      await User.destroy({ where: { userId } });

      logger.info('Пользователь удалён', { userId });

      return res.status(200).json({
        success: true,
        message: 'Пользователь успешно удалён',
        userId,
      });
    } catch (error) {
      logger.error('user delete error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при удалении пользователя',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  return router;
};
