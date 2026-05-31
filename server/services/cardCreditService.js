/**
 * Shared service to credit a LoyaltyCard balance.
 *
 * Используется:
 *   - POST /api/card/topup (демо/ручной режим)
 *   - Stripe webhook (после checkout.session.completed)
 *   - PayPal capture handler (после CAPTURE.COMPLETED)
 *
 * Гарантии:
 *   - Идемпотентность по transactionId / provider_session_id
 *   - SELECT FOR UPDATE на LoyaltyCard
 *   - Атомарность: либо все таблицы обновлены, либо ничего
 *
 * НЕ открывает свою транзакцию — вызывающая сторона передаёт `t`.
 */
const logger = require('../logger');
const { LoyaltyCard, CardTopUp, Transaction, Notification, User } = require('../models');

/**
 * @typedef {Object} CreditParams
 * @property {string} userId
 * @property {number} amount               Сумма в PRB
 * @property {string} provider             'manual' | 'stripe' | 'paypal' | 'bank_transfer'
 * @property {string} paymentMethod        Для совместимости со старой колонкой ('card' | 'paypal' | ...)
 * @property {string} [providerSessionId]
 * @property {string} [providerPaymentId]
 * @property {number} [originalAmount]
 * @property {string} [originalCurrency]
 * @property {number} [exchangeRate]
 * @property {string} [transactionId]      Идемпотентный ключ (для manual flow)
 * @property {string} [description]
 * @property {Object} [metadata]
 * @property {import('sequelize').Transaction} t  Активная Sequelize-транзакция
 */

/**
 * Зачисляет баланс на карту лояльности и пишет историю.
 * Если в card_topups уже есть запись с completed-статусом для этой сессии —
 * возвращает её, не дублируя.
 *
 * @param {CreditParams} params
 * @returns {Promise<{ topup: CardTopUp, card: LoyaltyCard, balanceBefore: number, balanceAfter: number, duplicate: boolean }>}
 */
async function creditCard(params) {
  const {
    userId,
    amount,
    provider = 'manual',
    paymentMethod,
    providerSessionId,
    providerPaymentId,
    originalAmount,
    originalCurrency,
    exchangeRate,
    transactionId,
    description,
    metadata,
    t,
  } = params;

  if (!t) throw new Error('cardCreditService: sequelize transaction required');
  if (!userId) throw new Error('cardCreditService: userId required');
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error('cardCreditService: amount must be > 0');
  }

  // Идемпотентность: ищем уже завершённую запись по providerSessionId или transactionId
  const idempotencyWhere = providerSessionId
    ? { providerSessionId }
    : transactionId
      ? { transactionId }
      : null;

  if (idempotencyWhere) {
    const existing = await CardTopUp.findOne({
      where: idempotencyWhere,
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (existing && existing.status === 'completed') {
      const card = await LoyaltyCard.findOne({ where: { userId }, transaction: t });
      return {
        topup: existing,
        card,
        balanceBefore: parseFloat(card?.balance ?? 0),
        balanceAfter: parseFloat(card?.balance ?? 0),
        duplicate: true,
      };
    }
  }

  // Lock карты
  let loyaltyCard = await LoyaltyCard.findOne({
    where: { userId },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  const balanceBefore = loyaltyCard ? parseFloat(loyaltyCard.balance) : 0;
  const balanceAfter = parseFloat((balanceBefore + parsedAmount).toFixed(2));

  if (!loyaltyCard) {
    loyaltyCard = await LoyaltyCard.create({
      userId,
      balance: parsedAmount,
      totalSpent: 0,
      totalEarned: parsedAmount,
      cashbackRate: 5,
      membershipLevel: 'Bronze',
    }, { transaction: t });
  } else {
    await loyaltyCard.update({
      balance: balanceAfter,
      totalEarned: parseFloat((parseFloat(loyaltyCard.totalEarned) + parsedAmount).toFixed(2)),
    }, { transaction: t });
  }

  // CardTopUp: либо обновляем существующий pending → completed, либо создаём новый
  let topup;
  if (idempotencyWhere) {
    topup = await CardTopUp.findOne({ where: idempotencyWhere, transaction: t });
  }

  const topupData = {
    userId,
    amount: parsedAmount,
    paymentMethod: paymentMethod || provider,
    provider,
    providerSessionId,
    providerPaymentId,
    originalAmount,
    originalCurrency,
    exchangeRate,
    metadata,
    status: 'completed',
    transactionId: transactionId || providerSessionId || `TOPUP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    description: description || `Пополнение карты через ${provider}`,
  };

  if (topup) {
    await topup.update(topupData, { transaction: t });
  } else {
    topup = await CardTopUp.create(topupData, { transaction: t });
  }

  // Transaction (история движения средств)
  await Transaction.create({
    userId,
    type: 'credit',
    category: 'topup',
    amount: parsedAmount,
    description: topupData.description,
    balanceBefore,
    balanceAfter,
    metadata: {
      provider,
      providerSessionId,
      providerPaymentId,
      originalAmount,
      originalCurrency,
      exchangeRate,
    },
  }, { transaction: t });

  logger.info('card credited', {
    userId,
    amount: parsedAmount,
    provider,
    providerSessionId,
    balanceAfter,
  });

  return { topup, card: loyaltyCard, balanceBefore, balanceAfter, duplicate: false };
}

/**
 * Отправляет уведомления пользователю и админам о пополнении.
 * Вызывается ПОСЛЕ commit транзакции, чтобы Notification.create не откатилась
 * вместе с зачислением при ошибке push-сервиса.
 */
async function sendTopupNotifications({ userId, amount, balanceAfter, balanceBefore, provider }) {
  try {
    const user = await User.findOne({ where: { userId } });
    const userName = user?.displayName || 'Пользователь';

    await Notification.create({
      userId,
      title: 'Баланс пополнен',
      message: `Ваша карта лояльности пополнена на ${amount} PRB. Новый баланс: ${balanceAfter} PRB`,
      type: 'balance_replenishment',
      data: { amount, newBalance: balanceAfter, oldBalance: balanceBefore, paymentMethod: provider },
      read: false,
    });

    const admins = await User.findAll({ where: { role: 'admin' } });
    await Promise.all(admins.map((admin) =>
      Notification.create({
        userId: admin.userId,
        title: 'Пополнение баланса пользователем',
        message: `${userName} пополнил карту на ${amount} PRB через ${provider}. Новый баланс: ${balanceAfter} PRB`,
        type: 'user_balance_replenishment',
        data: { userId, userName, amount, newBalance: balanceAfter, oldBalance: balanceBefore, paymentMethod: provider },
        read: false,
      })
    ));
  } catch (notifErr) {
    logger.error('topup notify error', { error: notifErr.message });
  }
}

module.exports = {
  creditCard,
  sendTopupNotifications,
};
