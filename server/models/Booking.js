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
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
    defaultValue: 'confirmed',
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
