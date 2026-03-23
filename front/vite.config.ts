import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Ensure all dependencies resolve the same React singleton.
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom']
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
    allowedHosts: ['localhost', '.localhost', '.trycloudflare.com'],
    hmr: {
      overlay: true
    },
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000'
    }
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/]
    }
  }
})
