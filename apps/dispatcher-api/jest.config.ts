import type { Config } from 'jest';

const baseTransform: Config['transform'] = {
  '^.+\\.(t|j)s$': [
    'ts-jest',
    {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  ],
};

const moduleNameMapper: Config['moduleNameMapper'] = {
  '^@/(.*)$': '<rootDir>/src/$1',
};

const config: Config = {
  projects: [
    {
      displayName: 'unit',
      rootDir: '.',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/test/unit/**/*.spec.ts'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      transform: baseTransform,
      moduleNameMapper,
      collectCoverageFrom: [
        'src/app.controller.ts',
        'src/config/env.ts',
        'src/reliability/**/*.ts',
        'src/auth/auth.controller.ts',
        'src/assignments/assignment.service.ts',
        'src/notifications/notification.service.ts',
        'src/ai-dispatch/ai-dispatch.service.ts',
      ],
    },
    {
      displayName: 'integration',
      rootDir: '.',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      transform: baseTransform,
      moduleNameMapper,
    },
  ],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverage: false,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

export default config;
