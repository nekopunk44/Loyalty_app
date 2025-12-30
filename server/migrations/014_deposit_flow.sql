-- ==================== Deposit Payment Flow ====================
-- Sprint A ВКР: «Гибридная оплата с депозитом».
--
-- Семантика (см. §3.1 ВКР):
--   1. Бронирование создаётся в status='pending_payment' с paymentDeadline=created+12ч.
--   2. До дедлайна юзер обязан оплатить депозит (fix amount per property).
--      Если не оплачен — cron переводит в status='expired' (слот освобождается).
--   3. После оплаты депозита status='confirmed'. Депозит списан с LoyaltyCard.balance,
--      зачислен в AdminWallet. Кэшбэк ещё не начисляется.
--   4. Остаток (totalPrice - depositAmount) оплачивается ДО checkInDate одним из способов:
--        - method='card'  — списание с LoyaltyCard.balance + кэшбэк со ВСЕЙ суммы (deposit+remaining)
--        - method='cash'  — без списания, кэшбэк ТОЛЬКО с депозита (наличные мимо приложения)
--      После оплаты — status='completed'.
--   5. Отмена:
--        - pending_payment → cancelled. Возвратов нет.
--        - confirmed → cancelled. Депозит сгорает в AdminWallet, юзер ничего не получает.
--        - completed → cancelled. Депозит сгорает; remaining (если был card) — обратно
--          юзеру; cashback забирается у юзера и возвращается в AdminWallet.
--
-- Создано: 2026-05-30

-- ── 1. properties.deposit_amount ────────────────────────────────────────────
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(12,2) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN properties.deposit_amount IS
  'Фиксированная сумма депозита для бронирования (PRB). 0 = без депозита (legacy).';

-- Дефолты — ~50% от ночной цены × 10 (т.е. за условный многосуточный заезд)
-- Применяется только если deposit_amount всё ещё 0 (идемпотентно для повторных миграций).
UPDATE properties SET deposit_amount = 1000 WHERE id = 1 AND deposit_amount = 0;
UPDATE properties SET deposit_amount = 800  WHERE id = 2 AND deposit_amount = 0;
UPDATE properties SET deposit_amount = 500  WHERE id = 3 AND deposit_amount = 0;
UPDATE properties SET deposit_amount = 2500 WHERE id = 4 AND deposit_amount = 0;

-- ── 2. bookings: статусы pending_payment + expired ──────────────────────────
-- Sequelize создаёт enum_bookings_status. Добавляем недостающие значения.
-- ADD VALUE IF NOT EXISTS работает с PostgreSQL 9.6+.
ALTER TYPE enum_bookings_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE enum_bookings_status ADD VALUE IF NOT EXISTS 'expired';

-- ── 3. bookings: поля платёжного потока ─────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS deposit_amount           DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS deposit_paid_at          TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS remaining_amount         DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS remaining_paid_at        TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS remaining_payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_deadline         TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cashback_amount          DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashback_credited_at     TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cashback_reverted_at     TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN bookings.deposit_amount IS
  'Сумма депозита (snapshot из properties.deposit_amount на момент создания).';
COMMENT ON COLUMN bookings.remaining_amount IS
  'Остаток к оплате после депозита = totalPrice - depositAmount.';
COMMENT ON COLUMN bookings.remaining_payment_method IS
  '''card'' = списан с карты приложения; ''cash'' = наличные на месте.';
COMMENT ON COLUMN bookings.payment_deadline IS
  'Дедлайн оплаты депозита. Превышение → cron переводит в expired.';
COMMENT ON COLUMN bookings.cashback_amount IS
  'Снапшот начисленного кэшбэка. Используется для отката при cancel.';

-- ── 4. Индекс для cron'а просроченных оплат ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_payment_deadline
  ON bookings (payment_deadline)
  WHERE status = 'pending_payment';
