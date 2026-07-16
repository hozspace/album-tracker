/// <reference types="vitest/config" />
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { APP_NAME } from './src/config.js'

const MANIFEST_PATH = '/manifest.webmanifest'
const THEME_COLOR = '#000000'

function buildManifest() {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    start_url: '/',
    display: 'standalone',
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}

// Generates the web app manifest from the single APP_NAME source of truth
// (src/config.ts) instead of hand-duplicating it into a static JSON file.
// No service worker — the app is served over plain http on a tailnet, so
// one wouldn't register anyway; this plugin only covers the "add to home
// screen" manifest.
function appManifestPlugin(): Plugin {
  const manifestJson = JSON.stringify(buildManifest())

  return {
    name: 'app-manifest',
    transformIndexHtml(html) {
      return html.replace(/%APP_NAME%/g, APP_NAME)
    },
    configureServer(server) {
      server.middlewares.use(MANIFEST_PATH, (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(manifestJson)
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifestJson })
    },
  }
}

export default defineConfig({
  plugins: [react(), appManifestPlugin()],
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:4180',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
