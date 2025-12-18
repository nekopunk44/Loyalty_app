# Часто задаваемые вопросы (FAQ)

## 🎯 Общие вопросы

### Что такое Villa Jaconda Loyalty App?

Это полнофункциональное мобильное приложение программы лояльности для управления бронированиями вилл, платежами и аналитикой. Разработано на React Native с поддержкой iOS, Android и Web.

### Кому подходит это приложение?

- 🏢 Компаниям сдачи в аренду (виллы, квартиры)
- 🏨 Отелям с программой лояльности
- 🎯 Бизнесу, нужна система управления бронированиями и платежами
- 👨‍💻 Разработчикам, которые хотят использовать это как основу

### Лицензия?

Приложение распространяется под MIT лицензией - вы можете использовать, модифицировать и распространять его свободно.

---

## 🚀 Установка и запуск

### Я установил Node.js, но npm не работает?

```bash
# Убедитесь, что Node.js установлен
node --version

# Переустановите Node.js с официального сайта
# https://nodejs.org/
```

### Ошибка "expo is not recognized"?

```bash
# Expo CLI не установлен глобально
npm install -g expo-cli

# Потом используйте
expo start
# или просто
npm start
```

### Не могу запустить на iOS/Android?

**iOS:**
- Требуется macOS и Xcode установлены
- Используйте iOS Simulator или реальное устройство с Expo Go

**Android:**
- Установите Android Studio
- Создайте Android Virtual Device (AVD)
- Убедитесь, что `adb devices` показывает ваше устройство

```bash
# Проверить инсталляцию Android
adb devices

# Если пусто, переустановите Android SDK
```

### Какие требования к системе?

- **Node.js**: >= 14.0 (рекомендуется 18.0+)
- **npm**: >= 6.0
- **Expo CLI**: последняя версия
- **ОС**: Windows, macOS, Linux
- **Память**: минимум 4GB RAM

---

## 💳 Платежи

### Какие системы платежей поддерживаются?

1. **PayPal** - мировая платежная система
2. **Stripe** - поддержка Visa/MasterCard
3. **Криптовалюта** - Bitcoin, Ethereum, USDT

### Как интегрировать PayPal?

1. Создайте аккаунт на [paypal.com/developers](https://www.paypal.com/cgi-bin/webscr)
2. Получите Client ID
3. Добавьте в `.env`:
```env
EXPO_PUBLIC_PAYPAL_CLIENT_ID=your_client_id
```
4. Используйте функцию в коде:
```javascript
await processPayPalPayment(amount, bookingId, description);
```

### Как добавить Stripe?

1. Зарегистрируйтесь на [stripe.com](https://stripe.com)
2. Получите Publishable Key
3. Добавьте в `.env`:
```env
EXPO_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
```
4. Используйте в коде:
```javascript
await processVisaPayment(cardToken, amount, bookingId);
```

### Поддерживается ли криптовалюта?

Да, поддерживаются:
- **Bitcoin** (BTC)
- **Ethereum** (ETH)
- **USDT** (Tether USD)

Платежи работают через QR-коды. Подробнее в [PAYMENT_SYSTEM.md](./PAYMENT_SYSTEM.md).

---

## 🔔 Push-уведомления

### Как включить push-уведомления?

```javascript
import { NotificationContext } from './context/NotificationContext';

const { sendNotification } = useContext(NotificationContext);

// Отправить уведомление
await sendNotification('paymentSuccess', {
  title: 'Платёж успешен',
  message: 'Спасибо за покупку!'
});
```

### Какие типы уведомлений поддерживаются?

- `bookingCreated` - новое бронирование
- `bookingConfirmed` - подтверждение бронирования
- `paymentSuccess` - платёж выполнен
- `paymentFailed` - ошибка платежа
- `reviewRequested` - запрос отзыва
- `referralUsed` - использован реферальный код
- `tierUpgraded` - повышение уровня
- `notificationBasic` - базовое уведомление

### Работают ли уведомления на всех платформах?

- ✅ **Android** - полная поддержка
- ✅ **iOS** - полная поддержка (требуется разрешение)
- ⚠️ **Web** - ограниченная поддержка (зависит от браузера)

---

## 📊 Аналитика

### Как отслеживать события?

```javascript
import { AnalyticsContext } from './context/AnalyticsContext';

const { trackEvent } = useContext(AnalyticsContext);

trackEvent('booking_created', {
  userId: '123',
  propertyId: 'villa_1',
  amount: 5000
});
```

### Какие события отслеживаются?

Смотрите полный список в [README.md](./README.md#-аналитика).

### Как получить статистику?

```javascript
const { getDashboardStats } = useContext(AnalyticsContext);

// Получить KPI
const kpis = getDashboardStats();
// { totalRevenue, totalBookings, avgRating, userGrowth, ... }

// Статистика по периодам
const stats = getStatsByPeriod('2024-01', '2024-02');

// Платежи по методам
const paymentStats = getPaymentMethodStats();
```

---

## 👥 Аутентификация и роли

### Как работает система пользователей?

2 типа ролей:
1. **User** - обычный пользователь
2. **Admin** - администратор

```javascript
const { user } = useContext(AuthContext);

if (user?.role === 'admin') {
  // Показать админ-панель
}
```

### Как создать админа?

Посмотрите в `server/restore-admin.js`:
```bash
cd server
node restore-admin.js
```

### Как работает двухфакторная аутентификация?

Сейчас не реализована, но планируется в будущих версиях.

---

## 🎁 Программа рефералов

### Как работают реферальные коды?

```javascript
// Генерировать код для текущего пользователя
const { generateReferralCode } = useContext(ReferralContext);
const code = await generateReferralCode();
// Пример: "VILLA2024XYZ"

// Применить реферальный код при регистрации
const { applyReferralCode } = useContext(ReferralContext);
await applyReferralCode(referralCode);
```

### Как работают бонусы за рефераль?

- Когда друг регистрируется по вашему коду, вы получаете бонус
- Бонус зависит от вашего уровня лояльности
- Bronze: 5%, Silver: 10%, Gold: 15%, Platinum: 20%

---

## 🏆 Система уровней

### Как работают уровни?

4 уровня лояльности:
1. **Bronze** - стартовый (0-10k)
2. **Silver** - 10k-50k
3. **Gold** - 50k-200k
4. **Platinum** - 200k+

Уровень зависит от общей суммы потраченных денег.

### Какие привилегии у каждого уровня?

| Привилегия | Bronze | Silver | Gold | Platinum |
|-----------|--------|--------|------|----------|
| Скидка | - | 5% | 10% | 20% |
| Рефераль бонус | 5% | 10% | 15% | 20% |
| Приоритет поддержки | ❌ | ✅ | ✅ | ✅ |
| Специальные предложения | ❌ | ❌ | ✅ | ✅ |
| Персональный менеджер | ❌ | ❌ | ❌ | ✅ |

---

## 🐛 Ошибки и решение проблем

### Ошибка: "Module not found"?

```bash
# Очистить кеш и переустановить
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Ошибка: API недоступен?

Убедитесь, что сервер запущен на `http://localhost:5002`, а в `.env` указан API URL:
```env
EXPO_PUBLIC_API_URL=http://localhost:5002/api
```

### Приложение зависает при запуске?

```bash
# Запустить с очисткой кеша Expo
expo start -c

# Или через npm
npm start -- -c
```

### Платежи не работают?

1. Проверьте INTERNET permission в `app.json`
2. Убедитесь, что API ключи в `.env`
3. Платежные системы требуют HTTPS в проде

---

## 🌍 Deployment

### Как выложить приложение в App Store?

```bash
# Требуется Apple Developer acount и платная подписка

# 1. Собрать для iOS
eas build --platform ios

# 2. Отправить в App Store
eas submit --platform ios
```

Подробнее: [iOS App Distribution Guide](https://docs.expo.dev/submit/ios/)

### Как выложить в Google Play?

```bash
# Требуется Google Play Developer account ($25 one-time)

# 1. Собрать для Android
eas build --platform android

# 2. Отправить в Google Play
eas submit --platform android
```

Подробнее: [Android App Distribution Guide](https://docs.expo.dev/submit/android/)

### Можно ли использовать как веб-приложение?

Да, но с ограничениями. Некоторые функции (push-уведомления, криптовалюта) работают лучше на мобильных.

```bash
npm start
# Нажмите 'w' для web
```

---

## 📞 Техническая поддержка

### Где искать помощь?

1. **README.md** - основная документация
2. **CONTRIBUTING.md** - гайд для разработчиков
3. **DEVELOPMENT.md** - гайд для локальной разработки
4. **GitHub Issues** - сообщить об ошибке
5. **GitHub Discussions** - задать вопрос
6. **Email** - vladbredihin4@gmail.com

### Как оставить отзыв?

- 💭 GitHub Discussions
- 🐛 GitHub Issues (если ошибка)
- 🌟 Star проект если понравился!

---

## 📝 Лицензия и юридические вопросы

### Могу ли я использовать это коммерчески?

Да, MIT лицензия позволяет коммерческое использование.

### Нужно ли указывать авторство?

Не требуется, но приветствуется.

### Можно ли модифицировать код?

Да, вы можете модифицировать код, если соблюдаете условия MIT лицензии.

---

## 🎓 Образовательные ресурсы

### Где учиться React Native?

- [Official React Native Docs](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [YouTube React Native Tutorials](https://www.youtube.com/results?search_query=react+native+tutorial)

### Где учиться Node.js (для backend)?

- [Node.js Official Docs](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [Database Design](https://www.postgresql.org/docs/)

---

**Не нашли ответ?** 📧 Напишите на vladbredihin4@gmail.com

_Последнее обновление: 23 февраля 2025_
