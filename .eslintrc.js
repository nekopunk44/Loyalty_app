module.exports = {
  root: true,
  extends: [
    'expo',
    'plugin:react-hooks/recommended',
  ],
  plugins: ['react-hooks'],
  env: {
    browser: true,   // setTimeout, clearTimeout, AbortController, crypto, etc.
  },
  rules: {
    // Запрет console.log в коде (оставляем только console.error)
    'no-console': ['warn', { allow: ['error', 'warn'] }],

    // Обязательная проверка зависимостей в useEffect/useCallback/useMemo
    'react-hooks/exhaustive-deps': 'warn',

    // Неиспользуемые переменные — ошибка (кроме переменных с _ prefix)
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

    // Запрет var
    'no-var': 'error',

    // Предпочитаем const
    'prefer-const': 'error',
  },
  ignorePatterns: [
    'node_modules/',
    'server/',      // сервер проверяем отдельным конфигом
    '.expo/',
    'dist/',
    'build/',
  ],
};
