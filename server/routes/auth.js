/**
 * Auth routes: register, register-admin, login, heartbeat, logout,
 * reset-password, set-new-password, verify-email.
 *
 * Экспортирует фабрику createAuthRouter(deps) — DI вместо глобалов:
 *   - authLimiter            : rate-limit middleware
 *   - sendPasswordResetEmail : (email, token) => Promise<void>
 *   - isDbConnected          : () => boolean (читает изменяемый флаг index.js)
 *
 * markUserOnline/Offline берутся из server/utils/onlineUsers — это разделяемый
 * процесс-локальный стейт.
 */
const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');

const logger = require('../logger');
const { User, LoyaltyCard, Notification } = require('../models');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../validation');
const { markUserOnline, markUserOffline } = require('../utils/onlineUsers');

const getJwtSecret = () =>
  process.env.JWT_SECRET || 'development-only-jwt-secret-change-me';

const isDev = () => (process.env.NODE_ENV || 'development') === 'development';

// ACCESS_TOKEN_TTL: короткий срок для access-токена
const ACCESS_TOKEN_TTL  = '15m';
// REFRESH_TOKEN_TTL: долгий срок для refresh-токена (хранится в БД)
const REFRESH_TOKEN_DAYS = 7;

/**
 * Выдаёт пару токенов (access + refresh) и сохраняет refresh в БД.
 * Refresh-токен ротируется при каждом вызове — старый становится недействительным.
 */
const issueTokens = async (user) => {
  const accessToken = jwt.sign(
    { userId: user.userId, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_TTL }
  );

  const refreshToken = crypto.randomBytes(48).toString('hex');
  const refreshTokenExpires = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await user.update({ refreshToken, refreshTokenExpires });

  return { accessToken, refreshToken, refreshTokenExpires };
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email.trim());
};

const validatePassword = (password) => {
  if (typeof password !== 'string') return false;
  if (password.length < 8) return false;
  if (!/\d/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  return true;
};

module.exports = function createAuthRouter({
  authLimiter,
  authSlowDown,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  isDbConnected,
}) {
  const router = express.Router();

  /**
   * POST /register — самостоятельная регистрация отключена.
   * Пользователей добавляет только администратор через /register-admin.
   */
  router.post('/register', (req, res) => {
    return res.status(403).json({
      success: false,
      error: 'Самостоятельная регистрация недоступна. Обратитесь к администратору.',
    });
  });

  /**
   * POST /register-admin — создание пользователя админом (без rate-limit'а,
   * так как требуется JWT админа).
   */
  router.post('/register-admin', verifyAdmin, async (req, res) => {
    try {
      const {
        email,
        displayName,
        phone,
        role = 'user',
        membershipLevel = 'Bronze',
      } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email обязателен' });
      }
      if (!validateEmail(email)) {
        return res.status(400).json({ success: false, message: 'Неверный формат email' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, message: 'База данных не подключена' });
      }

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email уже зарегистрирован' });
      }

      // Пароль не задаётся админом — генерим случайный hash. Юзер не сможет
      // войти, пока не использует setupToken из welcome-письма.
      const passwordHash = await bcryptjs.hash(crypto.randomBytes(32).toString('hex'), 10);
      const userId = `user_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`;

      const setupToken = crypto.randomBytes(32).toString('hex');
      const setupExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      const newUser = await User.create({
        userId,
        email,
        passwordHash,
        displayName: displayName || email.split('@')[0],
        phone: phone || null,
        role: role || 'user',
        membershipLevel: membershipLevel || 'Bronze',
        loyaltyPoints: 0,
        resetPasswordToken: setupToken,
        resetPasswordExpires: setupExpires,
      });

      await LoyaltyCard.create({
        userId: newUser.userId,
        balance: 0,
        cashbackRate: 5,
        totalSpent: 0,
        totalEarned: 0,
        membershipLevel: membershipLevel || 'Bronze',
      });

      logger.info('Новый пользователь создан админом', { email, role });

      // Письмо с приглашением — fire-and-forget. SMTP может уйти в таймаут
      // на десятки секунд, а юзер уже создан — нет смысла блокировать ответ.
      // Сбои логируются; админ либо переотправит письмо, либо сообщит токен
      // вручную (в dev токен возвращается в ответе).
      const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
      sendWelcomeEmail(email, setupToken, newUser.displayName).catch((mailErr) => {
        logger.error('welcome email failed', { email, error: mailErr.message });
      });

      return res.status(201).json({
        success: true,
        user: {
          id: newUser.userId,
          name: newUser.displayName,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          level: newUser.membershipLevel?.toLowerCase() || 'bronze',
          loyaltyPoints: newUser.loyaltyPoints,
          status: 'offline',
          rating: 4.5,
          purchases: 0,
          cashback: 0,
          joinDate: 'сегодня',
        },
        emailSent: smtpConfigured,
        // В dev возвращаем токен, чтобы админ мог скопировать, если SMTP не настроен.
        setupToken: isDev() ? setupToken : undefined,
        message: smtpConfigured
          ? 'Пользователь создан. Письмо-приглашение отправляется.'
          : 'Пользователь создан. SMTP не настроен — сообщите код приглашения вручную.',
      });
    } catch (error) {
      logger.error('register-admin error', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Ошибка при создании пользователя',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * POST /login — JWT-вход.
   */
  router.post('/login', authLimiter, authSlowDown, validate(schemas.login), async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email и пароль обязательны' });
      }
      if (!validateEmail(email)) {
        return res.status(400).json({ success: false, error: 'Неверный формат email' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ success: false, error: 'Неверный email или пароль' });
      }

      const passwordMatch = await bcryptjs.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, error: 'Неверный email или пароль' });
      }

      const { accessToken, refreshToken } = await issueTokens(user);

      logger.info('Пользователь успешно вошёл', { email });
      markUserOnline(user.userId);

      return res.status(200).json({
        success: true,
        token: accessToken,
        refreshToken,
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
        },
        message: 'Вход успешен',
      });
    } catch (error) {
      logger.error('login error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при входе',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * POST /heartbeat — обновляет «онлайн-метку» пользователя.
   * userId берётся из JWT (req.userId), а не из тела — нельзя «оживить» чужой аккаунт.
   */
  router.post('/heartbeat', verifyToken, (req, res) => {
    try {
      if (!req.userId) {
        return res.status(400).json({ success: false, error: 'userId обязателен' });
      }
      markUserOnline(req.userId);
      return res.status(200).json({ success: true, message: 'Статус онлайн обновлен' });
    } catch (error) {
      logger.error('heartbeat error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Ошибка при обновлении статуса' });
    }
  });

  /**
   * POST /refresh — выдаёт новый access-токен по действующему refresh-токену.
   * Реализует ротацию: каждый запрос инвалидирует старый refresh и выдаёт новый.
   * Это защищает от кражи токена из утечки БД или перехвата.
   */
  router.post('/refresh', validate(schemas.refreshToken), async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const { refreshToken } = req.body;

      const user = await User.findOne({
        where: {
          refreshToken,
          refreshTokenExpires: { [Op.gt]: new Date() },
        },
      });

      if (!user) {
        return res.status(401).json({ success: false, error: 'Refresh-токен недействителен или истёк' });
      }

      // Ротация: выдаём новую пару, старый refresh становится невалидным
      const { accessToken, refreshToken: newRefreshToken } = await issueTokens(user);

      return res.status(200).json({
        success: true,
        token: accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      logger.error('refresh error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });

  /**
   * POST /logout — снимает онлайн-метку.
   * userId берётся из проверенного JWT-токена, НЕ из тела запроса.
   */
  router.post('/logout', verifyToken, async (req, res) => {
    try {
      markUserOffline(req.userId);
      // Инвалидируем refresh-токен — после logout тихое обновление невозможно
      await User.update(
        { refreshToken: null, refreshTokenExpires: null },
        { where: { userId: req.userId } }
      );
      return res.status(200).json({ success: true, message: 'Выход успешен' });
    } catch (error) {
      logger.error('logout error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Ошибка при выходе' });
    }
  });

  /**
   * POST /reset-password — заявка на сброс пароля.
   * Всегда отвечает 200, чтобы не раскрывать наличие email в системе.
   */
  router.post('/reset-password', authLimiter, authSlowDown, validate(schemas.resetPassword), async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'email обязателен' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res
          .status(200)
          .json({ success: true, message: 'Если email зарегистрирован, инструкция отправлена' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 час

      await user.update({
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      });

      await sendPasswordResetEmail(email, resetToken);

      return res
        .status(200)
        .json({ success: true, message: 'Если email зарегистрирован, инструкция отправлена' });
    } catch (error) {
      logger.error('reset-password error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });

  /**
   * POST /set-new-password — смена пароля по одноразовому reset-токену.
   * Токен выдаётся через /reset-password и действует 1 час.
   * После смены токен аннулируется, чтобы нельзя было использовать его повторно.
   */
  router.post('/set-new-password', validate(schemas.setNewPassword), async (req, res) => {
    try {
      const { token, newPassword, mode = 'reset' } = req.body;

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      // Ищем пользователя по токену + проверяем срок действия
      const user = await User.findOne({
        where: {
          resetPasswordToken:   token,
          resetPasswordExpires: { [Op.gt]: new Date() },
        },
      });

      if (!user) {
        return res.status(400).json({ success: false, error: 'Токен недействителен или истёк' });
      }

      const hashedPassword = await bcryptjs.hash(newPassword, 12);

      // Меняем пароль и сразу аннулируем токен
      await user.update({
        passwordHash:         hashedPassword,
        resetPasswordToken:   null,
        resetPasswordExpires: null,
      });

      const isSetup = mode === 'setup';

      try {
        const admins   = await User.findAll({ where: { role: 'admin' } });
        const userName = user.displayName || user.email;
        await Promise.all(
          admins.map((admin) =>
            Notification.create({
              userId:  admin.userId,
              title:   isSetup ? 'Активация аккаунта' : 'Смена пароля',
              message: isSetup
                ? `Пользователь ${userName} (${user.email}) установил пароль и активировал аккаунт.`
                : `Пользователь ${userName} (${user.email}) сменил пароль.`,
              type:    'security',
              read:    false,
              data:    { userId: user.userId, email: user.email, mode },
            })
          )
        );
      } catch (notifErr) {
        logger.error('Ошибка при отправке уведомлений админам', { error: notifErr.message });
      }

      return res.status(200).json({
        success: true,
        message: isSetup ? 'Пароль установлен' : 'Пароль успешно изменён',
      });
    } catch (error) {
      logger.error('set-new-password error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });

  /**
   * POST /verify-email — подтверждение email по reset-токену из ссылки.
   * (Используется тот же токен/expires столбец, что и для reset-password.)
   */
  router.post('/verify-email', async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, error: 'token обязателен' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const user = await User.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { [Op.gt]: new Date() },
        },
      });

      if (!user) {
        return res.status(400).json({ success: false, error: 'Токен недействителен или истёк' });
      }

      await user.update({
        emailVerified: true,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      });

      return res.status(200).json({ success: true, message: 'Email подтверждён' });
    } catch (error) {
      logger.error('verify-email error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });

  return router;
};
