const { ruToIso, isoToRu } = require('../utils/dates');

describe('ruToIso', () => {
  test('конвертирует валидный DD.MM.YYYY в ISO', () => {
    expect(ruToIso('31.12.2026')).toBe('2026-12-31');
    expect(ruToIso('01.01.2026')).toBe('2026-01-01');
  });

  test('возвращает не-строки как есть', () => {
    expect(ruToIso(null)).toBe(null);
    expect(ruToIso(undefined)).toBe(undefined);
    expect(ruToIso(42)).toBe(42);
  });

  test('возвращает невалидный формат как есть (валидация — не его задача)', () => {
    expect(ruToIso('2026-12-31')).toBe('2026-12-31');
    expect(ruToIso('garbage')).toBe('garbage');
    expect(ruToIso('1.1.2026')).toBe('1.1.2026');
    expect(ruToIso('')).toBe('');
  });
});

describe('isoToRu', () => {
  test('конвертирует ISO-строку в DD.MM.YYYY', () => {
    expect(isoToRu('2026-12-31')).toBe('31.12.2026');
    expect(isoToRu('2026-01-01')).toBe('01.01.2026');
  });

  test('обрезает время от ISO timestamp', () => {
    expect(isoToRu('2026-12-31T15:30:00.000Z')).toBe('31.12.2026');
  });

  test('конвертирует объект Date', () => {
    expect(isoToRu(new Date('2026-12-31T00:00:00.000Z'))).toBe('31.12.2026');
  });

  test('возвращает null/undefined как есть', () => {
    expect(isoToRu(null)).toBe(null);
    expect(isoToRu(undefined)).toBe(undefined);
  });

  test('невалидный Date возвращается как есть', () => {
    const bad = new Date('not-a-date');
    expect(isoToRu(bad)).toBe(bad);
  });

  test('возвращает несоответствующий формат как есть', () => {
    expect(isoToRu('garbage')).toBe('garbage');
    expect(isoToRu('31.12.2026')).toBe('31.12.2026');
  });

  test('круговая конверсия ru -> iso -> ru сохраняет значение', () => {
    expect(isoToRu(ruToIso('15.06.2026'))).toBe('15.06.2026');
  });
});
