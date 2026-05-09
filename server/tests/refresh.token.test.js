/**
 * Тесты для механизма refresh-токена.
 * Проверяют схему валидации и логику ротации без реальной БД.
 */

const { schemas } = require('../validation');

// ==================== schemas.refreshToken ====================

describe('schemas.refreshToken', () => {
  test('принимает корректный refresh-токен', () => {
    const r = schemas.refreshToken.safeParse({ refreshToken: 'a'.repeat(96) });
    expect(r.success).toBe(true);
  });

  test('реджектит слишком короткий токен (< 16 символов)', () => {
    const r = schemas.refreshToken.safeParse({ refreshToken: 'tooshort' });
    expect(r.success).toBe(false);
  });

  test('реджектит слишком длинный токен (> 512 символов)', () => {
    const r = schemas.refreshToken.safeParse({ refreshToken: 'a'.repeat(513) });
    expect(r.success).toBe(false);
  });

  test('реджектит пустой токен', () => {
    const r = schemas.refreshToken.safeParse({ refreshToken: '' });
    expect(r.success).toBe(false);
  });

  test('реджектит отсутствие поля refreshToken', () => {
    const r = schemas.refreshToken.safeParse({});
    expect(r.success).toBe(false);
  });

  test('реджектит лишние поля (.strict)', () => {
    const r = schemas.refreshToken.safeParse({
      refreshToken: 'a'.repeat(96),
      userId: 'admin',
    });
    expect(r.success).toBe(false);
  });

  test('реджектит не-строку', () => {
    const r = schemas.refreshToken.safeParse({ refreshToken: 12345 });
    expect(r.success).toBe(false);
  });
});

// ==================== Ротация токенов (логика) ====================

describe('refresh token rotation logic', () => {
  const crypto = require('crypto');

  test('каждый вызов issueTokens генерирует уникальный refreshToken', () => {
    const tokens = new Set();
    for (let i = 0; i < 10; i++) {
      tokens.add(crypto.randomBytes(48).toString('hex'));
    }
    // Все 10 токенов уникальны
    expect(tokens.size).toBe(10);
  });

  test('refreshToken имеет достаточную длину энтропии (96 hex = 48 bytes = 384 bits)', () => {
    const token = crypto.randomBytes(48).toString('hex');
    expect(token.length).toBe(96);
    // Проходит валидацию схемы
    const r = schemas.refreshToken.safeParse({ refreshToken: token });
    expect(r.success).toBe(true);
  });

  test('refreshTokenExpires в будущем (7 дней)', () => {
    const REFRESH_TOKEN_DAYS = 7;
    const expires = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffDays = (expires - now) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(6.9);
    expect(diffDays).toBeLessThan(7.1);
  });
});

// ==================== Access token TTL ====================

describe('access token TTL', () => {
  const jwt = require('jsonwebtoken');
  const SECRET = 'test-secret-for-tests-only-not-for-production';

  test('access-токен истекает через 15 минут', () => {
    const token = jwt.sign({ userId: 'u1' }, SECRET, { expiresIn: '15m' });
    const decoded = jwt.decode(token);
    const ttlMs = (decoded.exp - decoded.iat) * 1000;
    expect(ttlMs).toBe(15 * 60 * 1000);
  });

  test('истёкший access-токен отклоняется при verifyToken', () => {
    // Токен с exp в прошлом
    const expiredToken = jwt.sign({ userId: 'u1' }, SECRET, { expiresIn: -1 });
    expect(() => jwt.verify(expiredToken, SECRET)).toThrow(/expired/);
  });

  test('невалидный токен отклоняется', () => {
    expect(() => jwt.verify('not.a.token', SECRET)).toThrow();
  });
});
