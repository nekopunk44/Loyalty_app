-- Для существующих БД, созданных через SQL-миграции (snake_case)
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token VARCHAR(512) DEFAULT NULL;

-- Для БД, созданных через sequelize.sync() (camelCase → lowercase)
ALTER TABLE users ADD COLUMN IF NOT EXISTS pushtoken VARCHAR(512) DEFAULT NULL;
