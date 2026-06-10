import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '#shared': resolve('./shared'),
      '#server': resolve('./server'),
      '~': resolve('./app'),
    },
  },
  define: {
    'import.meta.client': true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
})
