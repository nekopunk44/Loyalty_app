const { sequelize, DataTypes } = require('../db');

/**
 * История всех ставок по аукционам. Каждая ставка — отдельная строка.
 * За одним юзером на одном аукционе одновременно может быть только ОДНА
 * строка со status='active' (это гарантирует AuctionService при перебитии).
 *
 * Статусы:
 *   active     — текущая высшая ставка этого юзера (учитывается в lockedBalance)
 *   outbid     — перебита более высокой ставкой (lockedBalance уже освобождён)
 *   won        — победила, переведена в реальное списание при закрытии
 *   returned   — освобождена при закрытии (юзер проиграл)
 *   cancelled  — админ откатил аукцион
 */
const AuctionBid = sequelize.define('AuctionBid', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  eventId: {
    type: DataTypes.INTEGER,
    field: 'event_id',
    allowNull: false,
  },
  userId: {
    type: DataTypes.STRING,
    field: 'user_id',
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'outbid', 'won', 'returned', 'cancelled'),
    allowNull: false,
    defaultValue: 'active',
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',
    defaultValue: DataTypes.NOW,
  },
  resolvedAt: {
    type: DataTypes.DATE,
    field: 'resolved_at',
    allowNull: true,
  },
}, {
  timestamps: false,
  tableName: 'auction_bids',
});

module.exports = AuctionBid;
