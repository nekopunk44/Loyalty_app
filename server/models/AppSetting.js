const { sequelize, DataTypes } = require('../db');

/**
 * Глобальные настройки приложения (key → JSON value).
 * Используется для общих данных, которые редактирует админ и видят все
 * пользователи: правила программы и правила проживания (ключ 'rules').
 */
const AppSetting = sequelize.define('AppSetting', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  value: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName: 'app_settings',
  freezeTableName: true,
});

module.exports = AppSetting;
