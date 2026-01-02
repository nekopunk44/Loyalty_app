/**
 * Google Play Billing routes (prefix: /api/payments/google-play)
 *
 *   POST /verify  — валидация покупки в Google Play и зачисление PRB.
 *
 * Поток (Android-only):
 *   1. Клиент через react-native-iap покупает SKU вида 'prb_topup_1000'.
 *   2. Google возвращает клиенту { productId, purchaseToken, transactionId }.
 *   3. Клиент → POST /verify { productId, purchaseToken, orderId }.
 *   4. Сервер:
 *      - матчит productId на PRB-сумму по фиксированной таблице (НЕ доверяем клиенту);
 *      - валидирует покупку через Google Play Developer API;
 *      - creditCard() зачисляет PRB (идемпотентно по purchaseToken);
 *      - acknowledge покупки в Google (иначе через 3 дня будет refund).
 *   5. Клиент после успешного ответа вызывает finishTransaction() — товар
 *      становится «потреблённым» и доступным для повторной покупки.
 */

const express = require('express');

const logger = require('../logger');
const { sequelize, Sequelize } = require('../db');
const { CardTopUp } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { verifyPurchase, acknowledgePurchase } = require('../services/googlePlayService');
const { creditCard, sendTopupNotifications } = require('../services/cardCreditService');

const isDev = () => (process.env.NODE_ENV || 'development') !== 'production';

/**
 * SKU → PRB. Должно совпадать 1:1 с тем, что создано в Play Console.
 * Сумму берём отсюда, а не из тела запроса, чтобы клиент не мог запросить
 * зачисление произвольного количества PRB.
 */
const SKU_TO_PRB = {
  prb_topup_500:   500,
  prb_topup_1000:  1000,
  prb_topup_3000:  3000,
  prb_topup_5000:  5000,
  prb_topup_10000: 10000,
  prb_topup_25000: 25000,
};

module.exports = function createGooglePlayRouter({ isDbConnected }) {
  const router = express.Router();

  router.post('/verify', verifyToken, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const { productId, purchaseToken, orderId: clientOrderId } = req.body || {};
      const userId = req.userId;

      if (!productId || !purchaseToken) {
        return res.status(400).json({
          success: false,
          error: 'productId и purchaseToken обязательны',
        });
      }

      const amountPRB = SKU_TO_PRB[productId];
      if (!amountPRB) {
        return res.status(400).json({
          success: false,
          error: `Неизвестный productId: ${productId}`,
        });
      }

      // Ранний idempotency-чек: если purchaseToken уже зачислен — отдаём успех,
      // не вызывая Google и не открывая транзакцию.
      const already = await CardTopUp.findOne({
        where: { providerSessionId: purchaseToken, status: 'completed' },
      });
      if (already) {
        return res.status(200).json({
          success: true,
          status: 'paid',
          duplicate: true,
          topupId: already.id,
          amountPRB: parseFloat(already.amount),
        });
      }

      // Шаг 1: валидация в Google
      const verification = await verifyPurchase(productId, purchaseToken);
      if (!verification.verified) {
        logger.warn('google-play verify rejected', {
          userId,
          productId,
          purchaseState: verification.purchaseState,
        });
        return res.status(402).json({
          success: false,
          error: 'Покупка не подтверждена Google Play',
          purchaseState: verification.purchaseState,
        });
      }

      // Шаг 2: зачисление через общий сервис (идемпотентность по providerSessionId = purchaseToken)
      const providerOrderId = verification.orderId || clientOrderId || null;
      const priceCents = verification.priceAmountMicros
        ? Math.round(parseInt(verification.priceAmountMicros, 10) / 10000) / 100
        : null;

      const t = await sequelize.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
      });

      let result;
      try {
        result = await creditCard({
          userId,
          amount: amountPRB,
          provider: 'google_play',
          paymentMethod: 'google_play',
          providerSessionId: purchaseToken,
          providerPaymentId: providerOrderId,
          originalAmount: priceCents,
          originalCurrency: verification.priceCurrencyCode || null,
          description: `Google Play: ${productId}`,
          metadata: {
            productId,
            purchaseTimeMillis: verification.purchaseTimeMillis,
            devFallback: verification.devFallback === true,
          },
          t,
        });
        await t.commit();
      } catch (err) {
        await t.rollback();
        throw err;
      }

      // Шаг 3: acknowledge в Google (вне транзакции — если упадёт, deferred-cron
      // догонит). Без acknowledge через 3 дня Google автоматически возвращает деньги.
      try {
        await acknowledgePurchase(productId, purchaseToken);
      } catch (ackErr) {
        logger.warn('google-play acknowledge failed (will retry later)', {
          userId,
          productId,
          message: ackErr.message,
        });
      }

      // Шаг 4: уведомления (вне транзакции, чтобы push-сервис не откатывал зачисление)
      if (!result.duplicate) {
        await sendTopupNotifications({
          userId,
          amount: amountPRB,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter,
          provider: 'Google Play',
        });
      }

      return res.status(200).json({
        success: true,
        status: 'paid',
        duplicate: result.duplicate,
        topupId: result.topup.id,
        amountPRB,
        newBalance: result.balanceAfter,
      });
    } catch (error) {
      logger.error('google-play verify error', { error: error.message, stack: error.stack });
      return res.status(500).json({
        success: false,
        error: 'Не удалось обработать платёж Google Play',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /products — список доступных SKU и соответствующих PRB-сумм.
   * Клиент использует это, чтобы знать, какие productId запрашивать у Play Billing.
   */
  router.get('/products', verifyToken, (req, res) => {
    return res.status(200).json({
      success: true,
      products: Object.entries(SKU_TO_PRB).map(([productId, amountPRB]) => ({
        productId,
        amountPRB,
      })),
    });
  });

  return router;
};

module.exports.SKU_TO_PRB = SKU_TO_PRB;
