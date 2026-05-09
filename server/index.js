/**
 * Loyalty App Backend Server
 * Express.js + PostgreSQL + Sequelize
 */

// Sentry должен инициализироваться первым — до любых других require
const Sentry = require('./monitoring');

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const logger = require('./logger');
const { sequelize } = require('./db');
const { User, Booking, Property, LoyaltyCard, AdminWallet } = require('./models');
const { verifyToken } = require('./middleware/auth');
const { validate, schemas } = require('./validation');

const app = express();
const PORT = process.env.PORT || 5002;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_URL = process.env.DATABASE_URL;

const JWT_SECRET = process.env.JWT_SECRET || 'development-only-jwt-secret-change-me';

if (NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    logger.error('FATAL: JWT_SECRET must be set and at least 32 characters in production');
    process.exit(1);
  }
  if (process.env.ALLOW_DEMO_PAYMENTS === 'true') {
    logger.error('FATAL: ALLOW_DEMO_PAYMENTS cannot be true in production');
    process.exit(1);
  }
} else {
  if (!process.env.JWT_SECRET) {
    logger.warn('JWT_SECRET not set, using temporary value for development only');
  }
}

if (!DATABASE_URL && NODE_ENV === 'production') {
  throw new Error('DATABASE_URL environment variable is required in production');
}

// Security middleware (helmet, HPP, XSS sanitizer, rate-limit guards, etc.)
// Must be registered BEFORE CORS and bodyParser so bodySizeGuard, pathTraversalGuard
// and timeoutMiddleware run as early as possible.
const applySecurityMiddleware = require('./middleware/security');
applySecurityMiddleware(app);

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5002,http://localhost:8081,http://localhost:19006,http://localhost:19000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowedLocalDevOrigin = NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (corsOrigins.includes(origin) || isAllowedLocalDevOrigin) {
      return callback(null, origin);
    }
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Explicit size limits prevent bodyParser from reading beyond 1 MB before our
// bodySizeGuard header check already rejected oversized requests upstream.
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ limit: '1mb', extended: true }));
// XSS sanitizer runs after bodyParser so req.body is populated
app.use(applySecurityMiddleware.xssSanitizer);

// Request logging — метод, путь, статус, время ответа
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]('http', {
      method: req.method,
      path:   req.path,
      status: res.statusCode,
      ms,
      userId: req.userId || undefined,
    });
  });
  next();
});

// /api/v1/* → /api/* rewrite для обратной совместимости
app.use((req, res, next) => {
  if (req.url.startsWith('/api/v1/')) {
    req.url = '/api/' + req.url.slice('/api/v1/'.length);
  } else if (req.url === '/api/v1') {
    req.url = '/api';
  }
  next();
});

// ==================== Security & Rate Limiting ====================
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === 'production' ? 300 : 3000,
  keyGenerator: (req) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded?.userId) return `user:${decoded.userId}`;
      }
    } catch {}
    return req.ip;
  },
  message: 'Слишком много запросов, пожалуйста попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Слишком много попыток входа, пожалуйста попробуйте позже.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

// Плавное замедление перед жёстким rate limit:
// каждая неудачная попытка после первых двух добавляет 500мс задержки ответа.
const slowDown = require('express-slow-down');
const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 2,
  delayMs: (used) => (used - 2) * 500,
  skipSuccessfulRequests: true,
});

app.use('/api/', apiLimiter);

// ==================== Email Transport ====================
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendPasswordResetEmail = async (toEmail, resetToken) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.info('DEV reset token', { email: toEmail, token: resetToken });
    return;
  }
  await emailTransporter.sendMail({
    from: `"Villa Jaconda" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Сброс пароля — Villa Jaconda',
    headers: {
      'X-Priority': '1',
      'X-Mailer': 'Villa Jaconda Mailer',
      'Precedence': 'transactional',
    },
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f7fafc;border-radius:12px">
        <h2 style="color:#1a1150;margin-bottom:8px">Сброс пароля</h2>
        <p style="color:#4a5568;margin-bottom:24px">
          Вы запросили сброс пароля в приложении <strong>Villa Jaconda</strong>.<br>
          Введите код ниже в приложении. Код действует <strong>1 час</strong>.
        </p>
        <div style="background:#1a1150;border-radius:10px;padding:20px 24px;text-align:center;margin-bottom:24px">
          <p style="color:#a0aec0;font-size:12px;margin:0 0 8px">Код подтверждения</p>
          <code style="color:#ffffff;font-size:22px;letter-spacing:2px;word-break:break-all">${resetToken}</code>
        </div>
        <p style="color:#718096;font-size:13px">
          Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо. Ваш пароль останется прежним.
        </p>
      </div>
    `,
  });
};

const path = require('path');
app.use(express.static('public'));
app.use('/assets', express.static(path.join(__dirname, '../src/assets')));

// ==================== Database Setup ====================
let dbConnected = false;

const seedDatabase = async () => {
  try {
    await Booking.destroy({ where: {} });
    await LoyaltyCard.destroy({ where: {} });
    await AdminWallet.destroy({ where: {} });
    await User.destroy({ where: {} });

    const adminUser = await User.create({
      userId:          'admin-001',
      email:           'admin@villajaconda.ru',
      passwordHash:    await bcryptjs.hash('Admin1234', 10),
      displayName:     'Администратор',
      phone:           '+79999999999',
      address:         'Офис',
      role:            'admin',
      adminLevel:      1,
      membershipLevel: 'Platinum',
    });

    const regularUser = await User.create({
      userId:          'user-001',
      email:           'guest@villajaconda.ru',
      passwordHash:    await bcryptjs.hash('User1234', 10),
      displayName:     'Гость',
      phone:           '+79111111111',
      address:         'Москва',
      role:            'user',
      membershipLevel: 'Bronze',
    });

    await AdminWallet.create({
      adminId:          adminUser.userId,
      adminLevel:       1,
      totalBalance:     0,
      availableBalance: 0,
      pendingBalance:   0,
      totalReceived:    0,
      totalWithdrawn:   0,
      isActive:         true,
    });

    await LoyaltyCard.create({ userId: adminUser.userId,   balance: 0, totalSpent: 0, totalEarned: 0 });
    await LoyaltyCard.create({ userId: regularUser.userId, balance: 0, totalSpent: 0, totalEarned: 0 });

    const propCount = await Property.count();
    if (propCount === 0) {
      await Property.bulkCreate([
        { name: 'Villa Bonita',      description: 'Роскошная вилла с видом на море',         price: '150€', priceNumber: 150, rooms: 4, guests: 8,  amenities: ['WiFi', 'Бассейн', 'Кондиционер', 'Кухня'], image: 'villa1.jpg',     status: 'available' },
        { name: 'Sunset Apartment',  description: 'Уютная квартира в центре города',          price: '80€',  priceNumber: 80,  rooms: 2, guests: 4,  amenities: ['WiFi', 'Паркинг', 'Балкон'],                image: 'apartment1.jpg', status: 'available' },
        { name: 'Luxury Penthouse',  description: 'Премиум пентхаус с панорамным видом',      price: '250€', priceNumber: 250, rooms: 5, guests: 10, amenities: ['WiFi', 'СПА', 'Бассейн', 'Лифт', 'Консьерж'], image: 'penthouse.jpg',  status: 'available' },
        { name: 'Cozy Studio',       description: 'Студия для одного или двух человек',       price: '50€',  priceNumber: 50,  rooms: 1, guests: 2,  amenities: ['WiFi', 'Душ'],                              image: 'studio.jpg',     status: 'available' },
      ]);
    }

    logger.info('База данных инициализирована', {
      admin: 'admin@villajaconda.ru',
      user:  'guest@villajaconda.ru',
    });
  } catch (error) {
    logger.error('Ошибка при инициализации БД', { error: error.message });
  }
};

const connectDB = async () => {
  try {
    logger.info('Подключение к PostgreSQL...');
    await sequelize.authenticate();
    logger.info('PostgreSQL подключена успешно');

    // sync() без опций создаёт отсутствующие таблицы, но НЕ изменяет существующие.
    // alter:true опасен — может удалить колонки если они есть в БД, но нет в модели.
    // Изменения схемы выполняются через явные SQL-миграции (migrations/).
    await sequelize.sync();
    logger.info('Таблицы синхронизированы');

    // Seed только при первом запуске на пустой БД — не при каждом рестарте.
    const userCount = await User.count();
    if (userCount === 0) {
      logger.info('БД пустая — запускаем начальный seed');
      await seedDatabase();
    } else {
      logger.info('БД уже инициализирована, seed пропущен', { users: userCount });
    }

    dbConnected = true;
  } catch (error) {
    logger.error('Ошибка подключения к PostgreSQL', { error: error.message });
    dbConnected = false;
    setTimeout(connectDB, 5000);
  }
};

// ==================== Routes ====================

app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await sequelize.authenticate();
    dbStatus = 'connected';
  } catch {
    // DB not ready yet — server still alive
  }
  res.status(200).json({
    status:    dbStatus === 'connected' ? 'ok' : 'starting',
    ready:     dbStatus === 'connected',
    uptime:    Math.floor(process.uptime()),
    database:  dbStatus,
    env:       NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth',          require('./routes/auth')({ authLimiter, authSlowDown, sendPasswordResetEmail, isDbConnected: () => dbConnected }));
app.use('/api/users',         require('./routes/users')({ isDbConnected: () => dbConnected }));
app.use('/api/events',        require('./routes/events')({ isDbConnected: () => dbConnected }));
app.use('/api/notifications', require('./routes/notifications')({ isDbConnected: () => dbConnected }));
app.use('/api/referrals',     require('./routes/referrals')({ isDbConnected: () => dbConnected }));
app.use('/api/bookings',      require('./routes/bookings')({ isDbConnected: () => dbConnected }));
app.use('/api/properties',    require('./routes/properties')({ isDbConnected: () => dbConnected }));
app.use('/api/loyalty-card',  require('./routes/loyalty')({ isDbConnected: () => dbConnected }));
app.use('/api/card',          require('./routes/card')({ isDbConnected: () => dbConnected }));
app.use('/api/admin',         require('./routes/admin')({ isDbConnected: () => dbConnected }));

/**
 * POST /api/analytics — запись аналитического события от клиента.
 */
app.post('/api/analytics', verifyToken, validate(schemas.analytics), async (req, res) => {
  try {
    const { eventType, data } = req.body;
    logger.info('analytics event', { userId: req.userId, eventType, data: data || null });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// ==================== Error Handlers ====================

// Sentry перехватывает 5xx до того, как их обработает наш handler
Sentry.setupExpressErrorHandler(app);

process.on('uncaughtException', (error) => {
  logger.error('FATAL uncaughtException', { error: error?.message, stack: error?.stack });
  Sentry.captureException(error);
  setTimeout(() => process.exit(1), 200).unref();
});

process.on('unhandledRejection', (reason) => {
  logger.error('FATAL unhandledRejection', { reason: reason?.message || reason, stack: reason?.stack });
  Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
  setTimeout(() => process.exit(1), 200).unref();
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const requestId = req.headers['x-request-id'] || Date.now().toString(36);
  logger.error('Unhandled route error', {
    requestId,
    method:  req.method,
    path:    req.path,
    userId:  req.user?.userId || req.userId || 'anon',
    error:   err.message,
    stack:   err.stack,
  });
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success:   false,
    error:     NODE_ENV === 'production' ? 'Internal server error' : err.message,
    requestId,
  });
});

// ==================== Start Server ====================

const listenWithRetry = (retries = 10) => {
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      // Protect against Slowloris: close idle keep-alive connections after 65s,
      // and abort headers-only connections (no body yet) after 10s.
      server.keepAliveTimeout = 65_000;
      server.headersTimeout   = 70_000; // must be > keepAliveTimeout
      logger.info('Server started', { port: PORT, env: NODE_ENV });
      resolve(server);
    });
    server.on('error', (error) => {
      server.close();
      if (error.code === 'EADDRINUSE' && retries > 0) {
        logger.warn('Port busy, retrying', { port: PORT, retriesLeft: retries });
        setTimeout(() => listenWithRetry(retries - 1).then(resolve).catch(reject), 30000);
      } else {
        reject(error);
      }
    });
  });
};

const startServer = async () => {
  try {
    await connectDB();
    await listenWithRetry();
  } catch (error) {
    logger.error('Server startup failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

startServer();

module.exports = app;
