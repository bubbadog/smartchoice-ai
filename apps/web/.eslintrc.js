module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  parserOptions: {
    project: ['./tsconfig.json'],
  },
  rules: {
    'import/order': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/no-unescaped-entities': 'off',
    '@typescript-eslint/consistent-type-imports': 'off',
  },
}