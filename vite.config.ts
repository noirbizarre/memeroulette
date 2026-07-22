/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { localMemes } from './plugins/local-memes'

// Repo is deployed to https://<user>.github.io/memeroulette/
export default defineConfig({
  base: '/memeroulette/',
  plugins: [vue(), localMemes()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
