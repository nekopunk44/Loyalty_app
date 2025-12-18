/**
 * Конверсия дат на границе API.
 *
 * Клиент отдаёт/принимает `DD.MM.YYYY` (исторический формат).
 * БД (после миграции 006_bookings_dateonly.sql) хранит `DATE` (`YYYY-MM-DD`).
 *
 * Эти хелперы — единая точка перевода. Используются:
 *  - на входе POST /api/bookings перед `Booking.create`
 *  - на выходе GET /api/bookings*, /booked-dates перед `res.json`
 *
 * Невалидный/пустой вход возвращается как есть — ответственность вызывающего
 * (Zod-схемы) — заранее провалидировать формат.
 */

const RU_RE = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** "31.12.2026" -> "2026-12-31". Ввод не строка / не подходит формату — возвращается как есть. */
const ruToIso = (s) => {
  if (typeof s !== 'string') return s;
  const m = s.match(RU_RE);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
};

/** Date | "2026-12-31" | "2026-12-31T..." -> "31.12.2026". Невалидный ввод — как есть. */
const isoToRu = (d) => {
  if (d === null || d === undefined) return d;
  let s;
  if (d instanceof Date) {
    if (Number.isNaN(d.getTime())) return d;
    s = d.toISOString().slice(0, 10);
  } else if (typeof d === 'string') {
    s = d.slice(0, 10);
  } else {
    return d;
  }
  const m = s.match(ISO_RE);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : d;
};

module.exports = { ruToIso, isoToRu };
