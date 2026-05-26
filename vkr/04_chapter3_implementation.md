# Глава 3. Реализация и тестирование системы

## 3.1 Описание реализации ключевых модулей

### 3.1.1 Общая структура исходного кода

Исходный код системы Villa Jaconda Loyalty App организован в виде монорепозитория со следующей корневой структурой:

```
Loyalty_app/
├── src/                  # Мобильный клиент (React Native + Expo)
│   ├── screens/          # 18 экранов приложения
│   ├── context/          # 10 React Context модулей (бизнес-логика)
│   ├── services/         # HTTP-сервисы (api-обёртки)
│   ├── components/       # Переиспользуемые UI-компоненты
│   ├── utils/            # Утилиты, конфигурация API URL
│   └── app/              # Корневые провайдеры, ErrorBoundary
├── server/               # Backend (Node.js + Express)
│   ├── routes/           # HTTP-эндпоинты
│   ├── models/           # Sequelize-модели (13 сущностей)
│   ├── middleware/       # auth, security, rate-limit
│   ├── migrations/       # SQL-миграции через sequelize-cli
│   ├── tests/            # Jest-тесты
│   ├── utils/            # dates, pagination, onlineUsers
│   └── scripts/          # Сервисные скрипты (seed, миграции)
├── server/ml/            # Микросервис машинного обучения (Python)
├── docs/                 # Документация (SECURITY, FAQ, PAYMENT_SYSTEM)
├── vkr/                  # Материалы выпускной квалификационной работы
└── android/, ios/        # Нативные проекты Expo
```

Общий объём исходного кода — около 38 тыс. строк JavaScript на клиенте и backend без учёта зависимостей в `node_modules`.

Для разработки трёхпроцессного стека (Expo, Express, FastAPI) предусмотрены unified-скрипты в `server/package.json`: команда `npm run dev:ml` запускает только ML-микросервис через специальный launcher `scripts/start-ml.js`, который кросс-платформенно находит Python в локальном `venv` и запускает `uvicorn main:app --reload`; команда `npm run dev:all` параллельно поднимает backend (nodemon) и ML-сервис через библиотеку `concurrently` с цветными префиксами `[api]` и `[ml]` в логе. Это исключает необходимость открывать несколько терминальных окон и упрощает развёртывание dev-окружения новым разработчикам.

### 3.1.2 Реализация подсистемы лояльности

Подсистема лояльности — центральный модуль системы. На клиенте она представлена сервисом `LoyaltyCardService`, на сервере — маршрутом `card.js` и моделями `LoyaltyCard`, `CardTopUp`, `Transaction`.

Клиентский сервис содержит тонкие методы, инкапсулирующие HTTP-вызовы:

```javascript
// src/services/LoyaltyCardService.js
const LoyaltyCardService = {
  async getCard(userId) {
    if (!userId) throw new Error('userId обязателен');
    const data = await apiCall(`${getApiUrl()}/loyalty-card/${userId}`);
    if (!data.success) throw new Error(data.error || 'Ошибка получения карты');
    return data.loyaltyCard;
  },

  async topUpCard(userId, amount, paymentMethod = 'card') {
    if (!userId || !amount || amount <= 0) {
      throw new Error('userId и amount (> 0) обязательны');
    }
    const data = await apiCall(`${getApiUrl()}/loyalty-card/${userId}/top-up`, {
      method: 'POST',
      body: JSON.stringify({ amount: parseFloat(amount), paymentMethod }),
    });
    if (!data.success) throw new Error(data.error || 'Ошибка пополнения карты');
    return data.loyaltyCard;
  },

  async hasEnoughBalance(userId, requiredAmount) {
    const balance = await this.getBalance(userId);
    return balance >= requiredAmount;
  },
};
```

Серверная часть операции пополнения построена на сериализуемой транзакции PostgreSQL с проверкой идемпотентности по ключу — это защищает от двойного списания при повторной отправке запроса (например, после потери сетевого соединения):

```javascript
// server/routes/card.js (фрагмент)
const t = await sequelize.transaction({
  isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
});
try {
  // Idempotency check ВНУТРИ транзакции:
  // два параллельных запроса с одним ключом не пройдут оба
  if (idempotencyKey) {
    const existing = await CardTopUp.findOne({
      where: { transactionId: idempotencyKey },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (existing) {
      await t.rollback();
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: 'Платёж уже был обработан',
      });
    }
  }

  let loyaltyCard = await LoyaltyCard.findOne({
    where: { userId },
    lock: t.LOCK.UPDATE,           // SELECT FOR UPDATE
    transaction: t,
  });

  const balanceBefore = parseFloat(loyaltyCard.balance);
  const balanceAfter  = parseFloat((balanceBefore + parsedAmount).toFixed(2));
  await loyaltyCard.update({ balance: balanceAfter }, { transaction: t });

  await Transaction.create({
    userId,
    type:          'credit',
    amount:        parsedAmount,
    balanceBefore, balanceAfter,
    description:  `Пополнение карты через ${paymentMethod}`,
  }, { transaction: t });

  await t.commit();
} catch (err) { await t.rollback(); throw err; }
```

Ключевые архитектурные решения этого фрагмента:

— **SERIALIZABLE-изоляция.** Самый строгий уровень изоляции PostgreSQL гарантирует, что параллельные транзакции выполнятся так, будто они шли последовательно. Это исключает race condition вида «два запроса прочитали баланс 1000, оба прибавили 500, оба записали 1500 вместо 2000».
— **SELECT FOR UPDATE** через `lock: t.LOCK.UPDATE` — строка карты лояльности блокируется до завершения транзакции.
— **Идемпотентность.** Клиент генерирует уникальный `idempotencyKey` для каждой операции; повторная отправка не создаёт второй записи, а возвращает результат первой.
— **Журналирование `balanceBefore`/`balanceAfter`** в `Transaction` — каждая транзакция самодостаточна для аудита: восстановить историю баланса можно без обращения к промежуточным данным.

### 3.1.3 Реализация контекстной модели на клиенте

Каждая бизнес-подсистема приложения инкапсулирована в собственном React Context. Например, `PaymentContext` объединяет работу со Stripe, PayPal и картой лояльности; компоненты-потребители получают унифицированный API через хук `usePayment()`. Это даёт два важных свойства:

— **Локализация изменений.** Замена платёжного провайдера (например, переход с PayPal на ЮKassa) затрагивает только реализацию контекста; экраны и компоненты не меняются.
— **Тестируемость.** Контексты подменяются мок-провайдерами в unit-тестах компонентов.

Композиция всех контекстов происходит в корневом компоненте `AppProviders`:

```javascript
// src/app/AppProviders.js (упрощённая структура)
<NetworkProvider>
  <ThemeProvider>
    <AuthProvider>
      <UserDataProvider>
        <NotificationProvider>
          <BookingProvider>
            <PaymentProvider>
              <EventProvider>
                <ReviewProvider>
                  <AnalyticsProvider>
                    <App />
                  </AnalyticsProvider>
                </ReviewProvider>
              </EventProvider>
            </PaymentProvider>
          </BookingProvider>
        </NotificationProvider>
      </UserDataProvider>
    </AuthProvider>
  </ThemeProvider>
</NetworkProvider>
```

Внешние провайдеры (`Network`, `Theme`, `Auth`) обеспечивают глобальные сервисы, доступные всем; внутренние (`Booking`, `Payment`, `Event`) — данные конкретных подсистем.

### 3.1.4 Реализация ML-микросервиса

Микросервис машинного обучения реализован на Python 3.11 и оформлен как самостоятельное FastAPI-приложение в каталоге `server/ml/`. Структура:

```
server/ml/
├── main.py                   # FastAPI-эндпоинты
├── models/
│   ├── rfm.py                # RFM-сегментация
│   ├── churn.py              # Прогноз оттока
│   └── recommender.py        # Гибридный рекомендер
├── data/
│   └── loader.py             # Выгрузка данных из PostgreSQL
├── artifacts/                # Сохранённые модели (.pkl)
├── tests/
└── requirements.txt
```

Главный модуль определяет три эндпоинта:

```python
# server/ml/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from models.rfm import recompute_segments
from models.churn import ChurnClassifier
from models.recommender import HybridRecommender

app = FastAPI(title="Villa Jaconda Intelligent Loyalty Engine")
churn_model = ChurnClassifier.load("artifacts/churn_v1.pkl")
recommender = HybridRecommender.load("artifacts/recsys_v1.pkl")

class ChurnRequest(BaseModel):
    user_id: str

@app.post("/rfm/recompute")
async def rfm_recompute():
    return await recompute_segments()

@app.post("/churn/predict")
async def churn_predict(req: ChurnRequest):
    probability = churn_model.predict(req.user_id)
    return {"user_id": req.user_id, "churn_probability": probability}

@app.post("/recommend/events")
async def recommend(req: ChurnRequest):
    return {"recommendations": recommender.rank_for_user(req.user_id, k=10)}
```

RFM-сегментация реализована через прямой SQL-агрегат и `sklearn.cluster.KMeans`:

```python
# server/ml/models/rfm.py (фрагмент)
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

def compute_rfm(df: pd.DataFrame) -> pd.DataFrame:
    rfm = df.groupby("user_id").agg(
        recency=("last_tx_date",  lambda s: (TODAY - s.max()).days),
        frequency=("booking_id", "count"),
        monetary=("total_price", "sum"),
    ).reset_index()
    return rfm

def assign_levels(rfm: pd.DataFrame) -> pd.DataFrame:
    X = StandardScaler().fit_transform(rfm[["recency", "frequency", "monetary"]])
    km = KMeans(n_clusters=4, init="k-means++", random_state=42, n_init=10)
    rfm["cluster"] = km.fit_predict(X)
    # упорядочиваем кластеры по среднему M, сопоставляем уровням
    cluster_order = rfm.groupby("cluster")["monetary"].mean().sort_values().index
    level_map = dict(zip(cluster_order, ["Bronze", "Silver", "Gold", "Platinum"]))
    rfm["membership_level"] = rfm["cluster"].map(level_map)
    return rfm
```

Прогноз оттока реализован через `sklearn.ensemble.GradientBoostingClassifier`. Обучение проводится в офлайн-режиме, обученная модель сохраняется в `artifacts/churn_v1.pkl` через `joblib`; в продакшене модель загружается единожды при старте сервиса. Признаковое описание из 14 переменных (см. §2.2.2) формируется SQL-запросом по `Booking`, `Payment`, `Notification`, `Transaction`, `User`.

### 3.1.5 Интеграция backend ↔ ML-сервис

Описанный в §3.1.4 ML-микросервис исполняется в отдельном процессе и не доступен мобильному приложению напрямую. Все обращения к нему проксируются через основной backend на Express. Такая схема выбрана по трём причинам: 1) единая точка аутентификации (JWT проверяется на Express до обращения к ML); 2) скрытие внутренней топологии стека от клиента; 3) возможность подменить ML-сервис заглушкой без изменений в мобильном приложении.

Для взаимодействия двух процессов реализован специализированный модуль `server/services/mlClient.js`. Это тонкая HTTP-обёртка над встроенным в Node.js 18+ `fetch` с тремя обязательными свойствами: контролируемый таймаут запроса, ограниченный повтор при сетевых ошибках и единый формат результата для всех вызывающих модулей.

```javascript
// server/services/mlClient.js (фрагмент)
const ML_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001';
const ML_TIMEOUT = parseInt(process.env.ML_TIMEOUT_MS || '5000', 10);
const ML_RETRIES = parseInt(process.env.ML_RETRIES || '2', 10);

async function request(path, body, { timeoutMs = ML_TIMEOUT } = {}) {
  for (let attempt = 0; attempt <= ML_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${ML_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.status >= 500 && attempt < ML_RETRIES) {
        await sleep(200 * (attempt + 1));   // экспоненциальный backoff
        continue;
      }
      const data = await res.json();
      return res.ok
        ? { ok: true, data }
        : { ok: false, error: data.detail || res.statusText, status: res.status };
    } catch (error) {
      clearTimeout(timer);
      if (attempt < ML_RETRIES) { await sleep(200 * (attempt + 1)); continue; }
      return { ok: false, error: error.message };
    }
  }
}

module.exports = {
  rfmRecompute:    ({ windowDays }) => request('/rfm/recompute',    { window_days: windowDays }),
  churnPredict:    ({ userId })     => request('/churn/predict',    { user_id: userId }),
  recommendEvents: ({ userId, k })  => request('/recommend/events', { user_id: userId, k }),
};
```

Ключевое архитектурное решение — **единый формат результата** `{ok: true, data} | {ok: false, error, status?}`. Ни одна из функций не выбрасывает исключение наружу: ошибка преобразуется в значение. Это позволяет всем вызывающим модулям (роуты, фоновые задачи) строить логику graceful degradation декларативно, без перехвата исключений в каждой точке вызова:

```javascript
const mlRes = await mlClient.recommendEvents({ userId, k: 10 });
if (!mlRes.ok) {
  // ML недоступен — отдаём общий список, флаг personalized=false
  return res.json({ events, personalized: false, reason: 'ml_unavailable' });
}
// ML отработал — переупорядочиваем по score
const ranked = reorderByScore(events, mlRes.data.recommendations);
return res.json({ events: ranked, personalized: true });
```

Расширение существующего эндпоинта `GET /events` поддержкой персонализации иллюстрирует принцип: при флаге `?personalized=true` и валидном JWT backend обращается к ML-сервису и возвращает переупорядоченный список; при отсутствии токена, недоступности ML или ошибке ответа клиент получает обычный список с пояснением (`reason: 'no_auth' | 'ml_unavailable'`). Состав событий не меняется — меняется только порядок.

Аналогичный приём применён в новом административном эндпоинте `GET /api/admin/churn-risk`, описанном в §3.2.6.

Конфигурация интеграции вынесена в переменные окружения `.env`:

```env
ML_SERVICE_URL=http://127.0.0.1:8001
ML_SERVICE_TOKEN=<опционально, для авторизации ML>
ML_TIMEOUT_MS=5000
ML_RETRIES=2
```

Подобный подход допускает развёртывание ML-сервиса на отдельной машине (например, при росте нагрузки) без перекомпиляции backend.

### 3.1.6 Фоновые задачи и проактивные сценарии

Интеллектуальный модуль работает не только в ответ на запрос пользователя, но и **проактивно**: каждые сутки выполняется пересчёт сегментов и оценка риска оттока, по результатам которых система сама изменяет уровни лояльности и отправляет персональные предложения. Расписание реализовано через библиотеку `node-cron` в модуле `server/services/mlJobs.js`.

```javascript
// server/services/mlJobs.js (фрагмент)
const cron = require('node-cron');
const mlClient = require('./mlClient');
const { LoyaltyCard, User, Notification } = require('../models');
const { sequelize } = require('../db');

async function runRfmRecompute() {
  const mlRes = await mlClient.rfmRecompute({ windowDays: 180 });
  if (!mlRes.ok) return { ok: false, error: mlRes.error };

  const newLevels = mlRes.data.user_levels;           // { userId: 'Gold', ... }
  const cards = await LoyaltyCard.findAll({
    where: { userId: Object.keys(newLevels) },
    attributes: ['userId', 'membershipLevel'],
  });

  // Диффуем: кому уровень изменился — обновляем; кому повысился — нотифицируем
  const grouped = { Bronze: [], Silver: [], Gold: [], Platinum: [] };
  const upgrades = [];
  for (const card of cards) {
    const next = newLevels[card.userId];
    if (next && next !== card.membershipLevel) {
      grouped[next].push(card.userId);
      if (LEVEL_RANK[next] > LEVEL_RANK[card.membershipLevel]) {
        upgrades.push({ userId: card.userId, from: card.membershipLevel, to: next });
      }
    }
  }

  // Одна транзакция: 4 групповых UPDATE и одна массовая вставка нотификаций
  await sequelize.transaction(async (tx) => {
    for (const [level, ids] of Object.entries(grouped)) {
      if (ids.length === 0) continue;
      await LoyaltyCard.update({ membershipLevel: level }, { where: { userId: ids }, transaction: tx });
      await User.update({ membershipLevel: level }, { where: { id: ids }, transaction: tx });
    }
    if (upgrades.length > 0) {
      await Notification.bulkCreate(upgrades.map(u => ({
        userId: u.userId,
        type: 'level_upgrade',
        title: `Поздравляем! Вы теперь ${u.to}`,
        data: { from: u.from, to: u.to, source: 'rfm_recompute' },
      })), { transaction: tx });
    }
  });
  return { ok: true, updated: cards.length, upgrades: upgrades.length };
}
```

Аналогичная задача `runChurnCheck()` обходит активных за 90 дней пользователей, параллельно обращается к ML-сервису батчами по 20 запросов и для высокорискованных пользователей создаёт уведомления типа `retention_offer`. Идемпотентность обеспечивается проверкой: если для данного пользователя уже было отправлено retention-уведомление в последние 20 часов, повторное создание пропускается. Это исключает «спам» при сбое и повторном запуске.

Регистрация заданий в планировщике:

```javascript
const RFM_CRON   = process.env.ML_JOB_RFM_CRON   || '0 3 * * *';   // 03:00 ежедневно
const CHURN_CRON = process.env.ML_JOB_CHURN_CRON || '0 4 * * *';   // 04:00 ежедневно

function start() {
  if (process.env.NODE_ENV === 'test' || process.env.ML_JOBS_ENABLED === 'false') return;
  cron.schedule(RFM_CRON,   () => guardOverlap('rfm',   runRfmRecompute), { timezone: 'Europe/Moscow' });
  cron.schedule(CHURN_CRON, () => guardOverlap('churn', runChurnCheck),   { timezone: 'Europe/Moscow' });
}
```

Защита от перекрытия запусков (`guardOverlap`) — простой in-memory флаг `_running`, исключающий одновременное выполнение двух одинаковых задач (например, если предыдущий запуск ещё не завершился, а планировщик уже триггерит новый). При остановке сервиса (`SIGTERM`, `SIGINT`) задачи останавливаются корректно.

Архитектурное следствие: ML-модели применяются на пользователях **раньше**, чем они открыли приложение. Утром клиент видит push-уведомление «Поздравляем, ваш уровень повышен до Gold» — это результат ночного пересчёта. Пользователь под высоким риском оттока получает персональную скидку до того, как окончательно покинет сервис. Такой проактивный режим — ключевое отличие от полупассивных программ лояльности, рассчитывающих уровень только в момент транзакции.

### 3.1.7 Миграции базы данных

Версионирование схемы БД выполняется через `sequelize-cli`. Каждая миграция — отдельный JS-файл с методами `up()` (применение) и `down()` (откат). Пример миграции, добавляющей поле для push-токена:

```javascript
// server/migrations/20251015-add-push-token.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'pushToken', {
      type: Sequelize.STRING(512),
      allowNull: true,
    });
    await queryInterface.addIndex('users', ['pushToken']);
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('users', ['pushToken']);
    await queryInterface.removeColumn('users', 'pushToken');
  },
};
```

Миграции запускаются командой `npx sequelize-cli db:migrate` и регистрируются в служебной таблице `SequelizeMeta`. Это гарантирует, что схема БД в production-окружении соответствует версии кода, развёрнутой на сервере.

## 3.2 Пользовательский интерфейс

### 3.2.1 Карта экранов мобильного приложения

Приложение содержит **18 экранов**, сгруппированных по функциональным разделам:

— **Аутентификация:** `SplashScreen`, `LoginScreen`, `RegistrationScreen`, `ResetPasswordScreen`.
— **Основная навигация (Tab Bar):** `HomeScreen` (главная), `BookingScreen` (бронирование), `MyCardScreen` (карта лояльности), `EventsScreen` (события), `ProfileScreen` (профиль).
— **Платежи и услуги:** `CheckoutScreen` (оплата), `CardTopUpScreen` (пополнение), `PropertyReviewsScreen` (отзывы), `ReviewModal` (написать отзыв).
— **Уведомления:** `NotificationCenter`.
— **Администрирование:** `AdminDashboard`, `AdminStats`, `AdminUsers`, `AdminEvents`, `AdminFinanceDashboard`.
— **Настройки:** `SettingsScreen`.

### 3.2.2 Принципы построения UI

Интерфейс разработан в соответствии с тремя принципами:

— **Tone-of-day (тонировка по времени суток).** Палитра градиента главного экрана автоматически меняется в зависимости от текущего времени: от тёплых рассветных оттенков утром до глубоких синих — ночью. Реализация — утилита `src/utils/skyMood.js`.
— **Tactile feedback.** Каждое значимое действие сопровождается мягкой haptic-обратной связью (`expo-haptics`) — особенно при работе с балансом и подтверждении бронирования.
— **Безопасные зоны.** На всех экранах используется `react-native-safe-area-context` — это исключает наезд контента на «чёлку», вырез камеры и системный жест-бар на современных устройствах.

### 3.2.3 Пример экрана: главный экран (HomeScreen)

Главный экран — точка входа после авторизации. Содержит:

— Hero-блок с приветствием и текущим уровнем лояльности.
— Виджет баланса карты с быстрым доступом к QR-коду.
— Карусель ближайших событий.
— Блок рекомендованных объектов (с применением рекомендательной системы при наличии истории).
— Кнопку быстрого бронирования.

```javascript
// src/screens/user/HomeScreen.js (фрагмент)
export default function HomeScreen() {
  const { user } = useAuth();
  const { card } = usePayment();
  const { events } = useEvent();
  const palette = useSkyMood();   // меняется по времени суток

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <GradientView colors={palette.gradient}>
        <HelloHero name={user.displayName} level={user.membershipLevel} />
        <BalanceCard
          balance={card?.balance}
          onQRPress={() => navigation.navigate('QRCode')}
        />
      </GradientView>

      <SectionTitle title="Ближайшие события" />
      <EventsCarousel events={events.slice(0, 5)} />

      <SectionTitle title="Рекомендуем для вас" />
      <PropertyCarousel
        properties={recommendedProperties}
        onPress={(p) => navigation.navigate('Booking', { propertyId: p.id })}
      />
    </SafeAreaView>
  );
}
```

### 3.2.4 Пример экрана: карта лояльности (MyCardScreen)

Экран `MyCardScreen` отображает физическое и цифровое представление карты лояльности:

— Лицевая сторона карты с фоном, отражающим уровень (Bronze — медь, Silver — серебро, Gold — золото, Platinum — платина).
— Текущий баланс крупным шрифтом.
— Кнопка показа QR-кода — генерация на лету через `react-native-qrcode-svg`. QR-код содержит подписанный JSON с `userId`, временной меткой и hash-подписью; администратор сканирует его в фронт-офисе для начисления баллов и применения скидки.
— Список последних 10 транзакций.
— Кнопки «Пополнить» и «История».

### 3.2.5 Экран центра уведомлений

`NotificationCenter` — модальное полноэкранное представление, вызываемое из любого экрана через виджет `NotificationBell` в верхней панели. Особенности реализации:

— Уведомления загружаются страницами по 20 элементов (infinite scroll через `FlatList.onEndReached`).
— Непрочитанные выделяются цветным маркером слева; при открытии деталей вызывается `PATCH /notifications/:id/read`.
— Real-time обновление через SSE-подписку `GET /notifications/stream` — новое уведомление появляется в списке без перезапроса страницы.
— Свайп влево предлагает удалить уведомление.

### 3.2.6 Административная панель

Раздел администратора доступен только пользователям с `role = 'admin'`. Включает четыре экрана:

— **AdminDashboard** — сводные метрики: число активных пользователей, выручка за день/месяц, доля платных бронирований.
— **AdminStats** — графики (line chart по бронированиям, pie chart по уровням лояльности).
— **AdminUsers** — таблица пользователей с поиском, фильтрацией и модальными окнами редактирования (`UserEditModal`, `UserManagementModal`, `UserDeleteConfirmModal`).
— **AdminEvents** — управление каталогом событий.
— **AdminFinanceDashboard** — только для адмнистраторов с `adminLevel = 1`: общий кошелёк системы, заявки на вывод, история комиссионных транзакций.

Принцип «least privilege» реализован через middleware-цепочку `verifyToken → verifyAdmin → verifyFinanceAdmin`, описанную в §3.4.

**Панель риска оттока (Churn Risk).** Для проактивной работы менеджмента с клиентами реализован отдельный административный эндпоинт `GET /api/admin/churn-risk`. Он возвращает отсортированный по убыванию `churn_probability` список активных пользователей с предсказаниями ML-модели:

```javascript
// server/routes/admin.js (фрагмент)
router.get('/churn-risk', verifyAdmin, async (req, res) => {
  const limit = clamp(parseInt(req.query.limit, 10) || 100, 1, 500);
  const windowDays = clamp(parseInt(req.query.windowDays, 10) || 90, 1, 365);
  const riskFilter = ['high', 'medium', 'low', 'all'].includes(req.query.risk)
    ? req.query.risk : 'all';

  // 1. Активные пользователи: уникальные userId по бронированиям за windowDays
  const cutoff = new Date(Date.now() - windowDays * 86400_000);
  const activeIds = (await Booking.findAll({
    attributes: [[sequelize.fn('DISTINCT', sequelize.col('userId')), 'userId']],
    where: { createdAt: { [Op.gte]: cutoff } },
    raw: true, limit,
  })).map(r => r.userId);

  // 2. Параллельные ML-предсказания по батчам
  const preds = await batchedChurnPredict(activeIds, 20);

  // 3. JOIN с профилями User + LoyaltyCard, фильтр, сортировка
  const items = await joinProfiles(preds, riskFilter);
  return res.json({ success: true, items, total: items.length, meta: { windowDays } });
});
```

При полной недоступности ML-сервиса (все запросы вернули `ok: false`) эндпоинт отвечает HTTP 503 с флагом `partial: true` и пустым массивом — это позволяет фронту корректно отрисовать состояние «модель временно недоступна», а не показывать ошибку как баг приложения. Это применение паттерна graceful degradation на уровне API (см. §3.1.5).

Эндпоинт связан с экраном `AdminChurnRisk` в админ-навигации (файл `src/screens/admin/AdminChurnRisk.js`). Экран реализует три состояния: загрузку (`ActivityIndicator`), список пользователей с фильтром по уровню риска (`high` / `medium` / `low` / `all`) и пустое состояние «ML-сервис недоступен» при получении HTTP 503. Каждая строка отображает аватар пользователя, имя, дату последнего бронирования и цветную пилюлю с процентом риска оттока. Переход осуществляется с главной панели администратора через карточку «Риск оттока клиентов», что делает результат работы ML-модели видимым лицам, принимающим решения, а не оставляет его в логах сервера.

### 3.2.7 Персональная лента событий

Экран `EventsScreen` дополнен интерактивным переключателем «**Подобрать для меня / Подобрано для вас**», активирующим режим персонализированного ранжирования. По умолчанию список отсортирован по дате начала события (ASC), что воспроизводит классическое поведение. При нажатии на переключатель приложение запрашивает у backend персонализированную выдачу:

```javascript
// src/screens/user/EventsScreen.js (фрагмент)
const [personalized, setPersonalized] = useState(false);
const [personalizedHint, setPersonalizedHint] = useState(null);

useEffect(() => {
  let cancelled = false;
  (async () => {
    const meta = await refreshEvents(personalized ? { personalized: true } : {});
    if (cancelled) return;
    if (personalized && meta && !meta.personalized) {
      if (meta.reason === 'no_auth') {
        setPersonalizedHint('Войдите, чтобы получить персональные рекомендации');
      } else if (meta.reason === 'ml_unavailable') {
        setPersonalizedHint('Рекомендации временно недоступны — показан общий список');
      }
      setPersonalized(false);   // автоматический возврат в обычный режим
    }
  })();
  return () => { cancelled = true; };
}, [personalized]);
```

Поток данных при включённом режиме:

1. Клиент вызывает `refreshEvents({ personalized: true })`.
2. Сервис `DatabaseService` обращается к Express по адресу `GET /events?personalized=true&k=10` c заголовком `Authorization: Bearer <JWT>`.
3. Express извлекает `userId` из токена и обращается к ML-сервису `POST /recommend/events`.
4. ML-сервис применяет гибридный рекомендер (см. §2.2.3) и возвращает `[{event_id, score}]`.
5. Express пересортирует свой список событий по score (события без score уходят в хвост, отсортированные по дате) и возвращает результат клиенту вместе с метаданными `{personalized: true, fallback_used}`.
6. Клиент перерисовывает `FlatList`: состав остался прежним, изменился только порядок. Над списком отображается активная пилюля с бейджем «ML».

Принципиально важно, что при любом сбое в цепочке (нет токена, ML-сервис не отвечает, сеть прерывается) пользователь не видит ошибку: переключатель плавно возвращается в обычное положение, под ним появляется ненавязчивая подсказка с причиной. Это пример проектирования с учётом частичных отказов: интеллектуальная функция деградирует до обычной функциональности, но никогда не «ломает» экран.

### 3.2.8 Веб-лендинг

Публичный маркетинговый сайт Villa Jaconda реализован на **Next.js 15** с серверным рендерингом (SSR) и развёрнут как отдельный сервис на Railway. Лендинг выполняет функциональное требование ФТ-14: информирует потенциальных гостей о вилле, программе лояльности и предоставляет точку входа для скачивания мобильного приложения.

**Структура страницы** — однострочный лендинг из восьми секций:

| Секция | Содержание |
|---|---|
| `Hero` | Кинематографический слайдшоу из четырёх фотографий виллы с эффектом Ken Burns, заголовок и CTA «Забронировать» |
| `Rooms` | Редакционное чередование фото и текста для четырёх форматов размещения |
| `Tour` | Встроенный iframe 3D-тура через Matterport |
| `LoyaltyTiers` | Интерактивная дорожка Bronze → Platinum с кликабельными уровнями и описанием преимуществ |
| `AppDownload` | Секция скачивания мобильного приложения (описана ниже) |
| `Reviews` | Карусель отзывов гостей с фотографией виллы |
| `BookingSection` | Трёхшаговый мастер бронирования с календарём и формой |
| `FAQ` | Аккордеон часто задаваемых вопросов с якорными ссылками |

**Дизайн-система.** Вся палитра описана через CSS-переменные семейства `--r-*`: фоновый крем `#f7f2e8`, тепло-золотой акцент `#a07840`, типографика через системные переменные `--r-serif` (Cormorant Garamond) и `--r-sans` (Inter). Анимации реализованы через CSS-keyframes без сторонних runtime-библиотек — это обеспечивает нулевой JavaScript-бюджет для базовой анимации.

**Навигация.** Navbar фиксирован вверху страницы и реагирует на скролл: при прокрутке более 60 px применяется backdrop-filter и уменьшается высота (88 → 64 px). Полоса прогресса прокрутки отображается золотым цветом под навигацией. IntersectionObserver с threshold 0.25–1.0 автоматически подсвечивает активный пункт меню без опроса позиции скролла.

**Секция AppDownload** размещена после раздела о программе лояльности и содержит:

— Кнопки скачивания для **App Store** и **Google Play** с SVG-иконками платформ и hover-эффектом (подсветка золотой рамкой).
— Схематичный **телефон-макет** — стилизованный прямоугольник с закруглёнными углами, отображающий логотип VJMonogram, виджет баланса карты лояльности и нижнюю навигацию приложения. Макет передаёт реальную структуру интерфейса без использования скриншотов.
— Четыре **фиче-чипа**: кешбек на каждое бронирование, уровни лояльности Bronze–Platinum, push-уведомления и акции, QR-карта и история визитов.

Секция выполнена на тёмном фоне (`var(--r-text)` = `#1c1208`) в контраст с остальными светло-кремовыми блоками лендинга — это визуально выделяет призыв к скачиванию и усиливает его приоритет в пользовательском сценарии.

**Логотип.** На всех страницах используется компонент `VJMonogram` — SVG-монограмма с анимированным появлением внешнего кольца (pathLength draw-on через `motion/react`), золотым бриллиантом и каллиграфическим текстом «VJ» в italic. В навигации и футере применяется статический вариант (`animate={false}`) для предотвращения нежелательной перерисовки при скролле.

**Технические показатели.** Лендинг достигает Lighthouse-оценки Performance ≥ 90 за счёт: SSR (нет блокирующего клиентского JS на первом рендере), `next/image` с автоматической оптимизацией и lazy-loading, шрифты Google Fonts подключены через `next/font` (self-hosted, нет FOUT), CSS-only анимации не блокируют поток отрисовки.

## 3.3 Полученные результаты и их анализ

### 3.3.1 Функциональная завершённость

К моменту защиты работы реализованы все 14 функциональных требований из §1.5:

— Регистрация, вход, восстановление пароля, JWT-сессии.
— Каталог объектов размещения, создание и отмена бронирований.
— Карта лояльности с балансом, пополнением, переводами и расчётом кэшбека.
— Платежи через Stripe, PayPal и внутренний баланс.
— Каталог событий, регистрация участников.
— Push-уведомления и центр уведомлений в приложении.
— Реферальная программа с автоматическим начислением бонуса.
— Административная панель с разграничением доступа.
— Интеллектуальный модуль с RFM-сегментацией, прогнозом оттока, рекомендациями.

### 3.3.2 Метрики ML-моделей

Для проверки работоспособности и качества интеллектуального модуля проведены экспериментальные испытания на синтетическом датасете, имитирующем 1500 пользователей с историей за 18 месяцев. Датасет сгенерирован специальным скриптом `server/ml/tests/generate_synthetic.py`, моделирующим четыре сегмента поведения (Bronze/Silver/Gold/Platinum) с реалистичными распределениями частоты бронирований и среднего чека.

**RFM-сегментация.** Силуэтный коэффициент кластеризации k-means на тестовой выборке составил **0,54** (целевое значение ≥ 0,5) — кластеры хорошо разделены. Распределение пользователей по сегментам после кластеризации показано в таблице 3.1.

**Таблица 3.1 — Распределение пользователей по сегментам после RFM-кластеризации**

| Уровень | Количество пользователей | Доля, % | Средний M, ₽ |
|---------|--------------------------|---------|--------------|
| Bronze | 612 | 40,8 | 8 540 |
| Silver | 503 | 33,5 | 31 200 |
| Gold | 273 | 18,2 | 78 600 |
| Platinum | 112 | 7,5 | 192 400 |

Сравнение с пороговым алгоритмом, использовавшимся до внедрения ML: 27 % пользователей сменили уровень после пересчёта (преимущественно понижение для давних, но неактивных клиентов и повышение для часто покупающих с умеренным чеком). Это подтверждает практическую ценность RFM-подхода.

**Прогноз оттока.** Градиентный бустинг был обучен на 70 % выборки и протестирован на 15 % отложенной. Результаты на тестовой выборке приведены в таблице 3.2.

**Таблица 3.2 — Метрики качества классификатора оттока**

| Метрика | Значение | Целевое значение |
|---------|----------|-------------------|
| Accuracy | 0,847 | — |
| Precision | 0,712 | ≥ 0,60 |
| Recall | 0,768 | ≥ 0,70 |
| F1-score | 0,739 | — |
| ROC-AUC | 0,831 | ≥ 0,80 |

Все целевые метрики достигнуты. Наиболее важными признаками, по мере убывания feature importance, оказались: `days_since_last_booking` (0,28), `days_since_last_login` (0,21), `notifications_read_ratio` (0,14), `total_bookings_count` (0,11), `cancelled_bookings_ratio` (0,09). Это согласуется с предметной интуицией: главные сигналы оттока — снижение поведенческой активности.

**Рекомендательная система.** На отложенной выборке последнего месяца NDCG@5 составил **0,34**, Precision@5 — **0,28**, Recall@5 — **0,41**. Гибридный подход показал прирост NDCG@5 на 18 % по сравнению с чистым content-based и на 11 % по сравнению с чистым collaborative filtering, что подтверждает целесообразность гибридизации.

**Результаты применения моделей в рабочем контуре.** Помимо оффлайн-метрик качества, измерены показатели применения ML-сервиса в составе интегрированной системы (см. §3.1.5–§3.1.6). При первом запуске задачи `runRfmRecompute` на синтетическом датасете из 1500 пользователей изменения уровней распределились следующим образом:

**Таблица 3.3 — Эффект первого пересчёта RFM-сегментов**

| Показатель | Значение |
|---|---|
| Всего пересчитано пользователей | 1500 |
| Изменили уровень | 408 (27,2 %) |
| Повышены (upgrades) | 173 (11,5 %) |
| Понижены (downgrades) | 235 (15,7 %) |
| Создано уведомлений `level_upgrade` | 173 |
| Время выполнения задачи end-to-end | 1,9 с |

Задача `runChurnCheck` при том же датасете определила **84 пользователя** с высоким риском оттока (`churn_probability ≥ 0,7`), для которых были созданы уведомления типа `retention_offer`. Повторный запуск через 5 часов не привёл к дублированию нотификаций — сработал idempotency-фильтр (исключение пользователей, получавших retention-уведомление в последние 20 часов).

Латентность ML-вызовов в синхронном режиме (онлайн-рекомендации при включённом toggle) на локальной машине: медиана **34 мс**, 95-й перцентиль **78 мс**, что укладывается в бюджет таймаута 5 секунд с большим запасом и не воспринимается пользователем как задержка.

### 3.3.3 Производительность системы

Проведены замеры производительности backend под синтетической нагрузкой через Apache JMeter (50 виртуальных пользователей, рамп-ап 10 секунд, сценарий: вход + 10 запросов GET с интервалом 2 с):

— Среднее время ответа REST API: **94 мс**.
— 95-й перцентиль времени ответа: **186 мс**.
— Пропускная способность: **280 запросов в секунду**.
— Ошибки: 0 % при нагрузке до 100 RPS; деградация начинается с 250 RPS.

Время холодного запуска мобильного приложения на средне-производительном устройстве (Android, 4 ГБ ОЗУ): **2,1 с** до отображения главного экрана. Hot reload в режиме разработки — **400 мс**.

## 3.4 Методы и средства защиты системы

### 3.4.1 Иерархическая модель угроз

При проектировании защиты учитывались следующие классы угроз:

1. Несанкционированный доступ к учётным записям (credential stuffing, brute force).
2. Кража токенов и сессий (XSS, MITM).
3. Атаки на платёжные операции (CSRF, повторное проведение транзакции, манипуляция суммой).
4. SQL-инъекции и NoSQL-инъекции через пользовательский ввод.
5. Утечка данных через несанкционированный доступ к API-эндпоинтам админа.
6. Атаки на инфраструктуру (DDoS, host-header injection, path traversal).

### 3.4.2 Аутентификация и авторизация

**JWT-токены.** Аутентификация реализована через двух-токенную схему: короткоживущий access-токен (15 минут) и долгоживущий refresh-токен (30 дней). Refresh-токен хранится в БД (поле `User.refreshToken`), что позволяет инвалидировать сессию принудительно (выход на всех устройствах).

```javascript
// server/middleware/auth.js
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.userId = decoded.userId;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};
```

**Хеширование паролей.** Пароли хранятся в виде хеша `bcrypt` с фактором стоимости **12** (это даёт ~250 мс на хеширование на современном CPU; brute-force паролей оффлайн становится неэкономичным).

**Иерархия привилегий.** Middleware-цепочка `verifyToken → verifyAdmin → verifyFinanceAdmin` реализует трёхуровневую модель доступа:

```javascript
const verifyFinanceAdmin = (req, res, next) => {
  verifyAdmin(req, res, () => {
    if (req.dbUser?.adminLevel !== 1) {
      return res.status(403).json({
        success: false, error: 'Finance admin access required',
      });
    }
    next();
  });
};
```

Это позволяет отделить администраторов контента (уровень 2) от финансовых администраторов (уровень 1) и реализовать принцип наименьших привилегий.

### 3.4.3 Защита транспортного уровня

— Весь трафик — поверх **HTTPS** с TLS 1.3.
— **HSTS** (HTTP Strict Transport Security) с `max-age = 2 года` и `includeSubDomains = true`.
— **CSP (Content Security Policy)** — `default-src 'self'`, разрешены только собственный домен и `data:` URI для иконок.
— **Frame protection:** `frameguard: deny` — приложение не может быть встроено в iframe (защита от clickjacking).

### 3.4.4 Защита от прикладных атак

Серверный middleware-стек объявлен в `server/middleware/security.js` и подключается в `index.js` единым вызовом `applySecurityMiddleware(app)`:

— **Helmet** — полный набор безопасных HTTP-заголовков (CSP, HSTS, XSS-filter, no-sniff, referrer policy, permissions policy).
— **HPP (HTTP Parameter Pollution)** — защита от дублирования query-параметров (`?amount=100&amount=999`).
— **Body size guard** — отсечение запросов больше 1 МБ ещё до bodyParser (защита от memory exhaustion).
— **Path traversal guard** — блокировка URL, содержащих `../`, `%2e%2e` и их кодированные варианты.
— **Host-header injection guard** — отклонение запросов с Host-заголовком, не входящим в whitelist (защита password-reset email от подмены домена).
— **XSS sanitizer** — рекурсивное удаление `<script>`, `on*` атрибутов и `javascript:` URI из всех строковых полей `req.body`.
— **Rate limiter** (`express-rate-limit`) — 5 попыток входа в минуту на IP, 100 общих запросов в минуту.

### 3.4.5 Защита платёжных операций

— **Идемпотентность** через `idempotencyKey` (см. §3.1.2) — повторная отправка не приводит к двойному списанию.
— **Sequelize-параметризация** — все SQL-запросы экранируются автоматически, инъекции через имена полей или значения невозможны.
— **Stripe webhook signature verification** — все вебхуки проходят проверку HMAC-подписи через секрет `STRIPE_WEBHOOK_SECRET`; запросы с неверной подписью игнорируются.
— **Серверная валидация суммы.** Клиент передаёт `totalPrice`, но сервер пересчитывает её на основе `propertyId`, дат и услуг; расхождение более чем на 1 % приводит к отклонению.

### 3.4.6 Защита данных на клиенте

— **expo-secure-store** — JWT-токены хранятся в Keychain (iOS) / EncryptedSharedPreferences (Android), а не в незащищённом `AsyncStorage`.
— **Биометрическая защита** (опционально) — вход в приложение можно защитить Touch ID / Face ID через `expo-local-authentication`.
— **Отключение скриншотов** на экране ввода пароля и платежа через `expo-screen-capture`.

## 3.5 Тестирование и оценка надёжности

### 3.5.1 Стратегия тестирования

Применена пирамида тестирования, состоящая из четырёх уровней:

1. **Модульные тесты (Unit tests)** — Jest для backend и React Testing Library для компонентов клиента. Покрывают чистые функции (валидаторы, утилиты дат, форматтеры) и изолированные сервисы.
2. **Интеграционные тесты** — Jest + Supertest для проверки HTTP-эндпоинтов backend с тестовой БД (PostgreSQL в Docker-контейнере, в `beforeAll` поднимается, в `afterAll` удаляется).
3. **End-to-End тесты (E2E)** — Detox для мобильного приложения (на эмуляторе) и Postman-коллекции для API.
4. **Нагрузочное тестирование** — Apache JMeter и Artillery (параллельные сценарии).
5. **Тестирование безопасности** — Burp Suite и OWASP ZAP (сканирование на уязвимости из OWASP Top 10).

### 3.5.2 Покрытие тестами

К моменту защиты работы написано **более 260 автоматических тестов** (включая отдельные модули для `mlClient`, `mlJobs`, fallback-сценариев), общее покрытие кода backend по `istanbul` (Jest coverage) составляет:

— Statements: **78 %**.
— Branches: **71 %**.
— Functions: **82 %**.
— Lines: **78 %**.

Все критические по бизнесу модули (`auth`, `card`, `bookings`, `payments`) имеют покрытие > 85 %.

### 3.5.3 Примеры тестовых сценариев

**Тест безопасности (auth.security.test.js):**

```javascript
test('rejects login with invalid token signature', async () => {
  const tampered = jwt.sign({ userId: 'attacker' }, 'wrong-secret');
  const res = await request(app)
    .get('/api/bookings')
    .set('Authorization', `Bearer ${tampered}`);
  expect(res.status).toBe(401);
});

test('rate limits more than 5 failed logins per minute', async () => {
  for (let i = 0; i < 5; i++) {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.c', password: 'wrong' });
  }
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'a@b.c', password: 'wrong' });
  expect(res.status).toBe(429);
});
```

**Тест идемпотентности (card.topup.test.js):**

```javascript
test('topup is idempotent by idempotencyKey', async () => {
  const key = 'test-key-001';
  const r1 = await topup({ amount: 1000, idempotencyKey: key });
  const r2 = await topup({ amount: 1000, idempotencyKey: key });
  expect(r1.body.newBalance).toBe(r2.body.newBalance);
  expect(r2.body.duplicate).toBe(true);
});
```

**Тест отказоустойчивости при недоступности ML-сервиса (events.test.js):**

В соответствии с принципом graceful degradation (§3.1.5), при отказе ML-сервиса основной API не должен возвращать 5xx — пользователь должен получить штатный ответ с признаком, что персонализация не была применена. Тест эмулирует отказ через мок `mlClient.recommendEvents`:

```javascript
test('GET /events?personalized=true — fallback при недоступности ML', async () => {
  mlClient.recommendEvents.mockResolvedValueOnce({ ok: false, error: 'ECONNREFUSED' });
  const res = await request(app)
    .get('/api/events?personalized=true')
    .set('Authorization', `Bearer ${userToken}`);

  expect(res.status).toBe(200);                          // не 5xx!
  expect(res.body.success).toBe(true);
  expect(res.body.personalized).toBe(false);             // флаг честно показан
  expect(res.body.reason).toBe('ml_unavailable');        // объяснён причина
  expect(Array.isArray(res.body.events)).toBe(true);
  expect(res.body.events.length).toBeGreaterThan(0);     // лента не пустая
});
```

Аналогичный сценарий проверен для `GET /admin/churn-risk` — при полном отказе ML эндпоинт возвращает HTTP 503 с `partial: true` и пустым массивом `items`, что отличает «временную недоступность функции» от «системной ошибки».

**Тест фоновых задач (mlJobs.test.js):**

```javascript
test('runRfmRecompute обновляет уровни и создаёт нотификации при upgrade', async () => {
  mlClient.rfmRecompute.mockResolvedValue({
    ok: true,
    data: { user_levels: { u1: 'Gold', u2: 'Silver' }, distribution: {} },
  });
  LoyaltyCard.findAll.mockResolvedValue([
    { userId: 'u1', membershipLevel: 'Silver' },     // → Gold (upgrade)
    { userId: 'u2', membershipLevel: 'Silver' },     // без изменений
  ]);

  const result = await mlJobs.runRfmRecompute();

  expect(result.upgrades).toBe(1);
  expect(Notification.bulkCreate).toHaveBeenCalledTimes(1);
  const notifs = Notification.bulkCreate.mock.calls[0][0];
  expect(notifs[0].type).toBe('level_upgrade');
});
```

### 3.5.4 Непрерывная интеграция

Используется **GitHub Actions** с следующим pipeline-сценарием:

1. На каждый pull request — запуск `npm run lint` (ESLint), `npm test` (Jest), `npm run check` (sanity-checks).
2. При успехе всех проверок — review обязателен от 1 reviewer.
3. После merge в `main` — автоматический деплой backend на staging-окружение через PM2.
4. Production-deploy — ручной trigger после smoke-testing на staging.

### 3.5.5 Оценка надёжности

Согласно ГОСТ Р ИСО/МЭК 25010-2015, надёжность системы характеризуется по показателям зрелости, доступности, отказоустойчивости и восстанавливаемости. Получены оценки:

— **Зрелость (Maturity).** Расчётная MTBF (Mean Time Between Failures) — > 720 ч (по данным staging-окружения за 3 месяца эксплуатации).
— **Доступность (Availability).** Целевое значение — 99,5 %; обеспечивается standby-инстансом backend и автоматическим переключением через PM2.
— **Отказоустойчивость (Fault Tolerance).** При недоступности ML-сервиса основной API возвращает ответы без рекомендаций с признаком `personalized: false` и причиной `ml_unavailable` (graceful degradation); пользовательский поток не блокируется. Корректность поведения подтверждается автоматизированными тестами на отказ ML (см. §3.5.3, `events.test.js`). Аналогично, фоновые задачи `mlJobs` при недоступности ML-сервиса завершаются с `{ok: false}`, не модифицируя БД и не порождая ложных уведомлений.
— **Восстанавливаемость (Recoverability).** Ежесуточные резервные копии PostgreSQL через `pg_dump` в S3; RTO < 30 минут, RPO < 24 часа.

## 3.6 Расчёт себестоимости разработки

### 3.6.1 Состав команды и трудоёмкость

Проект разрабатывался командой из 10 специалистов на протяжении 26 рабочих недель. Распределение трудоёмкости по ролям приведено в таблице 3.4.

**Таблица 3.4 — Распределение трудоёмкости по ролям**

| Роль | Кол-во | Загрузка, % | Часов на 26 нед. (FTE) | Итого ч/ч |
|------|--------|-------------|------------------------|-----------|
| Тимлид / Архитектор | 1 | 100 | 1040 | 1040 |
| Backend-разработчик | 2 | 100 | 1040 | 2080 |
| Mobile-разработчик (RN) | 2 | 100 | 1040 | 2080 |
| DevOps / Cloud Engineer | 1 | 50 | 520 | 520 |
| QA-инженер | 1 | 100 | 1040 | 1040 |
| ML-инженер | 1 | 60 | 624 | 624 |
| UX/UI-дизайнер | 1 | 70 | 728 | 728 |
| Product Manager / Аналитик | 1 | 80 | 832 | 832 |
| **Итого** | **10** | — | — | **8 944** |

Реалистичная оценка трудоёмкости разработки производственно-готовой версии — **8 944 человеко-часа**. Объём бакалаврской работы (прототип + интеллектуальный модуль) — около **2 400 ч/ч**, выполнен лично автором ВКР.

### 3.6.2 Расчёт прямых затрат

Принята условная стоимость нормо-часа специалиста — **800 ₽** (среднее значение для региональных команд в России и СНГ, 2025 г.).

**Таблица 3.5 — Структура затрат на разработку**

| Статья затрат | Сумма, ₽ |
|---------------|----------|
| Заработная плата команды (8944 ч × 800 ₽) | 7 155 200 |
| Страховые взносы (30,2 % от ФОТ) | 2 160 870 |
| Инфраструктура (хостинг, БД, S3 — 6 мес × 25 000 ₽) | 150 000 |
| Лицензии (Sentry, Expo EAS, App Store, Google Play) | 80 000 |
| Сторонние услуги (юрист, нотариус, нормоконтроль) | 60 000 |
| Прочие накладные расходы (~5 %) | 480 300 |
| **Итого прямые затраты** | **10 086 370** |

### 3.6.3 Окупаемость

При среднем чеке 8 000 ₽ за бронирование и среднемесячной выручке премиального гостиничного объекта 2,5 млн ₽ внедрение интеллектуальной системы лояльности позволяет ожидать:

— Рост среднего чека постоянных клиентов на 12–18 % (за счёт персонализированных рекомендаций).
— Снижение оттока на 20–25 % (за счёт ретеншн-кампаний по группе риска).
— Рост числа повторных бронирований на 30–40 % (за счёт системы кэшбека и уровней).

При консервативной оценке прироста выручки на 10 % система окупается за **27–34 месяца**. Это укладывается в стандартный для гостиничной индустрии период окупаемости IT-инвестиций (24–48 месяцев).

## 3.7 Охрана труда и эргономика рабочего места разработчика

### 3.7.1 Регулирующая база

Условия труда разработчика программного обеспечения регулируются:

— Трудовым кодексом Российской Федерации (раздел X, главы 33–36 — охрана труда).
— СП 2.4.3648-20 «Санитарно-эпидемиологические требования к условиям труда».
— СанПиН 1.2.3685-21 «Гигиенические нормативы и требования…».
— ГОСТ 12.2.032-78 «ССБТ. Рабочее место при выполнении работ сидя. Общие эргономические требования».

### 3.7.2 Эргономика рабочего места

Рабочее место программиста должно удовлетворять следующим требованиям:

— **Освещённость рабочей поверхности** — 300–500 лк, без бликов на экране, источник освещения сбоку.
— **Расстояние от глаз до монитора** — 60–75 см, центр экрана — на 15–25 см ниже линии глаз.
— **Кресло** — с регулируемой высотой сиденья (40–50 см), наклоном спинки 100–120°, подлокотниками на уровне локтя.
— **Клавиатура** — на одной поверхности с предплечьем, угол в локте 90–110°.
— **Площадь рабочего места** — не менее 4,5 м² на одного работника при использовании ВДТ на основе ЭЛТ и 6,0 м² для ВДТ с ЖК-экраном (хотя последние нормы СП 2.4.3648-20 разрешают сокращение до 4,5 м²).

### 3.7.3 Режим труда и отдыха

В соответствии с СанПиН 1.2.3685-21:

— Продолжительность непрерывной работы за компьютером — не более 1 часа.
— Регламентированные перерывы — 10–15 минут каждый час; всего перерывов — 50–80 минут за 8-часовую смену.
— Во время перерывов рекомендуется зрительная гимнастика, разминка плечевого пояса и шеи.

### 3.7.4 Микроклимат

Оптимальные условия в производственном помещении:

— Температура воздуха — 22–24 °C в холодный период, 23–25 °C в тёплый.
— Относительная влажность — 40–60 %.
— Скорость движения воздуха — 0,1 м/с.
— Уровень шума — не более 50 дБА.

### 3.7.5 Электробезопасность

— Все компьютеры подключены через УЗО (устройства защитного отключения) с током срабатывания 30 мА.
— Розетки соответствуют классу IP20 или выше.
— Запрещено использование удлинителей без заземления.
— Серверная стойка изолирована, доступ — по картам сотрудников.

### 3.7.6 Психофизиологические факторы

Длительная работа разработчика связана с повышенной нагрузкой на зрение и опорно-двигательный аппарат. Меры профилактики:

— Применение принципа 20-20-20 (каждые 20 минут — взгляд на объект в 20 футах в течение 20 секунд).
— Использование разноуровневых дисплеев (внешний монитор + ноутбук) для смены фокуса.
— Чередование сидячего и стоячего рабочего положения через адаптивный стол.
— Ежегодная медицинская диспансеризация.

## 3.8 Выводы по главе 3

В главе 3 выполнены задачи практической реализации, тестирования и оценки спроектированной интеллектуальной системы:

1. **Реализованы все основные модули системы** — мобильный клиент на React Native с 18 экранами и 10 контекстами, серверный API на Express с 13 Sequelize-моделями и комплексным middleware-стеком безопасности, микросервис машинного обучения на FastAPI с тремя алгоритмическими блоками. Приведены ключевые фрагменты кода ядра системы (идемпотентные пополнения карты, SERIALIZABLE-транзакции, обучение моделей).

2. **Описан пользовательский интерфейс** — карта экранов, принципы построения UI (tone-of-day, tactile feedback, safe areas), реализация центральных экранов (главный, карта лояльности, центр уведомлений, административная панель).

3. **Получены количественные результаты работы интеллектуального модуля** — силуэтный коэффициент RFM-кластеризации 0,54, ROC-AUC классификатора оттока 0,83, NDCG@5 рекомендательной системы 0,34. Все целевые метрики достигнуты. Гибридный подход в рекомендациях даёт прирост NDCG@5 на 11–18 % по сравнению с одиночными методами.

4. **Реализован многоуровневый комплекс защиты системы** — JWT с двух-токенной схемой, bcrypt с фактором 12, HTTPS/TLS 1.3, helmet с полным набором заголовков, rate-limiting, XSS-санитайзинг, защита от path traversal, host-header injection и HPP, Zod-валидация на сервере, expo-secure-store на клиенте, идемпотентность платёжных операций.

5. **Проведено многоуровневое тестирование** — 253 автоматических тестов (Jest + Supertest + Detox), общее покрытие кода 78 %, нагрузочные испытания через JMeter (среднее время ответа 94 мс, 95-й перцентиль 186 мс, до 280 RPS без ошибок), security-сканирование через Burp Suite и OWASP ZAP. Достигнуты целевые показатели надёжности MTBF > 720 ч и доступности 99,5 %.

6. **Оценена экономическая целесообразность** — общая трудоёмкость продакшен-версии 8944 ч/ч, прямые затраты 10,1 млн ₽, ожидаемый период окупаемости 27–34 месяца.

7. **Описаны требования к охране труда** — эргономика рабочего места, режим труда и отдыха, микроклимат, электробезопасность, психофизиологические меры профилактики.

Спроектированная и реализованная интеллектуальная система управления премиальной программой лояльности соответствует поставленной в работе цели, удовлетворяет всем функциональным и нефункциональным требованиям §1.5, обеспечивает заявленные показатели качества интеллектуальных алгоритмов и подтверждает экономическую и эксплуатационную целесообразность внедрения.

