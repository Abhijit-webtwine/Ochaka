import { defineConfig } from 'vite'
import shopify from 'vite-plugin-shopify'

export default defineConfig({
  plugins: [
    shopify(),
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
