-- Добавляет колонки для хранения refresh-токенов в таблицу users.
-- Идемпотентна: повторный запуск не вызовет ошибки.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "refreshToken"        VARCHAR(512),
  ADD COLUMN IF NOT EXISTS "refreshTokenExpires" TIMESTAMPTZ;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_refresh_token
  ON users ("refreshToken")
  WHERE "refreshToken" IS NOT NULL;
