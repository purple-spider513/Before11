import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Local dev stays at /before11/. The GitHub Pages project site is /Before11/.
const base = process.env.npm_lifecycle_event === 'dev' ? '/before11/' : '/Before11/'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5199,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 5199,
    strictPort: true,
  },
})
