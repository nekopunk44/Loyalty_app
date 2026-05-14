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
      statements: 55,
      branches:   44,
      functions:  57,
      lines:      57,
    },
  },

  coverageReporters: ['text-summary', 'lcov'],
};
