import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['main/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['main/**/*.ts'],
      exclude: [
        'main/background.ts',
        'main/preload.ts',
        'main/helpers/create-window.ts',
        'main/**/*.{test,spec}.ts',
        'main/db/migrations/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
})
