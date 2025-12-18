const { sequelize, DataTypes } = require('../db');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: DataTypes.TEXT,
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: DataTypes.DATE,
  location: DataTypes.STRING,
  imageUrl: DataTypes.STRING,
  category: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'cancelled', 'upcoming', 'ended'),
    defaultValue: 'active',
  },
  prize: DataTypes.STRING,
  allowedUsers: {
    type: DataTypes.STRING,
    defaultValue: 'all',
  },
  eventType: {
    type: DataTypes.STRING,
    defaultValue: 'auction',
  },
  participants: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  participantIds: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'JSON массив ID пользователей которые участвуют',
  },
  createdBy: DataTypes.STRING,
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
  tableName: 'events',
});

module.exports = Event;
