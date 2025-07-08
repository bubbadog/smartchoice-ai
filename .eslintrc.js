module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: ['@smartchoice-ai/eslint-config'],
  settings: {
    'import/resolver': {
      typescript: {
        project: ['tsconfig.json', 'apps/*/tsconfig.json', 'packages/*/tsconfig.json'],
      },
    },
  },
}
