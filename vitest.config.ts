import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/index.ts',
        'src/**/types.ts',
        'src/test-utils.ts',
        'src/test-setup.ts',
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
    typecheck: {
      include: ['src/**/*.test.ts'],
      setupFiles: ['src/test-setup.ts'],
      tsconfig: 'tsconfig.test.json',
    },
  },
})
