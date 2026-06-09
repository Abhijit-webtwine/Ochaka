import { defineConfig } from 'vite'
import shopify from 'vite-plugin-shopify'
import shopifyClean from '@by-association-only/vite-plugin-shopify-clean'

export default defineConfig({
  plugins: [
    shopify({
      versionNumbers: true
    }),
    shopifyClean()
  ],
  build: {
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: 'theme.js',
        assetFileNames: 'theme.css',
      }
    }
  },
  watch: {
    include: ['src/**/*', 'sections/**/*', 'snippets/**/*', 'templates/**/*', 'assets/**/*'],
  },
})
