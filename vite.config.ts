import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiBase = env.VITE_API_BASE_URL || '';
    const apiTarget = apiBase.replace(/\/api\/?$/, '');
    return {
      base: '/To-Do-List/',  // Your GitHub repository name
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: apiTarget.startsWith('http')
          ? {
              '/api': {
                target: apiTarget,
                changeOrigin: true,
                secure: true,
              },
            }
          : undefined,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});
