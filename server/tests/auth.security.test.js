/**
 * Тесты безопасности auth-маршрутов.
 * Проверяют критичные уязвимости без запуска реальной БД —
 * все обращения к Sequelize замокированы.
 */

const { schemas } = require('../validation');

// ==================== set-new-password schema ====================

describe('schemas.setNewPassword', () => {
  test('требует token (не email)', () => {
    // Старая версия принимала email — теперь email недопустим
    const withEmail = schemas.setNewPassword.safeParse({
      email: 'victim@example.com',
      newPassword: 'NewPass123',
    });
    expect(withEmail.success).toBe(false); // email — unknown field, .strict() отбрасывает

    const withToken = schemas.setNewPassword.safeParse({
      token: 'a'.repeat(64),
      newPassword: 'NewPass123',
    });
    expect(withToken.success).toBe(true);
  });

  test('реджектит слишком короткий token (< 8 символов)', () => {
    const r = schemas.setNewPassword.safeParse({ token: 'short', newPassword: 'NewPass123' });
    expect(r.success).toBe(false);
  });

  test('реджектит слабый пароль (< 6 символов)', () => {
    const r = schemas.setNewPassword.safeParse({ token: 'a'.repeat(64), newPassword: '123' });
    expect(r.success).toBe(false);
  });

  test('реджектит слишком длинный token (> 256 символов)', () => {
    const r = schemas.setNewPassword.safeParse({ token: 'a'.repeat(300), newPassword: 'NewPass123' });
    expect(r.success).toBe(false);
  });

  test('не принимает лишние поля (.strict)', () => {
    const r = schemas.setNewPassword.safeParse({
      token: 'a'.repeat(64),
      newPassword: 'NewPass123',
      role: 'admin',
    });
    expect(r.success).toBe(false);
  });
});

// ==================== schemas.login — brute force defence ====================

describe('schemas.login — защита от brute force', () => {
  test('реджектит пустой пароль', () => {
    const r = schemas.login.safeParse({ email: 'a@b.com', password: '' });
    expect(r.success).toBe(false);
  });

  test('реджектит password длиннее 128 символов', () => {
    const r = schemas.login.safeParse({ email: 'a@b.com', password: 'x'.repeat(129) });
    expect(r.success).toBe(false);
  });

  test('нормализует email перед сравнением (lowercase + trim)', () => {
    const r = schemas.login.safeParse({ email: '  ADMIN@Example.COM  ', password: 'somepassword' });
    expect(r.success).toBe(true);
    expect(r.data.email).toBe('admin@example.com');
  });
});

// ==================== schemas.analytics — XSS guard ====================

describe('schemas.analytics — валидация eventType', () => {
  test('принимает корректный eventType', () => {
    const r = schemas.analytics.safeParse({ eventType: 'page_view' });
    expect(r.success).toBe(true);
  });

  test('реджектит eventType с HTML/XSS', () => {
    const r = schemas.analytics.safeParse({ eventType: '<script>alert(1)</script>' });
    expect(r.success).toBe(false);
  });

  test('реджектит eventType с пробелами', () => {
    const r = schemas.analytics.safeParse({ eventType: 'my event' });
    expect(r.success).toBe(false);
  });

  test('реджектит пустой eventType', () => {
    const r = schemas.analytics.safeParse({ eventType: '' });
    expect(r.success).toBe(false);
  });
});

// ==================== schemas.register — injection guard ====================

describe('schemas.register — защита от инъекций', () => {
  test('принимает displayName (поле добавлено в схему)', () => {
    // displayName теперь легитимное поле в registerSchema.
    // XSS в значении санируется на уровне xssSanitizer middleware, не схемой.
    const r = schemas.register.safeParse({
      email: 'u@e.com',
      password: 'Secret123',
      displayName: 'Иван Иванов',
    });
    expect(r.success).toBe(true);
    expect(r.data.displayName).toBe('Иван Иванов');
  });

  test('принимает firstName + lastName вместо displayName', () => {
    const r = schemas.register.safeParse({
      email: 'u@e.com',
      password: 'Secret123',
      firstName: 'Иван',
      lastName:  'Иванов',
    });
    expect(r.success).toBe(true);
  });

  test('реджектит поля не из схемы (.strict)', () => {
    const r = schemas.register.safeParse({
      email: 'u@e.com',
      password: 'Secret123',
      isAdmin: true,
    });
    expect(r.success).toBe(false);
  });

  test('реджектит email вида SQL-инъекция', () => {
    const r = schemas.register.safeParse({
      email: "' OR '1'='1",
      password: 'Secret123',
    });
    expect(r.success).toBe(false);
  });
});
