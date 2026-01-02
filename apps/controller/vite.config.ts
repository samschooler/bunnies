import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Load env file from root
  const env = loadEnv(mode, path.resolve(__dirname, '../../'), 'VITE_');

  // Use display URL from env, fallback to localhost
  const displayUrl = env.VITE_GAME_DISPLAY_URL || 'http://localhost:5173';

  return {
    base: '/controller/',
    plugins: [react()],
    envDir: '../../',
    envPrefix: ['VITE_'],
    server: {
      port: 5174,
      host: true,
      proxy: {
        '/assets': {
          target: displayUrl,
          changeOrigin: true
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  };
});
