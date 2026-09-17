import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootModules = resolve(__dirname, '../../node_modules')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: resolve(rootModules, 'react'),
      'react-dom': resolve(rootModules, 'react-dom'),
      'react/jsx-runtime': resolve(rootModules, 'react/jsx-runtime')
    }
  },
  css: {
    transformer: 'postcss'
  },
  build: {
    cssMinify: false,
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash]-v3.js',
        chunkFileNames: 'assets/[name]-[hash]-v3.js',
        assetFileNames: 'assets/[name]-[hash]-v3.[ext]'
      }
    }
  },
  server: {
    proxy: {
      '/AdoptionService': 'http://localhost:4004'
    },
    hmr: false
  }
})
