-- ==================== Recompute loyalty_cards.totalEarned ====================
-- Раньше пополнение карты ошибочно увеличивало loyalty_cards."totalEarned" на
-- сумму пополнения (cardCreditService.js + routes/card.js). Из-за этого блок
-- «Накопленный кэшбек» в MyCardScreen показывал сумму пополнений + кэшбека,
-- хотя должен отражать только кэшбек, начисленный по бронированиям.
--
-- После фикса (totalEarned трогаем только в routes/bookings.js при начислении
-- кэшбека за завершённое бронирование и его откате при отмене) пересчитываем
-- totalEarned из иммутабельного журнала transactions:
--   +SUM(amount) WHERE type='credit'  AND category='cashback'
--   -SUM(amount) WHERE type='debit'   AND category='refund'
--                  AND metadata->>'source' = 'cashback_revert'
--
-- Карты без cashback-транзакций получают 0.
-- Идемпотентно: пересчёт на каждом старте сходится с журналом транзакций.
--
-- Создано: 2026-06-04

UPDATE loyalty_cards lc
SET "totalEarned" = stats.earned
FROM (
  SELECT
    lc2."userId" AS user_id,
    COALESCE(SUM(
      CASE
        WHEN t.type = 'credit' AND t.category = 'cashback' THEN t.amount
        WHEN t.type = 'debit'  AND t.category = 'refund'
             AND t.metadata->>'source' = 'cashback_revert' THEN -t.amount
        ELSE 0
      END
    ), 0) AS earned
  FROM loyalty_cards lc2
  LEFT JOIN transactions t
    ON t."userId" = lc2."userId"
   AND (t.category = 'cashback'
        OR (t.category = 'refund' AND t.metadata->>'source' = 'cashback_revert'))
  GROUP BY lc2."userId"
) stats
WHERE lc."userId" = stats.user_id;
