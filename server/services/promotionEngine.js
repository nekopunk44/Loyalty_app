/**
 * Promotion Engine — единая точка применения активных Event-модификаторов
 * к расчёту бронирования. Вызывается из POST /bookings/:id/confirm-payment
 * внутри SERIALIZABLE-транзакции, на основе уже залоченной brony+карты.
 *
 * Правила:
 *   1. Скидка применяется к totalPrice ДО кэшбека. Кэшбек считается на сумму,
 *      которую пользователь реально платит. Иначе мы бы платили процент с
 *      несуществующего ценника.
 *   2. Cashback boost аддитивен к ставке уровня в процентных пунктах
 *      (Bronze 3% + boost 5pp = 8%).
 *   3. Несколько активных событий стекаются суммированием. Hard-cap внутри
 *      движка: суммарная скидка ≤ 80%, суммарный boost ≤ 20pp. Это страховка
 *      от ситуации "одобрили 5 разных персональных компенсаций, теперь бронь
 *      бесплатна".
 *   4. Подходящее событие — status='active', currentDate ∈ [startDate,endDate],
 *      и пользователь либо в participantIds (публичное), либо в targetUserIds
 *      (персональная компенсация).
 *
 * Сознательно НЕ трогает уровень-зависимые скидки на доп.услуги (сауна, посуда)
 * из BookingScreen — они применяются ещё на создании booking.totalPrice,
 * а тут мы работаем уже с готовой суммой.
 */

const MAX_TOTAL_DISCOUNT_PERCENT = 80;
const MAX_TOTAL_BOOST_PERCENT_POINTS = 20;

// Только эти типы могут модифицировать цену брони. Аукцион и розыгрыш — это
// «приз достаётся одному», к расчёту confirm-payment отношения не имеют, даже
// если по ошибке в БД остались ненулевые boost/discount.
const PROMO_ELIGIBLE_TYPES = new Set(['cashback', 'discount', 'promotion', 'special']);

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Фильтрует события, которые применимы к данному userId на момент `now`.
 * Чистая функция — отдельно тестируется без БД.
 */
function selectApplicableEvents(events, userId, now = new Date()) {
  return events.filter((e) => {
    if (e.status !== 'active') return false;

    // Защитный слой: даже если в БД у auction/giveaway случайно ненулевой
    // discount/boost — игнорируем. Семантика типа > значения колонок.
    if (e.eventType && !PROMO_ELIGIBLE_TYPES.has(e.eventType)) return false;

    const start = e.startDate ? new Date(e.startDate) : null;
    const end   = e.endDate   ? new Date(e.endDate)   : null;
    if (start && now < start) return false;
    if (end && now > end) return false;

    const targets = Array.isArray(e.targetUserIds) ? e.targetUserIds : [];
    const participants = Array.isArray(e.participantIds) ? e.participantIds : [];

    // Персональная компенсация (targetUserIds непуст) — применяется только этим юзерам,
    // без participants. Иначе — публичное событие, нужно участие.
    if (targets.length > 0) return targets.includes(userId);
    return participants.includes(userId);
  });
}

/**
 * Считает применённую скидку и boost к кэшбеку.
 * Возвращает структуру с финальной ценой, итоговой ставкой и аудитом.
 *
 * @param {object} args
 * @param {number} args.basePrice    — totalPrice брони ДО скидок
 * @param {number} args.cashbackRate — ставка уровня (0..1), уже с birthdayMult если применимо
 * @param {Array}  args.events       — все активные Event записи (Sequelize instances или plain)
 * @param {string} args.userId
 * @param {Date}   [args.now]
 */
function computePromotionEffect({ basePrice, cashbackRate, events, userId, now = new Date() }) {
  const applicable = selectApplicableEvents(events, userId, now);

  const rawDiscount = applicable.reduce((s, e) => s + num(e.discountPercent), 0);
  const rawBoost    = applicable.reduce((s, e) => s + num(e.cashbackBoostPercent), 0);

  const effectiveDiscount = Math.min(rawDiscount, MAX_TOTAL_DISCOUNT_PERCENT);
  const effectiveBoost    = Math.min(rawBoost,    MAX_TOTAL_BOOST_PERCENT_POINTS);

  const finalPrice    = parseFloat((basePrice * (1 - effectiveDiscount / 100)).toFixed(2));
  const finalRate     = cashbackRate + effectiveBoost / 100;

  return {
    finalPrice,
    finalRate,
    discountPercent: effectiveDiscount,
    boostPercentPoints: effectiveBoost,
    appliedEvents: applicable.map((e) => ({
      id: e.id,
      title: e.title,
      cashbackBoostPercent: num(e.cashbackBoostPercent),
      discountPercent: num(e.discountPercent),
      personalized: Array.isArray(e.targetUserIds) && e.targetUserIds.length > 0,
    })),
    capsApplied: {
      discount: rawDiscount > MAX_TOTAL_DISCOUNT_PERCENT,
      boost: rawBoost > MAX_TOTAL_BOOST_PERCENT_POINTS,
    },
  };
}

module.exports = {
  selectApplicableEvents,
  computePromotionEffect,
  MAX_TOTAL_DISCOUNT_PERCENT,
  MAX_TOTAL_BOOST_PERCENT_POINTS,
  PROMO_ELIGIBLE_TYPES,
};
