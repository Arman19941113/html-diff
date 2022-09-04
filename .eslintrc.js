module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
  },
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    browser: true,
    node: true,
  },
  globals: {},
  ignorePatterns: ['dist'],
  rules: {
    'indent': ['error', 2],
    'no-case-declarations': 'off',
    '@typescript-eslint/ban-ts-comment': [
      'error', {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': 'allow-with-description',
        'ts-nocheck': 'allow-with-description',
        'ts-check': 'allow-with-description',
        minimumDescriptionLength: 1,
      },
    ],
    '@typescript-eslint/no-non-null-assertion': 'off',
  },
}
