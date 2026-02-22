/**
 * Проверить структуру таблицы notifications
 */

const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/loyalty_app';

const sequelize = new Sequelize(DATABASE_URL, {
  logging: true,  // Включаем логирование SQL
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
});

async function checkSchema() {
  try {
    await sequelize.authenticate();
    console.log('✅ Подключение к БД успешно\n');

    // Запрашиваем информацию о столбцах
    const result = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'notifications'
      ORDER BY ordinal_position
    `);

    console.log('📊 Структура таблицы notifications:');
    console.log('═'.repeat(60));
    result[0].forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkSchema();
