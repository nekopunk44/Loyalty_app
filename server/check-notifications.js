/**
 * Скрипт для проверки уведомлений в базе данных
 */

const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/loyalty_app';

const sequelize = new Sequelize(DATABASE_URL, {
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
});

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  data: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  actionUrl: DataTypes.STRING,
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName: 'notifications',
  freezeTableName: true,
});

async function checkNotifications() {
  try {
    await sequelize.authenticate();
    console.log('✅ Подключение к БД успешно');

    // Получаем все уведомления
    const allNotifications = await Notification.findAll({
      order: [['createdAt', 'DESC']],
      limit: 30,
    });

    console.log('\n📊 Все уведомления (последние 30):');
    console.log('═'.repeat(100));
    
    allNotifications.forEach((n, idx) => {
      console.log(`${idx + 1}. [${n.type}] ${n.title} - ${n.message} (userId: ${n.userId}, created: ${n.createdAt})`);
    });

    // Группируем по типам
    const byType = {};
    allNotifications.forEach(n => {
      if (!byType[n.type]) byType[n.type] = 0;
      byType[n.type]++;
    });

    console.log('\n📈 Статистика по типам:');
    console.log('═'.repeat(50));
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });

    // Проверяем бронирования
    const bookingNotifications = await Notification.findAll({
      where: {
        type: ['newBooking', 'bookingConfirmed', 'bookingCompleted', 'bookingCancelled', 'bookingPending'],
      },
      order: [['createdAt', 'DESC']],
    });

    console.log('\n🎫 Уведомления о бронированиях:');
    console.log('═'.repeat(100));
    if (bookingNotifications.length === 0) {
      console.log('❌ Уведомлений о бронированиях не найдено!');
    } else {
      bookingNotifications.forEach((n, idx) => {
        console.log(`${idx + 1}. [${n.type}] ${n.title} - ${n.message} (userId: ${n.userId})`);
      });
    }
    console.log(`\nВсего: ${bookingNotifications.length}`);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkNotifications();
