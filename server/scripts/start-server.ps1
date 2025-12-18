#!/usr/bin/env pwsh

# Скрипт для запуска сервера PostgreSQL и загрузки тестовых данных
# Работает на Windows PowerShell (PowerShell 7+)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Loyalty App - PostgreSQL Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Переходим в директорию скрипта
Set-Location $PSScriptRoot

# Проверяем наличие node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[1] Установка зависимостей..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Запускаем сервер в новом окне PowerShell
Write-Host "[2] Запуск Express сервера на порту 5002..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm start"

# Даем серверу время на запуск
Start-Sleep -Seconds 3

# Загружаем тестовые данные
Write-Host ""
Write-Host "[3] Загрузка тестовых данных..." -ForegroundColor Yellow
node seed.js

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Сервер успешно запущен!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "API доступен по адресу:" -ForegroundColor Green
Write-Host "  http://localhost:5002/api/auth/login" -ForegroundColor Green
Write-Host ""
Write-Host "Тестовые учетные данные:" -ForegroundColor Green
Write-Host "  Email: user1@example.com" -ForegroundColor Green
Write-Host "  Пароль: password123" -ForegroundColor Green
Write-Host ""

Read-Host "Нажмите Enter для выхода"
