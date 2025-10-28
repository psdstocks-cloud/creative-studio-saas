import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load env variables from the root of the project
    const env = loadEnv(mode, path.resolve(__dirname, '.'), '');
    const stockApiBaseUrl = env.STOCK_API_BASE_URL || 'https://nehtw.com/api';
    const stockApiKey = env.STOCK_API_KEY;

    if (!stockApiKey) {
      console.warn('⚠️  STOCK_API_KEY is not set. API requests will fail in development.');
    }

    const stockProxyHeaders: Record<string, string> | undefined = stockApiKey
      ? { 'X-Api-Key': stockApiKey }
      : undefined;

    return {
      root: path.resolve(__dirname, 'src'),
      publicDir: path.resolve(__dirname, 'public'),
      envDir: path.resolve(__dirname, '.'), // Tell Vite to look for .env files in root
      server: {
        port: 3001,
        host: 'localhost',
        proxy: {
          '/api': {
            target: stockApiBaseUrl,
            changeOrigin: true,
            secure: true,
            rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
            headers: stockProxyHeaders,
          },
        },
      },
      plugins: [react()],
      envPrefix: 'VITE_',
      define: {
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      },
      build: {
        outDir: path.resolve(__dirname, 'dist'),
        emptyOutDir: true,
      }
    };
});
