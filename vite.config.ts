import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load env variables from the root of the project
    const env = loadEnv(mode, path.resolve(__dirname, '.'), '');
    
    return {
      root: path.resolve(__dirname, 'src'),
      publicDir: path.resolve(__dirname, 'public'),
      envDir: path.resolve(__dirname, '.'), // Tell Vite to look for .env files in root
      server: {
        port: 3000,
        host: '0.0.0.0',
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
