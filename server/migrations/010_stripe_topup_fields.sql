-- ==================== Stripe & PayPal Topup Migration ====================
-- Расширение card_topups для поддержки внешних платёжных провайдеров
-- (Stripe Checkout, PayPal Orders) с курсовой конвертацией PRB ↔ RUB/USD.
-- Created: 2026-05-27

ALTER TABLE card_topups
ADD COLUMN IF NOT EXISTS provider VARCHAR(32) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS provider_session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS original_currency VARCHAR(8),
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(12,6),
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- provider:            'manual' | 'stripe' | 'paypal' | 'bank_transfer'
-- provider_session_id: Stripe Checkout session.id / PayPal order.id
-- provider_payment_id: Stripe payment_intent.id / PayPal capture.id (после успеха)
-- original_amount:     сумма в валюте провайдера (RUB/USD)
-- original_currency:   'RUB' | 'USD'
-- exchange_rate:       1 RUB/USD = X PRB на момент создания сессии (аудит)

CREATE INDEX IF NOT EXISTS idx_card_topups_provider ON card_topups(provider);
CREATE UNIQUE INDEX IF NOT EXISTS idx_card_topups_provider_session_id
  ON card_topups(provider_session_id)
  WHERE provider_session_id IS NOT NULL;

-- Расширяем status, чтобы добавить 'expired' (Stripe session timeout)
-- card_topups.status уже VARCHAR(50), значения CHECK нет — добавлять не нужно.
