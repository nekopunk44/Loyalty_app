const { sequelize, DataTypes } = require('../db');

const AdminTransaction = sequelize.define('AdminTransaction', {
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
  type: {
    type: DataTypes.ENUM('booking_payment', 'topup_commission', 'withdrawal', 'refund', 'adjustment'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  bookingId: DataTypes.INTEGER,
  paymentId: DataTypes.INTEGER,
  description: DataTypes.TEXT,
  balanceBefore: DataTypes.DECIMAL(12, 2),
  balanceAfter: DataTypes.DECIMAL(12, 2),
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName: 'admin_transactions',
});

module.exports = AdminTransaction;
