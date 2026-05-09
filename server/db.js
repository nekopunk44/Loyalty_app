/**
 * Sequelize instance + DataTypes re-export.
 * Один источник истины для подключения к БД, шарится между index.js и
 * (в будущем) выделенными модулями моделей/роутов.
 *
 * SSL включается только в production — на managed-хостингах (Supabase/Render/RDS)
 * это обязательно, локально мешает.
 */
const { Sequelize, DataTypes } = require('sequelize');

const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL && NODE_ENV === 'production') {
  throw new Error('DATABASE_URL environment variable is required in production');
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max:     20,
    min:     2,
    acquire: 60000,
    idle:    30000,
  },
  dialectOptions: NODE_ENV === 'production'
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
});

module.exports = { sequelize, DataTypes, Sequelize };
