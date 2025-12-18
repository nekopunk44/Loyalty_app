/**
 * Referrals routes:
 *   POST /generate         — создать реферальный код (идемпотентно)
 *   POST /apply            — применить код при регистрации нового пользователя
 *   GET  /user/:userId     — реферальная информация + статистика пользователя
 */
const express = require('express');

const logger = require('../logger');
const { Referral, LoyaltyCard, Transaction, Notification } = require('../models');
const { verifyToken, requireOwnerOrAdmin } = require('../middleware/auth');

const isDev = () => (process.env.NODE_ENV || 'development') === 'development';
const REFERRAL_BONUS = 500;

module.exports = function createReferralsRouter({ isDbConnected }) {
  const router = express.Router();

  /**
   * POST /generate — создать реферальный код. Если уже есть — вернуть существующий.
   */
  router.post('/generate', verifyToken, async (req, res) => {
    try {
      const userId = req.userId;
      const { userName } = req.body;

      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId обязателен' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const existing = await Referral.findOne({ where: { referrerId: userId } });
      if (existing) {
        return res.status(200).json({
          success: true,
          referral: existing,
          message: 'Реферальный код уже существует',
        });
      }

      const referralCode = `REF_${userId.substring(0, 4)}_${Date.now().toString(36).toUpperCase()}`;
      const referral = await Referral.create({
        referralCode,
        referrerId: userId,
        referrerName: userName || 'Пользователь',
        status: 'pending',
      });

      logger.info('Реферальный код создан', { referralCode });
      return res.status(201).json({ success: true, message: 'Реферальный код создан', referral });
    } catch (error) {
      logger.error('referral generate error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при создании кода',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * POST /apply — применить реферальный код. Начисляет бонус реферреру.
   */
  router.post('/apply', verifyToken, async (req, res) => {
    try {
      const { referralCode, newUserId, newUserEmail } = req.body;

      if (!referralCode || !newUserId) {
        return res.status(400).json({ success: false, error: 'referralCode и newUserId обязательны' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const referral = await Referral.findOne({ where: { referralCode } });
      if (!referral) {
        return res.status(404).json({ success: false, error: 'Реферальный код не найден' });
      }
      if (referral.status !== 'pending') {
        return res.status(400).json({ success: false, error: 'Реферальный код уже использован или истёк' });
      }

      await referral.update({
        referredUserId: newUserId,
        referredEmail: newUserEmail,
        status: 'completed',
        bonus: REFERRAL_BONUS,
        completedAt: new Date(),
      });

      const referrerCard = await LoyaltyCard.findOne({ where: { userId: referral.referrerId } });
      if (referrerCard) {
        const prevBalance = parseFloat(referrerCard.balance);
        const newBalance = parseFloat((prevBalance + REFERRAL_BONUS).toFixed(2));
        referrerCard.balance = newBalance;
        referrerCard.totalEarned = parseFloat(
          (parseFloat(referrerCard.totalEarned) + REFERRAL_BONUS).toFixed(2)
        );
        await referrerCard.save();

        await Transaction.create({
          userId: referral.referrerId,
          type: 'credit',
          amount: REFERRAL_BONUS,
          description: `Реферальный бонус за привлечение ${newUserEmail}`,
          balanceBefore: prevBalance,
          balanceAfter: newBalance,
        });
      }

      try {
        await Notification.create({
          userId: referral.referrerId,
          title: ' Реферальный бонус',
          message: `Пользователь ${newUserEmail} зарегистрировался по вашему коду! Вы получили бонус ${REFERRAL_BONUS} PRB`,
          type: 'referralBonus',
          data: { referralId: referral.id, referredEmail: newUserEmail, bonus: REFERRAL_BONUS },
          read: false,
        });
      } catch (notifyErr) {
        logger.error('referral notify error', { error: notifyErr.message });
      }

      logger.info('Реферальный код применён', { newUserId, referrerId: referral.referrerId });
      return res.status(200).json({
        success: true,
        message: 'Реферальный код успешно применен',
        referral,
        bonus: REFERRAL_BONUS,
      });
    } catch (error) {
      logger.error('referral apply error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при применении кода',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /user/:userId — реферальная информация и статистика.
   */
  router.get('/user/:userId', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const referral = await Referral.findOne({ where: { referrerId: userId } });
      if (!referral) {
        return res.status(200).json({
          success: true,
          referral: null,
          stats: { total: 0, completed: 0, totalBonus: 0 },
        });
      }

      return res.status(200).json({
        success: true,
        referral,
        stats: {
          total: 1,
          completed: referral.status === 'completed' ? 1 : 0,
          totalBonus: referral.status === 'completed' ? parseFloat(referral.bonus) : 0,
        },
      });
    } catch (error) {
      logger.error('referral fetch error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при загрузке реферальной информации',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  return router;
};
