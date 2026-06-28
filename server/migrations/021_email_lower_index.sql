-- 021_email_lower_index.sql
-- Регистронезависимый вход: поиск пользователя идёт по lower(email) = '...'.
-- Функциональный индекс, чтобы при росте таблицы users логин не делал seq scan.
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));
