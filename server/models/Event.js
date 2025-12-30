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

  // ── Auction state (eventType='auction'; для остальных типов NULL/дефолты) ──
  startBid: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'start_bid',
    allowNull: true,
    comment: 'Стартовая цена аукциона в PRB. Первая ставка >= startBid.',
  },
  minBidIncrement: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'min_bid_increment',
    defaultValue: 100,
    comment: 'Минимальный шаг ставки в PRB.',
  },
  currentBid: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'current_bid',
    allowNull: true,
    comment: 'Текущая высшая ставка. NULL если ставок ещё не было.',
  },
  currentBidUserId: {
    type: DataTypes.STRING,
    field: 'current_bid_user_id',
    allowNull: true,
    comment: 'userId текущего лидера аукциона.',
  },
  winnerUserId: {
    type: DataTypes.STRING,
    field: 'winner_user_id',
    allowNull: true,
    comment: 'userId победителя после закрытия. NULL пока аукцион не закрыт.',
  },
  closedAt: {
    type: DataTypes.DATE,
    field: 'closed_at',
    allowNull: true,
    comment: 'Момент закрытия аукциона cron-задачей.',
  },

  // ── Promotion modifiers ────────────────────────────────────────────────
  // Реальное влияние события на цену/кэшбек в confirm-payment. До добавления
  // этих полей событие было чисто информационным (текстовый prize не парсился).
  cashbackBoostPercent: {
    type: DataTypes.DECIMAL(5, 2),
    field: 'cashback_boost_percent',
    defaultValue: 0,
    comment: 'Аддитивная надбавка к ставке кэшбека уровня, в процентных пунктах (5.00 = +5pp)',
  },
  discountPercent: {
    type: DataTypes.DECIMAL(5, 2),
    field: 'discount_percent',
    defaultValue: 0,
    comment: 'Скидка на сумму бронирования, в процентах (10.00 = 10%)',
  },
  targetUserIds: {
    type: DataTypes.JSONB,
    field: 'target_user_ids',
    defaultValue: [],
    comment: 'Если непуст — событие применяется ТОЛЬКО этим userId. Иначе — публичное (участники по join)',
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
