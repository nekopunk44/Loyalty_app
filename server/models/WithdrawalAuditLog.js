/**
 * Иммутабельный журнал жизненного цикла заявок на вывод.
 * Любая смена статуса (created/cancelled/completed) добавляет запись —
 * существующие записи не редактируются и не удаляются.
 *
 * Используется для:
 *   - отображения истории действий по заявке в UI;
 *   - финансовой ответственности (кто и когда инициировал движение средств);
 *   - sanity-checks при расхождениях между WithdrawalRequest и AdminWallet.
 */
const { sequelize, DataTypes } = require('../db');

const WithdrawalAuditLog = sequelize.define('WithdrawalAuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  withdrawalId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    index: true,
  },
  action: {
    type: DataTypes.ENUM('created', 'cancelled', 'completed'),
    allowNull: false,
  },
  fromStatus: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  toStatus: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  actorId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName: 'withdrawal_audit_logs',
  indexes: [
    { fields: ['withdrawalId'] },
    { fields: ['actorId'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = WithdrawalAuditLog;
