/**
 * Properties routes (prefix: /api/properties).
 *
 *   POST   /                          — создать номер (админ)
 *   PATCH  /:propertyId               — обновить номер (админ)
 *   DELETE /:propertyId               — удалить номер (админ)
 *   POST   /:propertyId/photos        — multipart: загрузить N фото (админ)
 *   DELETE /:propertyId/photos        — удалить фото { photo } (админ)
 *   GET    /                          — список доступных номеров
 *   GET    /:propertyId               — один номер по PK
 *
 * Фото хранятся в server/uploads/properties/<id>/<filename>. В БД лежат
 * относительные пути, на выходе резолвятся в полные URL через API_BASE_URL.
 * Из-за того, что image/photos исторически содержат и legacy-имя файла
 * (luks.jpg / standart.jpg — из src/assets/standart/), и относительный путь
 * (properties/<id>/...), резолвер умеет оба варианта.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const logger = require('../logger');
const { Property } = require('../models');
const { verifyAdmin } = require('../middleware/auth');

const isDev = () => (process.env.NODE_ENV || 'development') === 'development';
const getPort = () => process.env.PORT || 5002;
const getBaseUrl = () =>
  process.env.API_BASE_URL || `http://localhost:${getPort()}`;

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

/** http(s)://... — внешний URL, отдаём как есть. */
const isAbsoluteUrl = (s) => /^https?:\/\//i.test(s);

/**
 * Резолвит запись в БД в публичный URL.
 *   - 'http(s)://...'          → как есть
 *   - 'properties/<id>/<f>'    → /uploads/properties/<id>/<f>
 *   - 'standart.jpg' (legacy)  → /assets/standart/standart.jpg
 *   - null/''                  → null
 */
const resolveImage = (raw) => {
  if (!raw) return null;
  if (isAbsoluteUrl(raw)) return raw;
  const base = getBaseUrl();
  if (raw.startsWith('properties/') || raw.startsWith('uploads/')) {
    const rel = raw.startsWith('uploads/') ? raw.slice('uploads/'.length) : raw;
    return `${base}/uploads/${rel}`;
  }
  // legacy: голое имя файла в src/assets/standart/
  return `${base}/assets/standart/${raw}`;
};

const formatProperty = (p) => {
  const json = p.toJSON();
  const photos = Array.isArray(json.photos) ? json.photos : [];
  return {
    ...json,
    image: resolveImage(json.image),
    photos: photos.map(resolveImage).filter(Boolean),
  };
};

// ─── multer: запись в uploads/properties/<id>/<random>-<orig> ────────────────

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_ROOT, 'properties', String(req.params.propertyId));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.jpg';
    const stem = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${stem}${safeExt}`);
  },
});

const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 8 * 1024 * 1024, files: 20 }, // 8 МБ × до 20 файлов за запрос
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype)) return cb(null, true);
    cb(new Error('Допустимы только jpeg/png/webp/gif'));
  },
});

// ─── allowlist для POST / PATCH ─────────────────────────────────────────────

const SCALAR_FIELDS = [
  'name', 'description', 'price', 'priceNumber', 'status',
  'image', 'rooms', 'guests', 'depositAmount',
];
const ARRAY_FIELDS = ['amenities', 'photos'];

const pickAllowed = (body) => {
  const out = {};
  for (const k of SCALAR_FIELDS) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  for (const k of ARRAY_FIELDS) {
    if (body[k] !== undefined) {
      out[k] = Array.isArray(body[k]) ? body[k] : [];
    }
  }
  return out;
};

module.exports = function createPropertiesRouter({ isDbConnected }) {
  const router = express.Router();

  /**
   * POST / — создать номер.
   */
  router.post('/', verifyAdmin, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }
      const data = pickAllowed(req.body);
      if (!data.name || !data.price) {
        return res.status(400).json({ success: false, error: 'name и price обязательны' });
      }
      const property = await Property.create({
        ...data,
        status: data.status || 'available',
        photos: data.photos || [],
        amenities: data.amenities || [],
      });
      return res.status(201).json({ success: true, property: formatProperty(property) });
    } catch (error) {
      logger.error('property create error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Ошибка при создании объекта' });
    }
  });

  /**
   * PATCH /:propertyId — обновить номер.
   */
  router.patch('/:propertyId', verifyAdmin, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }
      const property = await Property.findByPk(req.params.propertyId);
      if (!property) {
        return res.status(404).json({ success: false, error: 'Объект не найден' });
      }
      await property.update(pickAllowed(req.body));
      return res.json({ success: true, property: formatProperty(property) });
    } catch (error) {
      logger.error('property update error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Ошибка при обновлении объекта' });
    }
  });

  /**
   * DELETE /:propertyId — удалить номер (плюс физически чистим папку фото).
   */
  router.delete('/:propertyId', verifyAdmin, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }
      const property = await Property.findByPk(req.params.propertyId);
      if (!property) {
        return res.status(404).json({ success: false, error: 'Объект не найден' });
      }
      await property.destroy();

      const dir = path.join(UPLOADS_ROOT, 'properties', String(req.params.propertyId));
      fs.rm(dir, { recursive: true, force: true }, () => {});

      return res.json({ success: true, message: 'Объект удалён' });
    } catch (error) {
      logger.error('property delete error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Ошибка при удалении объекта' });
    }
  });

  /**
   * POST /:propertyId/photos — multipart upload (поле "photos"), до 20 файлов.
   * Возвращает обновлённый список фото номера.
   */
  router.post(
    '/:propertyId/photos',
    verifyAdmin,
    (req, res, next) => {
      photoUpload.array('photos', 20)(req, res, (err) => {
        if (err) {
          logger.warn('property photos upload error', { error: err.message });
          return res.status(400).json({ success: false, error: err.message });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        if (!isDbConnected()) {
          return res.status(503).json({ success: false, error: 'База данных не подключена' });
        }
        const property = await Property.findByPk(req.params.propertyId);
        if (!property) {
          // Файлы уже легли на диск — подчищаем
          (req.files || []).forEach((f) => fs.unlink(f.path, () => {}));
          return res.status(404).json({ success: false, error: 'Объект не найден' });
        }
        const added = (req.files || []).map(
          (f) => `properties/${req.params.propertyId}/${f.filename}`
        );
        const photos = [...(property.photos || []), ...added];
        // image — обложка. Если у номера её ещё нет, ставим первую загруженную.
        const updates = { photos };
        if (!property.image && added[0]) updates.image = added[0];
        await property.update(updates);

        return res.status(201).json({
          success: true,
          property: formatProperty(property),
          added: added.map(resolveImage),
        });
      } catch (error) {
        logger.error('property photos save error', { error: error.message });
        return res.status(500).json({ success: false, error: 'Не удалось сохранить фото' });
      }
    }
  );

  /**
   * DELETE /:propertyId/photos — body: { photo: 'properties/<id>/<file>' | full URL }.
   * Удаляет из массива photos и с диска (если файл наш).
   */
  router.delete('/:propertyId/photos', verifyAdmin, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }
      const property = await Property.findByPk(req.params.propertyId);
      if (!property) {
        return res.status(404).json({ success: false, error: 'Объект не найден' });
      }
      const target = req.body?.photo;
      if (!target) {
        return res.status(400).json({ success: false, error: 'photo обязателен' });
      }
      // Сводим присланное к относительному виду 'properties/...'
      const rel = isAbsoluteUrl(target)
        ? target.replace(/^https?:\/\/[^/]+\/uploads\//i, '')
        : target.replace(/^\/?uploads\//, '');

      const photos = (property.photos || []).filter((p) => p !== rel);
      const updates = { photos };
      if (property.image === rel) updates.image = photos[0] || null;
      await property.update(updates);

      // Чистим файл, только если он реально лежит в нашем uploads/properties/<id>/
      if (rel.startsWith(`properties/${req.params.propertyId}/`)) {
        const abs = path.join(UPLOADS_ROOT, rel);
        fs.unlink(abs, () => {});
      }
      return res.json({ success: true, property: formatProperty(property) });
    } catch (error) {
      logger.error('property photo delete error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Не удалось удалить фото' });
    }
  });

  /**
   * GET / — список доступных номеров.
   */
  router.get('/', async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL не подключена' });
      }
      const properties = await Property.findAll({
        where: { status: 'available' },
        order: [['id', 'ASC']],
      });
      const formatted = properties.map(formatProperty);
      return res.status(200).json({ success: true, properties: formatted, count: formatted.length });
    } catch (error) {
      logger.error('properties list error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении объектов',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /admin/all — список всех номеров включая unavailable. Только админ.
   * Нужен AdminProperties-экрану.
   */
  router.get('/admin/all', verifyAdmin, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL не подключена' });
      }
      const properties = await Property.findAll({ order: [['id', 'ASC']] });
      const formatted = properties.map(formatProperty);
      return res.status(200).json({ success: true, properties: formatted, count: formatted.length });
    } catch (error) {
      logger.error('properties admin list error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении объектов',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  /**
   * GET /:propertyId — один номер.
   */
  router.get('/:propertyId', async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL не подключена' });
      }
      const property = await Property.findByPk(req.params.propertyId);
      if (!property) {
        return res.status(404).json({ success: false, error: 'Объект не найден' });
      }
      return res.status(200).json({ success: true, property: formatProperty(property) });
    } catch (error) {
      logger.error('property fetch error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении объекта',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  return router;
};
