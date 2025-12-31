/**
 * Unit-тесты promotionEngine.
 *
 * Эти тесты гарантируют инварианты, на которые опирается confirm-payment:
 *   1) скидка применяется ДО расчёта кэшбека,
 *   2) суммарные скидка/буст зажимаются глобальными кэпами (80% / 20pp),
 *   3) targetUserIds = персональная компенсация, не требующая participantIds,
 *   4) события вне окна status='active' игнорируются.
 *
 * Если эти инварианты сломают — ВКР §3.3 теряет ссылку на стек правил, и
 * аналитика Transaction.metadata расходится с реальной выплатой.
 */

const {
  selectApplicableEvents,
  computePromotionEffect,
  MAX_TOTAL_DISCOUNT_PERCENT,
  MAX_TOTAL_BOOST_PERCENT_POINTS,
} = require('../services/promotionEngine');

const baseEvent = (overrides = {}) => ({
  id: 'evt',
  title: 'evt',
  status: 'active',
  startDate: '2020-01-01',
  endDate: '2099-01-01',
  participantIds: [],
  targetUserIds: [],
  cashbackBoostPercent: 0,
  discountPercent: 0,
  ...overrides,
});

describe('selectApplicableEvents', () => {
  const now = new Date('2026-05-30T12:00:00Z');

  test('публичное событие требует participation', () => {
    const e1 = baseEvent({ id: 'a', participantIds: ['u1'] });
    const e2 = baseEvent({ id: 'b', participantIds: ['u2'] });
    expect(selectApplicableEvents([e1, e2], 'u1', now).map((e) => e.id)).toEqual(['a']);
  });

  test('персональная компенсация: targetUserIds игнорирует participantIds', () => {
    const e = baseEvent({ targetUserIds: ['u1'], participantIds: [] });
    expect(selectApplicableEvents([e], 'u1', now)).toHaveLength(1);
    expect(selectApplicableEvents([e], 'u2', now)).toHaveLength(0);
  });

  test('окно дат фильтрует прошедшие/будущие события', () => {
    const past   = baseEvent({ id: 'p', endDate: '2020-01-02', participantIds: ['u1'] });
    const future = baseEvent({ id: 'f', startDate: '2099-12-31', participantIds: ['u1'] });
    const live   = baseEvent({ id: 'l', participantIds: ['u1'] });
    const out = selectApplicableEvents([past, future, live], 'u1', now);
    expect(out.map((e) => e.id)).toEqual(['l']);
  });

  test('status !== active отбрасывается', () => {
    const drafted = baseEvent({ status: 'draft', participantIds: ['u1'] });
    expect(selectApplicableEvents([drafted], 'u1', now)).toHaveLength(0);
  });

  test('auction и giveaway отбрасываются даже с ненулевыми discount/boost', () => {
    const auction = baseEvent({
      eventType: 'auction',
      participantIds: ['u1'],
      discountPercent: 50,
      cashbackBoostPercent: 10,
    });
    const giveaway = baseEvent({
      eventType: 'giveaway',
      participantIds: ['u1'],
      discountPercent: 30,
    });
    expect(selectApplicableEvents([auction, giveaway], 'u1', now)).toHaveLength(0);
  });

  test('promo-eligible типы пропускаются', () => {
    const types = ['cashback', 'discount', 'promotion', 'special'];
    const evs = types.map((t, i) => baseEvent({ id: t, eventType: t, participantIds: ['u1'] }));
    expect(selectApplicableEvents(evs, 'u1', now).map((e) => e.id).sort()).toEqual(types.sort());
  });

  test('событие без eventType (legacy) — пропускается, как раньше', () => {
    const legacy = baseEvent({ participantIds: ['u1'] });
    delete legacy.eventType;
    expect(selectApplicableEvents([legacy], 'u1', now)).toHaveLength(1);
  });
});

describe('computePromotionEffect', () => {
  const now = new Date('2026-05-30T12:00:00Z');

  test('без активных событий: цена и ставка не меняются', () => {
    const r = computePromotionEffect({
      basePrice: 1000,
      cashbackRate: 0.05,
      events: [],
      userId: 'u1',
      now,
    });
    expect(r.finalPrice).toBe(1000);
    expect(r.finalRate).toBeCloseTo(0.05, 10);
    expect(r.discountPercent).toBe(0);
    expect(r.boostPercentPoints).toBe(0);
    expect(r.appliedEvents).toEqual([]);
    expect(r.capsApplied).toEqual({ discount: false, boost: false });
  });

  test('скидка считается ДО кэшбека (cashback от итоговой суммы клиента)', () => {
    const events = [baseEvent({ participantIds: ['u1'], discountPercent: 20 })];
    const r = computePromotionEffect({
      basePrice: 1000,
      cashbackRate: 0.05,
      events,
      userId: 'u1',
      now,
    });
    // 1000 - 20% = 800; кэшбек 5% от 800 = 40 (расчёт делает confirm-payment, тут проверяем цену)
    expect(r.finalPrice).toBe(800);
    expect(r.finalRate).toBeCloseTo(0.05, 10);
  });

  test('cashback boost суммируется в процентных пунктах со ставкой уровня', () => {
    const events = [baseEvent({ participantIds: ['u1'], cashbackBoostPercent: 5 })];
    const r = computePromotionEffect({
      basePrice: 1000,
      cashbackRate: 0.03, // Bronze
      events,
      userId: 'u1',
      now,
    });
    expect(r.finalRate).toBeCloseTo(0.08, 10); // 3% + 5pp = 8%
    expect(r.boostPercentPoints).toBe(5);
  });

  test('несколько событий стекаются суммированием', () => {
    const events = [
      baseEvent({ id: 'a', participantIds: ['u1'], discountPercent: 10, cashbackBoostPercent: 3 }),
      baseEvent({ id: 'b', participantIds: ['u1'], discountPercent: 15, cashbackBoostPercent: 2 }),
    ];
    const r = computePromotionEffect({
      basePrice: 2000,
      cashbackRate: 0.05,
      events,
      userId: 'u1',
      now,
    });
    expect(r.discountPercent).toBe(25);
    expect(r.boostPercentPoints).toBe(5);
    expect(r.finalPrice).toBe(1500); // 2000 - 25%
    expect(r.finalRate).toBeCloseTo(0.10, 10); // 5% + 5pp
    expect(r.appliedEvents).toHaveLength(2);
  });

  test('кэп общей скидки 80%: 5×20% = 100% сырых → 80% применённых', () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      baseEvent({ id: `e${i}`, participantIds: ['u1'], discountPercent: 20 }),
    );
    const r = computePromotionEffect({
      basePrice: 1000,
      cashbackRate: 0.05,
      events,
      userId: 'u1',
      now,
    });
    expect(r.discountPercent).toBe(MAX_TOTAL_DISCOUNT_PERCENT);
    expect(r.finalPrice).toBe(200);
    expect(r.capsApplied.discount).toBe(true);
  });

  test('кэп буста 20pp: 4×10pp = 40pp сырых → 20pp применённых', () => {
    const events = Array.from({ length: 4 }, (_, i) =>
      baseEvent({ id: `e${i}`, participantIds: ['u1'], cashbackBoostPercent: 10 }),
    );
    const r = computePromotionEffect({
      basePrice: 1000,
      cashbackRate: 0.05,
      events,
      userId: 'u1',
      now,
    });
    expect(r.boostPercentPoints).toBe(MAX_TOTAL_BOOST_PERCENT_POINTS);
    expect(r.finalRate).toBeCloseTo(0.25, 10); // 5% + 20pp
    expect(r.capsApplied.boost).toBe(true);
  });

  test('appliedEvents помечает personalized для targetUserIds', () => {
    const personal = baseEvent({ id: 'pers', targetUserIds: ['u1'], discountPercent: 50 });
    const r = computePromotionEffect({
      basePrice: 1000,
      cashbackRate: 0.05,
      events: [personal],
      userId: 'u1',
      now,
    });
    expect(r.appliedEvents).toEqual([
      expect.objectContaining({ id: 'pers', personalized: true, discountPercent: 50 }),
    ]);
  });

  test('юзер вне аудитории события: эффекта нет', () => {
    const events = [baseEvent({ participantIds: ['other'], discountPercent: 90 })];
    const r = computePromotionEffect({
      basePrice: 1000,
      cashbackRate: 0.05,
      events,
      userId: 'u1',
      now,
    });
    expect(r.finalPrice).toBe(1000);
    expect(r.discountPercent).toBe(0);
    expect(r.appliedEvents).toHaveLength(0);
  });

  test('строковые проценты из БД (DECIMAL) корректно парсятся', () => {
    const e = baseEvent({ participantIds: ['u1'], discountPercent: '12.50', cashbackBoostPercent: '4.00' });
    const r = computePromotionEffect({
      basePrice: 1000,
      cashbackRate: 0.05,
      events: [e],
      userId: 'u1',
      now,
    });
    expect(r.discountPercent).toBe(12.5);
    expect(r.finalPrice).toBe(875);
    expect(r.boostPercentPoints).toBe(4);
  });
});
