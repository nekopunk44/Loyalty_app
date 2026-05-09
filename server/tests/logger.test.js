/**
 * Smoke-тесты для logger.js: ленивая загрузка, базовые методы существуют.
 */
describe('logger', () => {
  test('exports info/warn/error/debug', () => {
    const logger = require('../logger');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  test('does not throw on simple log call', () => {
    const logger = require('../logger');
    expect(() => logger.info('test', { foo: 'bar' })).not.toThrow();
  });
});
