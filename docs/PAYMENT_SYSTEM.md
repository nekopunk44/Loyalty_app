# 💳 Система платежей приложения Loyalty App

Полная документация по реализованной системе платежей для приложения Loyalty App.

---

## Содержание

1. [Архитектура](#архитектура)
2. [Уровни администраторов](#уровни-администраторов)
3. [API endpoints](#api-endpoints)
4. [Потоки работы](#потоки-работы)
5. [Модели данных](#модели-данных)
6. [Тестовые данные](#тестовые-данные)
7. [Использование](#использование)

---

## Архитектура

### Основные компоненты

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native Frontend                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ PaymentContext (управление платежами)                │   │
│  │ - topUpCard()        - пополнение карты              │   │
│  │ - payBookingFromCard() - оплата бронирования         │   │
│  │ - getCardBalance()   - получить баланс               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│                    Express.js Backend                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Payment System API Endpoints                 │   │
│  │ - POST   /api/card/topup                             │   │
│  │ - GET    /api/card/balance/:userId                   │   │
│  │ - POST   /api/bookings/:id/pay-from-card             │   │
│  │ - GET    /api/admin/finances/summary                 │   │
│  │ - POST   /api/admin/finances/withdrawal              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ ORM
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Таблицы:                                             │   │
│  │ - loyalty_cards          (баланс пользователей)      │   │
│  │ - card_topups            (пополнения карт)           │   │
│  │ - payments               (платежи)                   │   │
│  │ - admin_wallets          (кошельки админов)          │   │
│  │ - admin_transactions     (транзакции админов)        │   │
│  │ - withdrawal_requests    (запросы на вывод)          │   │
│  │ - transactions           (история пользователей)     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Уровни администраторов

### Администратор уровня 1 (Финансовый управляющий)

**adminLevel: 1**

- Полный доступ к финансовым операциям
- Просмотр сводки всех платежей
- Просмотр истории финансовых транзакций
- Создание запросов на вывод средств
- Просмотр баланса кошелька
- Доступ к AdminFinanceDashboard

**Маршрут:** POST /auth/register с параметром `adminLevel: 1`

### Администратор уровня 2 (Обычный администратор)

**adminLevel: 2**

- БЕЗ доступа к финансовым операциям
- Доступ к другим функциям администратора
- Управление пользователями
- Управление бронированиями

**Маршрут:** POST /auth/register с параметром `adminLevel: 2`

### Обычный пользователь

**role: 'user', adminLevel: null**

- Пополнение своей карты лояльности
- Оплата бронирований с карты
- Просмотр истории транзакций
- Просмотр истории пополнений

---

## API Endpoints

### Пополнение карты (Card Top-Up)

#### POST /api/card/topup

Пополнить баланс карты лояльности пользователя.

**Request:**
```json
{
  "userId": "user_123",
  "amount": 5000,
  "paymentMethod": "card"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Баланс карты успешно пополнен",
  "topup": {
    "id": 1,
    "userId": "user_123",
    "amount": "5000.00",
    "paymentMethod": "card",
    "status": "completed",
    "transactionId": "TOPUP_1234567890_abc123",
    "createdAt": "2026-01-11T10:30:00.000Z"
  },
  "newBalance": 5000,
  "transactionId": "TOPUP_1234567890_abc123"
}
```

**Доступные способы оплаты:**
- `card` - кредитная/дебетовая карта
- `paypal` - PayPal
- `bank_transfer` - банковский перевод
- `crypto` - криптовалюта

---

#### GET /api/card/balance/:userId

Получить текущий баланс карты лояльности.

**Response:**
```json
{
  "success": true,
  "balance": 5000,
  "totalSpent": 2000,
  "totalEarned": 500,
  "membershipLevel": "Silver",
  "cashbackRate": 5
}
```

---

#### GET /api/card/transactions/:userId

Получить историю транзакций пользователя.

**Query параметры:**
- `limit` (optional) - максимум записей (по умолчанию 50)
- `offset` (optional) - смещение (по умолчанию 0)

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": 1,
      "userId": "user_123",
      "bookingId": 5,
      "type": "debit",
      "amount": "2500.00",
      "description": "Оплата бронирования #5 с карты лояльности",
      "balanceBefore": "7500.00",
      "balanceAfter": "5000.00",
      "createdAt": "2026-01-11T10:00:00.000Z"
    }
  ],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

---

#### GET /api/card/topups/:userId

Получить историю пополнений карты.

**Response:**
```json
{
  "success": true,
  "topups": [
    {
      "id": 1,
      "userId": "user_123",
      "amount": "5000.00",
      "paymentMethod": "card",
      "status": "completed",
      "transactionId": "TOPUP_1234567890_abc123",
      "description": "Пополнение карты через card",
      "createdAt": "2026-01-11T10:30:00.000Z"
    }
  ],
  "total": 3,
  "limit": 20,
  "offset": 0
}
```

---

### Оплата бронирований (Booking Payments)

#### POST /api/bookings/:bookingId/pay-from-card

Оплатить бронирование с карты лояльности.

**Request:**
```json
{
  "userId": "user_123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Платёж успешно выполнен",
  "payment": {
    "id": 10,
    "userId": "user_123",
    "bookingId": 5,
    "amount": "2500.00",
    "currency": "RUB",
    "status": "completed",
    "paymentMethod": "loyalty_card",
    "createdAt": "2026-01-11T10:00:00.000Z"
  },
  "booking": {
    "id": 5,
    "status": "confirmed"
  },
  "newBalance": 5000,
  "paymentId": 10
}
```

**Возможные ошибки:**
- `404` - бронирование не найдено
- `400` - недостаточно средств на карте
- `403` - попытка оплатить чужое бронирование

---

#### GET /api/bookings/:bookingId/payment-status

Получить статус платежа по бронированию.

**Response:**
```json
{
  "success": true,
  "bookingId": 5,
  "bookingStatus": "confirmed",
  "payment": {
    "id": 10,
    "amount": "2500.00",
    "status": "completed",
    "paymentMethod": "loyalty_card"
  },
  "isPaid": true
}
```

---

### Финансовая панель администратора (Admin Finance)

#### GET /api/admin/finances/summary

Получить финансовую сводку администратора.

**Query параметры:**
- `userId` (required) - ID администратора

**Response:**
```json
{
  "success": true,
  "admin": {
    "userId": "admin-user",
    "email": "admin@example.com",
    "displayName": "Администратор",
    "adminLevel": 1
  },
  "wallet": {
    "totalBalance": 250000,
    "availableBalance": 250000,
    "pendingBalance": 0,
    "totalReceived": 500000,
    "totalWithdrawn": 250000
  },
  "statistics": {
    "totalPayments": 45,
    "totalAmount": 500000,
    "todayPayments": 5,
    "todayAmount": 25000,
    "averagePayment": "11111.11"
  }
}
```

**Проверка доступа:**
- Только пользователи с `role: 'admin'` и `adminLevel: 1`

---

#### GET /api/admin/finances/transactions

Получить список финансовых транзакций администратора.

**Query параметры:**
- `userId` (required) - ID администратора
- `limit` (optional) - максимум записей (по умолчанию 100)
- `offset` (optional) - смещение

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": 1,
      "adminId": "admin-user",
      "adminLevel": 1,
      "type": "booking_payment",
      "amount": "2500.00",
      "bookingId": 5,
      "description": "Платёж за бронирование #5 (пользователь: user_123)",
      "balanceBefore": "247500.00",
      "balanceAfter": "250000.00",
      "createdAt": "2026-01-11T10:00:00.000Z"
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

**Типы транзакций:**
- `booking_payment` - платеж за бронирование
- `topup_commission` - комиссия от пополнения
- `withdrawal` - вывод средств
- `refund` - возврат
- `adjustment` - корректировка

---

#### POST /api/admin/finances/withdrawal

Создать запрос на вывод средств.

**Request:**
```json
{
  "userId": "admin-user",
  "amount": 50000,
  "bankAccount": "40817810123456789012",
  "reason": "Еженедельный вывод"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Запрос на вывод создан",
  "withdrawalRequest": {
    "id": 1,
    "adminId": "admin-user",
    "adminLevel": 1,
    "amount": "50000.00",
    "bankAccount": "40817810123456789012",
    "status": "pending",
    "reason": "Еженедельный вывод",
    "createdAt": "2026-01-11T11:00:00.000Z"
  },
  "updatedWallet": {
    "availableBalance": 200000,
    "pendingBalance": 50000
  }
}
```

**Возможные ошибки:**
- `403` - доступ запрещен (не финансовый администратор)
- `400` - недостаточно средств

---

#### GET /api/admin/finances/withdrawals

Получить список запросов на вывод.

**Query параметры:**
- `userId` (required) - ID администратора
- `status` (optional) - фильтр по статусу (pending, approved, completed, rejected)
- `limit` (optional) - максимум записей
- `offset` (optional) - смещение

**Response:**
```json
{
  "success": true,
  "withdrawals": [
    {
      "id": 1,
      "adminId": "admin-user",
      "adminLevel": 1,
      "amount": "50000.00",
      "bankAccount": "40817810123456789012",
      "status": "pending",
      "reason": "Еженедельный вывод",
      "createdAt": "2026-01-11T11:00:00.000Z"
    }
  ],
  "total": 5,
  "limit": 50,
  "offset": 0
}
```

---

## Потоки работы

### Сценарий 1: Пополнение карты пользователем

```
Пользователь
    ↓
Открывает CardTopUpScreen
    ↓
Вводит сумму и выбирает способ оплаты
    ↓
POST /api/card/topup
    ↓
Сервер:
  1. Создает запись CardTopUp со статусом 'pending'
  2. Меняет статус на 'completed' (демо)
  3. Обновляет баланс LoyaltyCard
  4. Создает запись Transaction
    ↓
Возвращает новый баланс
    ↓
Пользователь видит успешное пополнение
```

### Сценарий 2: Оплата бронирования с карты

```
Пользователь на CheckoutScreen
    ↓
Выбирает "Оплатить с карты лояльности"
    ↓
POST /api/bookings/{id}/pay-from-card
    ↓
Сервер:
  1. Проверяет баланс карты
  2. Проверяет, что это бронирование пользователя
  3. Создает Payment со статусом 'completed'
  4. Списывает средства с LoyaltyCard
  5. Создает Transaction для пользователя
  6. Обновляет AdminWallet финансового администратора
  7. Создает AdminTransaction для администратора
  8. Обновляет статус Booking на 'confirmed'
  9. Отправляет уведомления
    ↓
Возвращает подтверждение платежа
    ↓
Бронирование подтверждено, деньги получены администратором
```

### Сценарий 3: Администратор просматривает финансы

```
Финансовый администратор
    ↓
Открывает AdminFinanceDashboard
    ↓
GET /api/admin/finances/summary
    ↓
Сервер:
  1. Проверяет adminLevel (должен быть 1)
  2. Получает AdminWallet администратора
  3. Вычисляет статистику платежей
    ↓
Показывает сводку финансов
    ↓
Администратор видит:
  - Общий баланс
  - Доступный баланс
  - Историю транзакций
  - Запросы на вывод
```

### Сценарий 4: Администратор запрашивает вывод средств

```
Финансовый администратор на AdminFinanceDashboard
    ↓
Нажимает "Вывести средства"
    ↓
Вводит сумму и номер счета
    ↓
POST /api/admin/finances/withdrawal
    ↓
Сервер:
  1. Проверяет доступный баланс
  2. Создает WithdrawalRequest со статусом 'pending'
  3. Переводит сумму в pendingBalance
    ↓
Запрос создан, ждет одобрения
```

---

## Модели данных

### LoyaltyCard (Карта лояльности)

```javascript
{
  id: Integer,
  userId: String (unique),
  balance: Decimal(12,2),           // текущий баланс в рублях
  cashbackRate: Decimal(5,2),       // процент кэшбека
  totalSpent: Decimal(12,2),        // всего потрачено
  totalEarned: Decimal(12,2),       // всего заработано кэшбека
  membershipLevel: Enum['Bronze', 'Silver', 'Gold', 'Platinum'],
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### CardTopUp (Пополнение карты)

```javascript
{
  id: Integer,
  userId: String,
  amount: Decimal(10,2),
  paymentMethod: String,            // card, paypal, crypto, bank_transfer
  status: Enum['pending', 'completed', 'failed'],
  transactionId: String (unique),
  description: Text,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### Payment (Платеж)

```javascript
{
  id: Integer,
  userId: String,
  bookingId: Integer,
  amount: Decimal(10,2),
  currency: String,                 // по умолчанию 'RUB'
  status: Enum['pending', 'completed', 'failed', 'refunded'],
  paymentMethod: String,            // loyalty_card, stripe, paypal, etc.
  stripePaymentId: String,
  stripeChargeId: String,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### AdminWallet (Кошелек администратора)

```javascript
{
  id: Integer,
  adminId: String (unique),
  adminLevel: Integer,              // 1 или 2
  totalBalance: Decimal(12,2),      // всего (доступный + ожидающий)
  availableBalance: Decimal(12,2),  // доступный баланс
  pendingBalance: Decimal(12,2),    // в процессе вывода
  totalReceived: Decimal(12,2),     // всего получено
  totalWithdrawn: Decimal(12,2),    // всего выведено
  isActive: Boolean,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### AdminTransaction (Транзакция администратора)

```javascript
{
  id: Integer,
  adminId: String,
  adminLevel: Integer,
  type: Enum['booking_payment', 'topup_commission', 'withdrawal', 'refund', 'adjustment'],
  amount: Decimal(10,2),
  bookingId: Integer,
  paymentId: Integer,
  description: Text,
  balanceBefore: Decimal(12,2),
  balanceAfter: Decimal(12,2),
  createdAt: DateTime
}
```

### WithdrawalRequest (Запрос на вывод)

```javascript
{
  id: Integer,
  adminId: String,
  adminLevel: Integer,
  amount: Decimal(10,2),
  bankAccount: String,
  status: Enum['pending', 'approved', 'completed', 'rejected'],
  approvedBy: String,
  reason: Text,
  createdAt: DateTime,
  approvedAt: DateTime,
  completedAt: DateTime
}
```

### Transaction (История транзакций пользователя)

```javascript
{
  id: Integer,
  userId: String,
  bookingId: Integer,
  paymentId: Integer,
  type: Enum['debit', 'credit'],    // debit = списание, credit = пополнение
  amount: Decimal(10,2),
  description: Text,
  balanceBefore: Decimal(12,2),
  balanceAfter: Decimal(12,2),
  createdAt: DateTime
}
```

---

## Тестовые данные

При первом запуске сервера создаются:

### Администраторы:

1. **Финансовый администратор (уровень 1)**
   - Email: `admin@example.com`
   - Password: `password123`
   - adminLevel: 1
   - Может управлять финансами

2. **Обычный администратор (уровень 2)**
   - Email: `admin2@example.com`
   - Password: `password123`
   - adminLevel: 2
   - Не может управлять финансами

### Пользователи:

1. **Иван Петров**
   - Email: `user1@example.com`
   - Password: `password123`
   - Баланс карты: 500₽

2. **Мария Сидорова**
   - Email: `user2@example.com`
   - Password: `password123`
   - Баланс карты: 1000₽

---

## 💻 Использование

### На Frontend (React Native)

#### Пополнение карты:

```javascript
import { usePayment } from '../context/PaymentContext';

function MyComponent() {
  const { topUpCard, cardBalance, isProcessing } = usePayment();
  const { user } = useAuth();

  const handleTopUp = async () => {
    try {
      const result = await topUpCard(user.id, 5000, 'card');
      console.log('Пополнение успешно:', result.newBalance);
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  return (
    <TouchableOpacity onPress={handleTopUp} disabled={isProcessing}>
      <Text>Пополнить на 5000₽</Text>
    </TouchableOpacity>
  );
}
```

#### Оплата бронирования:

```javascript
const { payBookingFromCard } = usePayment();

const handlePayBooking = async () => {
  try {
    const result = await payBookingFromCard(bookingId, user.id);
    console.log('Бронирование оплачено:', result.newBalance);
  } catch (error) {
    Alert.alert('Ошибка оплаты', error.message);
  }
};
```

#### Получение баланса:

```javascript
const { getCardBalance } = usePayment();

const loadBalance = async () => {
  const data = await getCardBalance(user.id);
  console.log('Баланс:', data.balance);
};
```

### На Backend (curl примеры)

#### Пополнить карту:

```bash
curl -X POST http://localhost:5002/api/card/topup \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user1-id",
    "amount": 5000,
    "paymentMethod": "card"
  }'
```

#### Получить баланс:

```bash
curl http://localhost:5002/api/card/balance/user1-id
```

#### Оплатить бронирование:

```bash
curl -X POST http://localhost:5002/api/bookings/1/pay-from-card \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user1-id"
  }'
```

#### Финансовая сводка администратора:

```bash
curl "http://localhost:5002/api/admin/finances/summary?userId=admin-user"
```

#### Запрос на вывод:

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

## 🔐 Безопасность

### Текущие проверки:

- Проверка существования пользователя
- Проверка достаточности средств
- Проверка прав администратора (adminLevel)
- Проверка принадлежности операции пользователю
- Логирование всех финансовых операций

### Рекомендуемые улучшения:

- 🔒 Внедрить JWT аутентификацию на всех endpoints
- 🔒 Использовать реальную обработку платежей (Stripe, PayPal)
- 🔒 Добавить двухфакторную аутентификацию для администраторов
- 🔒 Шифровать чувствительные данные (номера счетов)
- 🔒 Добавить аудит логирование всех операций
- 🔒 Реализовать rate limiting на финансовых endpoints
- 🔒 Добавить PCI DSS compliance

---

## 📱 Экраны приложения

### CardTopUpScreen (`src/screens/CardTopUpScreen.js`)

- Отображает текущий баланс
- Позволяет выбрать предустановленные суммы (100, 500, 1000, 5000, 10000₽)
- Позволяет ввести произвольную сумму
- Выбор способа оплаты (карта, PayPal, банк, крипто)
- Подтверждение пополнения

### AdminFinanceDashboard (`src/screens/AdminFinanceDashboard.js`)

- Сводка финансов (общий баланс, доступный баланс)
- Статистика платежей (количество, сумма, среднее)
- История транзакций администратора
- История запросов на вывод
- Создание новых запросов на вывод средств

---

## Известные ограничения

1. **Демо-интеграция платежей** - платежи успешны по умолчанию, нет реальной обработки
2. **Ручное подтверждение выводов** - требует ручного одобрения суперадмином
3. **Одна валюта** - поддерживается только RUB
4. **Без рассрочки** - нет поддержки рассроченных платежей

---

## Поддержка

Для вопросов и предложений по системе платежей создавайте issues в GitHub репозитории.

---

**Версия:** 1.0  
**Дата:** 11 января 2026  
**Статус:** Реализовано для development/demo. Для production требуется подтверждать пополнения через реальные платежные webhooks и держать `ALLOW_DEMO_PAYMENTS=false`.
