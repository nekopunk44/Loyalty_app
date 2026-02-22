# PowerShell скрипт для выполнения миграций PostgreSQL

# Переменные подключения
$DB_HOST = "localhost"
$DB_USER = "postgres"
$DB_NAME = "loyalty_app"
$DB_PORT = "5432"
$PGPASSWORD = $env:PGPASSWORD  # или установите пароль явно: "your_password"

Write-Host "🔄 Применяем миграции к базе данных..."

# Миграция 1: Исходная схема
Write-Host "Применяем миграцию 001_initial_schema.sql..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f migrations/001_initial_schema.sql
if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Миграция 001_initial_schema.sql применена успешно"
} else {
  Write-Host "❌ Ошибка при применении 001_initial_schema.sql"
}

# Миграция 2: Добавление полей событий
Write-Host "Применяем миграцию 002_add_event_fields.sql..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f migrations/002_add_event_fields.sql
if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Миграция 002_add_event_fields.sql применена успешно"
} else {
  Write-Host "❌ Ошибка при применении 002_add_event_fields.sql"
}

# Миграция 3: Добавление дополнительных услуг
Write-Host "Применяем миграцию 003_add_additional_services.sql..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f migrations/003_add_additional_services.sql
if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Миграция 003_add_additional_services.sql применена успешно"
} else {
  Write-Host "❌ Ошибка при применении 003_add_additional_services.sql"
}

Write-Host "🎉 Все миграции завершены!"
