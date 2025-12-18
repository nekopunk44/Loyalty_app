/**
 * Трекинг онлайн-пользователей в памяти процесса.
 *
 * userId -> timestamp последней активности.
 * isUserOnline(uid) считает онлайн-ом тех, у кого активность была не более
 * ONLINE_TIMEOUT мс назад. Заодно лениво удаляет протухшие записи.
 *
 * Имеется в виду один процесс. Для горизонтального масштабирования (несколько
 * Node-инстансов) этот стейт надо переносить в Redis (cache.set/get с TTL).
 */
const connectedUsers = new Map();
const ONLINE_TIMEOUT = 30_000;

const isUserOnline = (userId) => {
  if (!connectedUsers.has(userId)) return false;
  const lastActivity = connectedUsers.get(userId);
  if (Date.now() - lastActivity < ONLINE_TIMEOUT) return true;
  connectedUsers.delete(userId);
  return false;
};

const markUserOnline = (userId) => {
  connectedUsers.set(userId, Date.now());
};

const markUserOffline = (userId) => {
  connectedUsers.delete(userId);
};

module.exports = {
  isUserOnline,
  markUserOnline,
  markUserOffline,
  connectedUsers,
  ONLINE_TIMEOUT,
};
