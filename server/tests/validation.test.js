/**
 * Unit-тесты для server/validation.js — pure-функция, не требует БД и сети.
 * Покрывают: позитивные кейсы, edge cases, защита от мусора.
 */
const { schemas, validate } = require('../validation');

describe('schemas.login', () => {
  test('accepts valid credentials and normalizes email', () => {
    const r = schemas.login.safeParse({ email: '  TEST@Example.COM ', password: 'pwd' });
    expect(r.success).toBe(true);
    expect(r.data.email).toBe('test@example.com');
  });

  test('rejects malformed email', () => {
    const r = schemas.login.safeParse({ email: 'not-an-email', password: 'pwd' });
    expect(r.success).toBe(false);
  });

  test('rejects oversized password (DoS guard)', () => {
    const r = schemas.login.safeParse({ email: 'a@b.co', password: 'x'.repeat(500) });
    expect(r.success).toBe(false);
  });

  test('strips unknown fields (.strict)', () => {
    const r = schemas.login.safeParse({ email: 'a@b.co', password: 'pwd', isAdmin: true });
    expect(r.success).toBe(false);
  });
});

describe('schemas.register', () => {
  test('accepts valid input with displayName', () => {
    const r = schemas.register.safeParse({ email: 'u@e.com', password: 'Secret123', displayName: 'Иван' });
    expect(r.success).toBe(true);
    expect(r.data.displayName).toBe('Иван');
  });

  test('accepts firstName + lastName без displayName', () => {
    const r = schemas.register.safeParse({ email: 'u@e.com', password: 'Secret123', firstName: 'Иван', lastName: 'Иванов' });
    expect(r.success).toBe(true);
  });

  test('реджектит пароль без заглавной буквы', () => {
    const r = schemas.register.safeParse({ email: 'u@e.com', password: 'secret123' });
    expect(r.success).toBe(false);
  });

  test('реджектит пароль без цифры', () => {
    const r = schemas.register.safeParse({ email: 'u@e.com', password: 'SecretPass' });
    expect(r.success).toBe(false);
  });

  test('реджектит пароль короче 8 символов', () => {
    const r = schemas.register.safeParse({ email: 'u@e.com', password: 'Ab1' });
    expect(r.success).toBe(false);
  });

  test('реджектит неизвестные поля (.strict)', () => {
    const r = schemas.register.safeParse({ email: 'u@e.com', password: 'Secret123', isAdmin: true });
    expect(r.success).toBe(false);
  });
});

describe('schemas.cardTopup', () => {
  test('coerces string amount to number', () => {
    const r = schemas.cardTopup.safeParse({ amount: '500' });
    expect(r.success).toBe(true);
    expect(r.data.amount).toBe(500);
  });

  test('rejects negative amount', () => {
    const r = schemas.cardTopup.safeParse({ amount: -100 });
    expect(r.success).toBe(false);
  });

  test('rejects amount over 1M', () => {
    const r = schemas.cardTopup.safeParse({ amount: 2_000_000 });
    expect(r.success).toBe(false);
  });

  test('rejects unknown payment method', () => {
    const r = schemas.cardTopup.safeParse({ amount: 100, paymentMethod: 'crypto' });
    expect(r.success).toBe(false);
  });

  test('accepts known payment methods', () => {
    for (const pm of ['card', 'sbp', 'bank_transfer']) {
      expect(schemas.cardTopup.safeParse({ amount: 100, paymentMethod: pm }).success).toBe(true);
    }
  });
});

describe('schemas.createBooking', () => {
  test('accepts both numeric and string propertyId', () => {
    expect(schemas.createBooking.safeParse({ propertyId: 1, checkInDate: '01.06.2026', checkOutDate: '03.06.2026' }).success).toBe(true);
    expect(schemas.createBooking.safeParse({ propertyId: '1', checkInDate: '01.06.2026', checkOutDate: '03.06.2026' }).success).toBe(true);
  });

  test('rejects malformed date', () => {
    const r = schemas.createBooking.safeParse({ propertyId: 1, checkInDate: '2026-06-01', checkOutDate: '03.06.2026' });
    expect(r.success).toBe(false);
  });

  test('rejects oversized notes (DoS)', () => {
    const r = schemas.createBooking.safeParse({
      propertyId: 1, checkInDate: '01.06.2026', checkOutDate: '03.06.2026',
      notes: 'a'.repeat(5000),
    });
    expect(r.success).toBe(false);
  });
});

describe('validate() middleware', () => {
  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
  };

  test('calls next() on valid input and replaces req.body with parsed', () => {
    const req = { body: { email: 'A@B.com', password: 'xx' } };
    const res = mockRes();
    const next = jest.fn();
    validate(schemas.login)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body.email).toBe('a@b.com');
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 400 with details on invalid input', () => {
    const req = { body: { email: 'bad', password: 'x' } };
    const res = mockRes();
    const next = jest.fn();
    validate(schemas.login)(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(Array.isArray(payload.details)).toBe(true);
  });
});
