import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.WAUTECH_DEV_API_TARGET || 'http://localhost:8080';
  const targetUrl = new URL(target);
  if (
    !['http:', 'https:'].includes(targetUrl.protocol) ||
    targetUrl.username ||
    targetUrl.password ||
    targetUrl.pathname !== '/' ||
    targetUrl.search ||
    targetUrl.hash
  ) {
    throw new Error(
      'WAUTECH_DEV_API_TARGET must be a backend origin without credentials or paths',
    );
  }
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target, changeOrigin: true, cookieDomainRewrite: '' },
      },
    },
    preview: { port: 4173, strictPort: true },
  };
});
