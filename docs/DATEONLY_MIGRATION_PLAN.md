# План миграции дат с STRING на DATEONLY

> **Статус:** запланировано, не выполнено.
> **Причина откладывания:** меняет API-контракт + требует миграции реальных данных в БД.
> Делать только на staging-копии прода с предварительным бэкапом.

## Текущее состояние

В таблице `Bookings` поля `checkInDate` и `checkOutDate` хранятся как `STRING` в формате `DD.MM.YYYY`.

**Проблемы:**
- Невозможна сортировка по дате (лексикографическая ≠ хронологическая для `DD.MM.YYYY`)
- Невозможны диапазонные запросы (`WHERE checkInDate BETWEEN '01.06.2026' AND '01.07.2026'` ломается)
- Парсинг при каждом чтении (см. `/api/bookings/property/:id/booked-dates`, ручной split)
- Нет защиты от мусора в БД (любая строка пройдёт)

## Целевое состояние

`checkInDate`/`checkOutDate` хранятся как `DATEONLY` (PostgreSQL `DATE` — `YYYY-MM-DD`).
API остаётся в формате `DD.MM.YYYY` для обратной совместимости с клиентом —
конвертация делается на границе (middleware/serializer).

## Шаги миграции

### Шаг 1. Миграция данных (отдельный sequelize migration файл)

```javascript
// server/migrations/2026XXXXXXXXXX-bookings-date-to-dateonly.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Добавить временные колонки
    await queryInterface.addColumn('Bookings', 'checkInDateNew',  { type: Sequelize.DATEONLY });
    await queryInterface.addColumn('Bookings', 'checkOutDateNew', { type: Sequelize.DATEONLY });

    // 2. Заполнить из старых строковых, конвертируя DD.MM.YYYY -> YYYY-MM-DD
    await queryInterface.sequelize.query(`
      UPDATE "Bookings"
      SET "checkInDateNew" = TO_DATE("checkInDate", 'DD.MM.YYYY')
      WHERE "checkInDate" ~ '^\\d{2}\\.\\d{2}\\.\\d{4}$'
    `);
    await queryInterface.sequelize.query(`
      UPDATE "Bookings"
      SET "checkOutDateNew" = TO_DATE("checkOutDate", 'DD.MM.YYYY')
      WHERE "checkOutDate" ~ '^\\d{2}\\.\\d{2}\\.\\d{4}$'
    `);

    // 3. Проверить что все строки сконвертировались
    const [unconverted] = await queryInterface.sequelize.query(`
      SELECT COUNT(*) AS c FROM "Bookings"
      WHERE "checkInDateNew" IS NULL OR "checkOutDateNew" IS NULL
    `);
    if (unconverted[0].c > 0) {
      throw new Error(`Failed to convert ${unconverted[0].c} bookings — check date formats manually before retrying.`);
    }

    // 4. Удалить старые, переименовать новые
    await queryInterface.removeColumn('Bookings', 'checkInDate');
    await queryInterface.removeColumn('Bookings', 'checkOutDate');
    await queryInterface.renameColumn('Bookings', 'checkInDateNew',  'checkInDate');
    await queryInterface.renameColumn('Bookings', 'checkOutDateNew', 'checkOutDate');

    // 5. NOT NULL и индексы
    await queryInterface.changeColumn('Bookings', 'checkInDate',  { type: Sequelize.DATEONLY, allowNull: false });
    await queryInterface.changeColumn('Bookings', 'checkOutDate', { type: Sequelize.DATEONLY, allowNull: false });
    await queryInterface.addIndex('Bookings', ['checkInDate']);
    await queryInterface.addIndex('Bookings', ['checkOutDate']);
  },

  async down(queryInterface, Sequelize) {
    // Откат: вернуть STRING + конвертировать обратно. Полную инверсию сложно
    // обеспечить без потерь — поэтому миграцию накатывать ТОЛЬКО после бэкапа.
    await queryInterface.changeColumn('Bookings', 'checkInDate',  { type: Sequelize.STRING });
    await queryInterface.changeColumn('Bookings', 'checkOutDate', { type: Sequelize.STRING });
    await queryInterface.sequelize.query(`
      UPDATE "Bookings"
      SET "checkInDate"  = TO_CHAR("checkInDate"::date,  'DD.MM.YYYY'),
          "checkOutDate" = TO_CHAR("checkOutDate"::date, 'DD.MM.YYYY')
    `);
  }
};
```

### Шаг 2. Изменить модель в `server/index.js`

```javascript
const Booking = sequelize.define('Booking', {
  // ...
  checkInDate:  { type: DataTypes.DATEONLY, allowNull: false },
  checkOutDate: { type: DataTypes.DATEONLY, allowNull: false },
  // ...
});
```

### Шаг 3. Хелперы конверсии на границе API

```javascript
// server/utils/dates.js
const ruToIso = (s) => {
  if (!s || typeof s !== 'string') return s;
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
};

const isoToRu = (d) => {
  if (!d) return d;
  const s = d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : s;
};

module.exports = { ruToIso, isoToRu };
```

### Шаг 4. Обновить роуты

- **POST /api/bookings**: в `validation.js` `createBookingSchema` принимает `DD.MM.YYYY`,
  но в роуте до `Booking.create` конвертировать через `ruToIso`.
- **GET /api/bookings**, **GET /booked-dates**: в response сериализовать через `isoToRu`,
  чтобы клиент по-прежнему получал `DD.MM.YYYY`.
- Удалить ручной split `'01.06.2026'.split('.')` в `/booked-dates` — теперь даты уже `Date`.

### Шаг 5. Тесты

- Юнит-тесты на `ruToIso`/`isoToRu` (включая некорректный ввод)
- Интеграционный: создать бронь → прочитать `/booked-dates` → формат не сломался
- Регрессионный: старые бронирования читаются после миграции

## Чеклист перед накатом

- [ ] Бэкап PostgreSQL: `pg_dump -Fc loyalty_app > backup_pre_dateonly.dump`
- [ ] Прогнать миграцию на копии прод-данных в staging
- [ ] Проверить что все existing бронирования имеют валидный `DD.MM.YYYY` —
      запрос: `SELECT id, "checkInDate" FROM "Bookings" WHERE "checkInDate" !~ '^\d{2}\.\d{2}\.\d{4}$'`
- [ ] Развернуть код сервера ПОСЛЕ миграции, не одновременно
- [ ] Smoke-test: создать бронь → отменить → создать снова

## Что НЕ делать

- Не использовать `sequelize.sync({ alter: true })` для этого изменения —
  он не умеет конвертировать данные между типами, потеряет всё содержимое колонок.
- Не накатывать миграцию без бэкапа.
- Не деплоить новый код модели до миграции — он будет писать ISO в STRING-колонку,
  что сломает старые роуты, читающие `DD.MM.YYYY`.
