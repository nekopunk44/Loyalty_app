# Code Review: Подготовка бэкенда к продакшену

> **Файл:** `server/index.js` (5 270 строк)  
> **Стек:** Express.js · PostgreSQL · Sequelize · JWT  
> **Цель:** Выявить критические проблемы перед запуском в продакшен

---

## Содержание

1. [Критические уязвимости (P0)](#1-критические-уязвимости-p0)
2. [Высокий приоритет (P1)](#2-высокий-приоритет-p1)
3. [Средний приоритет (P2)](#3-средний-приоритет-p2)
4. [Рефакторинг архитектуры (P3)](#4-рефакторинг-архитектуры-p3)
5. [Чеклист перед деплоем](#5-чеклист-перед-деплоем)

---

## 1. Критические уязвимости (P0)

Нужно исправить **до первого продакшен-деплоя**.

---

### 1.1 `ALLOW_DEMO_PAYMENTS` не блокируется в продакшене

**Проблема:** Флаг `ALLOW_DEMO_PAYMENTS=true` позволяет зачислять баланс без реального платежа.
Если он случайно окажется в продакшене — любой пользователь пополнит счёт бесплатно.

**Как есть:**
```javascript
// server/index.js — endpoint POST /api/card/topup
if (process.env.ALLOW_DEMO_PAYMENTS === 'true' || process.env.NODE_ENV !== 'production') {
  // Зачисляет сразу, без проверки платежа
  await card.update({ balance: newBalance });
}
```

**Исправление:**
```javascript
// Добавить в самый верх index.js после dotenv.config()
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_PAYMENTS === 'true') {
  console.error('FATAL: ALLOW_DEMO_PAYMENTS cannot be true in production');
  process.exit(1);
}
```

---

### 1.2 Гонка состояний при пополнении баланса (Race Condition)

**Проблема:** Два одновременных запроса пополнения могут прочитать одно значение баланса
и оба прибавить к нему сумму — в итоге одно из пополнений «потеряется» или баланс задвоится.

**Как есть:**
```javascript
const card = await LoyaltyCard.findOne({ where: { userId } });
const newBalance = parseFloat(card.balance) + amount;
await card.update({ balance: newBalance });
// ↑ между findOne и update другой запрос мог изменить balance
```

**Исправление — транзакция + блокировка строки:**
```javascript
const t = await sequelize.transaction();
try {
  const card = await LoyaltyCard.findOne({
    where: { userId },
    lock: true,           // SELECT ... FOR UPDATE
    transaction: t,
  });

  const before = parseFloat(card.balance);
  const after  = before + amount;

  await card.update({ balance: after }, { transaction: t });
  await Transaction.create({
    userId, type: 'credit', amount,
    balanceBefore: before, balanceAfter: after,
  }, { transaction: t });

  await t.commit();
} catch (err) {
  await t.rollback();
  throw err;
}
```

---

### 1.3 Отсутствует idempotency — возможны двойные зачисления

**Проблема:** Если клиент сделал запрос, сеть прервалась и он повторил запрос —
баланс зачислится дважды. Это стандартный сценарий на мобильных сетях.

**Исправление:**
```javascript
// POST /api/card/topup
const { amount, userId, idempotencyKey } = req.body;

// Проверить, не обработан ли этот запрос уже
const existing = await CardTopUp.findOne({
  where: { transactionId: idempotencyKey }
});
if (existing) {
  return res.json({ success: true, duplicate: true, balance: existing.balanceAfter });
}

// Только после этого обрабатывать платёж
```

**Клиент должен генерировать ключ один раз:**
```javascript
import uuid from 'react-native-uuid';
const idempotencyKey = uuid.v4(); // генерировать при открытии экрана, не при каждом нажатии
```

---

### 1.4 Webhook Stripe не проверяет подпись

**Проблема:** Любой может отправить POST на `/api/webhooks/stripe` с поддельными данными
и зачислить произвольный баланс.

**Как должно быть:**
```javascript
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),  // ← raw body обязателен
  (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).send(`Webhook signature error: ${err.message}`);
    }
    // только после этого обрабатывать event
  }
);
```

**Важно:** Webhook endpoint должен быть зарегистрирован **до** `app.use(express.json())`,
иначе `req.body` будет распарсен и подпись не сойдётся.

---

### 1.5 JWT Secret слишком короткий или предсказуемый

**Проблема:** Если `JWT_SECRET=secret` или `JWT_SECRET=12345` — токены можно подобрать брутфорсом.

**Исправление — добавить проверку при старте:**
```javascript
// Добавить в начало index.js
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters');
  process.exit(1);
}
```

**Сгенерировать безопасный секрет:**
```bash
openssl rand -base64 48
# или
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

---

### 1.6 Гонка при создании бронирований (двойные брони)

**Проблема:** Два пользователя одновременно бронируют один объект на одни даты.
Оба проходят проверку занятости — оба получают подтверждение.

**Как есть:**
```javascript
// Проверка доступности
const existingBookings = await Booking.findAll({
  where: { propertyId, status: { [Op.in]: ['pending', 'confirmed'] } }
});
// ... проверяем пересечение дат ...
const booking = await Booking.create({ ... }); // ← Между findAll и create — окно гонки
```

**Исправление:**
```javascript
const t = await sequelize.transaction({ isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE });
try {
  const conflicting = await Booking.findAll({
    where: { propertyId, status: { [Op.in]: ['pending', 'confirmed'] } },
    lock: true,
    transaction: t,
  });
  // проверить пересечение дат
  // если чисто — создать бронь
  await Booking.create({ ... }, { transaction: t });
  await t.commit();
} catch (err) {
  await t.rollback();
  throw err;
}
```

---

## 2. Высокий приоритет (P1)

Исправить в первый спринт после запуска.

---

### 2.1 Нет структурированного логирования

**Проблема:** `console.log` и `console.error` не пишут уровни, не содержат request ID,
их нельзя агрегировать в системах мониторинга.

**Установка:**
```bash
cd server && npm install winston
```

**Конфигурация (`server/logger.js`):**
```javascript
const winston = require('winston');

module.exports = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) =>
      `${timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
```

**Использование:**
```javascript
const logger = require('./logger');
// Вместо: console.log('User logged in', userId)
logger.info('User logged in', { userId, ip: req.ip });
// Вместо: console.error('Payment failed', err)
logger.error('Payment failed', { userId, amount, error: err.message, stack: err.stack });
```

---

### 2.2 Нет глобального обработчика ошибок

**Проблема:** Если в route handler бросается исключение без try/catch — сервер падает
или возвращает пустой 500 без диагностики.

**Добавить в конец index.js (после всех роутов):**
```javascript
// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  const requestId = req.headers['x-request-id'] || Date.now().toString(36);
  logger.error('Unhandled error', {
    requestId,
    method:  req.method,
    path:    req.path,
    userId:  req.user?.userId,
    error:   err.message,
    stack:   err.stack,
  });

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success:   false,
    error:     process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    requestId, // позволяет найти ошибку в логах по ID
  });
});
```

---

### 2.3 Пагинация без ограничения лимита

**Проблема:** Запросы типа `?limit=999999` могут вернуть сотни тысяч строк и положить сервер.

**Как есть:**
```javascript
const limit = parseInt(req.query.limit) || 50;
const offset = parseInt(req.query.offset) || 0;
```

**Исправление:**
```javascript
const MAX_LIMIT = 100;
const limit  = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), MAX_LIMIT);
const offset = Math.max(parseInt(req.query.offset) || 0, 0);
```

---

### 2.4 Валидация входных данных слишком слабая

**Проблема:** Текстовые поля принимают любой контент, числовые поля не ограничены.

**Установка:**
```bash
cd server && npm install zod
```

**Схема для создания бронирования:**
```javascript
const { z } = require('zod');

const createBookingSchema = z.object({
  propertyId:   z.number().int().positive(),
  checkInDate:  z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/, 'Формат: ДД.ММ.ГГГГ'),
  checkOutDate: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/, 'Формат: ДД.ММ.ГГГГ'),
  guests:       z.number().int().min(1).max(20),
  saunaHours:   z.number().int().min(0).max(24).optional().default(0),
  kitchenware:  z.boolean().optional().default(false),
  notes:        z.string().max(1000).optional(),
});

// Middleware валидации
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error:   'Validation error',
      details: result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  req.body = result.data; // очищенные данные
  next();
};

// В роуте:
app.post('/api/bookings', verifyToken, validate(createBookingSchema), async (req, res) => { ... });
```

---

### 2.5 Пароль не имеет таймаута на сброс

**Проблема:** Токен сброса пароля действует бесконечно, если `resetPasswordExpires` не проверяется.

**Исправление — при верификации токена:**
```javascript
const user = await User.findOne({
  where: {
    resetPasswordToken: token,
    resetPasswordExpires: { [Op.gt]: new Date() },  // ← добавить эту проверку
  }
});
if (!user) {
  return res.status(400).json({ error: 'Токен недействителен или истёк' });
}
```

**При генерации токена устанавливать срок:**
```javascript
user.resetPasswordToken   = crypto.randomBytes(32).toString('hex');
user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 час
```

---

### 2.6 Rate limit не привязан к пользователю

**Проблема:** Общий IP-rate-limit легко обойти через прокси. Аутентифицированные запросы
должны ограничиваться по userId.

```javascript
const userRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user?.userId || req.ip,  // по userId если авторизован
  message: { error: 'Слишком много запросов. Попробуйте через 15 минут.' },
});

app.use('/api', verifyToken, userRateLimiter);
```

---

## 3. Средний приоритет (P2)

Решить во втором спринте.

---

### 3.1 Connection Pool слишком маленький

**Проблема:** `max: 5` — при 50 одновременных запросах будет очередь и таймауты.

**Исправление:**
```javascript
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  pool: {
    max:     20,      // было 5
    min:     5,       // было 0 — не уничтожать соединения в idle
    acquire: 60000,   // было 30000
    idle:    30000,   // было 10000
  },
  logging: process.env.NODE_ENV !== 'production' ? console.log : false,
});
```

---

### 3.2 Нет версионирования API

**Проблема:** Любое изменение контракта ломает старые клиенты.

**Исправление — добавить префикс `/api/v1`:**
```javascript
const v1Router = express.Router();

// Все роуты переносятся в v1Router
v1Router.post('/auth/login', ...);
v1Router.get('/bookings', ...);
// ...

app.use('/api/v1', v1Router);
// Старый /api/ оставить как алиас временно:
app.use('/api', v1Router);
```

---

### 3.3 Форматы дат ненадёжны

**Проблема:** Строковый формат `DD.MM.YYYY` не учитывает часовые пояса,
нельзя сортировать, легко испортить при парсинге.

**Исправление — хранить как DATE в PostgreSQL:**
```javascript
// В модели Booking:
checkInDate:  { type: DataTypes.DATEONLY },  // хранит как YYYY-MM-DD в БД
checkOutDate: { type: DataTypes.DATEONLY },

// Конвертация при получении от клиента:
const parseClientDate = (ddmmyyyy) => {
  const [d, m, y] = ddmmyyyy.split('.');
  return `${y}-${m}-${d}`; // YYYY-MM-DD для PostgreSQL
};

// Конвертация при отдаче клиенту:
const formatClientDate = (isoDate) => {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
};
```

---

### 3.4 Ответы API несовместимы по структуре

**Проблема:** Одни endpoint возвращают `{ bookings: [] }`, другие `{ data: [] }`, третьи массив напрямую.
Клиент должен знать структуру каждого endpoint.

**Унифицированный формат ответа:**
```javascript
// Хелпер
const ok  = (res, data, meta = {}) => res.json({ success: true,  data, ...meta });
const err = (res, code, message)    => res.status(code).json({ success: false, error: message });

// Пример использования:
app.get('/api/v1/bookings', verifyAdmin, async (req, res) => {
  const { count, rows } = await Booking.findAndCountAll({ limit, offset });
  ok(res, rows, { total: count, limit, offset });
});
// Ответ всегда: { success: true, data: [...], total: N, limit: N, offset: N }
```

---

### 3.5 Нет health-check endpoint

**Нужен для load-balancer, Docker healthcheck, мониторинга:**
```javascript
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status:   'ok',
      uptime:   process.uptime(),
      database: 'connected',
      ts:       new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});
```

---

### 3.6 Финансовый администратор: нет разделения полномочий

**Проблема:** Один adminLevel=1 пользователь может и запросить, и одобрить вывод средств.
Это нарушает принцип четырёх глаз (two-person rule).

**Минимальное исправление — уведомление второму администратору:**
```javascript
// При запросе на вывод
app.post('/api/admin/finances/withdrawal', verifyToken, verifyFinanceAdmin, async (req, res) => {
  // ... создать WithdrawalRequest со статусом 'pending' ...

  // Уведомить другого финансового администратора
  const otherAdmins = await User.findAll({
    where: { role: 'admin', adminLevel: 1, userId: { [Op.ne]: req.user.userId } }
  });
  for (const admin of otherAdmins) {
    await Notification.create({
      userId:  admin.userId,
      title:   'Новый запрос на вывод',
      message: `Запрос на ${amount} ₽ требует подтверждения`,
      type:    'payment',
    });
  }
});
```

---

## 4. Рефакторинг архитектуры (P3)

Технический долг — решать по возможности, не блокирует запуск.

---

### 4.1 Разбить монолитный index.js

5 270 строк в одном файле — критическая проблема поддерживаемости.

**Целевая структура:**
```
server/
├── index.js                    ← только app setup, middleware, запуск
├── logger.js
├── database.js
├── models/
│   ├── index.js               ← Sequelize associations
│   ├── User.js
│   ├── Booking.js
│   ├── LoyaltyCard.js
│   ├── Transaction.js
│   ├── Payment.js
│   ├── Event.js
│   ├── Notification.js
│   └── ...
├── middleware/
│   ├── auth.js                ← verifyToken, verifyAdmin, verifyFinanceAdmin
│   ├── validate.js            ← validate(schema) хелпер
│   └── errorHandler.js
└── routes/
    ├── auth.js
    ├── bookings.js
    ├── properties.js
    ├── loyalty.js
    ├── payments.js
    ├── events.js
    ├── users.js
    ├── reviews.js
    ├── notifications.js
    └── admin.js
```

---

### 4.2 Добавить тесты

**Установка:**
```bash
cd server
npm install --save-dev jest supertest @jest/globals
```

**Минимальный тест для критического пути (пополнение баланса):**
```javascript
// server/tests/topup.test.js
describe('POST /api/card/topup', () => {
  it('should credit balance once (idempotency)', async () => {
    const key = 'test-key-' + Date.now();
    const res1 = await request(app)
      .post('/api/card/topup')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ userId: testUserId, amount: 1000, idempotencyKey: key });
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .post('/api/card/topup')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ userId: testUserId, amount: 1000, idempotencyKey: key });
    expect(res2.body.duplicate).toBe(true);

    const card = await LoyaltyCard.findOne({ where: { userId: testUserId } });
    expect(parseFloat(card.balance)).toBe(initialBalance + 1000); // не 2000
  });
});
```

---

### 4.3 Добавить Redis для кэширования

Список доступных дат бронирования и список объектов не меняются часто.
Кэш снизит нагрузку на PostgreSQL.

```bash
npm install ioredis
```

```javascript
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Кэшировать занятые даты
app.get('/api/bookings/property/:propertyId/booked-dates', async (req, res) => {
  const key = `booked:${req.params.propertyId}`;
  const cached = await redis.get(key);
  if (cached) return res.json(JSON.parse(cached));

  const dates = await getBookedDates(req.params.propertyId);

  await redis.setex(key, 60, JSON.stringify(dates)); // TTL 60 секунд
  res.json(dates);
});

// Инвалидировать кэш при создании/отмене бронирования
await redis.del(`booked:${propertyId}`);
```

---

## 5. Чеклист перед деплоем

### Безопасность
- [ ] `ALLOW_DEMO_PAYMENTS=false` (или отсутствует)
- [ ] `JWT_SECRET` длиной 48+ символов
- [ ] `NODE_ENV=production`
- [ ] Stripe webhook signature validation добавлена
- [ ] CORS ограничен production-доменом
- [ ] HTTPS принудительно (через nginx/reverse proxy)

### База данных
- [ ] Миграции запущены (`npm run migrate`)
- [ ] Connection pool: max ≥ 15
- [ ] Ежедневный автобэкап настроен
- [ ] SSL-соединение с PostgreSQL включено

### Платежи
- [ ] Stripe live-ключи (не test)
- [ ] PayPal live-режим
- [ ] Idempotency для всех топапов
- [ ] SELECT FOR UPDATE на LoyaltyCard

### Мониторинг
- [ ] Winston logger подключён
- [ ] `/health` endpoint отвечает 200
- [ ] Алерт на ошибки 5xx настроен (UptimeRobot / Datadog)
- [ ] Логи пишутся в файл

### Тесты
- [ ] Пройти E2E: регистрация → бронирование → оплата картой → проверить баланс
- [ ] Пройти E2E: двойное пополнение с одним idempotency key — зачислиться должно один раз
- [ ] Убедиться: `/api/admin/*` недоступен без admin токена

---

## Итог по приоритетам

| # | Проблема                              | Приоритет | Сложность |
|---|---------------------------------------|-----------|-----------|
| 1 | ALLOW_DEMO_PAYMENTS в продакшене      | P0        | Низкая    |
| 2 | Race condition на балансе             | P0        | Средняя   |
| 3 | Нет idempotency на топапах            | P0        | Средняя   |
| 4 | Stripe webhook без проверки подписи   | P0        | Низкая    |
| 5 | JWT_SECRET без проверки длины         | P0        | Низкая    |
| 6 | Race condition на бронированиях       | P0        | Средняя   |
| 7 | Нет структурированных логов           | P1        | Средняя   |
| 8 | Нет глобального error handler         | P1        | Низкая    |
| 9 | Нет лимита на pagination              | P1        | Низкая    |
| 10| Слабая валидация входных данных       | P1        | Средняя   |
| 11| Таймаут сброса пароля не проверяется  | P1        | Низкая    |
| 12| Rate limit не по userId               | P1        | Низкая    |
| 13| Connection pool слишком маленький     | P2        | Низкая    |
| 14| Нет API versioning                    | P2        | Средняя   |
| 15| Строковые даты вместо DATEONLY        | P2        | Высокая   |
| 16| Несовместимая структура ответов       | P2        | Средняя   |
| 17| Нет /health endpoint                  | P2        | Низкая    |
| 18| Нет разделения полномочий на выводах  | P2        | Средняя   |
| 19| Монолитный index.js (5270 строк)      | P3        | Высокая   |
| 20| Нет тестов                            | P3        | Высокая   |
| 21| Нет кэширования (Redis)               | P3        | Средняя   |
