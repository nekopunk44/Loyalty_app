/**
 * Notifications routes:
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
const { Notification } = require('../models');
const { verifyToken, requireOwnerOrAdmin } = require('../middleware/auth');
const { parsePagination } = require('../utils/pagination');

const isDev = () => (process.env.NODE_ENV || 'development') === 'development';

module.exports = function createNotificationsRouter({ isDbConnected }) {
  const router = express.Router();

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
