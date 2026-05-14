module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
  },
  rules: {
    'no-console': 'off',          // сервер использует logger, но console разрешён
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-var': 'error',
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always'],
    'no-process-exit': 'warn',
  },
  ignorePatterns: ['node_modules/', 'migrations/'],
};
