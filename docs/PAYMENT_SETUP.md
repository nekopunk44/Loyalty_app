# Настройка реальной системы оплаты

> **Статус:** Руководство по интеграции для Villa Jaconda Loyalty App  
> **Бэкенд:** Express.js + PostgreSQL (server/index.js)  
> **Фронтенд:** React Native (Expo)

---

## Содержание

1. [Обзор архитектуры](#1-обзор-архитектуры)
2. [Stripe — Visa / Mastercard](#2-stripe--visa--mastercard)
3. [PayPal](#3-paypal)
4. [Агропромбанк — банковский перевод](#4-агропромбанк--банковский-перевод)
5. [Эксимбанк — банковский перевод](#5-эксимбанк--банковский-перевод)
6. [Вебхуки и подтверждение платежей](#6-вебхуки-и-подтверждение-платежей)
7. [Переменные окружения](#7-переменные-окружения)
8. [Чеклист перед запуском](#8-чеклист-перед-запуском)

---

## 1. Обзор архитектуры

```
Клиент (React Native)
        │
        │  1. Запрашивает намерение оплаты
        ▼
Сервер (Express)  ──────────────► Stripe / PayPal API
        │                               │
        │  2. Возвращает client_secret  │
        ▼                               │
Клиент завершает оплату ◄───────────────┘
        │
        │  3. Stripe/PayPal отправляет webhook на сервер
        ▼
Сервер подтверждает → зачисляет баланс на LoyaltyCard
```

**Важно:** Баланс зачисляется **только** после подтверждения от платёжного шлюза через вебхук,
никогда не сразу после запроса клиента. Это защищает от мошенничества.

---

## 2. Stripe — Visa / Mastercard

### 2.1 Установка зависимостей

```bash
# Сервер
cd server
npm install stripe

# Клиент
npx expo install @stripe/stripe-react-native
```

### 2.2 Настройка сервера (server/index.js)

Добавить в начало файла:

```javascript
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
```

**Новый endpoint — создание PaymentIntent:**

```javascript
// POST /api/payments/stripe/create-intent
app.post('/api/payments/stripe/create-intent', verifyToken, async (req, res) => {
  try {
    const { amount, userId } = req.body;

    // amount в копейках/тийинах (целое число)
    if (!amount || amount < 100 || amount > 100000000) {
      return res.status(400).json({ error: 'Недопустимая сумма' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),      // в минимальных единицах валюты
      currency: 'rub',                 // или 'usd', 'eur' — зависит от вашего Stripe аккаунта
      metadata: {
        userId: String(userId),
        purpose: 'loyalty_topup',
      },
      automatic_payment_methods: { enabled: true },
    });

    // Сохранить pending-запись
    await CardTopUp.create({
      userId,
      amount: amount / 100,
      paymentMethod: 'card',
      status: 'pending',
      transactionId: paymentIntent.id,
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Stripe intent error:', err);
    res.status(500).json({ error: 'Не удалось создать платёж' });
  }
});
```

**Вебхук Stripe (подтверждение оплаты):**

```javascript
// POST /api/webhooks/stripe
// ВАЖНО: парсить raw body, не JSON
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature invalid:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const { userId, purpose } = intent.metadata;

      if (purpose === 'loyalty_topup') {
        const t = await sequelize.transaction();
        try {
          const topup = await CardTopUp.findOne({
            where: { transactionId: intent.id },
            transaction: t,
          });

          // Idempotency: не зачислять дважды
          if (!topup || topup.status === 'completed') {
            await t.commit();
            return res.json({ received: true });
          }

          const card = await LoyaltyCard.findOne({
            where: { userId },
            lock: true,      // SELECT FOR UPDATE — защита от гонки
            transaction: t,
          });

          const amount = topup.amount;
          await card.update({
            balance:      parseFloat(card.balance) + amount,
            totalEarned:  parseFloat(card.totalEarned) + amount,
          }, { transaction: t });

          await topup.update({ status: 'completed' }, { transaction: t });

          await Transaction.create({
            userId,
            type:          'credit',
            amount,
            description:   `Пополнение через Stripe`,
            balanceBefore: parseFloat(card.balance),
            balanceAfter:  parseFloat(card.balance) + amount,
          }, { transaction: t });

          await t.commit();
        } catch (err) {
          await t.rollback();
          console.error('Stripe webhook processing failed:', err);
          return res.status(500).end();
        }
      }
    }

    res.json({ received: true });
  }
);
```

### 2.3 Настройка клиента (CardTopUpScreen.js)

```javascript
import { StripeProvider, usePaymentSheet } from '@stripe/stripe-react-native';

// Обернуть приложение в App.js:
<StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PK}>
  <App />
</StripeProvider>

// В CardTopUpScreen при нажатии "Оплатить":
const handleStripePayment = async () => {
  // 1. Получить client_secret с сервера
  const res = await apiCall('/api/payments/stripe/create-intent', {
    method: 'POST',
    body: JSON.stringify({ amount: parsedAmount * 100, userId: user.id }),
  });

  // 2. Показать форму карты Stripe
  const { error } = await initPaymentSheet({
    paymentIntentClientSecret: res.clientSecret,
    merchantDisplayName: 'Villa Jaconda',
  });
  if (error) { Alert.alert('Ошибка', error.message); return; }

  const { error: confirmError } = await presentPaymentSheet();
  if (confirmError) {
    Alert.alert('Платёж отменён', confirmError.message);
  } else {
    Alert.alert('Готово', 'Оплата принята. Баланс будет зачислен в течение нескольких секунд.');
  }
};
```

### 2.4 Stripe Dashboard — что настроить

1. **Аккаунт:** [dashboard.stripe.com](https://dashboard.stripe.com) → создать аккаунт
2. **Ключи:** Developers → API keys → скопировать `sk_live_...` и `pk_live_...`
3. **Вебхук:**
   - Developers → Webhooks → Add endpoint
   - URL: `https://ваш-домен.com/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Скопировать `whsec_...` → `STRIPE_WEBHOOK_SECRET`
4. **Валюта:** Убедиться, что Stripe поддерживает RUB для вашей страны
   (Для Таджикистана может потребоваться USD — тогда менять `currency: 'usd'`)

---

## 3. PayPal

### 3.1 Установка

```bash
# Сервер
cd server
npm install @paypal/checkout-server-sdk

# Клиент — используем WebView, нативный SDK не нужен
npx expo install react-native-webview
```

### 3.2 Сервер — создание Order

```javascript
const paypal = require('@paypal/checkout-server-sdk');

const paypalClient = () => {
  const env = process.env.NODE_ENV === 'production'
    ? new paypal.core.LiveEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET
      )
    : new paypal.core.SandboxEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET
      );
  return new paypal.core.PayPalHttpClient(env);
};

// POST /api/payments/paypal/create-order
app.post('/api/payments/paypal/create-order', verifyToken, async (req, res) => {
  const { amount, userId } = req.body;

  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: { currency_code: 'USD', value: (amount / 100).toFixed(2) },
      custom_id: String(userId),
      description: 'Villa Jaconda — пополнение карты лояльности',
    }],
  });

  const order = await paypalClient().execute(request);

  await CardTopUp.create({
    userId,
    amount: amount / 100,
    paymentMethod: 'paypal',
    status: 'pending',
    transactionId: order.result.id,
  });

  const approvalUrl = order.result.links.find(l => l.rel === 'approve').href;
  res.json({ orderId: order.result.id, approvalUrl });
});

// POST /api/payments/paypal/capture-order
app.post('/api/payments/paypal/capture-order', verifyToken, async (req, res) => {
  const { orderId, userId } = req.body;

  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  const capture = await paypalClient().execute(request);

  if (capture.result.status === 'COMPLETED') {
    const t = await sequelize.transaction();
    try {
      const topup = await CardTopUp.findOne({
        where: { transactionId: orderId },
        lock: true,
        transaction: t,
      });

      if (!topup || topup.status === 'completed') {
        await t.commit();
        return res.json({ success: true });
      }

      const card = await LoyaltyCard.findOne({
        where: { userId },
        lock: true,
        transaction: t,
      });

      await card.update({
        balance:     parseFloat(card.balance) + topup.amount,
        totalEarned: parseFloat(card.totalEarned) + topup.amount,
      }, { transaction: t });

      await topup.update({ status: 'completed' }, { transaction: t });
      await t.commit();

      res.json({ success: true });
    } catch (err) {
      await t.rollback();
      res.status(500).json({ error: 'Ошибка при зачислении' });
    }
  } else {
    res.status(400).json({ error: 'Платёж не завершён' });
  }
});
```

### 3.3 Клиент — WebView

```javascript
import { WebView } from 'react-native-webview';

const PayPalWebView = ({ approvalUrl, onSuccess, onCancel }) => (
  <WebView
    source={{ uri: approvalUrl }}
    onNavigationStateChange={({ url }) => {
      if (url.includes('success')) onSuccess();
      if (url.includes('cancel'))  onCancel();
    }}
  />
);
```

### 3.4 PayPal Developer Dashboard

1. Перейти на [developer.paypal.com](https://developer.paypal.com)
2. My Apps & Credentials → Create App → скопировать Client ID и Secret
3. Для продакшена переключить с Sandbox на Live
4. Return URL для WebView: `https://ваш-домен.com/paypal/success`

---

## 4. Агропромбанк — банковский перевод

Агропромбанк не предоставляет публичный API для автоматических платежей.
Используется схема **ручного подтверждения**:

1. Пользователь получает реквизиты → делает перевод → отправляет фото чека
2. Администратор верифицирует чек → вручную зачисляет баланс

### 4.1 Endpoint для ручного зачисления администратором

```javascript
// POST /api/admin/topup/manual
// Только для adminLevel === 1 (финансовый администратор)
app.post('/api/admin/topup/manual', verifyToken, verifyFinanceAdmin, async (req, res) => {
  const { userId, amount, description, reference } = req.body;

  if (!userId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Некорректные данные' });
  }

  const t = await sequelize.transaction();
  try {
    const card = await LoyaltyCard.findOne({
      where: { userId },
      lock: true,
      transaction: t,
    });

    if (!card) {
      await t.rollback();
      return res.status(404).json({ error: 'Карта не найдена' });
    }

    const before = parseFloat(card.balance);
    const after  = before + parseFloat(amount);

    await card.update({ balance: after, totalEarned: parseFloat(card.totalEarned) + parseFloat(amount) }, { transaction: t });

    await CardTopUp.create({
      userId,
      amount,
      paymentMethod: 'bank_transfer',
      status: 'completed',
      transactionId: reference || `MANUAL-${Date.now()}`,
      description: description || 'Ручное пополнение администратором',
    }, { transaction: t });

    await Transaction.create({
      userId,
      type:          'credit',
      amount,
      description:   description || `Банковский перевод: ${reference}`,
      balanceBefore: before,
      balanceAfter:  after,
    }, { transaction: t });

    // Уведомить пользователя
    await Notification.create({
      userId,
      title:   'Баланс пополнен',
      message: `На вашу карту зачислено ${parseFloat(amount).toLocaleString('ru-RU')} ₽`,
      type:    'payment',
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, newBalance: after });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: 'Ошибка зачисления' });
  }
});
```

### 4.2 Реквизиты (уточнить в банке)

| Поле         | Значение                                 |
|--------------|------------------------------------------|
| Банк         | Агропромбанк Таджикистана                |
| Получатель   | ООО «Вилла Джаконда»                     |
| IBAN         | Уточнить в бухгалтерии                   |
| БИК          | Уточнить в бухгалтерии                   |
| Назначение   | Пополнение карты лояльности ID {userId}  |

---

## 5. Эксимбанк — банковский перевод

Аналогичная схема ручного подтверждения (см. раздел 4).
Эксимбанк Таджикистана также не предоставляет открытый платёжный API.

Реквизиты уточнить в головном офисе:
- Сайт: [eximbank.tj](https://eximbank.tj)
- Для подключения корпоративного эквайринга — связаться с отделом ВЭД

---

## 6. Вебхуки и подтверждение платежей

### Принцип работы

```
Stripe/PayPal ──POST──► /api/webhooks/stripe
                              │
                         Проверить подпись
                              │
                    ┌─────────▼─────────┐
                    │  Найти pending     │
                    │  CardTopUp по ID   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  SELECT FOR UPDATE │  ← блокировка строки
                    │  на LoyaltyCard    │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Обновить баланс   │
                    │  Создать Transaction│
                    │  Пометить completed│
                    └─────────┬─────────┘
                              │
                         COMMIT транзакции
```

### Тестирование вебхуков локально

```bash
# Установить Stripe CLI
stripe login
stripe listen --forward-to localhost:5002/api/webhooks/stripe

# Симулировать успешный платёж
stripe trigger payment_intent.succeeded
```

---

## 7. Переменные окружения

Добавить в `server/.env`:

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...         # sk_test_... для разработки
STRIPE_WEBHOOK_SECRET=whsec_...
EXPO_PUBLIC_STRIPE_PK=pk_live_...     # pk_test_... для разработки

# PayPal
PAYPAL_CLIENT_ID=AaBb...
PAYPAL_CLIENT_SECRET=EeFf...

# Безопасность платежей
ALLOW_DEMO_PAYMENTS=false             # НИКОГДА не true в продакшене
MAX_TOPUP_AMOUNT=1000000              # Максимальная сумма пополнения в рублях
```

---

## 8. Чеклист перед запуском

### Stripe
- [ ] Аккаунт верифицирован (KYB пройден)
- [ ] Live-ключи добавлены в .env
- [ ] Вебхук зарегистрирован с правильным URL
- [ ] STRIPE_WEBHOOK_SECRET добавлен
- [ ] Протестировать успешный платёж картой `4242 4242 4242 4242`
- [ ] Протестировать отклонённую карту `4000 0000 0000 0002`
- [ ] Убедиться, что двойное зачисление невозможно (idempotency)

### PayPal
- [ ] Аккаунт Business верифицирован
- [ ] Переключиться с Sandbox на Live
- [ ] Return URL настроен
- [ ] Протестировать полный цикл в Sandbox перед Live

### Банковские переводы
- [ ] Реквизиты проверены с бухгалтерией
- [ ] Endpoint `/api/admin/topup/manual` доступен только финансовому администратору
- [ ] Уведомления пользователю при зачислении работают

### Общее
- [ ] `ALLOW_DEMO_PAYMENTS=false`
- [ ] `NODE_ENV=production`
- [ ] Логирование всех транзакций включено
- [ ] База данных делает бэкапы ежедневно
- [ ] SSL сертификат активен (HTTPS обязателен)
