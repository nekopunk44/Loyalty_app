@echo off
REM Скрипт для запуска сервера PostgreSQL и загрузки тестовых данных
REM Работает на Windows PowerShell и CMD

echo.
echo ========================================
echo  Loyalty App - PostgreSQL Setup
echo ========================================
echo.

REM Проверяем текущую директорию
cd /d "%~dp0"

REM Проверяем наличие node_modules
if not exist "node_modules" (
    echo [1] Установка зависимостей...
    call npm install
    echo.
)

REM Запускаем сервер в фоне
echo [2] Запуск Express сервера на порту 5002...
start "Loyalty App Server" cmd /k npm start

REM Даем серверу время на запуск
timeout /t 3 /nobreak

REM Загружаем тестовые данные
echo.
echo [3] Загрузка тестовых данных...
call node seed.js

echo.
echo ========================================
echo  Сервер успешно запущен!
echo ========================================
echo.
echo API доступен по адресу:
echo   http://localhost:5002/api/auth/login
echo.
echo Тестовые учетные данные:
echo   Email: user1@example.com
echo   Пароль: password123
echo.
pause
