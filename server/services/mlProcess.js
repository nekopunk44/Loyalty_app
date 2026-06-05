/**
 * Manages the FastAPI/uvicorn ML subprocess as a child of the Express process.
 * Auto-restarts on crash; forwards stdout/stderr to the shared logger.
 *
 * Env controls:
 *   ML_PROCESS_ENABLED       = true|false  (default: true; set false to disable)
 *   ML_PORT                  = port         (default: 8001)
 *   ML_HOST                  = host         (default: 127.0.0.1)
 *   ML_PROCESS_MAX_RESTARTS  = number       (default: 5)
 *   ML_PROCESS_RESTART_DELAY = ms           (default: 3000)
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logger = require('../logger');

const ML_DIR = path.resolve(__dirname, '..', 'ml');
const ML_PORT = process.env.ML_PORT || '8001';
const ML_HOST = process.env.ML_HOST || '127.0.0.1';
const MAX_RESTARTS = parseInt(process.env.ML_PROCESS_MAX_RESTARTS || '5', 10);
const RESTART_DELAY_MS = parseInt(process.env.ML_PROCESS_RESTART_DELAY || '3000', 10);

const venvPython = process.platform === 'win32'
  ? path.join(ML_DIR, '.venv', 'Scripts', 'python.exe')
  : path.join(ML_DIR, '.venv', 'bin', 'python');

const python = fs.existsSync(venvPython)
  ? venvPython
  : (process.platform === 'win32' ? 'python' : 'python3');

let child = null;
let restartCount = 0;
let stopped = false;

function spawnProcess() {
  if (stopped) return;

  const args = ['-m', 'uvicorn', 'main:app', '--host', ML_HOST, '--port', ML_PORT];
  logger.info('[ml-process] запуск', { python, port: ML_PORT });

  child = spawn(python, args, {
    cwd: ML_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  child.stdout.on('data', (d) => {
    for (const line of d.toString().split('\n')) {
      if (line.trim()) logger.info(`[ml] ${line.trimEnd()}`);
    }
  });

  child.stderr.on('data', (d) => {
    for (const line of d.toString().split('\n')) {
      if (!line.trim()) continue;
      // uvicorn writes startup/access logs to stderr — only flag actual ERROR lines
      const fn = /\bERROR\b/.test(line) ? 'error' : 'info';
      logger[fn](`[ml] ${line.trimEnd()}`);
    }
  });

  child.on('error', (err) => {
    logger.error('[ml-process] ошибка запуска процесса', { error: err.message });
    child = null;
    scheduleRestart();
  });

  child.on('exit', (code, signal) => {
    child = null;
    if (stopped) return;
    if (signal) {
      logger.warn('[ml-process] завершён сигналом', { signal });
    } else if (code !== 0) {
      logger.warn('[ml-process] аварийное завершение', { code });
      scheduleRestart();
    }
  });
}

function scheduleRestart() {
  if (stopped) return;
  if (restartCount >= MAX_RESTARTS) {
    logger.error('[ml-process] превышен лимит перезапусков — ML-сервис отключён', { max: MAX_RESTARTS });
    return;
  }
  restartCount += 1;
  logger.info('[ml-process] перезапуск', { attempt: restartCount, delayMs: RESTART_DELAY_MS });
  setTimeout(spawnProcess, RESTART_DELAY_MS);
}

function start() {
  if (process.env.ML_PROCESS_ENABLED === 'false') {
    logger.info('[ml-process] отключён через ML_PROCESS_ENABLED=false');
    return;
  }
  if (process.env.NODE_ENV === 'test') return;

  // ML_SERVICE_URL указывает на внешний хост (например, отдельный Railway-сервис)
  // — локальный child-процесс не нужен и не запустится (в Node-контейнере нет Python).
  const externalUrl = process.env.ML_SERVICE_URL;
  if (externalUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(externalUrl)) {
    logger.info('[ml-process] ML_SERVICE_URL внешний — локальный процесс не запускается', { url: externalUrl });
    return;
  }

  if (!fs.existsSync(path.join(ML_DIR, 'main.py'))) {
    logger.warn('[ml-process] main.py не найден — ML-сервис не будет запущен', { dir: ML_DIR });
    return;
  }

  if (!fs.existsSync(venvPython)) {
    logger.warn('[ml-process] venv не найден, используется системный Python', { python });
  }

  spawnProcess();
}

function stop() {
  stopped = true;
  if (child && !child.killed) {
    child.kill('SIGTERM');
  }
}

module.exports = { start, stop };
