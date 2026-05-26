/**
 * User model — пользователи системы (включая админов).
 *
 * adminLevel:
 *   null = обычный пользователь
 *   1    = админ с доступом к финансам
 *   2    = админ без доступа к финансам
 *
 * Внешний идентификатор для клиента — `userId` (строка), а не PK `id`.
 * Это сохраняет совместимость с уже выданными JWT и URL вида /users/:userId.
 */
const { sequelize, DataTypes } = require('../db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    index: true,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    index: true,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  displayName: DataTypes.STRING,
  avatar: DataTypes.STRING,
  phone: DataTypes.STRING,
  address: DataTypes.TEXT,
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user',
  },
  adminLevel: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    comment: 'null = обычный пользователь, 1 = админ с доступом к финансам, 2 = админ без доступа к финансам',
  },
  loyaltyPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  membershipLevel: {
    type: DataTypes.ENUM('Bronze', 'Silver', 'Gold', 'Platinum'),
    defaultValue: 'Bronze',
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  refreshToken: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },
  refreshTokenExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  pushToken: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },
  birthDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Дата рождения (YYYY-MM-DD). Используется для бонуса в день рождения.',
  },
}, {
  timestamps: false,
  tableName: 'users',
});

module.exports = User;
