/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['../../.eslintrc.js'],
  parserOptions: {
    // Inclut src/ ET tests/ pour le linting
    project: './tsconfig.lint.json',
    tsconfigRootDir: __dirname,
  },
};
