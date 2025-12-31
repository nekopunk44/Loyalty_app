const { sequelize, DataTypes } = require('../db');

const Transaction = sequelize.define('Transaction', {
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
  bookingId: {
    type: DataTypes.INTEGER,
    index: true,
  },
  type: {
    type: DataTypes.ENUM('debit', 'credit'),
    allowNull: false,
  },
  // Sprint B: узкая классификация операции для фильтрации и UI-иконок.
  // 'topup' | 'booking_deposit' | 'booking_remaining' | 'cashback' |
  // 'admin_adjustment' | 'bid_lock' | 'bid_unlock' | 'refund' | null (legacy).
  category: {
    type: DataTypes.STRING,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  balanceBefore: {
    type: DataTypes.DECIMAL(12, 2),
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(12, 2),
  },
  // Sprint B: для admin_adjustment — id админа. Для остальных категорий — null.
  performedBy: {
    type: DataTypes.STRING,
  },
  // Sprint B: связанная сущность для deep-link / детализации.
  relatedType: {
    type: DataTypes.STRING,
  },
  relatedId: {
    type: DataTypes.STRING,
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Структурированный аудит транзакции: какие события применены, кэпы, источники',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName: 'transactions',
});

module.exports = Transaction;
