-- ==================== House Rules Signature ====================
-- Подпись пользователя с правилами дома хранится на сервере, чтобы админ
-- мог видеть её при просмотре деталей бронирования.
--
-- rules_signature  — JSON: { paths: ["M x y L ..."], ... } для рендера SVG.
-- rules_signed_at  — момент подписания (TIMESTAMP WITH TIME ZONE).
--
-- Подпись одноразовая для пользователя: одна на все будущие бронирования.
--
-- Создано: 2026-06-01

ALTER TABLE users ADD COLUMN IF NOT EXISTS rules_signature TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rules_signed_at TIMESTAMPTZ;
