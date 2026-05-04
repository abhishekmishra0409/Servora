import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@restaurent/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  roots: ['<rootDir>/src', '<rootDir>/test'],
  setupFiles: ['reflect-metadata'],
  testEnvironment: 'node',
  testTimeout: 30000,
  testRegex: '.*(-spec|\\.spec|\\.test)\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
};

export default config;
