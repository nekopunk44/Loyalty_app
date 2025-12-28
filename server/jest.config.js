/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 15000,

  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
  ],

  // Пороги = текущие значения минус ~3% — CI упадёт только при реальной регрессии
  coverageThreshold: {
    global: {
      statements: 51,
      branches:   40,
      functions:  52,
      lines:      52,
    },
  },

  coverageReporters: ['text-summary', 'lcov'],
};
