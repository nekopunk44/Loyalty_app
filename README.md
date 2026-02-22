# Villa Jaconda Loyalty App

**Мобильное приложение программы лояльности** для управления бронированиями вилл, платежами и отслеживанием статуса пользователя.

## Функциональность

### Этап 1 - Основные функции ✅
- Светлая/тёмная тема с сохранением предпочтений
- История бронирований с отзывами (5 звёзд + текст)
- Программа рефералов с кодами приглашения
- Система уровней пользователя (Bronze/Silver/Gold/Platinum)
- Анимированные карточки и переходы

### Этап 2 - Система платежей ✅
- PayPal интеграция
- Visa/MasterCard (Stripe)
- ₿ Криптовалюта (Bitcoin, Ethereum, USDT) с QR-кодами
- Оформление покупки с выбором метода
- История платежей и счётов

### Этап 3 - Push-Уведомления & Аналитика ✅
- Push-уведомления (expo-notifications)
  - 8 типов событий (бронирование, платёж, рефераль, отзыв и т.д.)
  - Центр уведомлений с фильтрацией
  - Отметить как прочитанное / удалить
  
- Комплексная аналитика
  - Отслеживание 10+ типов событий
  - КПП и метрики эффективности
  - 5-табовая админ-панель статистики
  - Распределение по методам платежа, уровням пользователей, лучшим объектам

## Технический стек

```json
{
  "react-native": "0.71.8",
  "expo": "~48.0.0",
  "react-navigation": "6.5.7",
  "@react-native-async-storage/async-storage": "^1.17.12",
  "react-native-vector-icons": "^9.2.0",
  "react-native-gesture-handler": "^2.10.3",
  "react-native-reanimated": "2.14.4",
  "expo-notifications": "^0.18.0",
  "expo-barcode-scanner": "^11.4.0",
  "react-native-qrcode-svg": "^6.2.1"
}
```

### Архитектура состояния (Context API)

```
App.js
├── ThemeProvider (светлая/тёмная тема)
├── AuthProvider (аутентификация, роли)
├── NotificationProvider (push-уведомления)
├── AnalyticsProvider (отслеживание событий)
├── BookingProvider (управление бронированиями)
├── ReferralProvider (программа рефералов)
└── PaymentProvider (обработка платежей)
```

## Быстрый старт

### 1. Установка зависимостей
```bash
npm install --legacy-peer-deps
```

### 2. Запуск приложения
```bash
npm start
```

### 3. Открыть в эмуляторе
- iOS: `i`
- Android: `a`
- Web: `w`

## Структура проекта

```
src/
├── components/
│   ├── AnimatedCard.js (масштабирование, затухание)
│   ├── Cards.js
│   └── FadeView.js
├── constants/
│   └── theme.js (цвета, отступы, радиусы)
├── context/
│   ├── AuthContext.js (аутентификация)
│   ├── ThemeContext.js (тёмная/светлая тема)
│   ├── BookingContext.js (бронирования + отзывы)
│   ├── ReferralContext.js (рефералы)
│   ├── PaymentContext.js (платежи)
│   ├── NotificationContext.js (push-уведомления)
│   └── AnalyticsContext.js (аналитика & события)
├── screens/
│   ├── LoginScreen.js
│   ├── HomeScreen.js
│   ├── BookingScreen.js
│   ├── CheckoutScreen.js (платежи)
│   ├── ProfileScreen.js (профиль + отзывы)
│   ├── MyCardScreen.js (карта лояльности)
│   ├── EventsScreen.js
│   ├── NotificationCenter.js (новое!)
│   ├── SettingsScreen.js
│   ├── AdminDashboard.js
│   ├── AdminStats.js (обновлена)
│   ├── AdminEvents.js
│   └── AdminUsers.js
├── App.js (навигация + провайдеры)
└── package.json
```

## API Contexts

### NotificationContext
```javascript
const { 
  sendNotification,
  scheduleNotification,
  notifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  notificationsEnabled
} = useContext(NotificationContext);

// Отправить уведомление
await sendNotification('paymentSuccess', {
  title: 'Платёж успешен',
  message: 'Сумма: ₽5,000'
});
```

### AnalyticsContext
```javascript
const { 
  trackEvent,
  getDashboardStats,
  getStatsByPeriod,
  getPaymentMethodStats,
  getUserTierStats,
  resetAnalytics
} = useContext(AnalyticsContext);

// Отследить событие
trackEvent('booking_created', {
  propertyId: 'prop_123',
  amount: 5000
});

// Получить КПП
const kpis = getDashboardStats();
```

## Интеграция платежей

### PayPal
```javascript
await processPayPalPayment(amount, bookingId, description);
```

### Visa/Stripe
```javascript
await processVisaPayment(cardToken, amount, bookingId, description);
```

### Криптовалюта
```javascript
await processCryptoPayment(cryptoType, amount, bookingId);
// cryptoType: 'bitcoin', 'ethereum', 'usdt'
```

## Аналитика - Отслеживаемые события

- `booking_created` - Новое бронирование
- `booking_completed` - Бронирование завершено
- `payment_processed` - Платёж обработан
- `review_submitted` - Отзыв отправлен
- `user_registered` - Пользователь зарегистрирован
- `tier_updated` - Уровень изменился
- `property_viewed` - Объект просмотрен
- `property_booked` - Объект заброниирован
- `referral_used` - Код рефералa использован
- `payment_method_used` - Метод платежа выбран

## Роли пользователей

### Пользователь
- Просмотр доступных вилл
- Бронирование и платежи
- История бронирований и отзывы
- Программа рефералов
- Центр уведомлений

### Администратор
- Панель управления (Dashboard)
- Управление событиями
- **Статистика** (5 табов):
  - Обзор (КПП, индикаторы, метрики)
  - Оборот (график доходов, рост)
  - Платежи (методы, распределение)
  - Пользователи (уровни, топ активные)
  - Объекты (лучшие по просмотрам/доходам)
- Управление пользователями

## Документация

Подробнее см. в:
- [PAYMENT_SYSTEM.md](./PAYMENT_SYSTEM.md) - Документация платежной системы
- [NOTIFICATIONS_ANALYTICS.md](./NOTIFICATIONS_ANALYTICS.md) - Push-уведомления и аналитика

## Будущие улучшения

- Real-time уведомления со звуком
- Экспорт аналитики в PDF/CSV
- Интеграция с Firebase для углублённого отслеживания
- Персональные рекомендации на основе ML
- Интеграция с CRM-системами
- API для мобильного приложения

## Разработка

Файл изменений документирован в git. Для развёртывания:

```bash
# Сборка для EAS
eas build --platform ios
eas build --platform android

# Распределение
eas submit --platform ios
eas submit --platform android
```

## Лицензия

MIT

---

**Villa Jaconda Loyalty App** - Полнофункциональная система управления программой лояльности для бронирования элитных вилл.
