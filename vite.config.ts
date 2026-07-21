/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Repo is deployed to https://<user>.github.io/memeroulette/
export default defineConfig({
  base: '/memeroulette/',
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
