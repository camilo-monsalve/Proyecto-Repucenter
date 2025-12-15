import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración Vite
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,           // Puerto del frontend
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // API backend
        changeOrigin: true,
        secure: false,
      }
    }
  }
})