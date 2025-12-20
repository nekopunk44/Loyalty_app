module.exports = {
  root: true,
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: ['babel-preset-expo'],
    },
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  extends: [
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  plugins: ['react', 'react-hooks'],
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    'no-console':    ['warn', { allow: ['error', 'warn'] }],
    'react-hooks/exhaustive-deps': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-var':         'error',
    'prefer-const':   'error',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'warn',
  },
  ignorePatterns: [
    'node_modules/',
    'server/',
    '.expo/',
    'dist/',
    'build/',
  ],
};
