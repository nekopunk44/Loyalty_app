/**
 * Stripe Checkout routes (prefix: /api/payments/stripe)
 *
 *   POST /create-session  — создать Stripe Checkout Session для пополнения баланса
 *   GET  /session/:id     — проверить статус сессии (для polling после возврата из браузера)
 *
 * Webhook регистрируется ОТДЕЛЬНО в server/index.js до bodyParser.json(),
 * потому что Stripe требует raw body для проверки подписи.
 *
 * Поток:
 *   1. Клиент → POST /create-session { amount: 1000, currency: 'RUB' }
 *      Сервер конвертирует 1000 PRB → RUB по курсу, создаёт CardTopUp(status='pending'),
 *      создаёт Stripe Checkout Session, возвращает { sessionId, url }.
 *   2. Клиент → openBrowserAsync(url), пользователь вводит карту 4242...
 *   3. Stripe → webhook checkout.session.completed → cardCreditService.creditCard(),
 *      обновляет CardTopUp(status='completed') и LoyaltyCard.balance.
 *   4. Клиент после возврата → опрашивает /balance/:userId или /session/:id.
 */

const express = require('express');

const logger = require('../logger');
const { sequelize, Sequelize } = require('../db');
const { CardTopUp } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { convertFromPRB } = require('../services/currencyService');

const isDev = () => (process.env.NODE_ENV || 'development') === 'development';

let stripeClient = null;
function getStripe() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  stripeClient = require('stripe')(key, {
    apiVersion: '2024-06-20',
    typescript: false,
    appInfo: { name: 'Villa Jaconda Loyalty', version: '1.0.0' },
  });
  return stripeClient;
}

module.exports = function createStripeRouter({ isDbConnected }) {
  const router = express.Router();

  /**
   * POST /create-session — создать Stripe Checkout Session.
   * Body: { amount: number (PRB), currency: 'RUB'|'USD', returnUrl?: string }
   */
  router.post('/create-session', verifyToken, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({ success: false, error: 'Stripe не сконфигурирован' });
      }
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }

      const { amount, currency = 'RUB', returnUrl } = req.body || {};
      const userId = req.userId;

      const amountPRB = parseFloat(amount);
      if (isNaN(amountPRB) || amountPRB <= 0) {
        return res.status(400).json({ success: false, error: 'Сумма должна быть больше 0' });
      }
      if (amountPRB > 1000000) {
        return res.status(400).json({ success: false, error: 'Максимальная сумма пополнения: 1 000 000 PRB' });
      }

      const upperCurrency = String(currency).toUpperCase();
      if (!['RUB', 'USD'].includes(upperCurrency)) {
        return res.status(400).json({ success: false, error: 'Поддерживаются только RUB и USD' });
      }

      // PRB → внешняя валюта по курсу
      const { amount: providerAmount, rate } = convertFromPRB(amountPRB, upperCurrency);
      const providerAmountCents = Math.round(providerAmount * 100);
      if (providerAmountCents < 50) {
        return res.status(400).json({
          success: false,
          error: `Минимальная сумма для оплаты — около ${Math.ceil(50 / 100 * rate)} PRB`,
        });
      }

      const stripe = getStripe();

      // Создаём pending-запись ДО Stripe-вызова — если Stripe вернёт ошибку,
      // запись просто останется pending и не помешает следующей попытке
      const transactionId = `STRIPE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const t = await sequelize.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED,
      });

      let topup;
      try {
        topup = await CardTopUp.create({
          userId,
          amount: amountPRB,
          paymentMethod: 'card',
          provider: 'stripe',
          status: 'pending',
          transactionId,
          originalAmount: providerAmount,
          originalCurrency: upperCurrency,
          exchangeRate: rate,
          description: `Пополнение через Stripe (${providerAmount} ${upperCurrency})`,
        }, { transaction: t });
        await t.commit();
      } catch (err) {
        await t.rollback();
        throw err;
      }

      // Базовый URL приложения для return URL (deep-link)
      // appScheme должен совпадать с app.json → expo.scheme
      const appScheme = process.env.APP_SCHEME || 'villajaconda';
      const successUrl = returnUrl || `${appScheme}://payment-success?topup=${topup.id}`;
      const cancelUrl = `${appScheme}://payment-cancel?topup=${topup.id}`;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: upperCurrency.toLowerCase(),
              product_data: {
                name: 'Пополнение карты лояльности Villa Jaconda',
                description: `Зачисление ${amountPRB} PRB на баланс`,
              },
              unit_amount: providerAmountCents,
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: String(userId),
        metadata: {
          userId: String(userId),
          topupId: String(topup.id),
          amountPRB: String(amountPRB),
          exchangeRate: String(rate),
        },
      });

      // Сохраняем session.id в CardTopUp, чтобы webhook нашёл запись
      await topup.update({
        providerSessionId: session.id,
        metadata: { sessionUrl: session.url },
      });

      logger.info('stripe session created', {
        userId,
        topupId: topup.id,
        sessionId: session.id,
        amountPRB,
        providerAmount,
        currency: upperCurrency,
      });

      return res.status(200).json({
        success: true,
        sessionId: session.id,
        url: session.url,
        topupId: topup.id,
        amountPRB,
        providerAmount,
        currency: upperCurrency,
        exchangeRate: rate,
      });
    } catch (error) {
      logger.error('stripe create-session error', { error: error.message, stack: error.stack });
      return res.status(500).json({
        success: false,
        error: 'Не удалось создать платёжную сессию',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /session/:id — текущий статус Stripe Checkout Session.
   * Используется клиентом для polling'а после возврата из браузера,
   * пока webhook ещё не пришёл (или если webhook не настроен в dev).
   */
  router.get('/session/:id', verifyToken, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({ success: false, error: 'Stripe не сконфигурирован' });
      }
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(req.params.id);

      const topup = await CardTopUp.findOne({ where: { providerSessionId: session.id } });

      return res.status(200).json({
        success: true,
        paymentStatus: session.payment_status,    // 'paid' | 'unpaid' | 'no_payment_required'
        sessionStatus: session.status,             // 'open' | 'complete' | 'expired'
        topupStatus: topup?.status || 'unknown',
      });
    } catch (error) {
      logger.error('stripe get-session error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Не удалось получить статус сессии',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  return router;
};

// ==================== Webhook handler (registered separately) ====================

/**
 * Создаёт обработчик webhook'а — регистрируется в server/index.js
 * с express.raw({ type: 'application/json' }) middleware, потому что
 * Stripe проверяет подпись на raw body.
 */
function createStripeWebhookHandler({ isDbConnected }) {
  return async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.warn('stripe webhook called but STRIPE_WEBHOOK_SECRET not set');
      return res.status(503).send('Webhook not configured');
    }

    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).send('Missing stripe-signature header');
    }

    let event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
      logger.warn('stripe webhook signature verification failed', { error: err.message });
      return res.status(400).send(`Webhook signature error: ${err.message}`);
    }

    logger.info('stripe webhook received', { type: event.type, id: event.id });

    try {
      if (event.type === 'checkout.session.completed') {
        await handleCheckoutCompleted(event.data.object, { isDbConnected });
      } else if (event.type === 'checkout.session.expired') {
        await handleCheckoutExpired(event.data.object);
      } else if (event.type === 'checkout.session.async_payment_failed') {
        await handleCheckoutFailed(event.data.object);
      }
      return res.status(200).json({ received: true });
    } catch (err) {
      logger.error('stripe webhook handler error', { error: err.message, eventType: event.type });
      return res.status(500).json({ error: 'Webhook handler failed' });
    }
  };
}

async function handleCheckoutCompleted(session, { isDbConnected }) {
  if (!isDbConnected()) {
    throw new Error('Database not connected');
  }
  if (session.payment_status !== 'paid') {
    logger.info('stripe checkout completed but not paid', { sessionId: session.id, status: session.payment_status });
    return;
  }

  const { creditCard, sendTopupNotifications } = require('../services/cardCreditService');

  const userId = session.metadata?.userId || session.client_reference_id;
  const amountPRB = parseFloat(session.metadata?.amountPRB);
  const exchangeRate = parseFloat(session.metadata?.exchangeRate);

  if (!userId || !amountPRB) {
    logger.error('stripe webhook missing metadata', { sessionId: session.id, metadata: session.metadata });
    return;
  }

  const t = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });

  let result;
  try {
    result = await creditCard({
      userId,
      amount: amountPRB,
      provider: 'stripe',
      paymentMethod: 'card',
      providerSessionId: session.id,
      providerPaymentId: session.payment_intent,
      originalAmount: (session.amount_total || 0) / 100,
      originalCurrency: String(session.currency).toUpperCase(),
      exchangeRate,
      description: `Stripe Checkout: ${(session.amount_total || 0) / 100} ${String(session.currency).toUpperCase()}`,
      metadata: { stripeEventSource: 'checkout.session.completed' },
      t,
    });
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  if (!result.duplicate) {
    await sendTopupNotifications({
      userId,
      amount: amountPRB,
      balanceBefore: result.balanceBefore,
      balanceAfter: result.balanceAfter,
      provider: 'Stripe',
    });
  }
}

async function handleCheckoutExpired(session) {
  await CardTopUp.update(
    { status: 'expired' },
    { where: { providerSessionId: session.id, status: 'pending' } }
  );
  logger.info('stripe checkout expired', { sessionId: session.id });
}

async function handleCheckoutFailed(session) {
  await CardTopUp.update(
    { status: 'failed' },
    { where: { providerSessionId: session.id, status: 'pending' } }
  );
  logger.info('stripe checkout failed', { sessionId: session.id });
}

module.exports.createStripeWebhookHandler = createStripeWebhookHandler;
