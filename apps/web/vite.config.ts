import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { devProxyTarget } from './dev-proxy.ts';
const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig(({ mode }) => ({
  root,
  plugins: [react(), tailwindcss()],
  resolve: { dedupe: ['react', 'react-dom'] },
  server: {
    port: 5176,
    strictPort: true,
    host: '127.0.0.1',
    fs: { allow: [fileURLToPath(new URL('../../', import.meta.url))] },
    proxy: {
      '/api': {
        target: devProxyTarget(loadEnv(mode, root, '').WAUTECH_DEV_API_TARGET),
        changeOrigin: true,
        cookieDomainRewrite: '',
      },
    },
  },
  preview: { port: 4176, strictPort: true, host: '127.0.0.1' },
}));
