-- ==================== Widen card_topups id columns ====================
-- Google Play purchaseToken — opaque base64, обычно 600–1000 символов.
-- Stripe session.id (~66) и PayPal order.id (~17) укладываются в VARCHAR(255),
-- но Google Play — нет. Перевод на TEXT снимает ограничение для всех
-- провайдеров. UNIQUE-индекс на provider_session_id остаётся в силе.
-- Created: 2026-06-04
--
-- Имена колонок:
--   * transactionId       — без field-маппинга в модели → "transactionId" (camelCase)
--   * provider_session_id — field:'provider_session_id' → snake_case
--   * provider_payment_id — field:'provider_payment_id' → snake_case
-- DO-блок с проверкой information_schema делает миграцию идемпотентной и
-- безопасной для свежих БД, где sync() уже создал колонки как TEXT.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='card_topups' AND column_name='transactionId') THEN
    ALTER TABLE card_topups ALTER COLUMN "transactionId" TYPE TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='card_topups' AND column_name='provider_session_id') THEN
    ALTER TABLE card_topups ALTER COLUMN provider_session_id TYPE TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='card_topups' AND column_name='provider_payment_id') THEN
    ALTER TABLE card_topups ALTER COLUMN provider_payment_id TYPE TEXT;
  END IF;
END $$;
