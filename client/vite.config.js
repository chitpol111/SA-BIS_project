import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,          // ให้ Codespaces forward port ได้
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001', // เรียก /api ผ่าน Vite ไม่ต้องยุ่งกับ CORS
    },
  },
})