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
const jwt = require('jsonwebtoken');

const logger = require('../logger');
const { Event, User } = require('../models');
const { verifyAdmin, verifyToken } = require('../middleware/auth');
const { isoToRu } = require('../utils/dates');
const mlClient = require('../services/mlClient');
const { LEVEL_ORDER } = require('../config/loyalty');
const { placeBid, closeAuction, BidError } = require('../services/auctionService');
const { AuctionBid } = require('../models');

const EVENT_LEVEL_ORDER = { all: 0, bronze: 0, silver: 1, gold: 2, platinum: 3 };

const getJwtSecret = () =>
  process.env.JWT_SECRET || 'development-only-jwt-secret-change-me';

/** Достаёт userId из Bearer-токена, но не падает при его отсутствии. */
const tryGetUserId = (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, getJwtSecret()).userId || null;
  } catch (_) {
    return null;
  }
};

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
  cashbackBoostPercent: e.cashbackBoostPercent ? parseFloat(e.cashbackBoostPercent) : 0,
  discountPercent: e.discountPercent ? parseFloat(e.discountPercent) : 0,
  targetUserIds: Array.isArray(e.targetUserIds) ? e.targetUserIds : [],
  // Auction state (для не-аукционов будут null/дефолты)
  startBid:         e.startBid         != null ? parseFloat(e.startBid)         : null,
  minBidIncrement:  e.minBidIncrement  != null ? parseFloat(e.minBidIncrement)  : 100,
  currentBid:       e.currentBid       != null ? parseFloat(e.currentBid)       : null,
  currentBidUserId: e.currentBidUserId || null,
  winnerUserId:     e.winnerUserId     || null,
  closedAt:         e.closedAt         ? new Date(e.closedAt).toISOString()     : null,
});

// Безопасный парс процента из тела запроса. Кэп — защита от человеческой ошибки
// "100" вместо "10". Возвращает число с двумя знаками.
const clampPercent = (raw, max) => {
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return parseFloat(Math.min(n, max).toFixed(2));
};

module.exports = function createEventsRouter({ isDbConnected }) {
  const router = express.Router();

  /**
   * GET / — список событий.
   * По умолчанию — сортировка по startDate ASC.
   * При ?personalized=true и валидном Bearer-токене — события переупорядочены
   * ML-рекомендером (CB + item-item CF). Если ML недоступен или пользователь
   * неизвестен — возвращается обычный список (graceful fallback) с флагом
   * `personalized: false` в ответе.
   */
  router.get('/', async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const wantPersonalized = String(req.query.personalized || '').toLowerCase() === 'true';
      const events = await Event.findAll({ order: [['startDate', 'ASC']] });

      if (!wantPersonalized) {
        return res.status(200).json({
          success: true,
          events: events.map(formatEvent),
          personalized: false,
        });
      }

      const userId = tryGetUserId(req);
      if (!userId) {
        return res.status(200).json({
          success: true,
          events: events.map(formatEvent),
          personalized: false,
          reason: 'no_auth',
        });
      }

      const k = Math.min(parseInt(req.query.k || '50', 10) || 50, 50);
      const mlRes = await mlClient.recommendEvents({ userId, k });
      if (!mlRes.ok) {
        logger.warn('events personalized: ML недоступен, fallback', { error: mlRes.error });
        return res.status(200).json({
          success: true,
          events: events.map(formatEvent),
          personalized: false,
          reason: 'ml_unavailable',
        });
      }

      // ML возвращает [{event_id, score}]. Строим маппинг id → score; события,
      // которых нет в ответе ML, идут после рекомендованных, в исходном порядке.
      const scoreById = new Map(
        (mlRes.data.recommendations || []).map((r) => [Number(r.event_id), Number(r.score)]),
      );
      const ranked = [...events].sort((a, b) => {
        const ka = Number(a.id);
        const kb = Number(b.id);
        const sa = scoreById.has(ka) ? scoreById.get(ka) : -Infinity;
        const sb = scoreById.has(kb) ? scoreById.get(kb) : -Infinity;
        if (sa !== sb) return sb - sa;
        // одинаковый score (включая -Infinity для unscored) → по startDate ASC
        return new Date(a.startDate || 0) - new Date(b.startDate || 0);
      });

      return res.status(200).json({
        success: true,
        events: ranked.map(formatEvent),
        personalized: true,
        fallback_used: Boolean(mlRes.data.fallback_used),
      });
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
   * GET /me/bids — все ставки авторизованного пользователя со связанными аукционами.
   * Используется на экране «Мои ставки» (MyBidsScreen).
   * Регистрируем ДО /:eventId, иначе Express маршрутизирует /me/bids как eventId='me'.
   * Фильтры (необязательно): ?status=active|outbid|won|returned (через запятую).
   */
  router.get('/me/bids', verifyToken, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }
      const userId = req.userId;

      const where = { userId };
      if (typeof req.query.status === 'string' && req.query.status.length) {
        const statuses = req.query.status.split(',').map(s => s.trim()).filter(Boolean);
        const allowed  = statuses.filter(s => ['active', 'outbid', 'won', 'returned'].includes(s));
        if (allowed.length) where.status = allowed;
      }

      const bids = await AuctionBid.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: 100,
      });

      const eventIds = [...new Set(bids.map(b => b.eventId))];
      const events = eventIds.length
        ? await Event.findAll({ where: { id: eventIds } })
        : [];
      const evMap = new Map(events.map(e => [e.id, e]));

      const items = bids.map((b) => {
        const ev = evMap.get(b.eventId);
        return {
          id:         b.id,
          eventId:    b.eventId,
          amount:     parseFloat(b.amount),
          status:     b.status,
          createdAt:  b.createdAt,
          resolvedAt: b.resolvedAt,
          event: ev ? {
            id:           ev.id,
            title:        ev.title,
            status:       ev.status,
            startDate:    ev.startDate,
            endDate:      ev.endDate,
            currentBid:   ev.currentBid != null ? parseFloat(ev.currentBid) : null,
            currentBidUserId: ev.currentBidUserId,
            winnerUserId: ev.winnerUserId,
            closedAt:     ev.closedAt,
            prize:        ev.prize,
          } : null,
        };
      });

      return res.status(200).json({ success: true, bids: items });
    } catch (err) {
      logger.error('me/bids error', { error: err.message, stack: err.stack });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при получении ставок',
        details: isDev() ? err.message : undefined,
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

      const {
        title, description, prize, startDate, endDate, allowedUsers, status, eventType,
        cashbackBoostPercent, discountPercent, targetUserIds,
        startBid, minBidIncrement,
      } = req.body;

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
        // Кэпы (20pp boost, 80% discount) — анти-fat-finger для админа.
        // 100% скидка превратила бы любую бронь в бесплатную.
        cashbackBoostPercent: clampPercent(cashbackBoostPercent, 20),
        discountPercent: clampPercent(discountPercent, 80),
        targetUserIds: Array.isArray(targetUserIds) ? targetUserIds.filter((x) => typeof x === 'string') : [],
        // Auction-параметры (имеют смысл только для eventType='auction'; для остальных
        // безопасно сохраняем — UI их просто не покажет).
        startBid: startBid != null && startBid !== '' ? Math.max(0, parseFloat(startBid)) : null,
        minBidIncrement: minBidIncrement != null && minBidIncrement !== ''
          ? Math.max(1, parseFloat(minBidIncrement))
          : 100,
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
        cashbackBoostPercent, discountPercent, targetUserIds,
        startBid, minBidIncrement,
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
      if (cashbackBoostPercent !== undefined) event.cashbackBoostPercent = clampPercent(cashbackBoostPercent, 20);
      if (discountPercent !== undefined) event.discountPercent = clampPercent(discountPercent, 80);
      if (targetUserIds !== undefined) {
        event.targetUserIds = Array.isArray(targetUserIds)
          ? targetUserIds.filter((x) => typeof x === 'string')
          : [];
      }
      if (startBid !== undefined) {
        event.startBid = startBid != null && startBid !== '' ? Math.max(0, parseFloat(startBid)) : null;
      }
      if (minBidIncrement !== undefined && minBidIncrement !== '') {
        event.minBidIncrement = Math.max(1, parseFloat(minBidIncrement));
      }

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

      // Проверяем минимальный уровень для участия
      const requiredLevel = (event.allowedUsers || 'all').toLowerCase();
      if (requiredLevel !== 'all' && requiredLevel !== 'bronze') {
        const user = await User.findOne({ where: { userId }, attributes: ['membershipLevel'] });
        const userLevelOrder = LEVEL_ORDER[user?.membershipLevel || 'Bronze'];
        const requiredLevelOrder = EVENT_LEVEL_ORDER[requiredLevel] ?? 0;
        if (userLevelOrder < requiredLevelOrder) {
          const levelLabel = requiredLevel.charAt(0).toUpperCase() + requiredLevel.slice(1);
          return res.status(403).json({
            success: false,
            error: `Это событие доступно только участникам уровня ${levelLabel} и выше`,
            requiredLevel: levelLabel,
          });
        }
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

  // ── Auction routes ─────────────────────────────────────────────────────────

  // Маппинг доменных кодов BidError на HTTP-статусы.
  const BID_ERROR_HTTP = {
    invalid_amount:         400,
    event_not_found:        404,
    not_auction:            400,
    closed:                 409,
    not_started:            409,
    expired:                409,
    level_required:         403,
    below_start_bid:        400,
    below_increment:        400,
    self_outbid:            409,
    insufficient_available: 402,
    card_not_found:         404,
    winner_card_missing:    500,
  };

  /**
   * POST /:eventId/bid — поставить ставку на аукционе.
   * Body: { amount: number }
   */
  router.post('/:eventId/bid', verifyToken, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }
      const eventId = parseInt(req.params.eventId, 10);
      if (!Number.isFinite(eventId)) {
        return res.status(400).json({ success: false, error: 'Неверный ID события' });
      }
      const { amount } = req.body;
      const result = await placeBid({ eventId, userId: req.userId, amount });
      return res.status(200).json({
        success:       true,
        bid:           result.bid,
        event:         formatEvent(result.event),
        lockedBalance: result.lockedBalance,
      });
    } catch (err) {
      if (err instanceof BidError) {
        const status = BID_ERROR_HTTP[err.code] || 400;
        return res.status(status).json({
          success: false,
          code:    err.code,
          error:   err.message,
          ...err.extra,
        });
      }
      logger.error('auction bid error', { error: err.message, stack: err.stack });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при размещении ставки',
        details: isDev() ? err.message : undefined,
      });
    }
  });

  /**
   * GET /:eventId/bids — история ставок аукциона. Сортировка amount DESC.
   * Открыт любому авторизованному (UI показывает leaderboard).
   */
  router.get('/:eventId/bids', verifyToken, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }
      const eventId = parseInt(req.params.eventId, 10);
      if (!Number.isFinite(eventId)) {
        return res.status(400).json({ success: false, error: 'Неверный ID события' });
      }
      const bids = await AuctionBid.findAll({
        where: { eventId },
        order: [['amount', 'DESC'], ['createdAt', 'ASC']],
        limit: 100,
      });
      return res.status(200).json({
        success: true,
        bids: bids.map((b) => ({
          id:         b.id,
          userId:     b.userId,
          amount:     parseFloat(b.amount),
          status:     b.status,
          createdAt:  b.createdAt,
          resolvedAt: b.resolvedAt,
        })),
      });
    } catch (err) {
      logger.error('auction bids list error', { error: err.message });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при получении списка ставок',
        details: isDev() ? err.message : undefined,
      });
    }
  });

  /**
   * POST /:eventId/close — досрочное закрытие аукциона админом.
   * Эквивалентно тому, что делает cron при истечении endDate.
   */
  router.post('/:eventId/close', verifyAdmin, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }
      const eventId = parseInt(req.params.eventId, 10);
      if (!Number.isFinite(eventId)) {
        return res.status(400).json({ success: false, error: 'Неверный ID события' });
      }
      const result = await closeAuction(eventId);
      return res.status(200).json({
        success:       true,
        event:         formatEvent(result.event),
        winnerUserId:  result.winnerUserId,
        winningAmount: result.winningAmount,
        alreadyClosed: !!result.alreadyClosed,
      });
    } catch (err) {
      if (err instanceof BidError) {
        const status = BID_ERROR_HTTP[err.code] || 400;
        return res.status(status).json({
          success: false,
          code:    err.code,
          error:   err.message,
          ...err.extra,
        });
      }
      logger.error('auction close error', { error: err.message, stack: err.stack });
      return res.status(500).json({
        success: false,
        error:   'Ошибка при закрытии аукциона',
        details: isDev() ? err.message : undefined,
      });
    }
  });

  return router;
};
