import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Falls back to DEV if the env file doesn't define VITE_API_BASE_URL
  const proxyTarget = env.VITE_API_BASE_URL || 'https://mdg.dev.erp.idf'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
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
  }
})
