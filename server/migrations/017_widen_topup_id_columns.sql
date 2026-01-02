-- ==================== Widen card_topups id columns ====================
-- Google Play purchaseToken — opaque base64, обычно 600–1000 символов.
-- Stripe session.id (~66) и PayPal order.id (~17) укладываются в VARCHAR(255),
-- но Google Play — нет. Перевод на TEXT снимает ограничение для всех
-- провайдеров. UNIQUE-индекс на provider_session_id остаётся в силе.
-- Created: 2026-06-04

ALTER TABLE card_topups
  ALTER COLUMN transaction_id       TYPE TEXT,
  ALTER COLUMN provider_session_id  TYPE TEXT,
  ALTER COLUMN provider_payment_id  TYPE TEXT;
