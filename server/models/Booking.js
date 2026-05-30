const { sequelize, DataTypes } = require('../db');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  propertyId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true,
  },
  checkInDate: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  checkOutDate: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  guests: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  saunaHours: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Количество часов аренды парилки',
  },
  kitchenware: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Использование кухонного сервиза',
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  // Гибридная оплата (Sprint A ВКР). Подробнее см. migrations/014_deposit_flow.sql.
  depositAmount: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'deposit_amount',
    allowNull: true,
  },
  depositPaidAt: {
    type: DataTypes.DATE,
    field: 'deposit_paid_at',
    allowNull: true,
  },
  remainingAmount: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'remaining_amount',
    allowNull: true,
  },
  remainingPaidAt: {
    type: DataTypes.DATE,
    field: 'remaining_paid_at',
    allowNull: true,
  },
  remainingPaymentMethod: {
    type: DataTypes.STRING,
    field: 'remaining_payment_method',
    allowNull: true,
    comment: "'card' | 'cash'",
  },
  paymentDeadline: {
    type: DataTypes.DATE,
    field: 'payment_deadline',
    allowNull: true,
    comment: 'Дедлайн оплаты депозита; после — expired.',
  },
  cashbackAmount: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'cashback_amount',
    defaultValue: 0,
    comment: 'Снапшот начисленного кэшбэка для отката при cancel.',
  },
  cashbackCreditedAt: {
    type: DataTypes.DATE,
    field: 'cashback_credited_at',
    allowNull: true,
  },
  cashbackRevertedAt: {
    type: DataTypes.DATE,
    field: 'cashback_reverted_at',
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'pending_payment', 'confirmed', 'completed', 'cancelled', 'expired'),
    defaultValue: 'pending_payment',
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
  tableName: 'bookings',
});

module.exports = Booking;
