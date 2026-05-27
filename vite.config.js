import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: ['.', '/Volumes/TM 14Go/KONTAKT Instruments/SAMPLE LIBRARY/SOUND DESIGN/BOOM LIBRARY']
    }
  }
})
