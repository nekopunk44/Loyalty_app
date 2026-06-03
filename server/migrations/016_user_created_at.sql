-- ==================== User created_at ====================
-- Дата регистрации пользователя в программе лояльности. Раньше Sequelize-модель
-- была с timestamps:false и created_at вообще не существовал в БД — поэтому в
-- админ-панели на месте «С нами с …» всегда показывалось «сегодня».
--
-- DEFAULT NOW() покрывает новые регистрации (auth.js User.create() ничего не
-- передаёт). Существующим строкам проставляем NOW() как разумную заглушку —
-- настоящая дата регистрации потеряна вместе с тем, что timestamps были
-- выключены изначально.
--
-- После бэкфилла снимаем nullable: колонка обязательная.
--
-- Создано: 2026-06-01

ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
UPDATE users SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;
