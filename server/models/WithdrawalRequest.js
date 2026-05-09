const { sequelize, DataTypes } = require('../db');

const WithdrawalRequest = sequelize.define('WithdrawalRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  adminId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true,
  },
  adminLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  bankAccount: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'completed', 'rejected'),
    defaultValue: 'pending',
  },
  approvedBy: DataTypes.STRING,
  reason: DataTypes.TEXT,
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  approvedAt: DataTypes.DATE,
  completedAt: DataTypes.DATE,
}, {
  timestamps: false,
  tableName: 'withdrawal_requests',
});

module.exports = WithdrawalRequest;
