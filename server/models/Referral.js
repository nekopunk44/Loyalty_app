const { sequelize, DataTypes } = require('../db');

const Referral = sequelize.define('Referral', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  referralCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    index: true,
  },
  referrerId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true,
  },
  referrerName: DataTypes.STRING,
  referredUserId: {
    type: DataTypes.STRING,
    index: true,
  },
  referredEmail: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'expired'),
    defaultValue: 'pending',
  },
  bonus: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  completedAt: DataTypes.DATE,
}, {
  timestamps: false,
  tableName: 'referrals',
});

module.exports = Referral;
