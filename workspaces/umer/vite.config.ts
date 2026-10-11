import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': {
        target:
          loadEnv(mode, process.cwd(), '').CRM_PROXY_TARGET ||
          'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  preview: { port: 4175, strictPort: true },
}));
