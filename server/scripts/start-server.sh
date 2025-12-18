#!/bin/bash

# Скрипт для запуска сервера PostgreSQL и загрузки тестовых данных
# Работает на macOS и Linux

echo ""
echo "========================================"
echo "  Loyalty App - PostgreSQL Setup"
echo "========================================"
echo ""

# Переходим в директорию скрипта
cd "$(dirname "$0")"

# Проверяем наличие node_modules
if [ ! -d "node_modules" ]; then
    echo "[1] Установка зависимостей..."
    npm install
    echo ""
fi

# Запускаем сервер в новом окне (macOS) или фоне (Linux)
echo "[2] Запуск Express сервера на порту 5002..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open -a Terminal.app "$(pwd)/server.command"
else
    # Linux
    npm start &
    SERVER_PID=$!
fi

# Даем серверу время на запуск
sleep 3

# Загружаем тестовые данные
echo ""
echo "[3] Загрузка тестовых данных..."
node seed.js

echo ""
echo "========================================"
echo "  Сервер успешно запущен!"
echo "========================================"
echo ""
echo "API доступен по адресу:"
echo "  http://localhost:5002/api/auth/login"
echo ""
echo "Тестовые учетные данные:"
echo "  Email: user1@example.com"
echo "  Пароль: password123"
echo ""
