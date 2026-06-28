/**
 * Глобальные настройки приложения.
 *   GET /rules — правила программы и проживания (любой авторизованный пользователь)
 *   PUT /rules — сохранить правила (только админ)
 *
 * Правила хранятся одним JSON-объектом в app_settings под ключом 'rules',
 * чтобы правки администратора видели все пользователи.
 */
const express = require('express');

const logger = require('../logger');
const { AppSetting } = require('../models');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const RULES_KEY = 'rules';
const isDev = () => (process.env.NODE_ENV || 'development') === 'development';

module.exports = function createSettingsRouter({ isDbConnected }) {
  const router = express.Router();

  router.get('/rules', verifyToken, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }
      const row = await AppSetting.findByPk(RULES_KEY);
      return res.status(200).json({ success: true, rules: row ? row.value : null });
    } catch (error) {
      logger.error('get rules error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении правил',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  router.put('/rules', verifyAdmin, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).json({ success: false, error: 'База данных не подключена' });
      }
      const { rules } = req.body;
      if (!rules || typeof rules !== 'object') {
        return res.status(400).json({ success: false, error: 'Поле rules обязательно (объект)' });
      }
      await AppSetting.upsert({ key: RULES_KEY, value: rules, updatedAt: new Date() });
      const row = await AppSetting.findByPk(RULES_KEY);
      return res.status(200).json({ success: true, rules: row ? row.value : rules });
    } catch (error) {
      logger.error('put rules error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка при сохранении правил',
        details: isDev() ? error.message : undefined,
      });
    }
  });

  return router;
};
