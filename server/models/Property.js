const { sequelize, DataTypes } = require('../db');

const Property = sequelize.define('Property', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: DataTypes.TEXT,
  price: DataTypes.TEXT,
  priceNumber: DataTypes.INTEGER,
  depositAmount: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'deposit_amount',
    defaultValue: 0,
    allowNull: false,
    comment: 'Фиксированный депозит для бронирования (PRB).',
  },
  rooms: DataTypes.INTEGER,
  guests: DataTypes.INTEGER,
  amenities: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  image: DataTypes.TEXT,
  photos: {
    type: DataTypes.JSONB,
    defaultValue: [],
    allowNull: false,
    comment: 'Массив относительных путей к фото в /uploads/properties/<id>/.',
  },
  status: {
    type: DataTypes.ENUM('available', 'unavailable'),
    defaultValue: 'available',
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
  tableName: 'properties',
});

module.exports = Property;
