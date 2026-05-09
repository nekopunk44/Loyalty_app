# Руководство по разработке

Руководство для разработчиков по настройке локальной среды разработки.

## 📋 Требования

- **Node.js** >= 14.0 (рекомендуется 18.0+)
- **npm** >= 6.0 или **yarn** >= 1.22
- **Git** >= 2.0
- **Expo CLI** - `npm install -g expo-cli`
- **Android Studio** или **Xcode** (для эмуляции)

## 🚀 Быстрый старт разработки

### 1. Клонирование и установка

```bash
# Клонировать репозиторий
git clone https://github.com/nekopunk44/Loyalty_app.git
cd Loyalty_app

# Установить зависимости
npm install --legacy-peer-deps

# (Optional) Если используется монорепо или несколько пакетов
npm install -g lerna
lerna bootstrap
```

### 2. Конфигурация окружения

```bash
# Скопировать .env пример
cp .env.example .env

# Отредактировать .env с вашими значениями
nano .env
# или
code .env
```

### 3. Запуск в разработке

```bash
# Основной приложение
npm start

# Backend сервер (в другом терминале)
cd server
npm start
```

## 📱 Запуск на устройстве

### iOS (macOS только)

```bash
# На iOS эмуляторе
npm start
# Нажміть 'i' в меню Expo

# Или напрямую
expo start --ios
```

### Android

```bash
# На Android эмуляторе
npm start
# Нажмите 'a' в меню Expo

# Или напрямую
expo start --android

# На реальном Android устройстве
# 1. Скачайте Expo Go приложение
# 2. npm start
# 3. Отсканируйте QR код в Expo Go
```

### Web

```bash
npm start
# Нажмите 'w' в меню Expo
# или
expo start --web
```

## 🏗️ Структура разработки

```
Loyalty_app/
├── src/
│   ├── components/          # Компоненты
│   ├── context/             # State Management
│   ├── screens/             # Экраны приложения
│   ├── services/            # Бизнес-логика
│   ├── utils/               # Утилиты
│   ├── constants/           # Константы
│   └── assets/              # Изображения
├── server/                  # Backend
│   ├── index.js             # Точка входа сервера
│   ├── migrations/          # БД миграции
│   └── db/                  # Данные БД
├── App.js                   # Root компонент
├── app.json                 # Конфигурация Expo
└── package.json             # Dependencies
```

## 🔧 Инструменты разработки

### ESLint - проверка кода

```bash
# Проверить синтаксис
npm run lint

# Автоматически исправить
npm run lint:fix
```

### Prettier - форматирование

```bash
# Форматировать код
npm run format

# Проверить форматирование
npm run format:check
```

### Testing

```bash
# Запустить тесты
npm test

# С coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## 📝 Стиль кода

### JavaScript/React Native

**Переменные:**
```javascript
// ✅ HОРОШО - описательные имена
const userBookings = getUserBookings(userId);
const isBookingValid = validateBooking(booking);

// ❌ ПЛОХО - непонятные имена
const ub = getBk(u);
const isValid = val(b);
```

**Функции:**
```javascript
// ✅ ХОРОШО - стрелочные функции, async/await
const fetchUserData = async (userId) => {
  try {
    const user = await api.get(`/users/${userId}`);
    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
};

// ❌ ПЛОХО - callbacks, нет error handling
function fetchUserData(userId, callback) {
  api.get(`/users/${userId}`, callback);
}
```

**JSDoc комментарии:**
```javascript
/**
 * Подсчитать общую цену бронирования
 * @param {Object} booking - объект бронирования
 * @param {number} booking.nights - количество ночей
 * @param {number} booking.pricePerNight - Цена за ночь
 * @returns {number} Общая цена
 * @throws {Error} Если booking некорректна
 */
const calculateTotal = (booking) => {
  if (!booking || !booking.nights) {
    throw new Error('Invalid booking');
  }
  return booking.nights * booking.pricePerNight;
};
```

## 🐛 Отладка

### Логирование

```javascript
// ✅ ХОРОШО - информативные логи
console.log('User booking created:', { userId, bookingId, amount });

// ❌ ПЛОХО - неинформативные логи
console.log('done');
console.log(data);
```

### React DevTools

```bash
# Установить расширение для браузера
# Chrome: React Developer Tools
# Firefox: React Developer Tools

# Использовать в приложении
import DevTools from 'react-devtools';
```

### Network debugging

```bash
# Использовать React Native Debugger
brew install react-native-debugger

# Или встроенное Expo DevTools
# Нажмите 'd' в меню Expo
```

## 🚀 Deployment Process

### Подготовка к продакшену

```bash
# Проверить production переменные
npm run build

# Запустить production build
npm run build:prod

# Тестировать production build
expo start --prod
```

### EAS Build

```bash
# Установить EAS CLI
npm install -g eas-cli

# Инициализировать проект
eas init

# Построить для iOS
eas build --platform ios

# Построить для Android
eas build --platform android

# Отправить в App Store / Play Market
eas submit --platform ios
eas submit --platform android
```

## 📚 Каталог документации

- [README.md](./README.md) - Основная документация
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Гайд для контрибьюторов
- [PAYMENT_SYSTEM.md](./PAYMENT_SYSTEM.md) - Документация платежей
- [server/README.md](./server/README.md) - Backend документация

## 🆘 Решение проблем

### Проблема: Зависимости не устанавливаются

```bash
# Решение 1: Очистить кеш
npm cache clean --force
rm -rf node_modules
npm install --legacy-peer-deps

# Решение 2: Использовать yarn
yarn install

# Решение 3: Использовать более свежую версию Node
nvm use 18
npm install
```

### Проблема: Эмулятор не запускается

```bash
# Android Studio должен быть установлен
# Проверить инсталляцию
adb devices

# iOS Simulator
open /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app
```

### Проблема: "Cannot find module" ошибки

```bash
# Это часто решается очисткой Expo кеша
expo start -c

# Или полной переинсталляцией
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## 📞 Нужна помощь?

- 📖 Прочитайте [README.md](./README.md)
- 💬 Создайте [GitHub Issue](https://github.com/nekopunk44/Loyalty_app/issues)
- 🤝 Спросите в [GitHub Discussions](https://github.com/nekopunk44/Loyalty_app/discussions)
- 📧 Email: vladbredihin4@gmail.com

---

**Happy coding! 🚀**

_Последнее обновление: 23 февраля 2025_
