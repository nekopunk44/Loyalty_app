const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'loyalty_app',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'zxckursed',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

const deleteTestBookings = async () => {
  try {
    console.log('🔄 Подключение к БД...');
    await sequelize.authenticate();
    console.log('✅ Подключение успешно');

    // Удаляем бронирования для тестовых пользователей
    const result = await sequelize.query(`
      DELETE FROM bookings 
      WHERE "userId" IN ('test-user-1', 'test-user-2', 'admin-user') 
      OR "userId" LIKE 'test-%'
      OR "userId" LIKE 'admin%';
    `);

    console.log('🗑️  Удалено записей:', result[1].rowCount || 0);
    console.log('✅ Все бронирования тестовых пользователей удалены!');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
};

deleteTestBookings();
