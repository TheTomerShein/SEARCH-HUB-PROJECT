import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://mdg.dev.erp.idf',
        changeOrigin: true,
        secure: true,
        followRedirects: true,
        // Session cookie + CSRF header must survive the proxy hop
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const csrf =
              proxyRes.headers['x-csrf-token'] ?? proxyRes.headers['X-CSRF-Token'];
            if (csrf && !proxyRes.headers['access-control-expose-headers']) {
              proxyRes.headers['access-control-expose-headers'] = 'x-csrf-token';
            }
          });
        },
      },
    },
  },
})
