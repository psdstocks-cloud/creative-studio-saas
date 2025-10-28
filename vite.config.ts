import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env variables from the root of the project
  const env = loadEnv(mode, path.resolve(__dirname, '.'), '');

  // In development, point the SPA to the local backend (BFF)
  // The BFF handles Supabase cookie auth + proxies stock API securely.
  const devProxyTarget = env.VITE_DEV_API_TARGET || 'http://localhost:3000';

  return {
    root: path.resolve(__dirname, 'src'),
    publicDir: path.resolve(__dirname, 'public'),
    envDir: path.resolve(__dirname, '.'), // Let Vite look for .env files in root
    server: {
      port: 3001,
      host: 'localhost',
      proxy: {
        '/api': {
          target: devProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react()],
    envPrefix: 'VITE_',
    define: {
      // We no longer expose Supabase URL/Key to the browser if auth is cookie-based.
      // Keep only the keys that are intended for the client.
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
    },
  };
});
