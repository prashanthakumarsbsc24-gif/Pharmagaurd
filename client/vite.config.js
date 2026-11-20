import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In dev, API calls to /api are forwarded to the Express server.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
