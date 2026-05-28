const typescriptEslint = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')
const js = require('@eslint/js')
const { FlatCompat } = require('@eslint/eslintrc')

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
})

module.exports = [
  { ignores: ['dist/**', 'node_modules/**'] },
  ...compat.extends('eslint:recommended', 'plugin:@typescript-eslint/recommended'),
  {
    plugins: {
      '@typescript-eslint': typescriptEslint
    },

    languageOptions: {
      parser: tsParser
    },

    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-types': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-unused-private-class-members': 'off',
      'no-undef': 'off'
    }
  },
  {
    files: ['plugins/**/*', 'routes/**/*', 'test/**/*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-types': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-unused-private-class-members': 'off',
      'no-undef': 'off'
    }
  }
]
