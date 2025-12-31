-- ==================== Transaction Metadata ====================
-- Структурированный аудит транзакции. До этой миграции применённые скидки/буст
-- кэшбека жили только в свободном тексте description, что плохо для
-- последующей аналитики (§3.3 ВКР — метрики применения акций).
-- Created: 2026-05-29

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Возможные ключи metadata (по мере появления):
--   eventsApplied: [{id, title, cashbackBoostPercent, discountPercent, personalized}]
--   caps:          {discount: bool, boost: bool}  — был ли срезан общий лимит
--   source:        'booking_payment' | 'refund' | 'manual_adjustment'
