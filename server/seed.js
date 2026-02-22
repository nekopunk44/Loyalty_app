/**
 * PostgreSQL Database Seeding Script
 * Добавляет тестовые данные в PostgreSQL БД
 */

const dotenv = require('dotenv');
const { Sequelize, DataTypes } = require('sequelize');
const bcryptjs = require('bcryptjs');

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

// ==================== Define Models ====================

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

const Property = sequelize.define('Property', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  price: DataTypes.STRING,
  priceNumber: DataTypes.INTEGER,
  rooms: DataTypes.INTEGER,
  guests: DataTypes.INTEGER,
  amenities: { type: DataTypes.JSON, defaultValue: [] },
  image: DataTypes.STRING,
  status: { type: DataTypes.ENUM('available', 'unavailable'), defaultValue: 'available' },
}, {
  timestamps: false,
  tableName: 'properties',
});

const Booking = sequelize.define('Booking', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  propertyId: { type: DataTypes.STRING, allowNull: false },
  userId: { type: DataTypes.STRING, allowNull: false },
  checkInDate: { type: DataTypes.STRING, allowNull: false },
  checkOutDate: { type: DataTypes.STRING, allowNull: false },
  guests: { type: DataTypes.INTEGER, allowNull: false },
  notes: { type: DataTypes.TEXT, defaultValue: '' },
  totalPrice: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'), defaultValue: 'confirmed' },
}, {
  timestamps: false,
  tableName: 'bookings',
});

const LoyaltyCard = sequelize.define('LoyaltyCard', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.STRING, unique: true, allowNull: false },
  balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  cashbackRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 5 },
  totalSpent: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  totalEarned: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  membershipLevel: { type: DataTypes.ENUM('Bronze', 'Silver', 'Gold', 'Platinum'), defaultValue: 'Bronze' },
}, {
  timestamps: false,
  tableName: 'loyalty_cards',
});

const Review = sequelize.define('Review', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  propertyId: { type: DataTypes.STRING, allowNull: false },
  userId: { type: DataTypes.STRING, allowNull: false },
  bookingId: DataTypes.INTEGER,
  rating: { type: DataTypes.DECIMAL(3, 2), allowNull: false },
  title: DataTypes.STRING,
  comment: DataTypes.TEXT,
  helpfulCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  timestamps: false,
  tableName: 'reviews',
});

// ==================== Seed Data ====================

const seedDatabase = async () => {
  try {
    console.log('🔄 Подключение к PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ Подключено к БД');

    // Синхронизируем модели - пересоздаём для чистоты
    console.log('🔄 Синхронизация таблиц...');
    await sequelize.sync({ force: true });
    console.log('✅ Таблицы синхронизированы');

    // ==================== Clear existing data ====================
    console.log('\n🗑️  Очистка старых данных...');
    await Booking.destroy({ where: {} });
    await Review.destroy({ where: {} });
    await LoyaltyCard.destroy({ where: {} });
    await Property.destroy({ where: {} });
    await User.destroy({ where: {} });
    console.log('✅ Старые данные удалены');

    // ==================== Create Test Users ====================
    console.log('\n👥 Создание тестовых пользователей...');
    const hashedPassword = await bcryptjs.hash('password123', 10);

    const users = await User.bulkCreate([
      {
        userId: 'test-user-1',
        email: 'user1@example.com',
        passwordHash: hashedPassword,
        displayName: 'Иван Петров',
        phone: '+79991234567',
        address: 'ул. Примерная, 10',
        role: 'user',
        loyaltyPoints: 5000,
        membershipLevel: 'Silver',
      },
      {
        userId: 'test-user-2',
        email: 'user2@example.com',
        passwordHash: hashedPassword,
        displayName: 'Мария Сидорова',
        phone: '+79997654321',
        address: 'пр. Главный, 5',
        role: 'user',
        loyaltyPoints: 10000,
        membershipLevel: 'Gold',
      },
      {
        userId: 'admin-user',
        email: 'admin@example.com',
        passwordHash: hashedPassword,
        displayName: 'Администратор',
        phone: '+79999999999',
        address: 'офис',
        role: 'admin',
        loyaltyPoints: 0,
        membershipLevel: null,
      },
    ]);

    console.log(`✅ Создано ${users.length} пользователей:`);
    users.forEach(u => console.log(`   - ${u.displayName} (${u.email})`));

    // ==================== Create Loyalty Cards ====================
    console.log('\n💳 Создание карт лояльности...');
    const loyaltyCards = await LoyaltyCard.bulkCreate([
      {
        userId: users[0].userId,
        balance: 10000,
        cashbackRate: 5,
        totalSpent: 50000,
        totalEarned: 2500,
        membershipLevel: 'Silver',
      },
      {
        userId: users[1].userId,
        balance: 7500,
        cashbackRate: 7,
        totalSpent: 150000,
        totalEarned: 10500,
        membershipLevel: 'Gold',
      },
      {
        userId: users[2].userId,
        balance: 0,
        cashbackRate: 10,
        totalSpent: 0,
        totalEarned: 0,
        membershipLevel: 'Platinum',
      },
    ]);

    console.log(`✅ Создано ${loyaltyCards.length} карт лояльности`);

    // ==================== Create Properties ====================
    console.log('\n🏠 Создание объектов недвижимости...');
    const properties = await Property.bulkCreate([
      {
        name: 'Villa Bonita',
        description: 'Прекрасная вилла с видом на море, бассейн, полностью оборудована',
        price: '150€',
        priceNumber: 150,
        rooms: 3,
        guests: 6,
        amenities: JSON.stringify(['WiFi', 'Бассейн', 'Кухня', 'Кондиционер', 'Паркинг']),
        image: 'villa1.jpg',
        status: 'available',
      },
      {
        name: 'Sunset Apartment',
        description: 'Уютная квартира с видом на закат, балкон, близко к центру',
        price: '80€',
        priceNumber: 80,
        rooms: 2,
        guests: 4,
        amenities: JSON.stringify(['WiFi', 'Кухня', 'Балкон', 'Паркинг']),
        image: 'apt1.jpg',
        status: 'available',
      },
      {
        name: 'Luxury Penthouse',
        description: 'Премиум пентхаус со всеми удобствами, спа, тренажерный зал',
        price: '250€',
        priceNumber: 250,
        rooms: 4,
        guests: 8,
        amenities: JSON.stringify(['WiFi', 'Бассейн', 'Спа', 'Кухня', 'Тренажерный зал', 'Паркинг']),
        image: 'penthouse1.jpg',
        status: 'available',
      },
      {
        name: 'Cozy Studio',
        description: 'Маленькая, но очень уютная студия для одного-двух человек',
        price: '50€',
        priceNumber: 50,
        rooms: 1,
        guests: 2,
        amenities: JSON.stringify(['WiFi', 'Кухня']),
        image: 'studio1.jpg',
        status: 'available',
      },
    ]);

    console.log(`✅ Создано ${properties.length} объектов:`);
    properties.forEach(p => console.log(`   - ${p.name} (ID: ${p.id}, ${p.priceNumber}${p.price.slice(-1)})`));

    // ==================== Create Bookings ====================
    console.log('\n📅 Создание бронирований...');
    const bookings = await Booking.bulkCreate([
      {
        propertyId: properties[0].id.toString(),
        userId: users[0].userId,
        checkInDate: '25.12.2025',
        checkOutDate: '27.12.2025',
        guests: 4,
        notes: 'Бронирование на Рождество',
        totalPrice: 300,
        status: 'confirmed',
      },
      {
        propertyId: properties[1].id.toString(),
        userId: users[1].userId,
        checkInDate: '20.12.2025',
        checkOutDate: '22.12.2025',
        guests: 2,
        notes: 'Рождественские каникулы',
        totalPrice: 160,
        status: 'confirmed',
      },
      {
        propertyId: properties[2].id.toString(),
        userId: users[0].userId,
        checkInDate: '28.12.2025',
        checkOutDate: '01.01.2026',
        guests: 6,
        notes: 'Новогодний отпуск',
        totalPrice: 1000,
        status: 'pending',
      },
    ]);

    console.log(`✅ Создано ${bookings.length} бронирований`);

    // ==================== Create Reviews ====================
    console.log('\n⭐ Создание отзывов...');
    const reviews = await Review.bulkCreate([
      {
        propertyId: properties[0].id.toString(),
        userId: users[0].userId,
        bookingId: bookings[0].id,
        rating: 4.5,
        title: 'Отличная вилла!',
        comment: 'Очень красивое место, замечательный вид, чистые номера. Рекомендую!',
        helpfulCount: 12,
      },
      {
        propertyId: properties[1].id.toString(),
        userId: users[1].userId,
        bookingId: bookings[1].id,
        rating: 4.8,
        title: 'Идеальное место',
        comment: 'Все превзошло наши ожидания. Спасибо хозяевам за гостеприимство!',
        helpfulCount: 18,
      },
      {
        propertyId: properties[0].id.toString(),
        userId: users[1].userId,
        rating: 4.0,
        title: 'Хорошо, но...',
        comment: 'Хороший объект, но требует небольшого обновления интерьера.',
        helpfulCount: 5,
      },
    ]);

    console.log(`✅ Создано ${reviews.length} отзывов`);

    // ==================== Summary ====================
    console.log('\n' + '='.repeat(50));
    console.log('✨ ТЕСТОВЫЕ ДАННЫЕ УСПЕШНО ДОБАВЛЕНЫ! ✨');
    console.log('='.repeat(50));
    console.log('\n📊 Статистика:');
    console.log(`   Пользователей: ${users.length}`);
    console.log(`   Карт лояльности: ${loyaltyCards.length}`);
    console.log(`   Объектов недвижимости: ${properties.length}`);
    console.log(`   Бронирований: ${bookings.length}`);
    console.log(`   Отзывов: ${reviews.length}`);
    
    console.log('\n🔐 Тестовые учетные данные:');
    console.log(`   Email: user1@example.com | Пароль: password123`);
    console.log(`   Email: user2@example.com | Пароль: password123`);
    console.log(`   Email: admin@example.com  | Пароль: password123 (Admin)`);

    console.log('\n✅ Готово! Сервер готов к использованию.');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка при добавлении тестовых данных:', error.message);
    console.error(error);
    process.exit(1);
  }
};

seedDatabase();
