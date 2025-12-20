# Villa Jaconda Loyalty App

[![CI](https://github.com/nekopunk44/Loyalty_app/actions/workflows/ci.yml/badge.svg)](https://github.com/nekopunk44/Loyalty_app/actions/workflows/ci.yml)
[![React Native](https://img.shields.io/badge/React_Native-0.83.6-61dafb?logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-55-000?logo=expo)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js)](https://nodejs.org/)

Мобильное приложение программы лояльности для Villa Jaconda. Позволяет гостям бронировать виллы, отслеживать баллы, получать уведомления и управлять своим профилем. Администраторы получают панель управления с аналитикой и инструментами для работы с пользователями и событиями.

---

## Функциональность

### Для пользователя
- Просмотр и бронирование вилл с выбором дат через календарь
- Карта лояльности с уровнями Bronze / Silver / Gold / Platinum
- График расходов за последние 6 месяцев
- Центр уведомлений с фильтрацией по типу
- Push-уведомления на устройство (Expo Push API)
- Загрузка аватара из галереи или камеры
- История бронирований и отзывы (1–5 звёзд)
- Светлая и тёмная тема

### Для администратора
- Dashboard с ключевыми метриками
- Управление пользователями: редактирование, удаление, быстрое пополнение баланса
- Управление событиями: создание, редактирование, смена статуса, дублирование
- Финансовая аналитика (оборот, платежи, пользователи по уровням, популярные объекты)

---

## Технический стек

### Клиент (React Native / Expo)

| Пакет | Версия | Назначение |
|---|---|---|
| expo | ^55.0.23 | Платформа разработки |
| react-native | 0.83.6 | UI-фреймворк |
| @react-navigation/native | ^6.1.7 | Навигация |
| expo-notifications | — | Push-уведомления |
| expo-image-picker | — | Загрузка аватара |
| react-native-svg | — | SVG-графики |
| @react-native-async-storage/async-storage | — | Локальное хранилище |
| react-native-vector-icons | — | Иконки |

### Сервер (Node.js / Express)

| Пакет | Назначение |
|---|---|
| express | HTTP-сервер |
| sequelize + pg | ORM + PostgreSQL |
| jsonwebtoken | JWT-аутентификация |
| bcryptjs | Хэширование паролей |
| jest + supertest | 253 теста |

### Инфраструктура
- **Деплой:** Railway (сервер + БД PostgreSQL)
- **CI/CD:** GitHub Actions (ESLint, серверные тесты на Node 20/22, аудит безопасности)
- **Real-time:** SSE (Server-Sent Events) для уведомлений в реальном времени

---

## Архитектура

```
App.js
├── ThemeProvider        — светлая/тёмная тема
├── AuthProvider         — JWT-аутентификация, роли (user/admin)
├── NotificationProvider — push-токены, SSE-поток, локальные уведомления
├── AnalyticsProvider    — отслеживание событий
├── BookingProvider      — бронирования
├── PaymentProvider      — обработка платежей
├── ReviewProvider       — отзывы
└── UserDataProvider     — профиль, баланс, уровень
```

```
server/
├── routes/          — auth, users, bookings, card, events,
│                      notifications, properties, loyalty, admin
├── models/          — User, Booking, LoyaltyCard, Notification,
│                      Event, Payment, Transaction, Property...
├── middleware/       — verifyToken, requireOwnerOrAdmin
├── utils/           — expoPush, pagination, logger
├── migrations/      — SQL-миграции (001–006)
└── tests/           — 253 теста (Jest + supertest)
```

---

## Быстрый старт

### Требования
- Node.js >= 18
- Expo Go на телефоне или эмулятор

### Установка

```bash
git clone https://github.com/nekopunk44/Loyalty_app.git
cd Loyalty_app
npm install --legacy-peer-deps
```

### Конфигурация

Создайте `.env` в корне:

```env
EXPO_PUBLIC_API_URL=http://localhost:8080/api
```

Создайте `server/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/loyalty
JWT_SECRET=your_secret
NODE_ENV=development
```

### Запуск

```bash
# Клиент
npm start

# Сервер
cd server && npm start
```

---

## CI/CD

GitHub Actions запускает 4 проверки на каждый пуш в `main`/`develop`:

| Проверка | Описание |
|---|---|
| Server tests (Node 20.x / 22.x) | 253 теста, Jest + supertest |
| ESLint (client) | 0 ошибок, макс. 50 предупреждений |
| Security audit (server) | `npm audit --audit-level=high` |
| Security audit (client) | `npm audit --audit-level=high` |

---

## Деплой

### Сервер на Railway

Репозиторий содержит `Dockerfile` в корне. Railway автоматически собирает образ и задаёт переменные окружения через панель управления.

Необходимые переменные:
```
DATABASE_URL
JWT_SECRET
NODE_ENV=production
```

### Клиент (EAS)

```bash
npm install -g eas-cli
eas build --platform android
eas build --platform ios
```

---

## Контакты

- Email: vladbredihin4@gmail.com
- Issues: [github.com/nekopunk44/Loyalty_app/issues](https://github.com/nekopunk44/Loyalty_app/issues)
