/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'miniflare',
  testMatch: ['**/test/**/*.+(ts|tsx)', '**/src/**/(*.)+(spec|test).+(ts|tsx)'],
};
