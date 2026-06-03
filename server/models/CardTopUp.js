const { sequelize, DataTypes } = require('../db');

const CardTopUp = sequelize.define('CardTopUp', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Сумма пополнения во внутренней валюте (PRB)',
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "'card', 'paypal', 'crypto', 'bank_transfer'",
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'expired'),
    defaultValue: 'pending',
  },
  transactionId: {
    type: DataTypes.TEXT,
    unique: true,
    index: true,
  },
  description: DataTypes.TEXT,

  // ==================== Платёжные провайдеры (Stripe / PayPal / Google Play) ====================
  provider: {
    type: DataTypes.STRING(32),
    defaultValue: 'manual',
    comment: "'manual' | 'stripe' | 'paypal' | 'bank_transfer' | 'google_play'",
  },
  providerSessionId: {
    type: DataTypes.TEXT,
    field: 'provider_session_id',
    comment: 'Stripe Checkout session.id / PayPal order.id / Google Play purchaseToken',
  },
  providerPaymentId: {
    type: DataTypes.TEXT,
    field: 'provider_payment_id',
    comment: 'Stripe payment_intent.id / PayPal capture.id / Google Play orderId',
  },
  originalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'original_amount',
    comment: 'Сумма в валюте провайдера (RUB/USD)',
  },
  originalCurrency: {
    type: DataTypes.STRING(8),
    field: 'original_currency',
    comment: "'RUB' | 'USD'",
  },
  exchangeRate: {
    type: DataTypes.DECIMAL(12, 6),
    field: 'exchange_rate',
    comment: '1 RUB/USD = X PRB на момент создания сессии',
  },
  metadata: {
    type: DataTypes.JSONB,
    comment: 'Дополнительные данные от провайдера',
  },

  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName: 'card_topups',
});

module.exports = CardTopUp;
