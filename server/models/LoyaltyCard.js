const { sequelize, DataTypes } = require('../db');

const LoyaltyCard = sequelize.define('LoyaltyCard', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    index: true,
  },
  balance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Баланс карты лояльности в рублях',
  },
  cashbackRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 5,
    comment: 'Процент кэшбека при возврате',
  },
  totalSpent: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Всего потрачено через карту',
  },
  totalEarned: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Всего заработано кэшбека',
  },
  membershipLevel: {
    type: DataTypes.ENUM('Bronze', 'Silver', 'Gold', 'Platinum'),
    defaultValue: 'Bronze',
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
  tableName: 'loyalty_cards',
});

module.exports = LoyaltyCard;
