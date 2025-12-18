# 📚 Документация项目

Добро пожаловать в проект Villa Jaconda Loyalty App! 

Ниже вы найдете все, что нужно для быстрого старта и разработки.

## 🚀 Для начинающих

| Документец | Описание |
|-----------|---------|
| [README.md](./README.md) | 📖 Начните отсюда - полный обзор проекта |
| [QUICK_START.md](#quick-start) | ⚡ Быстрый старт за 5минут |
| [FAQ.md](./FAQ.md) | ❓ Часто задаваемые вопросы |

## 👨‍💻 Для разработчиков

| Документец | Описание |
|-----------|---------|
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 🔧 Настройка локальной разработки |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 🤝 Как помочь проекту |
| [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) | 💚 Кодекс поведения |
| [server/README.md](./server/README.md) | 🖥️ Backend разработка |

## 🛡️ Безопасность и Admin

| Документец | Описание |
|-----------|---------|
| [SECURITY.md](./SECURITY.md) | 🔐 Политика безопасности и отчеты |
| [LICENSE](./LICENSE) | 📄 MIT лицензия |

## 💳 Платежи и аналитика

| Документец | Описание |
|-----------|---------|
| [PAYMENT_SYSTEM.md](./PAYMENT_SYSTEM.md) | 💰 Полная документация платежей |
| [PAYMENT_IMPLEMENTATION_SUMMARY.md](./PAYMENT_IMPLEMENTATION_SUMMARY.md) | 📝 Краткое резюме платежей |
| [QUICK_START_PAYMENT_SYSTEM.md](./QUICK_START_PAYMENT_SYSTEM.md) | 🚀 Быстрый старт платежей |

## 📞 Поддержка и контакты

| Канал | Где |
|-------|-----|
| 🐛 Отчеты об ошибках | [GitHub Issues](https://github.com/nekopunk44/Loyalty_app/issues) |
| 💬 Вопросы и идеи | [GitHub Discussions](https://github.com/nekopunk44/Loyalty_app/discussions) |
| 📧 Email | vladbredihin4@gmail.com |
| ⭐ Star проект | [GitHub Repository](https://github.com/nekopunk44/Loyalty_app) |

---

## ⚡️ Quick Start

### Установка (3 шага)

```bash
# 1. Клонировать
git clone https://github.com/nekopunk44/Loyalty_app.git
cd Loyalty_app

# 2. Установить зависимости
npm install --legacy-peer-deps

# 3. Запустить
npm start
```

### Требования
- Node.js >= 14.0
- npm >= 6.0
- Expo CLI: `npm install -g expo-cli`

### Запуск на устройстве
```bash
npm start
# Нажмите:
# 'i' - iOS эмулятор
# 'a' - Android эмулятор
# 'w' - Web браузер
# 'e' - Реальное устройство (скан QR)
```

---

## 📖 Путеводители по функциям

### 1️⃣ Аутентификация
```javascript
import { AuthContext } from './context/AuthContext';

const { user, login, register, logout } = useContext(AuthContext);

// Вход
await login(email, password);

// Выход
await logout();
```

### 2️⃣ Бронирования
```javascript
const { createBooking, getBookings } = useContext(BookingContext);

// Создать бронирование
const booking = await createBooking({
  propertyId, startDate, endDate, guests
});

// Получить мои бронирования
const myBookings = await getBookings(userId);
```

### 3️⃣ Платежи
```javascript
const { processPayment } = useContext(PaymentContext);

// PayPal
await processPayPalPayment(amount, bookingId);

// Stripe (Visa/Mastercard)
await processVisaPayment(cardToken, amount, bookingId);

// Криптовалюта
await processCryptoPayment('bitcoin', amount, bookingId);
```

### 4️⃣ Аналитика
```javascript
const { trackEvent, getDashboardStats } = useContext(AnalyticsContext);

// Отследить событие
trackEvent('booking_created', { amount, propertyId });

// Получить KPI
const stats = getDashboardStats();
```

### 5️⃣ Push-уведомления
```javascript
const { sendNotification } = useContext(NotificationContext);

// Отправить уведомление
await sendNotification('paymentSuccess', {
  title: 'Платёж выполнен',
  message: '₽5,000'
});
```

---

## 🏗️ Структура проекта

```
Loyalty_app/
├── 📱 src/                    # Клиентская часть
│   ├── components/            # Переиспользуемые компоненты
│   ├── context/               # State Management (Context API)
│   ├── screens/               # Экраны приложения
│   ├── services/              # Бизнес-логика
│   ├── utils/                 # Утилиты
│   ├── constants/             # Константы
│   └── assets/                # Изображения
├── 🖥️ server/                 # Backend (Node.js)
│   ├── index.js               # Главный файл сервера
│   ├── migrations/            # Миграции БД
│   └── db/                    # Данные БД
├── 📚 Документация
│   ├── README.md              # Основная документация
│   ├── CONTRIBUTING.md        # Гайд для контрибьюторов
│   ├── DEVELOPMENT.md         # Гайд для разработчиков
│   ├── FAQ.md                 # F.A.Q
│   └── PAYMENT_SYSTEM.md      # Платежи
└── ⚙️ Конфигурация
    ├── app.json               # Expo конфигурация
    ├── package.json           # Dependencies
    └── .env.example           # Переменные окружения
```

---

## 🎯 Совет по навигации

1. **Новичок?** → [README.md](./README.md)
2. **Хочу разрабатывать?** → [DEVELOPMENT.md](./DEVELOPMENT.md)
3. **Имеет вопрос?** → [FAQ.md](./FAQ.md)
4. **Хочу помочь?** → [CONTRIBUTING.md](./CONTRIBUTING.md)
5. **Нужны платежи?** → [PAYMENT_SYSTEM.md](./PAYMENT_SYSTEM.md)

---

## 🌟 Ключевые инструменты

- **React Native** - кроссплатформенная разработка
- **Expo** - быстрая разработка и deployment
- **Context API** - управление состоянием
- **AsyncStorage** - локальное хранилище
- **Node.js/Express** - backend API
- **PostgreSQL/Sequelize** - база данных и модели

---

## ✨ Функции

### Пользователь
- ✅ Аутентификация
- ✅ Бронирование вилл
- ✅ Платежи (PayPal, Stripe, Crypto)
- ✅ Отзывы и рейтинги
- ✅ Программа рефералов
- ✅ Карта лояльности
- ✅ Push-уведомления

### Администратор
- ✅ Управление объектами
- ✅ Управление пользователями
- ✅ Статистика и аналитика
- ✅ Управление платежами
- ✅ Отчеты и KPI

---

## 🔄 Жизненный цикл проекта

| Стадия | Status | Примечание |
|--------|--------|-----------|
| v1.0.0 | ✅ Released | Основные функции |
| v1.1.0 | 🔄 Планируется | Улучшения UI/UX |
| v2.0.0 | 📋 Дорожная карта | Новые функции |

---

## 📊 Статистика

- 📦 50+ компонентов
- 🎯 20+ экранов
- 💾 9 Context providers
- 🔌 3 платежные системы
- 📈 10+ отслеживаемых событий
- 🌍 2 платформы (мобиль + web)

---

## 🎓 Полезные ссылки

- [React Native Official](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [React Hooks Guide](https://react.dev/reference/react)
- [Context API](https://react.dev/reference/react/useContext)
- [Node.js Docs](https://nodejs.org/)

---

<div align="center">

## 🚀 Готовы начать?

[Запустите приложение сейчас → README.md](./README.md)

**Вопросы?** 📧 vladbredihin4@gmail.com

★ Не забудьте поставить звёзду! ⭐

</div>

---

_Последнее обновление: 23 февраля 2025_
