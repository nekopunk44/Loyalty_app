/**
 * Properties routes:
 *   POST   /                      — создать объект (админ)
 *   PATCH  /:propertyId           — обновить объект (админ)
 *   DELETE /:propertyId           — удалить объект (админ)
 *   GET    /                      — список доступных объектов
 *   GET    /:propertyId           — один объект по PK
 */
const express = require('express');

const logger = require('../logger');
const { Property } = require('../models');
const { verifyAdmin } = require('../middleware/auth');

const isDev = () => (process.env.NODE_ENV || 'development') === 'development';
const getPort = () => process.env.PORT || 5002;

const buildImageUrl = (image) =>
  image
    ? `${process.env.API_BASE_URL || `http://localhost:${getPort()}`}/assets/standart/${image}`
    : null;

module.exports = function createPropertiesRouter({ isDbConnected }) {
  const router = express.Router();

  /**
   * POST / — создать объект.
   */
  router.post('/', verifyAdmin, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }
      const { name, description, price, status, image, amenities } = req.body;
      if (!name || !price) {
        return res.status(400).json({ success: false, error: 'name и price обязательны' });
      }
      const property = await Property.create({
        name,
        description,
        price: parseFloat(price),
        status: status || 'available',
        image,
        amenities,
      });
      return res.status(201).json({ success: true, property });
    } catch (error) {
      logger.error('property create error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Ошибка при создании объекта' });
    }
  });

  /**
   * PATCH /:propertyId — обновить объект.
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
      const allowed = ['name', 'description', 'price', 'status', 'image', 'amenities'];
      const updates = {};
      for (const k of allowed) {
        if (req.body[k] !== undefined) updates[k] = req.body[k];
      }
      await property.update(updates);
      return res.json({ success: true, property });
    } catch (error) {
      logger.error('property update error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Ошибка при обновлении объекта' });
    }
  });

  /**
   * DELETE /:propertyId — удалить объект.
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
      return res.json({ success: true, message: 'Объект удален' });
    } catch (error) {
      logger.error('property delete error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Ошибка при удалении объекта' });
    }
  });

  /**
   * GET / — список доступных объектов.
   */
  router.get('/', async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL не подключена' });
      }
      const properties = await Property.findAll({ where: { status: 'available' } });
      const formatted = properties.map((p) => ({
        ...p.toJSON(),
        image: buildImageUrl(p.image),
      }));
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
   * GET /:propertyId — один объект.
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
      return res.status(200).json({
        success: true,
        property: { ...property.toJSON(), image: buildImageUrl(property.image) },
      });
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
