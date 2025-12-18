# 🏨 Villa Jaconda Loyalty App

[![React Native](https://img.shields.io/badge/React_Native-0.71.8-61dafb?logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~48.0.0-000?logo=expo)](https://expo.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-success)]()

**Мобильное приложение программы лояльности** для управления бронированиями вилл, платежами и отслеживанием статуса пользователя.

---

## 📋 Содержание

- [✨ Функциональность](#-функциональность)
- [🛠️ Технический стек](#%EF%B8%8F-технический-стек)
- [📁 Структура проекта](#-структура-проекта)
- [🚀 Быстрый старт](#-быстрый-старт)
- [📱 Интеграции](#-интеграции)
- [🔍 Аналитика](#-аналитика)
- [👥 Роли пользователей](#-роли-пользователей)
- [📚 Документация](#-документация)
- [🤝 Помощь и поддержка](#-помощь-и-поддержка)
- [🔄 Развертывание](#-развертывание)
- [🔮 Будущие улучшения](#-будущие-улучшения)

## ✨ Функциональность

### Этап 1 - Основные функции ✅
- 🌙 Светлая/тёмная тема с сохранением предпочтений
- 📅 История бронирований с отзывами (5 звёзд + текст)
- 🎁 Программа рефералов с кодами приглашения
- 🏆 Система уровней пользователя (Bronze/Silver/Gold/Platinum)
- ✨ Анимированные карточки и переходы

### Этап 2 - Система платежей ✅
- 💳 PayPal интеграция
- 💰 Visa/MasterCard (Stripe)
- ₿ Криптовалюта (Bitcoin, Ethereum, USDT) с QR-кодами
- 🛒 Оформление покупки с выбором метода
- 📊 История платежей и счётов

### Этап 3 - Push-Уведомления & Аналитика ✅
- 🔔 Push-уведомления (expo-notifications)
  - 8 типов событий (бронирование, платёж, рефераль, отзыв и т.д.)
  - 📬 Центр уведомлений с фильтрацией
  - ✓ Отметить как прочитанное / удалить
  
- 📈 Комплексная аналитика
  - Отслеживание 10+ типов событий
  - КПП и метрики эффективности
  - 5-табовая админ-панель статистики
  - Распределение по методам платежа, уровням пользователей, лучшим объектам

## 🛠️ Технический стек

### Основные зависимости
| Пакет | Версия | Назначение |
|-------|--------|-----------|
| react-native | 0.71.8 | Фреймворк для мобильных приложений |
| expo | ~48.0.0 | Платформа для разработки |
| react-navigation | 6.5.7 | Навигация между экранами |
| async-storage | ^1.17.12 | Локальное хранилище данных |
| vector-icons | ^9.2.0 | Иконки |
| reanimated | 2.14.4 | Анимации |
| expo-notifications | ^0.18.0 | Push-уведомления |
| qrcode-svg | ^6.2.1 | QR-коды |

### Архитектура состояния (Context API)

```
App.js
├── 🎨 ThemeProvider (светлая/тёмная тема)
├── 🔐 AuthProvider (аутентификация, роли)
├── 🔔 NotificationProvider (push-уведомления)
├── 📊 AnalyticsProvider (отслеживание событий)
├── 📅 BookingProvider (управление бронированиями)
├── 🎁 ReferralProvider (программа рефералов)
├── 💳 PaymentProvider (обработка платежей)
├── ✍️ ReviewProvider (отзывы)
└── 👤 UserDataProvider (данные пользователя)
```

## 🚀 Быстрый старт

### 📋 Требования к системе
- **Node.js** >= 14.0
- **npm** >= 6.0 или **yarn** >= 1.22
- **Expo CLI**: `npm install -g expo-cli`
- Эмулятор Android или iPhone (или Expo Go приложение)

### ⚙️ Пошаговая установка

#### 1️⃣ Клонирование репозитория
```bash
git clone https://github.com/nekopunk44/Loyalty_app.git
cd Loyalty_app
```

#### 2️⃣ Установка зависимостей
```bash
npm install --legacy-peer-deps
# или
yarn install
```

#### 3️⃣ Запуск приложения
```bash
npm start
# или
expo start
```

#### 4️⃣ Запуск на устройстве
В интерактивном меню Expo нажмите:
- **`i`** - запустить на iOS эмуляторе
- **`a`** - запустить на Android эмуляторе
- **`w`** - запустить в браузере
- **`e`** - отправить ссылку на устройство (Expo Go)

### 🔧 Дополнительная конфигурация

Настройте ваш `.env` файл (если необходимо):
```env
FIREBASE_API_KEY=your_key
PAYPAL_CLIENT_ID=your_client_id
STRIPE_PUBLIC_KEY=your_public_key
```

## 📁 Структура проекта

```
Loyalty_app/
├── 📱 src/
│   ├── components/              # Переиспользуемые компоненты
│   │   ├── AnimatedCard.js       # Card с анимациями
│   │   ├── BookingCalendar.js    # Календарь бронирований
│   │   ├── PropertyCarousel.js   # Карусель объектов
│   │   ├── ReviewCard.js         # Карточка отзыва
│   │   ├── StarRating.js         # Рейтинг звёзд
│   │   └── ...
│   ├── constants/               # Константы приложения
│   │   └── theme.js             # Цвета, размеры, радиусы
│   ├── context/                 # State Management (Context API)
│   │   ├── AuthContext.js        # Аутентификация & роли
│   │   ├── ThemeContext.js       # Тёмная/светлая тема
│   │   ├── BookingContext.js     # Бронирования + отзывы
│   │   ├── ReferralContext.js    # Программа рефералов
│   │   ├── PaymentContext.js     # Платежи
│   │   ├── NotificationContext.js # Push-уведомления
│   │   ├── AnalyticsContext.js   # Аналитика & события
│   │   └── ...
│   ├── screens/                 # Экраны приложения
│   │   ├── LoginScreen.js        # Вход/регистрация
│   │   ├── HomeScreen.js         # Главная страница
│   │   ├── BookingScreen.js      # Бронирование вилл
│   │   ├── CheckoutScreen.js     # Оформление платежа
│   │   ├── ProfileScreen.js      # Профиль пользователя
│   │   ├── MyCardScreen.js       # Карта лояльности
│   │   ├── NotificationCenter.js # Центр уведомлений
│   │   ├── SettingsScreen.js     # Настройки
│   │   ├── AdminDashboard.js     # Админ-панель
│   │   ├── AdminStats.js         # Статистика (5 табов)
│   │   ├── AdminEvents.js        # Управление событиями
│   │   ├── AdminUsers.js         # Управление пользователями
│   │   └── ...
│   ├── services/                # Бизнес-логика
│   │   ├── BookingService.js     # Логика бронирований
│   │   ├── DatabaseService.js    # БД операции
│   │   ├── FirebaseService.js    # Firebase интеграция
│   │   ├── LoyaltyCardService.js # Карта лояльности
│   │   ├── PropertyService.js    # Объекты недвижимости
│   │   └── EncryptionService.js  # Шифрование данных
│   ├── utils/                   # Утилиты
│   │   ├── api.js               # API запросы
│   │   ├── apiUrl.js            # URL endpoints
│   │   ├── apiExamples.js       # Примеры API
│   │   ├── eventStyles.js       # Стили для событий
│   │   └── pluralize.js         # Множественное число
│   └── assets/                  # Изображения и ресурсы
│       ├── luks/                # Элитные виллы
│       ├── standart/            # Стандартные виллы
│       └── zad/                 # Загородные дома
│
├── 🖥️ server/                   # Backend сервер
│   ├── index.js                 # Основной файл сервера
│   ├── migrate.js               # Миграции БД
│   ├── seed.js                  # Заполнение тестовых данных
│   ├── migrations/              # SQL миграции
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_event_fields.sql
│   │   └── ...
│   ├── db/                      # Данные БД
│   │   ├── bookings.json
│   │   └── properties.json
│   └── package.json
│
├── 📖 App.js                    # Корневой компонент
├── app.json                     # Конфигурация Expo
├── package.json                 # Dependencies
├── .gitignore                   # Git исключения
│
├── 📚 Документация
│   ├── README.md                # Этот файл
│   ├── PAYMENT_SYSTEM.md        # Система платежей
│   ├── PAYMENT_IMPLEMENTATION_SUMMARY.md
│   └── QUICK_START_PAYMENT_SYSTEM.md
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

## 📱 Интеграции

### Платежные системы

#### 💳 PayPal
```javascript
import { PaymentContext } from './context/PaymentContext';

const { processPayPalPayment } = useContext(PaymentContext);

// Использование
await processPayPalPayment(amount, bookingId, description);
```

#### 💰 Stripe (Visa/MasterCard)
```javascript
await processVisaPayment(cardToken, amount, bookingId);
```

#### ₿ Криптовалюта
```javascript
await processCryptoPayment(
  'bitcoin' | 'ethereum' | 'usdt',
  amount,
  bookingId
);
// Возвращает QR-код для оплаты
```

### 🔔 Push-Уведомления

```javascript
import { NotificationContext } from './context/NotificationContext';

const { 
  sendNotification,
  scheduleNotification,
  notifications,
  markAsRead,
  deleteNotification 
} = useContext(NotificationContext);

// Отправить уведомление
await sendNotification('paymentSuccess', {
  title: 'Платёж успешен',
  message: 'Сумма: ₽5,000'
});

// Запланировать уведомление
await scheduleNotification(
  'bookingReminder',
  { propertyName: 'Villa Luxe' },
  { seconds: 3600 } // За час до заезда
);
```

## 🔍 Аналитика

### Отслеживаемые события (10+)

| Событие | Тип | Описание |
|---------|-----|---------|
| `booking_created` | 🔵 | Новое бронирование создано |
| `booking_completed` | ✅ | Бронирование завершено |
| `payment_processed` | 💳 | Платёж успешно обработан |
| `review_submitted` | ⭐ | Отзыв отправлен |
| `user_registered` | 👤 | Пользователь зарегистрирован |
| `tier_updated` | 🏆 | Уровень пользователя изменился |
| `property_viewed` | 👁️ | Объект просмотрен |
| `referral_used` | 🎁 | Код реферала использован |
| `payment_method_used` | 🔑 | Метод платежа выбран |
| `notification_sent` | 📬 | Уведомление отправлено |

### API аналитики

```javascript
import { AnalyticsContext } from './context/AnalyticsContext';

const { 
  trackEvent,
  getDashboardStats,
  getStatsByPeriod,
  getPaymentMethodStats,
  getUserTierStats
} = useContext(AnalyticsContext);

// Отследить событие
trackEvent('booking_created', {
  propertyId: 'prop_123',
  amount: 5000,
  paymentMethod: 'paypal'
});

// Получить KPI (Key Performance Indicators)
const kpis = getDashboardStats();
// { totalRevenue, totalBookings, avgRating, userGrowth, ... }

// Статистика по периодам
const stats = getStatsByPeriod('2024-01', '2024-02');

// Распределение по методам платежей
const paymentStats = getPaymentMethodStats();
// { paypal: 45%, stripe: 35%, crypto: 20% }

// Пользователи по уровням
const tierStats = getUserTierStats();
// { bronze: 500, silver: 300, gold: 150, platinum: 50 }
```

### 📊 Админ-панель статистики (5 табов)

1. **Обзор** - KPI, индикаторы, метрики эффективности
2. **Оборот** - График доходов, прогнозирование, линия тренда
3. **Платежи** - Распределение по методам, конверсия
4. **Пользователи** - Уровни (Bronze/Silver/Gold/Platinum), активные юзеры
5. **Объекты** - Популярные виллы, доходность по объектам

## 👥 Роли пользователей

### 👤 Обычный пользователь
- 👁️ Просмотр доступных вилл и объектов
- 📅 Бронирование вилл с выбором дат
- 💳 Платежи несколькими способами (PayPal, Stripe, Крипто)
- 🔄 Просмотр истории бронирований
- ⭐ Написание и просмотр отзывов (1-5 звёзд)
- 🎁 Участие в программе рефералов
- 📬 Центр уведомлений с фильтрацией
- 🏆 Отслеживание уровня лояльности

### 🛡️ Администратор
- 📊 **Панель управления** (Dashboard)
  - Быстрый доступ к ключевым метрикам
  - Список активных бронирований
  
- 📅 **Управление событиями**
  - Создание, редактирование, удаление событий
  
- 📈 **Статистика** (5 специализированных табов)
  - Обзор KPI и метрик
  - Анализ оборота и доходов
  - Распределение платежей
  - Демография пользователей
  - Популярность объектов
  
- 👥 **Управление пользователями**
  - Просмотр профилей
  - Управление уровнями (Bronze/Silver/Gold/Platinum)
  - Заблокировать/разблокировать пользователей
  
- 🏠 **Управление объектами**
  - Добавление/редактирование вилл
  - Управление изображениями
  - Установка цен и доступности

## 📚 Документация

Дополнительная документация проекта:

| Документ | Описание |
|----------|---------|
| [PAYMENT_SYSTEM.md](./PAYMENT_SYSTEM.md) | 💳 Полная документация платежной системы |
| [PAYMENT_IMPLEMENTATION_SUMMARY.md](./PAYMENT_IMPLEMENTATION_SUMMARY.md) | 📝 Краткое резюме реализации платежей |
| [QUICK_START_PAYMENT_SYSTEM.md](./QUICK_START_PAYMENT_SYSTEM.md) | 🚀 Быстрый старт для платежей |
| [server/README.md](./server/README.md) | 🖥️ Документация backend сервера |

## 🚀 Развертывание

### EAS (Expo Application Services)

```bash
# Установка EAS CLI
npm install -g eas-cli

# Инициализация проекта
eas init

# Сборка для iOS
eas build --platform ios

# Сборка для Android
eas build --platform android

# Загрузка в App Store / Google Play
eas submit --platform ios
eas submit --platform android
```

### Локальное тестирование

```bash
# Запуск в режиме разработки
npm start

# С горячей перезагрузкой
npm start -- --dev-client
```

## 🔮 Будущие улучшения

- [ ] Real-time уведомления со звуком и вибрацией
- [ ] Экспорт аналитики в PDF/CSV/Excel
- [ ] Углублённая интеграция Firebase Realtime DB
- [ ] Персональные рекомендации на основе ML
- [ ] Интеграция с CRM-системами (Salesforce, HubSpot)
- [ ] API для партнёрских приложений
- [ ] Web-версия админ-панели
- [ ] Многоязычная поддержка (i18n)
- [ ] Offline-mode с синхронизацией
- [ ] Социальные сегменты и сегментирование аудитории

## 🤝 Помощь и поддержка

### Проблемы и ошибки
Если вы столкнулись с проблемой, пожалуйста:
1. Проверьте [существующие Issues](https://github.com/nekopunk44/Loyalty_app/issues)
2. Соберите информацию об ошибке (скриншоты, логи)
3. [Создайте новое Issue](https://github.com/nekopunk44/Loyalty_app/issues/new)

### Вопросы и предложения
- 💬 Обсудить идеи: [GitHub Discussions](https://github.com/nekopunk44/Loyalty_app/discussions)
- 📧 Email: vladbredihin4@gmail.com

### Полезные ресурсы
- [React Native документация](https://reactnative.dev/)
- [Expo документация](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Context API гайд](https://react.dev/reference/react/useContext)

##  ��������

MIT License - �������� [LICENSE](./LICENSE) ��� ����� ��������� ����������.

---

##  �����������

**Villa Jaconda Loyalty App** - ������������������� ������� ���������� ���������� ���������� ��� ������������ ������� ����.

-  **�������**: 50+ ������� � �����������
-  **����������**: React Native, Expo, Context API
-  **�������**: 3 ������� (PayPal, Stripe, Crypto)
-  **���������**: Real-time ���������� � KPI
-  **�����������**: Push-����������� � �������� �������

---

<div align="center">

**[ ��������� � ������](#-villa-jaconda-loyalty-app)**

_������� �  ��� Villa Jaconda_

</div>
