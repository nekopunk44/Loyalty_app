-- ==================== AdminTransaction ENUM extension ====================
-- Sprint A ВКР: гибридная оплата (deposit + remaining) и cancel-логика
-- используют типы AdminTransaction, которых не было в исходном енуме:
--   booking_deposit    — депозит за бронирование (LoyaltyCard → AdminWallet)
--   booking_remaining  — остаток оплаты (LoyaltyCard → AdminWallet)
--   cashback_payout    — выдача кэшбэка (AdminWallet → LoyaltyCard)
--   booking_refund     — возврат при отмене (AdminWallet → LoyaltyCard)
--   cashback_revert    — откат начисленного кэшбэка (LoyaltyCard → AdminWallet)
--
-- Без этой миграции pay-deposit/pay-remaining/cancel падают с
--   "invalid input value for enum enum_admin_transactions_type" (PG 22P02).
--
-- ALTER TYPE ... ADD VALUE не работает внутри транзакции (PG <12 строго,
-- PG 12+ требует IF NOT EXISTS и отдельный statement). Каждое значение
-- отдельным statement — идемпотентно при повторном применении.
--
-- Создано: 2026-06-05

ALTER TYPE enum_admin_transactions_type ADD VALUE IF NOT EXISTS 'booking_deposit';
ALTER TYPE enum_admin_transactions_type ADD VALUE IF NOT EXISTS 'booking_remaining';
ALTER TYPE enum_admin_transactions_type ADD VALUE IF NOT EXISTS 'cashback_payout';
ALTER TYPE enum_admin_transactions_type ADD VALUE IF NOT EXISTS 'booking_refund';
ALTER TYPE enum_admin_transactions_type ADD VALUE IF NOT EXISTS 'cashback_revert';
