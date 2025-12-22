#!/usr/bin/env node
/**
 * Запускает ML-микросервис (FastAPI + Uvicorn) из server/ml.
 * Выбирает Python из локального venv, если он есть; иначе системный.
 *
 * Используется из npm-скриптов:
 *   npm run dev:ml    — только ML
 *   npm run dev:all   — backend + ML параллельно
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ML_DIR = path.resolve(__dirname, '..', 'ml');
const PORT = process.env.ML_PORT || '8001';
const HOST = process.env.ML_HOST || '127.0.0.1';

const venvPython = process.platform === 'win32'
  ? path.join(ML_DIR, '.venv', 'Scripts', 'python.exe')
  : path.join(ML_DIR, '.venv', 'bin', 'python');

const python = fs.existsSync(venvPython) ? venvPython : (process.platform === 'win32' ? 'python' : 'python3');

if (!fs.existsSync(venvPython)) {
  console.warn(`[ml] venv не найден (${venvPython}), используется системный ${python}`);
  console.warn('[ml] установка: cd server/ml && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt');
}

if (!fs.existsSync(path.join(ML_DIR, 'main.py'))) {
  console.error(`[ml] main.py не найден в ${ML_DIR}`);
  process.exit(1);
}

const args = ['-m', 'uvicorn', 'main:app', '--host', HOST, '--port', PORT, '--reload'];
console.log(`[ml] starting ${python} ${args.join(' ')} (cwd=${ML_DIR})`);

const child = spawn(python, args, {
  cwd: ML_DIR,
  stdio: 'inherit',
  env: process.env,
});

const stop = (signal) => {
  if (!child.killed) child.kill(signal);
};
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) {
    console.log(`[ml] завершён сигналом ${signal}`);
    process.exit(0);
  }
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error(`[ml] ошибка запуска: ${err.message}`);
  process.exit(1);
});
