# Быстрый старт - Система платежей

## Предварительные требования

- Node.js v14+
- PostgreSQL 12+
- npm или yarn

---

## Установка и запуск

### 1. Подготовка базы данных

```bash
# Создать базу данных (если её еще нет)
createdb loyalty_app

# Или используя psql:
psql -U postgres
# В psql:
CREATE DATABASE loyalty_app;
```

### 2. Запуск миграций

```bash
cd server
npm install
npm run migrate
```

Или вручную выполнить SQL из:
```
server/migrations/005_payment_system.sql
```

### 3. Запуск сервера

```bash
# В директории server/
npm start
# или
node index.js
```

Сервер запустится на `http://localhost:5002`

**Ожидаемый вывод:**
```
PostgreSQL подключена успешно
Таблицы синхронизированы
Загрузка тестовых данных...
Создано 4 пользователей (1 админ с финансами, 1 админ без финансов, 2 обычных)
Созданы кошельки администраторов
Создано 4 карты лояльности

Loyalty App Backend Server запущен!
Port: 5002
Environment: development
Database: PostgreSQL (loyalty_app)
```

### 4. Проверка здоровья сервера

```bash
curl http://localhost:5002/health

# Ожидаемый ответ:
{
  "status": "OK",
  "ready": true,
  "environment": "development",
  "database": "PostgreSQL",
  "timestamp": "2026-01-11T10:00:00.000Z"
}
```

---

## Тестовые аккаунты

### Администраторы

**Финансовый администратор (уровень 1):**
- Email: `admin@example.com`
- Password: `password123`
- Доступ: ✅ Финансовая панель

**Обычный администратор (уровень 2):**
- Email: `admin2@example.com`
- Password: `password123`
- Доступ: ❌ Финансовая панель

### Пользователи

**Иван Петров:**
- Email: `user1@example.com`
- Password: `password123`
- Баланс: 500₽

**Мария Сидорова:**
- Email: `user2@example.com`
- Password: `password123`
- Баланс: 1000₽

---

## Использование API

### Пополнить карту

```bash
curl -X POST http://localhost:5002/api/card/topup \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user1-id",
    "amount": 5000,
    "paymentMethod": "card"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Баланс карты успешно пополнен",
  "newBalance": 5500,
  "transactionId": "TOPUP_..."
}
```

### Получить баланс

```bash
curl http://localhost:5002/api/card/balance/user1-id
```

**Response:**
```json
{
  "success": true,
  "balance": 5500,
  "totalSpent": 2000,
  "totalEarned": 500,
  "membershipLevel": "Silver"
}
```

### Оплатить бронирование

```bash
curl -X POST http://localhost:5002/api/bookings/1/pay-from-card \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user1-id"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Платёж успешно выполнен",
  "newBalance": 3000,
  "paymentId": 10
}
```

### Финансовая сводка администратора

```bash
curl http://localhost:5002/api/admin/finances/summary?userId=admin-user
```

**Response:**
```json
{
  "success": true,
  "wallet": {
    "totalBalance": 250000,
    "availableBalance": 250000,
    "totalReceived": 500000
  },
  "statistics": {
    "totalPayments": 45,
    "todayPayments": 5
  }
}
```

### История транзакций

```bash
curl http://localhost:5002/api/card/transactions/user1-id
```

### История пополнений

```bash
curl http://localhost:5002/api/card/topups/user1-id
```

### Список выводов администратора

```bash
curl http://localhost:5002/api/admin/finances/withdrawals?userId=admin-user
```

### Запрос на вывод средств

```bash
curl -X POST http://localhost:5002/api/admin/finances/withdrawal \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "admin-user",
    "amount": 50000,
    "bankAccount": "40817810123456789012",
    "reason": "Еженедельный вывод"
  }'
```

---

## Структура БД

### Основные таблицы

```sql
-- Карты лояльности пользователей
loyalty_cards
├── id (PK)
├── user_id (FK)
├── balance
├── total_spent
└── total_earned

-- Пополнения карт
card_topups
├── id (PK)
├── user_id (FK)
├── amount
├── payment_method
└── status

-- Платежи
payments
├── id (PK)
├── user_id (FK)
├── booking_id (FK)
├── amount
└── status

-- Кошельки администраторов
admin_wallets
├── id (PK)
├── admin_id (FK)
├── total_balance
├── available_balance
└── pending_balance

-- Транзакции администраторов
admin_transactions
├── id (PK)
├── admin_id (FK)
├── type (booking_payment, withdrawal, etc.)
├── amount
└── balance_after

-- Запросы на вывод
withdrawal_requests
├── id (PK)
├── admin_id (FK)
├── amount
├── bank_account
└── status (pending, completed, etc.)
```

---

## Отладка

### Проверить логи

```bash
# Включить подробное логирование в server/index.js:
// Раскомментируйте в Database Setup:
logging: console.log, // вместо logging: false
```

### Проверить соединение БД

```bash
psql -U postgres -d loyalty_app
\dt  -- список таблиц
\d loyalty_cards  -- структура таблицы
```

### Очистить БД и пересоздать

```bash
dropdb loyalty_app
createdb loyalty_app
# Запустить сервер для пересоздания таблиц
node index.js
```

---

## Полезные сценарии

### Сценарий 1: Пополнение карты и оплата

```bash
# 1. Пользователь пополняет карту на 10000₽
curl -X POST http://localhost:5002/api/card/topup \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1-id","amount":10000,"paymentMethod":"card"}'

# 2. Проверяем новый баланс
curl http://localhost:5002/api/card/balance/user1-id

# 3. Пользователь создает бронирование (POST /api/bookings)
# Это возвращает booking.id = 5

# 4. Пользователь оплачивает бронирование
curl -X POST http://localhost:5002/api/bookings/5/pay-from-card \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1-id"}'

# 5. Проверяем финансы администратора
curl http://localhost:5002/api/admin/finances/summary?userId=admin-user
```

### Сценарий 2: Администратор запрашивает вывод

```bash
# 1. Администратор видит сводку
curl http://localhost:5002/api/admin/finances/summary?userId=admin-user

# 2. Создает запрос на вывод
curl -X POST http://localhost:5002/api/admin/finances/withdrawal \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"admin-user",
    "amount":100000,
    "bankAccount":"40817810123456789012",
    "reason":"Месячный вывод"
  }'

# 3. Проверяет статус запроса
curl http://localhost:5002/api/admin/finances/withdrawals?userId=admin-user
```

---

## Дополнительные ресурсы

- **Полная документация:** [PAYMENT_SYSTEM.md](./PAYMENT_SYSTEM.md)
- **Резюме реализации:** [PAYMENT_IMPLEMENTATION_SUMMARY.md](./PAYMENT_IMPLEMENTATION_SUMMARY.md)
- **Backend код:** [server/index.js](./server/index.js)
- **Frontend код:** 
  - [src/screens/CardTopUpScreen.js](./src/screens/CardTopUpScreen.js)
  - [src/screens/AdminFinanceDashboard.js](./src/screens/AdminFinanceDashboard.js)
  - [src/context/PaymentContext.js](./src/context/PaymentContext.js)

---

## Поддержка

При возникновении проблем:

1. **Проверьте логи сервера** - там указаны все ошибки
2. **Проверьте соединение с БД** - `psql -U postgres -d loyalty_app`
3. **Проверьте миграции** - все таблицы должны быть созданы
4. **Перезагрузите сервер** - `Ctrl+C` и `node index.js`

---

## Что дальше?

Система готова к:
- Интеграции с реальными платежными системами (Stripe, PayPal)
- Добавлению рассрочки платежей
- Внедрению 2FA для администраторов
- Добавлению рефундов и возвратов
- Интеграции с различными валютами

---

**Версия:** 1.0  
**Дата:** 11 января 2026  
**Статус:** Готово к использованию
