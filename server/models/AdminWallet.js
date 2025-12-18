const { sequelize, DataTypes } = require('../db');

const AdminWallet = sequelize.define('AdminWallet', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  adminId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    index: true,
  },
  adminLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '1 = админ с финансовым доступом, 2 = админ без финансового доступа',
  },
  totalBalance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Общий баланс (доступный + ожидающий)',
  },
  availableBalance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Доступный баланс для вывода',
  },
  pendingBalance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Баланс в процессе обработки',
  },
  totalReceived: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Всего получено денег',
  },
  totalWithdrawn: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Всего выведено денег',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
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
  tableName: 'admin_wallets',
});

module.exports = AdminWallet;
