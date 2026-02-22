/**
 * Loyalty App Backend Server
 * Express.js + PostgreSQL + Sequelize
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { Sequelize, DataTypes } = require('sequelize');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Загружаем переменные окружения
dotenv.config();

// JWT Secret (измените на более сложный в production!)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production-123!';

// Инициализируем Express приложение
const app = express();
const PORT = process.env.PORT || 5002;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/loyalty_app';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Раздача статических файлов (изображения, шрифты и т.д.)
app.use(express.static('public'));
const path = require('path');
app.use('/assets', express.static(path.join(__dirname, '../src/assets')));

// ==================== Property Relationships ====================
// Люкс и Стандарт - это один дом, поэтому их календари синхронизированы
// Вся территория синхронизирована со всеми свойствами
const relatedProperties = {
  '1': ['1', '2', '4'],  // Люкс (1) связан со Стандартом (2), Всей территорией (4)
  '2': ['1', '2', '4'],  // Стандарт (2) связан с Люксом (1), Всей территорией (4)
  '3': ['3', '4'],       // Задний двор (3) связан с Всей территорией (4)
  '4': ['1', '2', '3', '4'],  // Вся территория (4) связана со всеми свойствами
};

// ==================== Database Setup ====================

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false, // Отключаем логирование всех SQL запросов для лучшей производительности
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

let dbConnected = false;

// ==================== Online Users Tracking ====================
// Объект для отслеживания активных (онлайн) пользователей
// Ключ - userId, значение - timestamp последнего запроса
const connectedUsers = new Map();
const ONLINE_TIMEOUT = 30000; // 30 секунд без активности = офлайн

// Функция проверки, онлайн ли пользователь
const isUserOnline = (userId) => {
  if (!connectedUsers.has(userId)) return false;
  const lastActivity = connectedUsers.get(userId);
  const isOnline = Date.now() - lastActivity < ONLINE_TIMEOUT;
  if (!isOnline) {
    connectedUsers.delete(userId);
  }
  return isOnline;
};

// Функция добавления пользователя в онлайн
const markUserOnline = (userId) => {
  connectedUsers.set(userId, Date.now());
};

// Функция удаления пользователя из онлайн
const markUserOffline = (userId) => {
  connectedUsers.delete(userId);
};

// ==================== Date Formatting ====================
// Функция форматирования даты из объекта Date в строку DD.MM.YYYY
const formatDateToDDMMYYYY = (date) => {
  if (!date) return null;
  if (typeof date === 'string') {
    // Если уже строка, проверяем формат
    if (date.includes('.') && date.length === 10) {
      return date; // Уже в формате DD.MM.YYYY
    }
    // Если это ISO строка, парсим её
    if (date.includes('T')) {
      const dateOnly = date.split('T')[0];
      const [year, month, day] = dateOnly.split('-');
      return `${day}.${month}.${year}`;
    } else if (date.includes('-')) {
      // Формат YYYY-MM-DD
      const [year, month, day] = date.split('-');
      return `${day}.${month}.${year}`;
    }
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

// ==================== Models ====================

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  propertyId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true,
  },
  checkInDate: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  checkOutDate: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  guests: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  saunaHours: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Количество часов аренды парилки',
  },
  kitchenware: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Использование кухонного сервиза',
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
    defaultValue: 'confirmed',
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
  tableName: 'bookings',
});

const Property = sequelize.define('Property', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: DataTypes.TEXT,
  price: DataTypes.STRING,
  priceNumber: DataTypes.INTEGER,
  rooms: DataTypes.INTEGER,
  guests: DataTypes.INTEGER,
  amenities: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  image: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('available', 'unavailable'),
    defaultValue: 'available',
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
  tableName: 'properties',
});

// ==================== LoyaltyCard Model ====================

const LoyaltyCard = sequelize.define('LoyaltyCard', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    index: true,
  },
  balance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Баланс карты лояльности в рублях',
  },
  cashbackRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 5,
    comment: 'Процент кэшбека при возврате',
  },
  totalSpent: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Всего потрачено через карту',
  },
  totalEarned: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Всего заработано кэшбека',
  },
  membershipLevel: {
    type: DataTypes.ENUM('Bronze', 'Silver', 'Gold', 'Platinum'),
    defaultValue: 'Bronze',
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
  tableName: 'loyalty_cards',
});

// ==================== Transaction Model ====================

const Transaction = sequelize.define('Transaction', {
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
  bookingId: {
    type: DataTypes.INTEGER,
    index: true,
  },
  type: {
    type: DataTypes.ENUM('debit', 'credit'), // debit = списание, credit = пополнение
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  balanceBefore: {
    type: DataTypes.DECIMAL(12, 2),
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(12, 2),
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName: 'transactions',
});

// ==================== Event Model ====================

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: DataTypes.TEXT,
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: DataTypes.DATE,
  location: DataTypes.STRING,
  imageUrl: DataTypes.STRING,
  category: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'cancelled', 'upcoming', 'ended'),
    defaultValue: 'active',
  },
  prize: DataTypes.STRING,
  allowedUsers: {
    type: DataTypes.STRING,
    defaultValue: 'all',
  },
  eventType: {
    type: DataTypes.STRING,
    defaultValue: 'auction',
  },
  participants: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  participantIds: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'JSON массив ID пользователей которые участвуют',
  },
  createdBy: DataTypes.STRING,
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
  tableName: 'events',
});

// ==================== Notification Model ====================

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

// ==================== Review Model ====================

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  propertyId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true,
  },
  userName: DataTypes.STRING,
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 },
  },
  title: DataTypes.STRING,
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  helpful: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  helpfulBy: {
    type: DataTypes.JSONB,
    defaultValue: [],
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
  tableName: 'reviews',
});

// ==================== Referral Model ====================

const Referral = sequelize.define('Referral', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  referralCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    index: true,
  },
  referrerId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true,
  },
  referrerName: DataTypes.STRING,
  referredUserId: {
    type: DataTypes.STRING,
    index: true,
  },
  referredEmail: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'expired'),
    defaultValue: 'pending',
  },
  bonus: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  completedAt: DataTypes.DATE,
}, {
  timestamps: false,
  tableName: 'referrals',
});

// ==================== CardTopUp Model ====================
// Пополнения карты лояльности пользователя
const CardTopUp = sequelize.define('CardTopUp', {
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
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "'card', 'paypal', 'crypto', 'bank_transfer'",
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending',
  },
  transactionId: {
    type: DataTypes.STRING,
    unique: true,
    index: true,
  },
  description: DataTypes.TEXT,
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
  tableName: 'card_topups',
});

// ==================== Payment Model ====================
// Модель для отслеживания всех платежей
const Payment = sequelize.define('Payment', {
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
  bookingId: {
    type: DataTypes.INTEGER,
    index: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'RUB',
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending',
  },
  paymentMethod: {
    type: DataTypes.STRING,
    comment: "'loyalty_card', 'stripe', 'paypal', 'bank_transfer'",
  },
  stripePaymentId: DataTypes.STRING,
  stripeChargeId: DataTypes.STRING,
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
  tableName: 'payments',
});

// ==================== AdminWallet Model ====================
// Кошелек администратора с финансовым доступом
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

// ==================== AdminTransaction Model ====================
// История всех транзакций администратора
const AdminTransaction = sequelize.define('AdminTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  adminId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true,
  },
  adminLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('booking_payment', 'topup_commission', 'withdrawal', 'refund', 'adjustment'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  bookingId: DataTypes.INTEGER,
  paymentId: DataTypes.INTEGER,
  description: DataTypes.TEXT,
  balanceBefore: DataTypes.DECIMAL(12, 2),
  balanceAfter: DataTypes.DECIMAL(12, 2),
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName: 'admin_transactions',
});

// ==================== WithdrawalRequest Model ====================
// Запросы на вывод денег администратором
const WithdrawalRequest = sequelize.define('WithdrawalRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  adminId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true,
  },
  adminLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  bankAccount: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'completed', 'rejected'),
    defaultValue: 'pending',
  },
  approvedBy: DataTypes.STRING,
  reason: DataTypes.TEXT,
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  approvedAt: DataTypes.DATE,
  completedAt: DataTypes.DATE,
}, {
  timestamps: false,
  tableName: 'withdrawal_requests',
});

// ==================== Database Connection ====================

const seedDatabase = async () => {
  try {
    console.log('\n👥 Загрузка тестовых данных...');
    
    // Проверяем есть ли уже пользователи
    const userCount = await User.count();
    if (userCount > 0) {
      console.log(`✅ БД уже содержит ${userCount} пользователей, пропускаем загрузку seed данных`);
      return;
    }

    // Создаем администратора
    const adminUser = await User.create({
      userId: 'admin-user',
      email: 'admin@example.com',
      passwordHash: await bcryptjs.hash('password123', 10),
      displayName: 'Администратор',
      phone: '+79999999999',
      address: 'офис',
      role: 'admin',
      adminLevel: 1, // 1 = админ с финансовым доступом
      membershipLevel: 'Platinum',
    });

    // Создаем админа второго уровня
    const adminUser2 = await User.create({
      userId: 'admin-user-2',
      email: 'admin2@example.com',
      passwordHash: await bcryptjs.hash('password123', 10),
      displayName: 'Администратор (без финансов)',
      phone: '+79999999998',
      address: 'офис',
      role: 'admin',
      adminLevel: 2, // 2 = админ БЕЗ финансового доступа
      membershipLevel: 'Platinum',
    });

    // Создаем обычных пользователей
    const user1 = await User.create({
      userId: 'user1-id',
      email: 'user1@example.com',
      passwordHash: await bcryptjs.hash('password123', 10),
      displayName: 'Иван Петров',
      phone: '+79111111111',
      address: 'Москва',
      role: 'user',
      membershipLevel: 'Silver',
    });

    const user2 = await User.create({
      userId: 'user2-id',
      email: 'user2@example.com',
      passwordHash: await bcryptjs.hash('password123', 10),
      displayName: 'Мария Сидорова',
      phone: '+79222222222',
      address: 'Санкт-Петербург',
      role: 'user',
      membershipLevel: 'Gold',
    });

    console.log('✅ Создано 4 пользователей (1 админ с финансами, 1 админ без финансов, 2 обычных)');

    // Создаем кошельки администраторов
    await AdminWallet.create({
      adminId: adminUser.userId,
      adminLevel: 1,
      totalBalance: 0,
      availableBalance: 0,
      pendingBalance: 0,
      totalReceived: 0,
      totalWithdrawn: 0,
      isActive: true,
    });

    await AdminWallet.create({
      adminId: adminUser2.userId,
      adminLevel: 2,
      totalBalance: 0,
      availableBalance: 0,
      pendingBalance: 0,
      totalReceived: 0,
      totalWithdrawn: 0,
      isActive: true,
    });

    console.log('✅ Созданы кошельки администраторов');

    // Создаем карты лояльности
    await LoyaltyCard.create({
      userId: adminUser.userId,
      balance: 0,
      totalSpent: 0,
      totalEarned: 0,
    });

    await LoyaltyCard.create({
      userId: adminUser2.userId,
      balance: 0,
      totalSpent: 0,
      totalEarned: 0,
    });

    await LoyaltyCard.create({
      userId: user1.userId,
      balance: 500,
      totalSpent: 2000,
      totalEarned: 100,
    });

    await LoyaltyCard.create({
      userId: user2.userId,
      balance: 1000,
      totalSpent: 5000,
      totalEarned: 250,
    });

    console.log('✅ Создано 4 карты лояльности');

    // Создаем объекты недвижимости
    const properties = [
      {
        name: 'Villa Bonita',
        description: 'Роскошная вилла с видом на море',
        price: '150€',
        priceNumber: 150,
        rooms: 4,
        guests: 8,
        amenities: ['WiFi', 'Бассейн', 'Кондиционер', 'Кухня'],
        image: 'villa1.jpg',
        status: 'available',
      },
      {
        name: 'Sunset Apartment',
        description: 'Уютная квартира в центре города',
        price: '80€',
        priceNumber: 80,
        rooms: 2,
        guests: 4,
        amenities: ['WiFi', 'Паркинг', 'Балкон'],
        image: 'apartment1.jpg',
        status: 'available',
      },
      {
        name: 'Luxury Penthouse',
        description: 'Премиум пентхаус с панорамным видом',
        price: '250€',
        priceNumber: 250,
        rooms: 5,
        guests: 10,
        amenities: ['WiFi', 'СПА', 'Бассейн', 'Лифт', 'Консьерж'],
        image: 'penthouse.jpg',
        status: 'available',
      },
      {
        name: 'Cozy Studio',
        description: 'Студия для одного или двух человек',
        price: '50€',
        priceNumber: 50,
        rooms: 1,
        guests: 2,
        amenities: ['WiFi', 'Душ'],
        image: 'studio.jpg',
        status: 'available',
      },
    ];

    await Property.bulkCreate(properties);
    console.log('✅ Создано 4 объекта недвижимости');

    // Создаем бронирования
    const booking1 = await Booking.create({
      propertyId: '1',
      userId: user1.userId,
      checkInDate: '2025-01-01',
      checkOutDate: '2025-01-08',
      guests: 2,
      totalPrice: 560,
      status: 'confirmed',
    });

    const booking2 = await Booking.create({
      propertyId: '2',
      userId: user2.userId,
      checkInDate: '2025-01-10',
      checkOutDate: '2025-01-15',
      guests: 4,
      totalPrice: 400,
      status: 'confirmed',
    });

    const booking3 = await Booking.create({
      propertyId: '3',
      userId: user1.userId,
      checkInDate: '2025-02-01',
      checkOutDate: '2025-02-05',
      guests: 8,
      totalPrice: 1000,
      status: 'pending',
    });

    console.log('✅ Создано 3 бронирования');

    console.log('\n✨ ТЕСТОВЫЕ ДАННЫЕ УСПЕШНО ЗАГРУЖЕНЫ!\n');
    console.log('🔐 Тестовые учетные данные:');
    console.log('   Email: admin@example.com | Пароль: password123');
    console.log('   Email: user1@example.com | Пароль: password123');
    console.log('   Email: user2@example.com | Пароль: password123\n');

  } catch (error) {
    console.error('❌ Ошибка при загрузке seed данных:', error.message);
  }
};

const connectDB = async () => {
  try {
    console.log('🔄 Подключение к PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL подключена успешно');

    // Синхронизируем модели с БД (alter: true сохраняет существующие данные)
    await sequelize.sync({ alter: true });
    console.log('✅ Таблицы синхронизированы');

    // Автоматически загружаем seed данные при первом запуске
    await seedDatabase();

    dbConnected = true;
  } catch (error) {
    console.error('❌ Ошибка подключения к PostgreSQL:', error.message);
    dbConnected = false;
    // Пробуем переподключиться через 5 секунд
    setTimeout(connectDB, 5000);
  }
};

// ==================== Routes ====================

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: dbConnected ? 'OK' : 'DB Error',
    ready: dbConnected,
    environment: NODE_ENV,
    database: 'PostgreSQL',
    timestamp: new Date().toISOString(),
  });
});

// ==================== Bookings Routes ====================

/**
 * GET /api/bookings/property/:propertyId/booked-dates
 * Получить список занятых дат для объекта (и связанных объектов)
 */
app.get('/api/bookings/property/:propertyId/booked-dates', async (req, res) => {
  try {
    const { propertyId } = req.params;
    console.log(`📌 GET booked-dates для property ${propertyId}`);

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: 'propertyId является обязательным параметром',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'PostgreSQL не подключена',
      });
    }

    // Получаем список связанных свойств (включая само свойство)
    const propertiesToCheck = relatedProperties[propertyId.toString()] || [propertyId.toString()];
    console.log(`🔗 Проверяем свойства: ${propertiesToCheck.join(', ')}`);

    const bookings = await Booking.findAll({
      where: {
        propertyId: propertiesToCheck,
        status: 'confirmed',
      },
      attributes: [
        'id',
        'propertyId',
        'userId',
        'checkInDate',
        'checkOutDate',
        'guests',
        'notes',
        'saunaHours',
        'kitchenware',
        'totalPrice',
        'status',
        'createdAt',
        'updatedAt',
      ],
    });

    console.log(`✅ Найдено бронирований для ${propertiesToCheck.join(', ')}: ${bookings.length}`);

    const bookedDates = [];

    bookings.forEach((booking) => {
      try {
        if (!booking.checkInDate || !booking.checkOutDate) {
          console.warn('⚠️ Бронирование без дат:', booking.id);
          return;
        }

        // Парсим даты в формате ДД.MM.YYYY
        const [dayIn, monthIn, yearIn] = booking.checkInDate.split('.');
        const [dayOut, monthOut, yearOut] = booking.checkOutDate.split('.');

        const checkIn = new Date(yearIn, monthIn - 1, dayIn);
        const checkOut = new Date(yearOut, monthOut - 1, dayOut);

        if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
          console.warn('⚠️ Неверный формат даты в бронировании:', booking.id);
          return;
        }

        // Генерируем все даты между check-in и check-out
        const current = new Date(checkIn);
        while (current <= checkOut) {
          const dateStr = `${String(current.getDate()).padStart(2, '0')}.${String(
            current.getMonth() + 1
          ).padStart(2, '0')}.${current.getFullYear()}`;
          bookedDates.push(dateStr);
          current.setDate(current.getDate() + 1);
        }
      } catch (error) {
        console.error('❌ Ошибка при обработке бронирования:', booking.id, error.message);
      }
    });

    // Удаляем дубликаты
    const uniqueDates = [...new Set(bookedDates)];

    res.status(200).json({
      success: true,
      propertyId,
      bookedDates: uniqueDates,
      allBookings: bookings,
      count: uniqueDates.length,
    });
  } catch (error) {
    console.error('❌ Error fetching booked dates:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении занятых дат',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/bookings
 * Создать новое бронирование
 */
app.post('/api/bookings', async (req, res) => {
  try {
    const { propertyId, userId, checkInDate, checkOutDate, guests, notes, totalPrice, saunaHours, kitchenware } = req.body;

    console.log(`📌 POST /api/bookings`);
    console.log(`📋 Полученные данные:`, {
      propertyId,
      userId,
      checkInDate,
      checkOutDate,
      guests,
      guestsType: typeof guests,
      notes,
      totalPrice,
      saunaHours,
      kitchenware,
    });

    // Валидация
    if (!propertyId || !userId || !checkInDate || !checkOutDate || !guests) {
      return res.status(400).json({
        success: false,
        error: 'Отсутствуют обязательные поля',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'PostgreSQL не подключена',
      });
    }

    // Парсим даты в формате ДД.MM.YYYY
    const [dayIn, monthIn, yearIn] = checkInDate.split('.');
    const [dayOut, monthOut, yearOut] = checkOutDate.split('.');

    const checkIn = new Date(yearIn, monthIn - 1, dayIn);
    const checkOut = new Date(yearOut, monthOut - 1, dayOut);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Неверный формат даты. Используйте ДД.MM.YYYY',
      });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({
        success: false,
        error: 'Дата выезда должна быть позже даты заезда',
      });
    }

    // Проверяем, не заняты ли даты
    const conflictingBookings = await Booking.findAll({
      where: {
        propertyId,
        status: 'confirmed',
      },
    });

    console.log(`🔍 Проверка конфликтов дат для property: ${propertyId}`);

    let hasConflict = false;
    conflictingBookings.forEach((booking) => {
      try {
        if (!booking.checkInDate || !booking.checkOutDate) {
          return;
        }

        const [existDayIn, existMonthIn, existYearIn] = booking.checkInDate.split('.');
        const [existDayOut, existMonthOut, existYearOut] = booking.checkOutDate.split('.');
        const existingCheckIn = new Date(existYearIn, existMonthIn - 1, existDayIn);
        const existingCheckOut = new Date(existYearOut, existMonthOut - 1, existDayOut);

        if (
          (checkIn >= existingCheckIn && checkIn <= existingCheckOut) ||
          (checkOut >= existingCheckIn && checkOut <= existingCheckOut) ||
          (checkIn <= existingCheckIn && checkOut >= existingCheckOut)
        ) {
          hasConflict = true;
        }
      } catch (error) {
        console.error('❌ Ошибка при проверке конфликта дат:', error);
      }
    });

    if (hasConflict) {
      return res.status(409).json({
        success: false,
        error: 'Выбранные даты уже заняты',
      });
    }

    // Проверяем или создаем карту лояльности пользователя
    let loyaltyCard = await LoyaltyCard.findOne({ where: { userId } });

    if (!loyaltyCard) {
      loyaltyCard = await LoyaltyCard.create({
        userId,
        balance: 0,
        cashbackRate: 5,
        totalSpent: 0,
        totalEarned: 0,
        membershipLevel: 'Bronze',
      });
      console.log(`➕ Создана новая карта лояльности для пользователя: ${userId}`);
    }

    const bookingPrice = parseFloat(totalPrice) || 0;
    
    // Примечание: Проверка баланса и списание средств происходит в отдельном endpoint'е
    // при подтверждении платежа (POST /api/bookings/:bookingId/confirm-payment)

    // Создаем бронирование со статусом 'pending' (ожидание оплаты)
    // Деньги НЕ списываются до завершения платежа!
    const guestsInt = parseInt(guests);
    console.log(`🧑 Сохраняем количество гостей: "${guests}" -> ${guestsInt} (тип: ${typeof guestsInt})`);
    
    const booking = await Booking.create({
      propertyId,
      userId,
      checkInDate,
      checkOutDate,
      guests: guestsInt,
      notes: notes || '',
      saunaHours: parseInt(saunaHours) || 0,
      kitchenware: kitchenware || false,
      totalPrice: bookingPrice,
      status: 'pending',  // ⚠️ ВАЖНО: статус 'pending' до оплаты
    });

    console.log(`📋 Бронирование создано в статусе PENDING: ${booking.id}`);
    console.log(`⏳ Ожидание оплаты: ${bookingPrice}₽`);

    res.status(201).json({
      success: true,
      message: 'Бронирование создано. Требуется завершить оплату.',
      bookingId: booking.id,
      booking,
      payment: {
        amount: bookingPrice,
        status: 'pending',
        requiredAmount: bookingPrice,
        transactionTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Error creating booking:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании бронирования',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/bookings/:bookingId
 * Получить информацию о бронировании
 */
app.get('/api/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'PostgreSQL не подключена',
      });
    }

    const booking = await Booking.findByPk(bookingId, {
      attributes: [
        'id',
        'propertyId',
        'userId',
        'checkInDate',
        'checkOutDate',
        'guests',
        'notes',
        'saunaHours',
        'kitchenware',
        'totalPrice',
        'status',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Бронирование не найдено',
      });
    }

    res.status(200).json({
      success: true,
      bookingId: booking.id,
      booking,
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении бронирования',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/bookings/:bookingId/confirm-payment
 * Подтвердить платеж и активировать бронирование
 */
app.post('/api/bookings/:bookingId/confirm-payment', async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'PostgreSQL не подключена',
      });
    }

    // Получаем бронирование
    const booking = await Booking.findByPk(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Бронирование не найдено',
      });
    }

    // Проверяем, что бронирование еще в статусе pending
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Бронирование уже обработано или отменено',
        currentStatus: booking.status,
      });
    }

    // Получаем карту лояльности пользователя
    let loyaltyCard = await LoyaltyCard.findOne({ where: { userId: booking.userId } });

    if (!loyaltyCard) {
      return res.status(404).json({
        success: false,
        error: 'Карта лояльности пользователя не найдена',
      });
    }

    // Получаем информацию о пользователе для определения уровня лояльности
    const user = await User.findOne({ where: { userId: booking.userId } });

    const bookingPrice = parseFloat(booking.totalPrice);
    const currentBalance = parseFloat(loyaltyCard.balance);

    // Проверяем баланс
    if (currentBalance < bookingPrice) {
      return res.status(402).json({
        success: false,
        error: 'Недостаточно средств на карте лояльности',
        currentBalance: currentBalance,
        requiredAmount: bookingPrice,
        deficit: bookingPrice - currentBalance,
      });
    }

    // Списываем средства с карты лояльности
    const balanceBefore = parseFloat(currentBalance.toFixed(2));
    loyaltyCard.balance = parseFloat((currentBalance - bookingPrice).toFixed(2));
    loyaltyCard.totalSpent = parseFloat((parseFloat(loyaltyCard.totalSpent) + bookingPrice).toFixed(2));
    await loyaltyCard.save();

    // Меняем статус бронирования на 'confirmed'
    booking.status = 'confirmed';
    await booking.save();

    // Создаем запись о транзакции (дебит - списание)
    await Transaction.create({
      userId: booking.userId,
      bookingId: booking.id,
      type: 'debit',
      amount: bookingPrice,
      description: `Оплата бронирования #${booking.id} в объекте ${booking.propertyId}`,
      balanceBefore: balanceBefore,
      balanceAfter: loyaltyCard.balance,
    });

    console.log(`✅ Платеж подтвержден: бронирование #${booking.id}, списано ${bookingPrice}₽`);

    // ==================== УВЕДОМЛЕНИЯ АДМИНИСТРАТОРУ ====================
    try {
      // Получаем всех администраторов
      const admins = await User.findAll({
        where: { role: 'admin' }
      });

      // Получаем информацию о пользователе и объекте
      const bookingUser = await User.findOne({ where: { userId: booking.userId } });
      const property = await Property.findByPk(booking.propertyId);

      // Формируем описание дополнительных услуг
      let additionalServicesStr = '';
      if (booking.saunaHours > 0) {
        additionalServicesStr += `🧖 Сауна: ${booking.saunaHours}ч. `;
      }
      if (booking.kitchenware) {
        additionalServicesStr += `🍴 Посуда и кухня`;
      }
      additionalServicesStr = additionalServicesStr.trim();

      const adminMessage = `Новое бронирование от ${bookingUser?.name || 'Пользователь'}: ${property?.name || `объект ${booking.propertyId}`}. Гостей: ${booking.guests}, Сумма: ${bookingPrice}₽, Даты: ${booking.checkInDate} - ${booking.checkOutDate}${additionalServicesStr ? '. ' + additionalServicesStr : ''}`;

      // Отправляем уведомление каждому админу
      for (const admin of admins) {
        await Notification.create({
          userId: admin.userId,
          title: '🔔 Новое бронирование',
          message: adminMessage,
          type: 'new_booking',
          data: {
            bookingId: booking.id,
            propertyId: booking.propertyId,
            userId: booking.userId,
            guestName: bookingUser?.name,
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            guests: booking.guests,
            totalPrice: bookingPrice,
            saunaHours: booking.saunaHours,
            kitchenware: booking.kitchenware,
          },
          read: false,
        });
      }
      console.log(`📨 Уведомления отправлены ${admins.length} администратору(ам)`);
    } catch (adminNotifyError) {
      console.error('⚠️ Ошибка при отправке уведомления админу:', adminNotifyError.message);
      // Не прерываем процесс, если ошибка в отправке уведомления
    }

    // ==================== КЭШБЕК СИСТЕМА ====================
    // Определяем процент кэшбека в зависимости от уровня лояльности
    const cashbackRates = {
      'Bronze': 0.10,    // 10%
      'Silver': 0.20,    // 20%
      'Gold': 0.30,      // 30%
      'Platinum': 0.40,  // 40%
    };

    const membershipLevel = user?.membershipLevel || 'Bronze';
    const cashbackRate = cashbackRates[membershipLevel] || 0.10;
    const cashbackAmount = parseFloat((bookingPrice * cashbackRate).toFixed(2));

    // Добавляем кэшбек на карту лояльности
    const balanceBeforeCashback = loyaltyCard.balance;
    loyaltyCard.balance = parseFloat((loyaltyCard.balance + cashbackAmount).toFixed(2));
    loyaltyCard.totalEarned = parseFloat((parseFloat(loyaltyCard.totalEarned) + cashbackAmount).toFixed(2));
    await loyaltyCard.save();

    // Создаем запись о транзакции (кредит - начисление кэшбека)
    await Transaction.create({
      userId: booking.userId,
      bookingId: booking.id,
      type: 'credit',
      amount: cashbackAmount,
      description: `Кэшбек ${Math.round(cashbackRate * 100)}% за бронирование #${booking.id} (уровень: ${membershipLevel})`,
      balanceBefore: balanceBeforeCashback,
      balanceAfter: loyaltyCard.balance,
    });

    console.log(`💰 Кэшбек начислен: ${cashbackAmount}₽ (${Math.round(cashbackRate * 100)}% от ${bookingPrice}₽, уровень ${membershipLevel})`);
    console.log(`💳 Новый баланс карты: ${loyaltyCard.balance}₽`);

    res.status(200).json({
      success: true,
      message: 'Платеж успешно обработан. Бронирование подтверждено. Кэшбек начислен.',
      bookingId: booking.id,
      booking,
      payment: {
        amount: bookingPrice,
        status: 'confirmed',
        balanceAfterPayment: balanceBeforeCashback,
        transactionTime: new Date().toISOString(),
      },
      cashback: {
        rate: `${Math.round(cashbackRate * 100)}%`,
        membershipLevel: membershipLevel,
        amount: cashbackAmount,
        balanceAfterCashback: loyaltyCard.balance,
      },
    });
  } catch (error) {
    console.error('❌ Error confirming payment:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обработке платежа',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/bookings/:bookingId/cancel
 * Отменить бронирование с проверкой дат и возвратом средств
 */
app.post('/api/bookings/:bookingId/cancel', async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'PostgreSQL не подключена',
      });
    }

    // Получаем бронирование
    const booking = await Booking.findByPk(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Бронирование не найдено',
      });
    }

    // Проверяем статус: можно отменить только pending или confirmed
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        error: 'Можно отменить только незаплаченные (pending) или подтвержденные (confirmed) бронирования',
        currentStatus: booking.status,
      });
    }

    // Проверяем дату заезда: можно отменить минимум за 2 дня (в день 0, 1 нельзя, с дня 2 можно)
    const [dayIn, monthIn, yearIn] = booking.checkInDate.split('.');
    const checkInDate = new Date(yearIn, monthIn - 1, dayIn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    checkInDate.setHours(0, 0, 0, 0);
    
    const daysUntilCheckIn = Math.floor((checkInDate - today) / (1000 * 60 * 60 * 24));
    
    console.log(`📅 Проверка отмены: дней до заезда = ${daysUntilCheckIn}, дата заезда = ${booking.checkInDate}, сегодня = ${today.toLocaleDateString('ru-RU')}`);
    
    if (daysUntilCheckIn < 2) {
      return res.status(400).json({
        success: false,
        error: `Отмена доступна минимум за 3 дня до заезда. До заезда осталось ${daysUntilCheckIn} дней.`,
        daysUntilCheckIn,
      });
    }

    // Для confirmed бронирований - возвращаем средства с вычетом кэшбека
    let refundAmount = 0;
    let cashbackDeducted = 0;

    if (booking.status === 'confirmed') {
      // Получаем информацию о пользователе и его карте лояльности
      const loyaltyCard = await LoyaltyCard.findOne({ where: { userId: booking.userId } });
      const user = await User.findOne({ where: { userId: booking.userId } });

      if (!loyaltyCard) {
        return res.status(404).json({
          success: false,
          error: 'Карта лояльности пользователя не найдена',
        });
      }

      // Получаем исходную цену бронирования
      const bookingPrice = parseFloat(booking.totalPrice);

      // Определяем процент кэшбека на основе membership level
      const cashbackRates = {
        'Bronze': 0.10,    // 10%
        'Silver': 0.20,    // 20%
        'Gold': 0.30,      // 30%
        'Platinum': 0.40,  // 40%
      };

      const membershipLevel = user?.membershipLevel || 'Bronze';
      const cashbackRate = cashbackRates[membershipLevel] || 0.10;
      
      // Вычитаем из возврата сумму кэшбека, которую пользователь получил
      cashbackDeducted = parseFloat((bookingPrice * cashbackRate).toFixed(2));
      refundAmount = parseFloat((bookingPrice - cashbackDeducted).toFixed(2));

      console.log(`💰 Возврат при отмене: ${refundAmount}PRB (платеж: ${bookingPrice}, кэшбек ${Math.round(cashbackRate * 100)}%: ${cashbackDeducted})`);

      // Возвращаем средства пользователю
      const balanceBefore = parseFloat(loyaltyCard.balance);
      const newBalance = parseFloat(balanceBefore) + parseFloat(refundAmount);
      loyaltyCard.balance = parseFloat(newBalance.toFixed(2));
      await loyaltyCard.save();

      // Создаем транзакцию возврата
      await Transaction.create({
        userId: booking.userId,
        bookingId: booking.id,
        type: 'credit',
        amount: refundAmount,
        description: `Возврат при отмене бронирования #${booking.id} (минус кэшбек ${Math.round(cashbackRate * 100)}%)`,
        balanceBefore: balanceBefore,
        balanceAfter: loyaltyCard.balance,
      });

      // Удаляем кэшбек из totalEarned, так как бронирование отменено
      const currentEarned = parseFloat(loyaltyCard.totalEarned) || 0;
      loyaltyCard.totalEarned = parseFloat((currentEarned - cashbackDeducted).toFixed(2));
      await loyaltyCard.save();
    }

    // Меняем статус на 'cancelled'
    booking.status = 'cancelled';
    await booking.save();

    console.log(`❌ Бронирование #${booking.id} отменено, возврат: ${refundAmount}PRB`);

    res.status(200).json({
      success: true,
      message: 'Бронирование отменено. Даты освобождены.',
      bookingId: booking.id,
      booking,
      refund: {
        refundAmount: refundAmount,
        cashbackDeducted: cashbackDeducted,
        daysUntilCheckIn: daysUntilCheckIn,
      },
    });
  } catch (error) {
    console.error('❌ Error cancelling booking:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при отмене бронирования',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/bookings/:bookingId/status
 * Обновить статус бронирования
 */
app.patch('/api/bookings/:bookingId/status', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'PostgreSQL не подключена',
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Статус не предоставлен',
      });
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Недопустимый статус. Допустимые значения: ${validStatuses.join(', ')}`,
      });
    }

    // Получаем бронирование
    const booking = await Booking.findByPk(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Бронирование не найдено',
      });
    }

    // Обновляем статус
    booking.status = status;
    await booking.save();

    console.log(`✅ Статус бронирования #${bookingId} изменен на: ${status}`);

    res.status(200).json({
      success: true,
      message: `Статус бронирования обновлен на: ${status}`,
      bookingId: booking.id,
      booking,
    });
  } catch (error) {
    console.error('❌ Error updating booking status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении статуса бронирования',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/bookings/user/:userId
 * Получить все бронирования пользователя
 */
app.get('/api/bookings/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'PostgreSQL не подключена',
      });
    }

    const bookings = await Booking.findAll({
      where: { userId },
      attributes: [
        'id',
        'propertyId',
        'userId',
        'checkInDate',
        'checkOutDate',
        'guests',
        'notes',
        'saunaHours',
        'kitchenware',
        'totalPrice',
        'status',
        'createdAt',
        'updatedAt',
      ],
    });

    console.log('📊 Бронирования из БД:', bookings.map(b => ({
      id: b.id,
      saunaHours: b.saunaHours,
      kitchenware: b.kitchenware,
      totalPrice: b.totalPrice,
    })));

    res.status(200).json({
      success: true,
      userId,
      bookings,
      count: bookings.length,
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении бронирований пользователя',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ==================== Properties Routes ====================

/**
 * GET /api/properties
 * Получить все объекты
 */
app.get('/api/properties', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'PostgreSQL не подключена',
      });
    }

    const properties = await Property.findAll({
      where: { status: 'available' },
    });

    // Преобразуем имена изображений в полные URL
    const formattedProperties = properties.map(property => ({
      ...property.toJSON(),
      image: property.image ? `http://localhost:5002/assets/standart/${property.image}` : null,
    }));

    res.status(200).json({
      success: true,
      properties: formattedProperties,
      count: formattedProperties.length,
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении объектов',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/properties/:propertyId
 * Получить информацию об объекте
 */
app.get('/api/properties/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'PostgreSQL не подключена',
      });
    }

    const property = await Property.findByPk(propertyId);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Объект не найден',
      });
    }

    // Преобразуем имя изображения в полный URL
    const formattedProperty = {
      ...property.toJSON(),
      image: property.image ? `http://localhost:5002/assets/standart/${property.image}` : null,
    };

    res.status(200).json({
      success: true,
      property: formattedProperty,
    });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении объекта',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ==================== Loyalty Card Routes ====================

/**
 * GET /api/loyalty-card/:userId
 * Получить информацию о карте лояльности пользователя
 */
app.get('/api/loyalty-card/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId обязателен',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'PostgreSQL не подключена',
      });
    }

    let loyaltyCard = await LoyaltyCard.findOne({ where: { userId } });

    if (!loyaltyCard) {
      // Создаем карту если её нет
      loyaltyCard = await LoyaltyCard.create({
        userId,
        balance: 0,
        cashbackRate: 5,
        totalSpent: 0,
        totalEarned: 0,
        membershipLevel: 'Bronze',
      });
    }

    res.status(200).json({
      success: true,
      loyaltyCard: {
        userId: loyaltyCard.userId,
        balance: parseFloat(loyaltyCard.balance),
        cashbackRate: parseFloat(loyaltyCard.cashbackRate),
        totalSpent: parseFloat(loyaltyCard.totalSpent),
        totalEarned: parseFloat(loyaltyCard.totalEarned),
        membershipLevel: loyaltyCard.membershipLevel,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching loyalty card:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении карты лояльности',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/loyalty-card/:userId/top-up
 * Пополнить баланс карты лояльности
 */
app.post('/api/loyalty-card/:userId/top-up', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, paymentMethod } = req.body;

    // Валидация
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'userId и amount (> 0) обязательны',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'PostgreSQL не подключена',
      });
    }

    const topUpAmount = parseFloat(amount);

    // Получаем карту (создаем если нет)
    let loyaltyCard = await LoyaltyCard.findOne({ where: { userId } });
    if (!loyaltyCard) {
      loyaltyCard = await LoyaltyCard.create({
        userId,
        balance: 0,
        cashbackRate: 5,
        totalSpent: 0,
        totalEarned: 0,
        membershipLevel: 'Bronze',
      });
    }

    const oldBalance = parseFloat(loyaltyCard.balance);
    loyaltyCard.balance = parseFloat((oldBalance + topUpAmount).toFixed(2));
    await loyaltyCard.save();

    // Создаем запись о пополнении
    await Transaction.create({
      userId,
      type: 'credit',
      amount: topUpAmount,
      description: `Пополнение карты через ${paymentMethod || 'другой способ'}`,
      balanceBefore: oldBalance,
      balanceAfter: loyaltyCard.balance,
    });

    console.log(`✅ Карта пополнена на ${topUpAmount}₽ пользователем ${userId}`);
    console.log(`💳 Новый баланс: ${loyaltyCard.balance}₽`);

    // ==================== УВЕДОМЛЕНИЯ ====================
    try {
      // Получаем информацию о пользователе для уведомления
      const user = await User.findOne({ where: { userId } });
      const userName = user?.name || 'Пользователь';

      // Отправляем уведомление ПОЛЬЗОВАТЕЛЮ об успешном пополнении
      await Notification.create({
        userId: userId,
        title: '💳 Баланс пополнен',
        message: `Ваша карта лояльности пополнена на ${topUpAmount}₽. Новый баланс: ${loyaltyCard.balance}₽`,
        type: 'balance_replenishment',
        data: {
          amount: topUpAmount,
          newBalance: loyaltyCard.balance,
          oldBalance: oldBalance,
          paymentMethod: paymentMethod || 'другой способ',
        },
        read: false,
      });
      console.log(`📨 Уведомление о пополнении отправлено пользователю ${userId}`);

      // Отправляем уведомление АДМИНИСТРАТОРАМ об пополнении баланса
      const admins = await User.findAll({
        where: { role: 'admin' }
      });

      for (const admin of admins) {
        await Notification.create({
          userId: admin.userId,
          title: '💰 Пополнение баланса пользователем',
          message: `${userName} пополнил карту лояльности на ${topUpAmount}₽. Новый баланс: ${loyaltyCard.balance}₽. Способ: ${paymentMethod || 'другой способ'}`,
          type: 'user_balance_replenishment',
          data: {
            userId: userId,
            userName: userName,
            amount: topUpAmount,
            newBalance: loyaltyCard.balance,
            oldBalance: oldBalance,
            paymentMethod: paymentMethod || 'другой способ',
          },
          read: false,
        });
      }
      console.log(`📨 Уведомления о пополнении отправлены ${admins.length} администратору(ам)`);
    } catch (notificationError) {
      console.error('⚠️ Ошибка при отправке уведомлений:', notificationError.message);
      // Не прерываем процесс, если ошибка в отправке уведомления
    }

    res.status(200).json({
      success: true,
      message: `Карта пополнена на ${topUpAmount}₽`,
      loyaltyCard: {
        userId: loyaltyCard.userId,
        balance: loyaltyCard.balance,
        cashbackRate: parseFloat(loyaltyCard.cashbackRate),
        totalSpent: parseFloat(loyaltyCard.totalSpent),
        totalEarned: parseFloat(loyaltyCard.totalEarned),
      },
    });
  } catch (error) {
    console.error('❌ Error topping up loyalty card:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при пополнении карты',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/loyalty-card/:userId/transactions
 * Получить историю транзакций пользователя
 */
app.get('/api/loyalty-card/:userId/transactions', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'PostgreSQL не подключена',
      });
    }

    const transactions = await Transaction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const total = await Transaction.count({ where: { userId } });

    res.status(200).json({
      success: true,
      transactions,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении истории транзакций',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ==================== Authentication Routes ====================

// ==================== User Model ====================

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    index: true,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    index: true,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  displayName: DataTypes.STRING,
  avatar: DataTypes.STRING,
  phone: DataTypes.STRING,
  address: DataTypes.TEXT,
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user',
  },
  adminLevel: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    comment: 'null = обычный пользователь, 1 = админ с доступом к финансам, 2 = админ без доступа к финансам',
  },
  loyaltyPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  membershipLevel: {
    type: DataTypes.ENUM('Bronze', 'Silver', 'Gold', 'Platinum'),
    defaultValue: 'Bronze',
  },
}, {
  timestamps: false,
  tableName: 'users',
});

/**
 * POST /api/auth/register
 * Регистрация нового пользователя
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email и пароль обязательны',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    // Проверяем, существует ли пользователь
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email уже зарегистрирован',
      });
    }

    // Хешируем пароль
    const passwordHash = await bcryptjs.hash(password, 10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Создаём пользователя в БД
    const newUser = await User.create({
      userId,
      email,
      passwordHash,
      displayName: displayName || email.split('@')[0],
      role: 'user',
      membershipLevel: 'Bronze',
      loyaltyPoints: 0,
    });

    // Создаём карту лояльности
    await LoyaltyCard.create({
      userId: newUser.userId,
      balance: 0,
      cashbackRate: 5,
      totalSpent: 0,
      totalEarned: 0,
      membershipLevel: 'Bronze',
    });

    // Генерируем JWT токен
    const token = jwt.sign(
      { userId: newUser.userId, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const user = {
      id: newUser.userId,
      email: newUser.email,
      displayName: newUser.displayName,
      role: newUser.role,
      membershipLevel: newUser.membershipLevel,
      loyaltyPoints: newUser.loyaltyPoints,
    };

    console.log(`✅ Новый пользователь зарегистрирован: ${email}`);

    res.status(201).json({
      success: true,
      token,
      user,
      message: 'Пользователь успешно зарегистрирован',
    });
  } catch (error) {
    console.error('❌ Error in register:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при регистрации',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/auth/register-admin
 * Создание пользователя админом
 */
app.post('/api/auth/register-admin', async (req, res) => {
  try {
    const { email, password, displayName, phone, role = 'user', membershipLevel = 'Bronze' } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email и пароль обязательны',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        message: 'База данных не подключена',
      });
    }

    // Проверяем, существует ли пользователь
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email уже зарегистрирован',
      });
    }

    // Хешируем пароль
    const passwordHash = await bcryptjs.hash(password, 10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Создаём пользователя в БД
    const newUser = await User.create({
      userId,
      email,
      passwordHash,
      displayName: displayName || email.split('@')[0],
      phone: phone || null,
      role: role || 'user',
      membershipLevel: membershipLevel || 'Bronze',
      loyaltyPoints: 0,
    });

    // Создаём карту лояльности
    await LoyaltyCard.create({
      userId: newUser.userId,
      balance: 0,
      cashbackRate: 5,
      totalSpent: 0,
      totalEarned: 0,
      membershipLevel: membershipLevel || 'Bronze',
    });

    const user = {
      id: newUser.userId,
      name: newUser.displayName,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      level: newUser.membershipLevel?.toLowerCase() || 'bronze',
      loyaltyPoints: newUser.loyaltyPoints,
      status: 'offline',
      rating: 4.5,
      purchases: 0,
      cashback: 0,
      joinDate: 'сегодня',
    };

    console.log(`✅ Новый пользователь создан админом: ${email} (${role})`);

    res.status(201).json({
      success: true,
      user,
      message: 'Пользователь успешно создан',
    });
  } catch (error) {
    console.error('❌ Error in register-admin:', error.message);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании пользователя',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/auth/login
 * Вход пользователя
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email и пароль обязательны',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    // Ищем пользователя в БД
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Неверный email или пароль',
      });
    }

    // Проверяем пароль
    const passwordMatch = await bcryptjs.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Неверный email или пароль',
      });
    }

    // Генерируем JWT токен
    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userData = {
      id: user.userId,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      phone: user.phone,
      address: user.address,
      role: user.role,
      membershipLevel: user.membershipLevel,
      loyaltyPoints: user.loyaltyPoints,
    };

    console.log(`✅ Пользователь успешно вошел: ${email}`);

    // Отмечаем пользователя как онлайн
    markUserOnline(user.userId);

    res.status(200).json({
      success: true,
      token,
      user: userData,
      message: 'Вход успешен',
    });
  } catch (error) {
    console.error('❌ Error in login:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при входе',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/auth/heartbeat
 * Поддерживает онлайн статус пользователя
 */
app.post('/api/auth/heartbeat', (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId обязателен',
      });
    }

    // Обновляем timestamp последней активности
    markUserOnline(userId);

    res.status(200).json({
      success: true,
      message: 'Статус онлайн обновлен',
    });
  } catch (error) {
    console.error('❌ Error in heartbeat:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении статуса',
    });
  }
});

/**
 * POST /api/auth/logout
 * Выход пользователя
 */
app.post('/api/auth/logout', (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId обязателен',
      });
    }

    // Отмечаем пользователя как офлайн
    markUserOffline(userId);

    res.status(200).json({
      success: true,
      message: 'Выход успешен',
    });
  } catch (error) {
    console.error('❌ Error in logout:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при выходе',
    });
  }
});

/**
 * GET /api/users
 * Получить всех пользователей (для админа)
 */
app.get('/api/users', async (req, res) => {
  try {
    console.log('📡 GET /api/users запрос получен');
    
    if (!dbConnected) {
      console.warn('⚠️ База данных не подключена');
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    console.log('🔄 Получение всех пользователей из БД...');
    const users = await User.findAll({
      attributes: ['id', 'userId', 'email', 'displayName', 'phone', 'avatar', 'role', 'membershipLevel', 'loyaltyPoints'],
      order: [['id', 'DESC']],
    });

    console.log(`✅ Найдено пользователей: ${users.length}`);

    const formattedUsers = users.map(user => ({
      id: user.userId,
      name: user.displayName || user.email.split('@')[0],
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      level: user.membershipLevel?.toLowerCase() || 'bronze',
      loyaltyPoints: user.loyaltyPoints || 0,
      joinDate: user.createdAt ? user.createdAt.toLocaleDateString('ru-RU') : 'сегодня',
      status: isUserOnline(user.userId) ? 'online' : 'offline', // Проверяем по connectedUsers
      // Для админа не добавляем баланс, бронирования и кэшбек
      // Для обычных пользователей эти данные загружаются при открытии профиля
    }));

    console.log('📦 Отправка ответа...');
    res.json({
      success: true,
      users: formattedUsers,
      count: formattedUsers.length,
    });
  } catch (error) {
    console.error('❌ Ошибка при получении пользователей:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении пользователей',
      details: error.message,
    });
  }
});

/**
 * GET /api/users/:userId
 * Получить профиль пользователя
 */
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const user = await User.findOne({ where: { userId } });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден',
      });
    }

    // Получаем количество бронирований пользователя
    let bookingsCount = 0;
    let balance = 0;
    let cashback = 0;

    // Только обычные пользователи могут иметь баланс, бронирования и кэшбек
    if (user.role !== 'admin') {
      bookingsCount = await Booking.count({ where: { userId } });
      
      // Получаем баланс из LoyaltyCard таблицы
      const loyaltyCard = await LoyaltyCard.findOne({ where: { userId } });
      if (loyaltyCard) {
        balance = parseFloat(loyaltyCard.balance) || 0;
        cashback = parseFloat(loyaltyCard.cashback) || 0;
      }
    }

    // Получаем статус онлайн
    const isOnline = isUserOnline(userId);

    const userData = {
      id: user.userId,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      phone: user.phone,
      address: user.address,
      role: user.role,
      membershipLevel: user.membershipLevel,
      loyaltyPoints: user.loyaltyPoints,
      walletBalance: balance,
      balance: balance,
      totalBookings: bookingsCount,
      cashback: cashback,
      joinDate: user.createdAt ? user.createdAt.toLocaleDateString('ru-RU') : 'сегодня',
      status: isOnline ? 'online' : 'offline',
    };

    res.status(200).json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error('❌ Error fetching user:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении профиля',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/users/:userId
 * Обновить профиль пользователя
 */
app.patch('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    console.log(`📝 Попытка обновить пользователя ${userId}, данные:`, updates);

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const user = await User.findOne({ where: { userId } });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден',
      });
    }

    // Обновляем только разрешённые поля
    const allowedFields = ['displayName', 'avatar', 'phone', 'address', 'role', 'membershipLevel'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined && updates[field] !== null && updates[field] !== '') {
        let value = updates[field];
        
        // Нормализируем membershipLevel к правильному регистру (Bronze, Silver, Gold, Platinum)
        if (field === 'membershipLevel') {
          value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        }
        
        updateData[field] = value;
      }
    });

    console.log(`🔄 Обновляем поля:`, updateData);

    // Используем update вместо присваивания и save
    await user.update(updateData);

    const userData = {
      id: user.userId,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      phone: user.phone,
      address: user.address,
      role: user.role,
      membershipLevel: user.membershipLevel,
      loyaltyPoints: user.loyaltyPoints,
    };

    console.log(`✅ Профиль обновлён: ${userId}`);

    res.status(200).json({
      success: true,
      user: userData,
      message: 'Профиль успешно обновлён',
    });
  } catch (error) {
    console.error('❌ Error updating user:', error.message);
    console.error('❌ Full error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении профиля',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/users/:userId
 * Удалить пользователя (администратор)
 */
app.delete('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const user = await User.findOne({ where: { userId } });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден',
      });
    }

    // Удаляем все связанные данные пользователя
    // 1. Удаляем бронирования
    await Booking.destroy({ where: { userId } });
    
    // 2. Удаляем транзакции лояльности
    await Transaction.destroy({ where: { userId } });
    
    // 3. Удаляем уведомления
    await Notification.destroy({ where: { userId } });
    
    // 4. Удаляем самого пользователя
    await User.destroy({ where: { userId } });

    console.log(`✅ Пользователь удалён: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Пользователь успешно удалён',
      userId,
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении пользователя',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ==================== Events Routes ====================

/**
 * GET /api/events
 * Получить все события
 */
app.get('/api/events', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const events = await Event.findAll({
      order: [['startDate', 'ASC']],
    });

    res.status(200).json({
      success: true,
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        startDate: formatDateToDDMMYYYY(e.startDate),
        endDate: formatDateToDDMMYYYY(e.endDate),
        location: e.location,
        imageUrl: e.imageUrl,
        category: e.category,
        status: e.status,
        prize: e.prize,
        eventType: e.eventType,
        allowedUsers: e.allowedUsers,
        participants: e.participants,
        participantIds: e.participantIds,
      })),
    });
  } catch (error) {
    console.error('❌ Error fetching events:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении событий',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/events/:eventId
 * Получить событие по ID
 */
app.get('/api/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Событие не найдено',
      });
    }

    res.status(200).json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        startDate: formatDateToDDMMYYYY(event.startDate),
        endDate: formatDateToDDMMYYYY(event.endDate),
        location: event.location,
        imageUrl: event.imageUrl,
        category: event.category,
        status: event.status,
        prize: event.prize,
        eventType: event.eventType,
        allowedUsers: event.allowedUsers,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching event:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении события',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/events
 * Создать новое событие
 */
app.post('/api/events', async (req, res) => {
  try {
    const { title, description, prize, startDate, endDate, allowedUsers, status, eventType } = req.body;

    console.log('📥 POST /api/events: получены данные:', { title, prize, startDate, endDate, allowedUsers, status, eventType });

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Название события обязательно',
      });
    }

    // Функция для преобразования даты из формата DD.MM.YYYY
    const parseDate = (dateString) => {
      if (!dateString) return null;
      if (typeof dateString === 'string' && dateString.includes('.')) {
        const [day, month, year] = dateString.split('.');
        return new Date(year, month - 1, day);
      }
      return new Date(dateString);
    };

    // Преобразуем startDate из формата DD.MM.YYYY если нужно
    let parsedStartDate = null;
    if (startDate) {
      parsedStartDate = parseDate(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        parsedStartDate = null;
      }
    }

    // Преобразуем endDate из формата DD.MM.YYYY если нужно
    let parsedEndDate = null;
    if (endDate) {
      parsedEndDate = parseDate(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        parsedEndDate = null;
      }
    }

    const event = await Event.create({
      title,
      description: description || '',
      prize: prize || '',
      startDate: parsedStartDate || new Date(), // Используем переданную дату или текущую
      endDate: parsedEndDate, // Преобразованная дата или null
      allowedUsers: allowedUsers || 'all',
      status: status || 'active',
      eventType: eventType || 'cashback', // Используем cashback как default, не auction
    });

    console.log(`✅ Событие создано: ${event.id}`);
    console.log(`✅ Данные в БД: prize="${event.prize}", eventType="${event.eventType}"`);

    res.status(201).json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        prize: event.prize,
        startDate: formatDateToDDMMYYYY(event.startDate),
        endDate: formatDateToDDMMYYYY(event.endDate),
        allowedUsers: event.allowedUsers,
        status: event.status,
        eventType: event.eventType,
      },
    });
  } catch (error) {
    console.error('❌ Error creating event:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании события',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * PUT /api/events/:eventId
 * Обновить событие
 */
app.put('/api/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { title, description, prize, startDate, endDate, allowedUsers, status, eventType, participantIds, participants } = req.body;

    console.log('📥 PUT /api/events/:eventId - получены данные для обновления:', { eventId, title, prize, startDate, endDate, allowedUsers, status, eventType, participantIds, participants });

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    // Игнорируем локальные ID (которые начинаются с 'local_')
    if (eventId.startsWith('local_')) {
      console.log(`⚠️ Локальное событие обновлено на клиенте: ${eventId}`);
      return res.status(200).json({
        success: true,
        message: 'Локальное событие успешно обновлено',
      });
    }

    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Событие не найдено',
      });
    }

    // Функция для преобразования даты из формата DD.MM.YYYY
    const parseDate = (dateString) => {
      if (!dateString) return null;
      if (typeof dateString === 'string' && dateString.includes('.')) {
        const [day, month, year] = dateString.split('.');
        return new Date(year, month - 1, day);
      }
      return new Date(dateString);
    };

    // Обновляем только переданные поля
    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (prize !== undefined) event.prize = prize;
    if (startDate !== undefined && startDate) {
      const parsedDate = parseDate(startDate);
      if (!isNaN(parsedDate.getTime())) {
        event.startDate = parsedDate;
      }
    }
    if (endDate !== undefined) {
      if (endDate) {
        const parsedDate = parseDate(endDate);
        event.endDate = isNaN(parsedDate.getTime()) ? null : parsedDate;
      } else {
        event.endDate = null;
      }
    }
    if (allowedUsers !== undefined) event.allowedUsers = allowedUsers;
    if (status !== undefined) event.status = status;
    if (eventType !== undefined) event.eventType = eventType;
    if (participantIds !== undefined) event.participantIds = Array.isArray(participantIds) ? participantIds : [];
    if (participants !== undefined) event.participants = participants;

    await event.save();

    console.log(`✅ Событие обновлено: ${eventId}`);
    console.log(`✅ Данные в БД после обновления: prize="${event.prize}", eventType="${event.eventType}", participantIds=${JSON.stringify(event.participantIds)}`);

    res.status(200).json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        prize: event.prize,
        startDate: formatDateToDDMMYYYY(event.startDate),
        endDate: formatDateToDDMMYYYY(event.endDate),
        allowedUsers: event.allowedUsers,
        status: event.status,
        eventType: event.eventType,
        participantIds: event.participantIds,
        participants: event.participants,
      },
    });
  } catch (error) {
    console.error('❌ Error updating event:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении события',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/events/:eventId
 * Удалить событие
 */
app.delete('/api/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    // Игнорируем локальные ID (которые начинаются с 'local_')
    if (eventId.startsWith('local_')) {
      console.log(`⚠️ Локальное событие удалено на клиенте: ${eventId}`);
      return res.status(200).json({
        success: true,
        message: 'Локальное событие успешно удалено',
      });
    }

    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Событие не найдено',
      });
    }

    await event.destroy();

    console.log(`✅ Событие удалено: ${eventId}`);

    res.status(200).json({
      success: true,
      message: 'Событие успешно удалено',
    });
  } catch (error) {
    console.error('❌ Error deleting event:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении события',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/events/:eventId/join
 * Добавить пользователя участником события
 */
app.post('/api/events/:eventId/join', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.body;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    if (!eventId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Требуются eventId и userId',
      });
    }

    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Событие не найдено',
      });
    }

    // Инициализируем participantIds если он пустой
    let participantIds = Array.isArray(event.participantIds) ? event.participantIds : [];
    
    // Проверяем, уже ли участвует пользователь
    if (participantIds.includes(userId)) {
      return res.status(409).json({
        success: false,
        error: 'Вы уже участвуете в этом событии',
        alreadyJoined: true,
        event: {
          id: event.id,
          title: event.title,
          description: event.description,
          startDate: formatDateToDDMMYYYY(event.startDate),
          endDate: formatDateToDDMMYYYY(event.endDate),
          status: event.status,
          prize: event.prize,
          eventType: event.eventType,
          participants: event.participants,
          participantIds: event.participantIds,
        },
      });
    }

    // Добавляем пользователя в список участников
    participantIds.push(userId);
    event.participantIds = participantIds;
    
    // Увеличиваем количество участников
    event.participants = participantIds.length;
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Пользователь успешно добавлен в участники',
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        startDate: formatDateToDDMMYYYY(event.startDate),
        endDate: formatDateToDDMMYYYY(event.endDate),
        status: event.status,
        prize: event.prize,
        eventType: event.eventType,
        participants: event.participants,
        participantIds: event.participantIds,
      },
    });
  } catch (error) {
    console.error('❌ Error joining event:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при добавлении участника',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ==================== Notifications Routes ====================

/**
 * GET /api/notifications/:userId
 * Получить уведомления пользователя
 */
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const notifications = await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
    });

    console.log('📨 GET /api/notifications/:userId - Найдено уведомлений:', notifications.length, 'Типы:', notifications.map(n => ({ id: n.id, type: n.type, title: n.title })));

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении уведомлений',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/notifications/:userId
 * Создать уведомление
 */
app.post('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, message, type, actionUrl } = req.body;

    console.log('📨 POST /api/notifications/:userId - Получено:', { userId, title, message, type, actionUrl });

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const notification = await Notification.create({
      userId,
      title,
      message,
      type: type || 'system',
      data: req.body.data || {},
      actionUrl,
      read: false,
    });

    console.log('✅ Уведомление создано с типом:', notification.type);

    res.status(201).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('❌ Error creating notification:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании уведомления',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/notifications/:userId/:notificationId
 * Отметить уведомление как прочитанное
 */
app.patch('/api/notifications/:userId/:notificationId', async (req, res) => {
  try {
    const { userId, notificationId } = req.params;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const notification = await Notification.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Уведомление не найдено',
      });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('❌ Error updating notification:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении уведомления',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * ==================== REVIEWS ====================
 */

/**
 * POST /api/reviews
 * Создать новый отзыв
 */
app.post('/api/reviews', async (req, res) => {
  try {
    const { propertyId, userId, userName, rating, title, text } = req.body;

    if (!propertyId || !userId || !rating || !text) {
      return res.status(400).json({
        success: false,
        error: 'propertyId, userId, rating и text обязательны',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    // Создаём отзыв
    const review = await Review.create({
      propertyId,
      userId,
      userName: userName || 'Аноним',
      rating: parseInt(rating),
      title: title || '',
      text,
      approved: false,
    });

    console.log(`✅ Отзыв создан: ${review.id} для объекта ${propertyId}`);

    // Отправляем уведомление администраторам
    try {
      const admins = await User.findAll({
        where: { role: 'admin' }
      });

      const user = await User.findOne({ where: { userId } });
      
      for (const admin of admins) {
        await Notification.create({
          userId: admin.userId,
          title: '⭐ Новый отзыв',
          message: `${userName || user?.displayName || 'Пользователь'} оставил ${rating}-звездочный отзыв на объект. Ожидает модерации.`,
          type: 'newReview',
          data: {
            reviewId: review.id,
            propertyId,
            userId,
            userName: userName || user?.displayName,
            rating,
            text,
            title,
          },
          read: false,
        });
      }
      console.log(`📨 Уведомления об отзыве отправлены администраторам`);
    } catch (notifyError) {
      console.error('⚠️ Ошибка при отправке уведомления:', notifyError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Отзыв создан и отправлен на модерацию',
      review,
    });
  } catch (error) {
    console.error('❌ Error creating review:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании отзыва',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/reviews/property/:propertyId
 * Получить все отзывы объекта
 */
app.get('/api/reviews/property/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { filter } = req.query; // 'approved', 'pending', 'all'

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    let reviews = await Review.findAll({
      where: { propertyId },
      order: [['createdAt', 'DESC']],
    });

    // Фильтруем если нужно
    if (filter === 'approved') {
      reviews = reviews.filter(r => r.approved === true);
    } else if (filter === 'pending') {
      reviews = reviews.filter(r => r.approved === false);
    }

    // Считаем статистику
    const stats = {
      total: reviews.length,
      approved: reviews.filter(r => r.approved).length,
      average: reviews.length > 0 
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : 0,
      distribution: {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length,
      }
    };

    res.status(200).json({
      success: true,
      reviews,
      stats,
    });
  } catch (error) {
    console.error('❌ Error fetching reviews:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при загрузке отзывов',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * PUT /api/reviews/:reviewId
 * Обновить отзыв (только владелец или админ)
 */
app.put('/api/reviews/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId, rating, title, text } = req.body;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const review = await Review.findByPk(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Отзыв не найден',
      });
    }

    if (review.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Вы не можете редактировать чужой отзыв',
      });
    }

    // Обновляем
    await review.update({
      rating: parseInt(rating) || review.rating,
      title: title !== undefined ? title : review.title,
      text: text || review.text,
      updatedAt: new Date(),
    });

    console.log(`✅ Отзыв ${reviewId} обновлён`);

    res.status(200).json({
      success: true,
      message: 'Отзыв обновлён',
      review,
    });
  } catch (error) {
    console.error('❌ Error updating review:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении отзыва',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/reviews/:reviewId
 * Удалить отзыв
 */
app.delete('/api/reviews/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId } = req.body;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const review = await Review.findByPk(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Отзыв не найден',
      });
    }

    if (review.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Вы не можете удалить чужой отзыв',
      });
    }

    await review.destroy();
    console.log(`✅ Отзыв ${reviewId} удалён`);

    res.status(200).json({
      success: true,
      message: 'Отзыв удалён',
    });
  } catch (error) {
    console.error('❌ Error deleting review:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении отзыва',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * ==================== REFERRALS ====================
 */

/**
 * POST /api/referrals/generate
 * Генерировать реферальный код для пользователя
 */
app.post('/api/referrals/generate', async (req, res) => {
  try {
    const { userId, userName } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId обязателен',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    // Проверяем есть ли уже код
    const existing = await Referral.findOne({ where: { referrerId: userId } });
    if (existing) {
      return res.status(200).json({
        success: true,
        referral: existing,
        message: 'Реферальный код уже существует',
      });
    }

    // Генерируем уникальный код
    const referralCode = `REF_${userId.substring(0, 4)}_${Date.now().toString(36).toUpperCase()}`;

    const referral = await Referral.create({
      referralCode,
      referrerId: userId,
      referrerName: userName || 'Пользователь',
      status: 'pending',
    });

    console.log(`✅ Реферальный код создан: ${referralCode}`);

    res.status(201).json({
      success: true,
      message: 'Реферальный код создан',
      referral,
    });
  } catch (error) {
    console.error('❌ Error generating referral code:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании кода',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/referrals/apply
 * Применить реферальный код при регистрации
 */
app.post('/api/referrals/apply', async (req, res) => {
  try {
    const { referralCode, newUserId, newUserEmail } = req.body;

    if (!referralCode || !newUserId) {
      return res.status(400).json({
        success: false,
        error: 'referralCode и newUserId обязательны',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    // Ищем реферальный код
    const referral = await Referral.findOne({ where: { referralCode } });
    if (!referral) {
      return res.status(404).json({
        success: false,
        error: 'Реферальный код не найден',
      });
    }

    if (referral.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Реферальный код уже использован или истёк',
      });
    }

    // Обновляем статус реферала
    const bonus = 500; // Размер бонуса
    await referral.update({
      referredUserId: newUserId,
      referredEmail: newUserEmail,
      status: 'completed',
      bonus,
      completedAt: new Date(),
    });

    // Добавляем бонус реферреру на карту лояльности
    const referrerCard = await LoyaltyCard.findOne({ where: { userId: referral.referrerId } });
    if (referrerCard) {
      referrerCard.balance = parseFloat((parseFloat(referrerCard.balance) + bonus).toFixed(2));
      referrerCard.totalEarned = parseFloat((parseFloat(referrerCard.totalEarned) + bonus).toFixed(2));
      await referrerCard.save();

      // Создаём транзакцию
      await Transaction.create({
        userId: referral.referrerId,
        type: 'credit',
        amount: bonus,
        description: `Реферальный бонус за привлечение ${newUserEmail}`,
        balanceBefore: parseFloat(referrerCard.balance) - bonus,
        balanceAfter: referrerCard.balance,
      });
    }

    // Отправляем уведомление реферреру
    try {
      await Notification.create({
        userId: referral.referrerId,
        title: '🎉 Реферальный бонус',
        message: `Пользователь ${newUserEmail} зарегистрировался по вашему коду! Вы получили бонус ${bonus} PRB`,
        type: 'referralBonus',
        data: {
          referralId: referral.id,
          referredEmail: newUserEmail,
          bonus,
        },
        read: false,
      });

      console.log(`📨 Уведомление о реферальном бонусе отправлено ${referral.referrerId}`);
    } catch (notifyError) {
      console.error('⚠️ Ошибка при отправке уведомления:', notifyError.message);
    }

    console.log(`✅ Реферальный код применен: ${newUserId} -> ${referral.referrerId}, бонус: ${bonus}`);

    res.status(200).json({
      success: true,
      message: 'Реферальный код успешно применен',
      referral,
      bonus,
    });
  } catch (error) {
    console.error('❌ Error applying referral code:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при применении кода',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/referrals/user/:userId
 * Получить реферальную информацию пользователя
 */
app.get('/api/referrals/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const referral = await Referral.findOne({ where: { referrerId: userId } });
    
    // Если реферала нет, возвращаем пустой результат вместо ошибки
    if (!referral) {
      return res.status(200).json({
        success: true,
        referral: null,
        stats: {
          total: 0,
          completed: 0,
          totalBonus: 0,
        },
      });
    }

    // Считаем статистику
    const stats = {
      total: 1,
      completed: referral.status === 'completed' ? 1 : 0,
      totalBonus: referral.status === 'completed' ? referral.bonus : 0,
    };

    res.status(200).json({
      success: true,
      referral,
      stats,
    });
  } catch (error) {
    console.error('❌ Error fetching referral:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при загрузке реферальной информации',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/notifications/:userId/:notificationId
 * Удалить конкретное уведомление пользователя
 */
app.delete('/api/notifications/:userId/:notificationId', async (req, res) => {
  try {
    const { userId, notificationId } = req.params;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const notification = await Notification.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Уведомление не найдено',
      });
    }

    await notification.destroy();

    res.status(200).json({
      success: true,
      message: 'Уведомление удалено',
    });
  } catch (error) {
    console.error('❌ Error deleting notification:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении уведомления',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/notifications/:userId
 * Удалить все уведомления пользователя
 */
app.delete('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const deleted = await Notification.destroy({
      where: { userId },
    });

    res.status(200).json({
      success: true,
      message: `Удалено ${deleted} уведомлений`,
      count: deleted,
    });
  } catch (error) {
    console.error('❌ Error clearing notifications:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении уведомлений',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ==================== PAYMENT SYSTEM - Card Top Up ====================

/**
 * POST /api/card/topup
 * Пополнить баланс карты лояльности
 */
app.post('/api/card/topup', async (req, res) => {
  try {
    const { userId, amount, paymentMethod } = req.body;

    if (!userId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'userId, amount и paymentMethod обязательны',
      });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Сумма должна быть больше 0',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    // Генерируем уникальный ID транзакции
    const transactionId = `TOPUP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Создаём запись пополнения
    const topup = await CardTopUp.create({
      userId,
      amount: parseFloat(amount),
      paymentMethod,
      status: 'pending',
      transactionId,
      description: `Пополнение карты через ${paymentMethod}`,
    });

    // В реальном приложении здесь проходила бы интеграция с платёжной системой
    // Для демонстрации сразу переводим в completed
    await topup.update({ status: 'completed' });

    // Обновляем баланс карты лояльности
    let loyaltyCard = await LoyaltyCard.findOne({ where: { userId } });

    if (!loyaltyCard) {
      loyaltyCard = await LoyaltyCard.create({
        userId,
        balance: parseFloat(amount),
        totalSpent: 0,
        totalEarned: 0,
      });
    } else {
      loyaltyCard.balance = parseFloat((parseFloat(loyaltyCard.balance) + parseFloat(amount)).toFixed(2));
      await loyaltyCard.save();
    }

    // Создаём транзакцию в истории
    await Transaction.create({
      userId,
      type: 'credit',
      amount: parseFloat(amount),
      description: `Пополнение карты через ${paymentMethod}`,
      balanceBefore: parseFloat(loyaltyCard.balance) - parseFloat(amount),
      balanceAfter: loyaltyCard.balance,
    });

    console.log(`💳 Пополнение карты: ${userId}, сумма: ${amount}₽, метод: ${paymentMethod}`);

    res.status(201).json({
      success: true,
      message: 'Баланс карты успешно пополнен',
      topup,
      newBalance: loyaltyCard.balance,
      transactionId,
    });
  } catch (error) {
    console.error('❌ Error in card topup:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при пополнении баланса',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/card/balance/:userId
 * Получить баланс карты лояльности пользователя
 */
app.get('/api/card/balance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId обязателен',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const loyaltyCard = await LoyaltyCard.findOne({ where: { userId } });

    if (!loyaltyCard) {
      return res.status(404).json({
        success: false,
        error: 'Карта лояльности не найдена',
      });
    }

    res.status(200).json({
      success: true,
      balance: parseFloat(loyaltyCard.balance),
      totalSpent: parseFloat(loyaltyCard.totalSpent),
      totalEarned: parseFloat(loyaltyCard.totalEarned),
      membershipLevel: loyaltyCard.membershipLevel,
      cashbackRate: parseFloat(loyaltyCard.cashbackRate),
    });
  } catch (error) {
    console.error('❌ Error fetching card balance:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении баланса',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/card/transactions/:userId
 * Получить историю транзакций пользователя
 */
app.get('/api/card/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId обязателен',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const transactions = await Transaction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const total = await Transaction.count({ where: { userId } });

    res.status(200).json({
      success: true,
      transactions,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении истории транзакций',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/card/topups/:userId
 * Получить историю пополнений карты
 */
app.get('/api/card/topups/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId обязателен',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const topups = await CardTopUp.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const total = await CardTopUp.count({ where: { userId } });

    res.status(200).json({
      success: true,
      topups,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('❌ Error fetching topups:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении истории пополнений',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ==================== PAYMENT SYSTEM - Booking Payments ====================

/**
 * POST /api/bookings/:bookingId/pay-from-card
 * Оплатить бронирование с карты лояльности
 */
app.post('/api/bookings/:bookingId/pay-from-card', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.body;

    if (!bookingId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'bookingId и userId обязательны',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    // Получаем бронирование
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Бронирование не найдено',
      });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Вы не можете оплатить чужое бронирование',
      });
    }

    const bookingAmount = parseFloat(booking.totalPrice);

    // Проверяем баланс карты
    const loyaltyCard = await LoyaltyCard.findOne({ where: { userId } });
    if (!loyaltyCard) {
      return res.status(404).json({
        success: false,
        error: 'Карта лояльности не найдена',
      });
    }

    const currentBalance = parseFloat(loyaltyCard.balance);
    if (currentBalance < bookingAmount) {
      return res.status(400).json({
        success: false,
        error: 'Недостаточно средств на карте',
        requiredAmount: bookingAmount,
        availableBalance: currentBalance,
        deficit: bookingAmount - currentBalance,
      });
    }

    // Создаём платёж
    const payment = await Payment.create({
      userId,
      bookingId: booking.id,
      amount: bookingAmount,
      currency: 'RUB',
      paymentMethod: 'loyalty_card',
      status: 'completed',
    });

    // Списываем со счёта карты лояльности
    loyaltyCard.balance = parseFloat((currentBalance - bookingAmount).toFixed(2));
    loyaltyCard.totalSpent = parseFloat((parseFloat(loyaltyCard.totalSpent) + bookingAmount).toFixed(2));
    await loyaltyCard.save();

    // Создаём транзакцию
    await Transaction.create({
      userId,
      bookingId: booking.id,
      paymentId: payment.id,
      type: 'debit',
      amount: bookingAmount,
      description: `Оплата бронирования #${booking.id} с карты лояльности`,
      balanceBefore: currentBalance,
      balanceAfter: loyaltyCard.balance,
    });

    // Обновляем статус бронирования на confirmed
    booking.status = 'confirmed';
    await booking.save();

    // Получаем финансового администратора и добавляем ему деньги
    const financeAdmin = await User.findOne({ where: { role: 'admin', adminLevel: 1 } });
    if (financeAdmin) {
      const adminWallet = await AdminWallet.findOne({ where: { adminId: financeAdmin.userId } });
      if (adminWallet) {
        adminWallet.totalBalance = parseFloat((parseFloat(adminWallet.totalBalance) + bookingAmount).toFixed(2));
        adminWallet.availableBalance = parseFloat((parseFloat(adminWallet.availableBalance) + bookingAmount).toFixed(2));
        adminWallet.totalReceived = parseFloat((parseFloat(adminWallet.totalReceived) + bookingAmount).toFixed(2));
        await adminWallet.save();

        // Создаём транзакцию администратора
        await AdminTransaction.create({
          adminId: financeAdmin.userId,
          adminLevel: 1,
          type: 'booking_payment',
          amount: bookingAmount,
          bookingId: booking.id,
          paymentId: payment.id,
          description: `Платёж за бронирование #${booking.id} (пользователь: ${userId})`,
          balanceBefore: parseFloat(adminWallet.totalBalance) - bookingAmount,
          balanceAfter: adminWallet.totalBalance,
        });
      }
    }

    // Отправляем уведомление пользователю
    try {
      await Notification.create({
        userId,
        title: '✅ Платёж принят',
        message: `Ваше бронирование #${booking.id} успешно оплачено. Сумма: ${bookingAmount}₽`,
        type: 'payment',
        data: { bookingId: booking.id, paymentId: payment.id, amount: bookingAmount },
        read: false,
      });
    } catch (notifyError) {
      console.error('⚠️ Ошибка при отправке уведомления:', notifyError.message);
    }

    // Отправляем уведомление администратору
    try {
      if (financeAdmin) {
        await Notification.create({
          userId: financeAdmin.userId,
          title: '💰 Новый платёж',
          message: `Получен платёж ${bookingAmount}₽ за бронирование #${booking.id}`,
          type: 'admin_payment',
          data: { bookingId: booking.id, paymentId: payment.id, amount: bookingAmount },
          read: false,
        });
      }
    } catch (notifyError) {
      console.error('⚠️ Ошибка при отправке уведомления администратору:', notifyError.message);
    }

    console.log(`💳 Платёж с карты лояльности: бронирование #${bookingId}, сумма: ${bookingAmount}₽`);

    res.status(201).json({
      success: true,
      message: 'Платёж успешно выполнен',
      payment,
      booking: {
        id: booking.id,
        status: booking.status,
      },
      newBalance: loyaltyCard.balance,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error('❌ Error paying from card:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при оплате с карты',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/bookings/:bookingId/payment-status
 * Получить статус платежа по бронированию
 */
app.get('/api/bookings/:bookingId/payment-status', async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: 'bookingId обязателен',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Бронирование не найдено',
      });
    }

    const payment = await Payment.findOne({
      where: { bookingId: booking.id },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      bookingId: booking.id,
      bookingStatus: booking.status,
      payment: payment || null,
      isPaid: booking.status === 'confirmed' || booking.status === 'completed',
    });
  } catch (error) {
    console.error('❌ Error fetching payment status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении статуса платежа',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ==================== ADMIN FINANCE SYSTEM ====================

/**
 * GET /api/admin/finances/summary
 * Получить финансовую сводку администратора
 */
app.get('/api/admin/finances/summary', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId обязателен',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    // Проверяем, что это администратор с финансовым доступом
    const user = await User.findOne({ where: { userId } });
    if (!user || user.role !== 'admin' || user.adminLevel !== 1) {
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещен. Только администратор с финансовым доступом может просматривать финансы',
      });
    }

    const adminWallet = await AdminWallet.findOne({ where: { adminId: userId } });
    if (!adminWallet) {
      return res.status(404).json({
        success: false,
        error: 'Кошелек администратора не найден',
      });
    }

    // Считаем количество платежей и другую статистику
    const totalPayments = await Payment.count({
      where: { status: 'completed' },
    });

    const totalAmount = await Payment.sum('amount', {
      where: { status: 'completed' },
    });

    const todayPayments = await Payment.findAll({
      where: {
        status: 'completed',
        createdAt: {
          [sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    const todayAmount = todayPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    res.status(200).json({
      success: true,
      admin: {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        adminLevel: user.adminLevel,
      },
      wallet: {
        totalBalance: parseFloat(adminWallet.totalBalance),
        availableBalance: parseFloat(adminWallet.availableBalance),
        pendingBalance: parseFloat(adminWallet.pendingBalance),
        totalReceived: parseFloat(adminWallet.totalReceived),
        totalWithdrawn: parseFloat(adminWallet.totalWithdrawn),
      },
      statistics: {
        totalPayments,
        totalAmount: parseFloat(totalAmount || 0),
        todayPayments: todayPayments.length,
        todayAmount: todayAmount,
        averagePayment: totalPayments > 0 ? (parseFloat(totalAmount || 0) / totalPayments).toFixed(2) : 0,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching admin finances:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении финансовой сводки',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/admin/finances/transactions
 * Получить список финансовых транзакций администратора
 */
app.get('/api/admin/finances/transactions', async (req, res) => {
  try {
    const { userId, limit = 100, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId обязателен',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    // Проверяем права администратора
    const user = await User.findOne({ where: { userId } });
    if (!user || user.role !== 'admin' || user.adminLevel !== 1) {
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещен',
      });
    }

    const transactions = await AdminTransaction.findAll({
      where: { adminId: userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const total = await AdminTransaction.count({ where: { adminId: userId } });

    res.status(200).json({
      success: true,
      transactions,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('❌ Error fetching admin transactions:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении транзакций',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/admin/finances/withdrawal
 * Запросить вывод денег администратором
 */
app.post('/api/admin/finances/withdrawal', async (req, res) => {
  try {
    const { userId, amount, bankAccount, reason } = req.body;

    if (!userId || !amount || !bankAccount) {
      return res.status(400).json({
        success: false,
        error: 'userId, amount и bankAccount обязательны',
      });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Сумма должна быть больше 0',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    // Проверяем права администратора
    const user = await User.findOne({ where: { userId } });
    if (!user || user.role !== 'admin' || user.adminLevel !== 1) {
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещен',
      });
    }

    // Проверяем баланс
    const adminWallet = await AdminWallet.findOne({ where: { adminId: userId } });
    if (!adminWallet) {
      return res.status(404).json({
        success: false,
        error: 'Кошелек администратора не найден',
      });
    }

    const withdrawAmount = parseFloat(amount);
    const availableBalance = parseFloat(adminWallet.availableBalance);

    if (availableBalance < withdrawAmount) {
      return res.status(400).json({
        success: false,
        error: 'Недостаточно средств',
        availableBalance,
        requestedAmount: withdrawAmount,
      });
    }

    // Создаём запрос на вывод
    const withdrawalRequest = await WithdrawalRequest.create({
      adminId: userId,
      adminLevel: user.adminLevel,
      amount: withdrawAmount,
      bankAccount,
      status: 'pending',
      reason: reason || 'Запрос на вывод средств',
    });

    // Обновляем баланс (переводим в pending)
    adminWallet.availableBalance = parseFloat((availableBalance - withdrawAmount).toFixed(2));
    adminWallet.pendingBalance = parseFloat((parseFloat(adminWallet.pendingBalance) + withdrawAmount).toFixed(2));
    await adminWallet.save();

    console.log(`💸 Запрос на вывод: администратор ${userId}, сумма ${withdrawAmount}₽`);

    res.status(201).json({
      success: true,
      message: 'Запрос на вывод создан',
      withdrawalRequest,
      updatedWallet: {
        availableBalance: adminWallet.availableBalance,
        pendingBalance: adminWallet.pendingBalance,
      },
    });
  } catch (error) {
    console.error('❌ Error creating withdrawal request:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании запроса на вывод',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/admin/finances/withdrawals
 * Получить список запросов на вывод
 */
app.get('/api/admin/finances/withdrawals', async (req, res) => {
  try {
    const { userId, status, limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId обязателен',
      });
    }

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'База данных не подключена',
      });
    }

    // Проверяем права администратора
    const user = await User.findOne({ where: { userId } });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещен',
      });
    }

    const where = { adminId: userId };
    if (status) {
      where.status = status;
    }

    const withdrawals = await WithdrawalRequest.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const total = await WithdrawalRequest.count({ where });

    res.status(200).json({
      success: true,
      withdrawals,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('❌ Error fetching withdrawals:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении запросов на вывод',
      details: NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ==================== Error Handlers ====================

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера',
    details: NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ==================== Start Server ====================

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Loyalty App Backend Server запущен!`);
      console.log(`📝 Port: ${PORT}`);
      console.log(`🔧 Environment: ${NODE_ENV}`);
      console.log(`🗄️  Database: PostgreSQL (loyalty_app)`);
      console.log(`\n🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`\n📚 API Эндпоинты:`);
      console.log(`   GET  /api/bookings/property/:propertyId/booked-dates`);
      console.log(`   POST /api/bookings`);
      console.log(`   GET  /api/bookings/:bookingId`);
      console.log(`   GET  /api/bookings/user/:userId`);
      console.log(`   GET  /api/properties`);
      console.log(`   GET  /api/properties/:propertyId\n`);
    });

    // Обработчик ошибок сервера
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
    });
  } catch (error) {
    console.error('❌ Ошибка при запуске сервера:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
