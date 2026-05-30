const logger = require('../logger');
const { Notification, User } = require('../models');
const { pushNotificationToUser } = require('../routes/notifications');
const { sendExpoPush } = require('./expoPush');

/**
 * Создать уведомление + доставить его всеми каналами:
 *   1) запись в БД (Notification)
 *   2) SSE-пуш активным клиентам пользователя
 *   3) Expo Push (OS-баннер) на устройство
 *
 * userId — строковый внешний идентификатор (User.userId), а не PK.
 */
async function notify({ userId, title, message, type, data, actionUrl }) {
  if (!userId) return null;
  try {
    const notification = await Notification.create({
      userId: String(userId),
      title,
      message,
      type: type || 'system',
      data: data || {},
      actionUrl,
      read: false,
    });

    try { pushNotificationToUser(String(userId), notification); } catch (_) { /* ignore */ }

    User.findOne({ where: { userId: String(userId) }, attributes: ['pushToken'] })
      .then(user => {
        if (user?.pushToken) {
          return sendExpoPush(user.pushToken, title, message, data || {});
        }
      })
      .catch(err => logger.error('notify: expo push failed', { error: err.message, userId }));

    return notification;
  } catch (err) {
    logger.error('notify failed', { error: err.message, userId, type });
    return null;
  }
}

/**
 * Разослать уведомление всем администраторам.
 * payload — без userId; title/message/type/data/actionUrl.
 */
async function notifyAllAdmins(payload) {
  try {
    const admins = await User.findAll({
      where: { role: 'admin' },
      attributes: ['userId'],
    });
    await Promise.allSettled(
      admins.map(a => notify({ ...payload, userId: a.userId }))
    );
  } catch (err) {
    logger.error('notifyAllAdmins failed', { error: err.message });
  }
}

module.exports = { notify, notifyAllAdmins };
