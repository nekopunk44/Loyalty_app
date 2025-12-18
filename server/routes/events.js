/**
 * Events routes:
 *   GET    /                    — список событий
 *   GET    /:eventId            — одно событие
 *   POST   /                    — создать событие (админ)
 *   PUT    /:eventId            — обновить событие (админ)
 *   DELETE /:eventId            — удалить событие (админ)
 *   POST   /:eventId/join       — вступить в событие (авторизован)
 *
 * Даты отдаются клиенту в формате DD.MM.YYYY (isoToRu), принимаются в DD.MM.YYYY
 * или ISO. `local_*` ID обрабатываются как no-op: клиент управляет ими локально.
 */
const express = require('express');

const logger = require('../logger');
const { Event } = require('../models');
const { verifyAdmin, verifyToken } = require('../middleware/auth');
const { isoToRu } = require('../utils/dates');

const isDev = () => (process.env.NODE_ENV || 'development') === 'development';

/** Parses DD.MM.YYYY or ISO string into a Date. Returns null for falsy input. */
const parseEventDate = (s) => {
  if (!s) return null;
  if (typeof s === 'string' && s.includes('.')) {
    const [day, month, year] = s.split('.');
    return new Date(year, month - 1, day);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const formatEvent = (e) => ({
  id: e.id,
  title: e.title,
  description: e.description,
  startDate: isoToRu(e.startDate),
  endDate: isoToRu(e.endDate),
  location: e.location,
  imageUrl: e.imageUrl,
  category: e.category,
  status: e.status,
  prize: e.prize,
  eventType: e.eventType,
  allowedUsers: e.allowedUsers,
  participants: e.participants,
  participantIds: e.participantIds,
});

module.exports = function createEventsRouter({ isDbConnected }) {
  const router = express.Router();

  /**
   * GET / — список всех событий, отсортированных по дате начала.
   */
  router.get('/', async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }
      const events = await Event.findAll({ order: [['startDate', 'ASC']] });
      return res.status(200).json({ success: true, events: events.map(formatEvent) });
    } catch (error) {
      logger.error('events list error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении событий',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /:eventId — одно событие.
   */
  router.get('/:eventId', async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }
      const event = await Event.findByPk(req.params.eventId);
      if (!event) {
        return res.status(404).json({ success: false, error: 'Событие не найдено' });
      }
      return res.status(200).json({ success: true, event: formatEvent(event) });
    } catch (error) {
      logger.error('event fetch error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении события',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * POST / — создать событие.
   */
  router.post('/', verifyAdmin, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const { title, description, prize, startDate, endDate, allowedUsers, status, eventType } =
        req.body;

      if (!title) {
        return res.status(400).json({ success: false, error: 'Название события обязательно' });
      }

      const event = await Event.create({
        title,
        description: description || '',
        prize: prize || '',
        startDate: parseEventDate(startDate) || new Date(),
        endDate: parseEventDate(endDate),
        allowedUsers: allowedUsers || 'all',
        status: status || 'active',
        eventType: eventType || 'cashback',
      });

      logger.info('Событие создано', { id: event.id });
      return res.status(201).json({ success: true, event: formatEvent(event) });
    } catch (error) {
      logger.error('event create error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при создании события',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * PUT /:eventId — обновить событие. local_* IDs обрабатываются клиентом — no-op на сервере.
   */
  router.put('/:eventId', verifyAdmin, async (req, res) => {
    try {
      const { eventId } = req.params;

      if (eventId.startsWith('local_')) {
        return res.status(200).json({ success: true, message: 'Локальное событие успешно обновлено' });
      }

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const event = await Event.findByPk(eventId);
      if (!event) {
        return res.status(404).json({ success: false, error: 'Событие не найдено' });
      }

      const {
        title, description, prize, startDate, endDate,
        allowedUsers, status, eventType, participantIds, participants,
      } = req.body;

      if (title !== undefined) event.title = title;
      if (description !== undefined) event.description = description;
      if (prize !== undefined) event.prize = prize;
      if (startDate) {
        const d = parseEventDate(startDate);
        if (d) event.startDate = d;
      }
      if (endDate !== undefined) {
        event.endDate = endDate ? parseEventDate(endDate) : null;
      }
      if (allowedUsers !== undefined) event.allowedUsers = allowedUsers;
      if (status !== undefined) event.status = status;
      if (eventType !== undefined) event.eventType = eventType;
      if (participantIds !== undefined) {
        event.participantIds = Array.isArray(participantIds) ? participantIds : [];
      }
      if (participants !== undefined) event.participants = participants;

      await event.save();

      logger.info('Событие обновлено', { id: eventId });
      return res.status(200).json({ success: true, event: formatEvent(event) });
    } catch (error) {
      logger.error('event update error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении события',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * DELETE /:eventId — удалить событие. local_* IDs — no-op.
   */
  router.delete('/:eventId', verifyAdmin, async (req, res) => {
    try {
      const { eventId } = req.params;

      if (eventId.startsWith('local_')) {
        return res.status(200).json({ success: true, message: 'Локальное событие успешно удалено' });
      }

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const event = await Event.findByPk(eventId);
      if (!event) {
        return res.status(404).json({ success: false, error: 'Событие не найдено' });
      }

      await event.destroy();
      logger.info('Событие удалено', { id: eventId });
      return res.status(200).json({ success: true, message: 'Событие успешно удалено' });
    } catch (error) {
      logger.error('event delete error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при удалении события',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * POST /:eventId/join — вступить в событие. Идемпотентно — 409 если уже участник.
   */
  router.post('/:eventId/join', verifyToken, async (req, res) => {
    try {
      const { eventId } = req.params;
      const { userId } = req;

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }
      if (!eventId || !userId) {
        return res.status(400).json({ success: false, error: 'Требуются eventId и userId' });
      }

      const event = await Event.findByPk(eventId);
      if (!event) {
        return res.status(404).json({ success: false, error: 'Событие не найдено' });
      }

      const participantIds = Array.isArray(event.participantIds) ? event.participantIds : [];

      if (participantIds.includes(userId)) {
        return res.status(409).json({
          success: false,
          error: 'Вы уже участвуете в этом событии',
          alreadyJoined: true,
          event: formatEvent(event),
        });
      }

      participantIds.push(userId);
      event.participantIds = participantIds;
      event.participants = participantIds.length;
      await event.save();

      return res.status(200).json({
        success: true,
        message: 'Пользователь успешно добавлен в участники',
        event: formatEvent(event),
      });
    } catch (error) {
      logger.error('event join error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при добавлении участника',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  return router;
};
