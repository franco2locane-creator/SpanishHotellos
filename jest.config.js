/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: ['/node_modules/'],
  globals: {
    __DEV__: true,
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },
};
