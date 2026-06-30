import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Parse server port from VITE_API_URL or default to 3000
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000/api';
  const serverTarget = apiUrl.replace(/\/api\/?$/, '') || 'http://localhost:3000';

  // Client port: use VITE_PORT env or default 5173
  const clientPort = parseInt(env.VITE_PORT || '5173', 10);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      host: true,
      port: clientPort,
      strictPort: false, // Allow fallback to next free port if busy
      proxy: {
        '/api': {
          target: serverTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
