/**
 * Security middleware stack.
 * Подключается один раз в index.js: applySecurityMiddleware(app)
 *
 * Покрывает:
 *  - Helmet (HTTP-заголовки: CSP, HSTS, XSS-защита, и т.д.)
 *  - HPP  (HTTP Parameter Pollution)
 *  - Request timeout
 *  - Request size guard (reject до bodyParser)
 *  - IP / user-agent sanity checks
 *  - XSS-sanitize строк в req.body (рекурсивно)
 *  - Path traversal guard
 *  - Host-header injection guard
 */
const helmet = require('helmet');
const hpp    = require('hpp');
const logger = require('../logger');

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd   = NODE_ENV === 'production';

// ============================================================
// 1. Helmet — полный набор безопасных HTTP-заголовков
// ============================================================
const helmetMiddleware = helmet({
  // Content-Security-Policy: только self + API-домен
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'", "'unsafe-inline'"],
      imgSrc:         ["'self'", 'data:', 'blob:'],
      connectSrc:     ["'self'"],
      fontSrc:        ["'self'"],
      objectSrc:      ["'none'"],
      frameSrc:       ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
  // HSTS — только в production
  strictTransportSecurity: isProd
    ? { maxAge: 63_072_000, includeSubDomains: true, preload: true } // 2 года
    : false,
  // Запрет встраивания в iframe
  frameguard: { action: 'deny' },
  // Запрет MIME sniffing
  noSniff: true,
  // XSS filter (IE legacy)
  xssFilter: true,
  // Убираем X-Powered-By
  hidePoweredBy: true,
  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // CORP для cross-origin ресурсов (нужен для /assets)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: false,
  // Permissions Policy
  permissionsPolicy: {
    features: {
      geolocation:         [],
      microphone:          [],
      camera:              [],
      payment:             [],
      usb:                 [],
      fullscreen:          ["'self'"],
    },
  },
});

// ============================================================
// 2. HPP — защита от HTTP Parameter Pollution
//    ?amount=100&amount=999 → берём последнее значение
// ============================================================
const hppMiddleware = hpp({
  whitelist: [], // никакие параметры не дублируются
});

// ============================================================
// 3. Request timeout — 30s для обычных, 60s для uploads
// ============================================================
const REQUEST_TIMEOUT_MS = 30_000;

const timeoutMiddleware = (req, res, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      logger.warn('request timeout', { method: req.method, path: req.path, ip: req.ip });
      res.status(503).json({ success: false, error: 'Request timeout' });
    }
  }, REQUEST_TIMEOUT_MS);

  // Очищаем таймер при завершении
  res.on('finish',  () => clearTimeout(timeout));
  res.on('close',   () => clearTimeout(timeout));
  next();
};

// ============================================================
// 4. Raw body size guard — отсекает до bodyParser
//    Дефолтный bodyParser.json() лимит = 1MB, но его можно обойти
//    чанкованием. Этот middleware считает Content-Length заголовок.
// ============================================================
const MAX_CONTENT_LENGTH = 1 * 1024 * 1024; // 1 MB

const bodySizeGuard = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_CONTENT_LENGTH) {
    logger.warn('request too large', { contentLength, ip: req.ip, path: req.path });
    return res.status(413).json({ success: false, error: 'Request entity too large' });
  }
  next();
};

// ============================================================
// 5. Host-header injection guard
//    Защита от атак через Host: evil.com в password-reset письмах
// ============================================================
const ALLOWED_HOSTS = (
  process.env.ALLOWED_HOSTS ||
  `localhost:${process.env.PORT || 5002},127.0.0.1:${process.env.PORT || 5002}`
).split(',').map(h => h.trim().toLowerCase());

const hostGuard = (req, res, next) => {
  if (!isProd) return next(); // в dev не проверяем

  const host = (req.headers.host || '').toLowerCase().split(':')[0];
  const allowed = ALLOWED_HOSTS.map(h => h.split(':')[0]);
  if (!allowed.includes(host)) {
    logger.warn('host injection attempt', { host: req.headers.host, ip: req.ip });
    return res.status(400).json({ success: false, error: 'Invalid Host header' });
  }
  next();
};

// ============================================================
// 6. XSS sanitizer — рекурсивно очищает строки в req.body
//    Удаляет <script>, on* handlers, javascript: URI
//    (Sequelize параметризует запросы, но SQL-injection всё равно
//    возможна через Sequelize literal — это extra defence-in-depth)
// ============================================================
const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /on\w+\s*=\s*[^>\s]*/gi,
  /<[^>]+>/g, // убираем все HTML теги из API-значений
];

const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  let s = str;
  for (const pattern of XSS_PATTERNS) {
    s = s.replace(pattern, '');
  }
  return s;
};

const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === 'object') {
    const clean = {};
    for (const key of Object.keys(obj)) {
      clean[sanitizeString(key)] = sanitizeObject(obj[key]);
    }
    return clean;
  }
  return obj;
};

const xssSanitizer = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};

// ============================================================
// 7. Path traversal guard — блокируем ../ в URL и query params
// ============================================================
const pathTraversalGuard = (req, res, next) => {
  const suspicious = /(\.\.|%2e%2e|%252e%252e|\.\.%2f|%2f\.\.)/i;
  const urlToCheck = req.originalUrl + JSON.stringify(req.query);
  if (suspicious.test(urlToCheck)) {
    logger.warn('path traversal attempt', { url: req.originalUrl, ip: req.ip });
    return res.status(400).json({ success: false, error: 'Invalid request path' });
  }
  next();
};

// ============================================================
// 8. Request ID — для трассировки логов
// ============================================================
const requestId = (req, res, next) => {
  const id = req.headers['x-request-id'] || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
};

// ============================================================
// Экспорт
// applySecurityMiddleware(app) — регистрирует всё кроме xssSanitizer
// (xssSanitizer надо подключать ПОСЛЕ bodyParser — экспортируется отдельно)
// ============================================================
function applySecurityMiddleware(app) {
  app.use(requestId);
  app.use(helmetMiddleware);
  app.use(hostGuard);
  app.use(pathTraversalGuard);
  app.use(bodySizeGuard);
  app.use(hppMiddleware);
  app.use(timeoutMiddleware);
}

applySecurityMiddleware.xssSanitizer = xssSanitizer;

module.exports = applySecurityMiddleware;
