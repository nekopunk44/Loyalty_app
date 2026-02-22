#!/bin/bash
# Скрипт для выполнения миграций PostgreSQL

# Переменные подключения (измените на ваши данные)
DB_HOST="localhost"
DB_USER="postgres"
DB_NAME="loyalty_app"
DB_PORT="5432"

# Выполняем миграции
echo "🔄 Применяем миграции к базе данных..."

# Миграция 1: Исходная схема
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f migrations/001_initial_schema.sql
if [ $? -eq 0 ]; then
  echo "✅ Миграция 001_initial_schema.sql применена успешно"
else
  echo "❌ Ошибка при применении 001_initial_schema.sql"
fi

# Миграция 2: Добавление полей событий
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f migrations/002_add_event_fields.sql
if [ $? -eq 0 ]; then
  echo "✅ Миграция 002_add_event_fields.sql применена успешно"
else
  echo "❌ Ошибка при применении 002_add_event_fields.sql"
fi

# Миграция 3: Добавление дополнительных услуг
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f migrations/003_add_additional_services.sql
if [ $? -eq 0 ]; then
  echo "✅ Миграция 003_add_additional_services.sql применена успешно"
else
  echo "❌ Ошибка при применении 003_add_additional_services.sql"
fi

echo "🎉 Все миграции завершены!"
