-- ==================== Event Promotion Fields ====================
-- Превращаем Event из чисто информационной сущности в реальный модификатор
-- цены/кэшбека на confirm-payment. До этой миграции поле prize было свободным
-- текстом и не влияло на расчёт — это вводило гостей в заблуждение
-- ("+10% к кэшбеку" в UI, ничего на чекауте).
--
-- Поведение применения определяется в server/routes/bookings.js
-- (confirm-payment): discount_percent режет цену ДО кэшбека, cashback_boost_percent
-- аддитивно к ставке уровня. Множественные активные события стекаются суммированием.
-- Created: 2026-05-29

ALTER TABLE events
ADD COLUMN IF NOT EXISTS cashback_boost_percent DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_user_ids JSONB DEFAULT '[]'::jsonb;

-- cashback_boost_percent: 5.00 = +5pp к базовой ставке уровня (Bronze 3% + 5pp = 8%)
-- discount_percent:       10.00 = -10% от totalPrice до кэшбека
-- target_user_ids:        [] = публичное событие (применяется к participant_ids).
--                         ['uid_anna'] = персональная компенсация только Anna,
--                         не показываем другим как доступное к участию.
