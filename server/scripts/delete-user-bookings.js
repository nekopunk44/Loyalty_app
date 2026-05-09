/**
 * Удалить все бронирования тестового пользователя
 */

const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/loyalty_app';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
});

const deleteUserBookings = async () => {
  try {
    console.log('🔄 Подключение к БД...');
    await sequelize.authenticate();
    console.log('✅ Подключено к PostgreSQL\n');

    const userId = 'test-user-1';
    
    console.log(`🗑️  Удаляю все бронирования пользователя: ${userId}`);
    
    // Удаляем все бронирования пользователя
    const deletedCount = await sequelize.query(
      'DELETE FROM bookings WHERE "userId" = :userId',
      {
        replacements: { userId },
        type: Sequelize.QueryTypes.DELETE,
      }
    );

    console.log(`✅ Удалено бронирований: ${deletedCount}`);

    // Также удаляем уведомления
    console.log(`\n🗑️  Удаляю все уведомления пользователя: ${userId}`);
    const notifDeleted = await sequelize.query(
      'DELETE FROM notifications WHERE "userId" = :userId',
      {
        replacements: { userId },
        type: Sequelize.QueryTypes.DELETE,
      }
    );

    console.log(`✅ Удалено уведомлений: ${notifDeleted}`);

    // Также удаляем транзакции
    console.log(`\n🗑️  Удаляю все транзакции пользователя: ${userId}`);
    const transDeleted = await sequelize.query(
      'DELETE FROM transactions WHERE "userId" = :userId',
      {
        replacements: { userId },
        type: Sequelize.QueryTypes.DELETE,
      }
    );

    console.log(`✅ Удалено транзакций: ${transDeleted}`);

    console.log('\n✅ Все данные пользователя удалены успешно!');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

deleteUserBookings();
