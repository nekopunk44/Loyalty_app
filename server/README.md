# 🚀 Loyalty App Backend Server

Node.js/Express сервер для приложения Loyalty App с интеграцией Firebase Firestore.

## 📋 Требования

- Node.js v16+
- npm или yarn
- Firebase проект (уже настроен)

## 🔧 Установка и запуск

### 1. Установка зависимостей

```bash
cd server
npm install
```

### 2. Конфигурация Firebase

Скопируй файл `.env.example` в `.env`:

```bash
cp .env.example .env
```

Затем заполни `.env` файл с данными Firebase Admin SDK:

```env
PORT=5000
NODE_ENV=development

FIREBASE_PROJECT_ID=villa-jaconda-loyalty
FIREBASE_PRIVATE_KEY_ID=xxxxxxx
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@villa-jaconda-loyalty.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=xxxxxxx
```

### Как получить Firebase credentials?

1. Перейди в [Firebase Console](https://console.firebase.google.com/)
2. Выбери проект `villa-jaconda-loyalty`
3. Перейди в `Project Settings` → `Service Accounts`
4. Нажми `Generate New Private Key`
5. Скопируй JSON файл и используй значения из него в `.env`

### 3. Запуск сервера

**Development режим (с автоперезагрузкой):**
```bash
npm run dev
```

**Production режим:**
```bash
npm start
```

Сервер будет доступен на `http://localhost:5000`

## 📚 API Endpoints

### Health Check
```
GET /health
```

### Bookings

#### Получить занятые даты объекта
```
GET /api/bookings/property/:propertyId/booked-dates

Ответ:
{
  "success": true,
  "propertyId": "1",
  "bookedDates": ["23.12.2025", "24.12.2025"],
  "count": 2
}
```

#### Создать новое бронирование
```
POST /api/bookings

Body:
{
  "propertyId": "1",
  "userId": "user123",
  "checkInDate": "25.12.2025",
  "checkOutDate": "27.12.2025",
  "guests": 2,
  "notes": "Детская кровать",
  "totalPrice": 400
}

Ответ:
{
  "success": true,
  "message": "Бронирование успешно создано",
  "bookingId": "booking123",
  "booking": {...}
}
```

#### Получить бронирование
```
GET /api/bookings/:bookingId
```

#### Обновить бронирование
```
PATCH /api/bookings/:bookingId

Body:
{
  "status": "confirmed",
  "notes": "Обновленные заметки"
}
```

#### Отменить бронирование
```
DELETE /api/bookings/:bookingId
```

#### Получить бронирования пользователя
```
GET /api/bookings/user/:userId
```

### Properties

#### Получить все объекты
```
GET /api/properties
```

#### Получить один объект
```
GET /api/properties/:propertyId
```

## 🔒 Безопасность

- Используются Firebase Firestore Rules для контроля доступа
- Все запросы проходят валидацию на сервере
- Private Key Firebase хранится в `.env` и не коммитится в Git

## 📝 Логирование

Сервер логирует все ошибки в консоль. Для production используй:
- Winston или Bunyan для структурированного логирования
- Sentry для отслеживания ошибок

## 🚢 Развертывание

### Heroku
```bash
heroku create loyalty-app-server
git push heroku main
heroku config:set FIREBASE_PROJECT_ID=villa-jaconda-loyalty
heroku config:set FIREBASE_PRIVATE_KEY="your_key_here"
# ... остальные переменные окружения
```

### Railway / Render
Аналогично - установи переменные окружения в панели управления.

### Docker
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

## 🐛 Troubleshooting

### Firebase не инициализируется
- Проверь, что `.env` файл заполнен корректно
- Убедись, что `FIREBASE_PRIVATE_KEY` содержит `\n` вместо настоящих переносов строк

### CORS ошибки
- В клиенте используй полный URL сервера: `http://localhost:5000/api`
- На production убедись, что CORS настроен правильно в Express

## 📞 Support

Если есть проблемы, проверь:
1. Статус Firebase сервиса
2. Логи консоли на сервере
3. Network tab в DevTools браузера
