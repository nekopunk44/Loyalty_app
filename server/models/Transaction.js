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
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName: 'transactions',
});

module.exports = Transaction;
