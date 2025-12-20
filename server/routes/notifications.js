/**
 * Notifications routes:
 *   GET    /:userId/stream                    — SSE-поток новых уведомлений
 *   GET    /:userId                           — уведомления пользователя
 *   POST   /:userId                           — создать уведомление
 *   PATCH  /:userId/:notificationId           — отметить как прочитанное
 *   DELETE /:userId/:notificationId           — удалить конкретное
 *   DELETE /:userId                           — удалить все
 *
 * ВАЖНО: DELETE /:userId/:notificationId объявлен до DELETE /:userId,
 * хотя Express корректно различает эти паттерны по числу сегментов.
 * Порядок сохранён для ясности намерений.
 */
const express = require('express');

const logger = require('../logger');
const { Notification, User } = require('../models');
const { sendExpoPush } = require('../utils/expoPush');
const { verifyToken, requireOwnerOrAdmin } = require('../middleware/auth');
const { parsePagination } = require('../utils/pagination');

const isDev = () => (process.env.NODE_ENV || 'development') === 'development';

// userId → Set<res>  — активные SSE-соединения
const sseClients = new Map();

/**
 * Отправить уведомление всем открытым SSE-соединениям пользователя.
 * Вызывается из этого роутера и может быть импортирован другими роутерами.
 */
function pushNotificationToUser(userId, notification) {
  const clients = sseClients.get(String(userId));
  if (!clients || clients.size === 0) return;
  const payload = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch (_) { /* клиент уже отключился */ }
  }
}

module.exports = function createNotificationsRouter({ isDbConnected }) {
  const router = express.Router();

  /**
   * GET /:userId/stream — SSE-поток новых уведомлений.
   * Клиент подключается один раз; сервер пушит события по мере их создания.
   * Соединение поддерживается heartbeat-ом каждые 25 с.
   */
  router.get('/:userId/stream', verifyToken, requireOwnerOrAdmin, (req, res) => {
    const { userId } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // отключить буферизацию nginx
    res.flushHeaders();

    // Подтверждение соединения
    res.write('event: connected\ndata: {}\n\n');

    // Регистрируем клиента
    if (!sseClients.has(userId)) sseClients.set(userId, new Set());
    sseClients.get(userId).add(res);

    // Heartbeat чтобы соединение не закрылось
    const heartbeat = setInterval(() => {
      try { res.write('event: ping\ndata: {}\n\n'); } catch (_) { /* ignore */ }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.get(userId)?.delete(res);
      if (sseClients.get(userId)?.size === 0) sseClients.delete(userId);
    });
  });

  /**
   * GET /:userId — последние уведомления. Поддерживает ?limit=N.
   */
  router.get('/:userId', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit } = parsePagination(req.query);

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const notifications = await Notification.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
      });

      return res.status(200).json({ success: true, notifications });
    } catch (error) {
      logger.error('notifications fetch error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении уведомлений',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * POST /:userId/push-token — сохранить Expo Push Token пользователя.
   */
  router.post('/:userId/push-token', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { pushToken } = req.body;

      if (!pushToken) {
        return res.status(400).json({ success: false, error: 'pushToken is required' });
      }

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      await User.update({ pushToken }, { where: { id: userId } });
      return res.status(200).json({ success: true });
    } catch (error) {
      logger.error('push-token save error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Ошибка при сохранении push-токена' });
    }
  });

  /**
   * POST /:userId — создать уведомление.
   */
  router.post('/:userId', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { title, message, type, actionUrl, data } = req.body;

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const notification = await Notification.create({
        userId,
        title,
        message,
        type: type || 'system',
        data: data || {},
        actionUrl,
        read: false,
      });

      // SSE для онлайн-клиентов
      pushNotificationToUser(userId, notification);

      // Expo Push для офлайн-устройств
      const user = await User.findByPk(userId, { attributes: ['pushToken'] });
      if (user?.pushToken) {
        sendExpoPush(user.pushToken, title, message, data || {}).catch(() => {});
      }

      return res.status(201).json({ success: true, notification });
    } catch (error) {
      logger.error('notification create error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при создании уведомления',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * PATCH /:userId/:notificationId — отметить как прочитанное.
   */
  router.patch('/:userId/:notificationId', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId, notificationId } = req.params;

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const notification = await Notification.findOne({ where: { id: notificationId, userId } });
      if (!notification) {
        return res.status(404).json({ success: false, error: 'Уведомление не найдено' });
      }

      notification.read = true;
      await notification.save();

      return res.status(200).json({ success: true, notification });
    } catch (error) {
      logger.error('notification read error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении уведомления',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * DELETE /:userId/:notificationId — удалить конкретное уведомление.
   */
  router.delete('/:userId/:notificationId', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId, notificationId } = req.params;

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const notification = await Notification.findOne({ where: { id: notificationId, userId } });
      if (!notification) {
        return res.status(404).json({ success: false, error: 'Уведомление не найдено' });
      }

      await notification.destroy();
      return res.status(200).json({ success: true, message: 'Уведомление удалено' });
    } catch (error) {
      logger.error('notification delete error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при удалении уведомления',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * DELETE /:userId — удалить все уведомления пользователя.
   */
  router.delete('/:userId', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const deleted = await Notification.destroy({ where: { userId } });
      return res.status(200).json({
        success: true,
        message: `Удалено ${deleted} уведомлений`,
        count: deleted,
      });
    } catch (error) {
      logger.error('notifications clear error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при удалении уведомлений',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  return router;
};

module.exports.pushNotificationToUser = pushNotificationToUser;
