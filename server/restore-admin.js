/**
 * Скрипт для восстановления администратора в БД
 */

const dotenv = require('dotenv');
const { Sequelize, DataTypes } = require('sequelize');

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.STRING, unique: true, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  passwordHash: DataTypes.STRING,
  displayName: DataTypes.STRING,
  avatar: DataTypes.STRING,
  phone: DataTypes.STRING,
  address: DataTypes.TEXT,
  role: { type: DataTypes.ENUM('user', 'admin'), defaultValue: 'user' },
  loyaltyPoints: { type: DataTypes.INTEGER, defaultValue: 0 },
  membershipLevel: { type: DataTypes.ENUM('Bronze', 'Silver', 'Gold', 'Platinum'), defaultValue: 'Bronze' },
}, {
  timestamps: false,
  tableName: 'users',
});

async function restoreAdmin() {
  try {
    console.log('🔄 Подключение к БД...');
    await sequelize.authenticate();
    console.log('✅ Подключение успешно');

    // Удаляем старого администратора если он есть
    const existingAdmin = await User.findOne({ where: { email: 'admin@example.com' } });
    if (existingAdmin) {
      console.log('⚠️ Администратор с таким email уже существует, удаляем старого...');
      await existingAdmin.destroy();
      console.log('✅ Старый администратор удален');
    }

    // Создаем нового администратора
    const hashedPassword = '$2a$10$1.W8GT21YJhbhpjdjzisZ.3ncxXHb3cG8/N6kyQpDU7XJZkDXNfPi'; // password123
    
    const admin = await User.create({
      userId: 'admin-user',
      email: 'admin@example.com',
      passwordHash: hashedPassword,
      displayName: 'Администратор',
      phone: '+79999999999',
      address: 'офис',
      role: 'admin',
      loyaltyPoints: 0,
      membershipLevel: null,
    });

    console.log('✅ Администратор восстановлен:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Пароль: password123`);
    console.log(`   Роль: ${admin.role}`);
    console.log(`   Уровень членства: ${admin.membershipLevel}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

restoreAdmin();
