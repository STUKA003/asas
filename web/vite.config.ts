import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    allowedHosts: ['.loca.lt', '.trycloudflare.com'],
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
