import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: ['.', '/Volumes/TM 14Go/KONTAKT Instruments/SAMPLE LIBRARY/SOUND DESIGN/BOOM LIBRARY']
    },
    proxy: {
      '/api/preview-sound':  'http://localhost:3001',
      '/api/upload-sound':   'http://localhost:3001',
      '/api/upload-audio':   'http://localhost:3001',
      '/api/get-upload-url': 'http://localhost:3001',
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  }
})