const https = require('https');
const logger = require('../logger');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Отправить push-уведомление через Expo Push API.
 * @param {string|string[]} to  — Expo Push Token(ы)
 * @param {string} title
 * @param {string} body
 * @param {object} [data={}]
 */
async function sendExpoPush(to, title, body, data = {}) {
  const tokens = Array.isArray(to) ? to : [to];
  const validTokens = tokens.filter(t => t && typeof t === 'string' && t.startsWith('ExponentPushToken['));
  if (validTokens.length === 0) return;

  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  const payload = JSON.stringify(messages);

  return new Promise((resolve) => {
    const req = https.request(
      EXPO_PUSH_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          try {
            const result = JSON.parse(raw);
            logger.info('Expo push sent', { tokens: validTokens.length, status: res.statusCode });
            resolve(result);
          } catch (_) {
            resolve(null);
          }
        });
      }
    );

    req.on('error', (err) => {
      logger.error('Expo push error', { error: err.message });
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { sendExpoPush };
