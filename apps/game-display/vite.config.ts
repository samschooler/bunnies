import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/',
  envDir: '../../',
  envPrefix: ['VITE_'],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@games/demo': path.resolve(__dirname, '../../games/demo/src/client.ts'),
      '@games/sprout-land': path.resolve(__dirname, '../../games/sprout-land/src/client.ts')
    }
  },
  plugins: [
    {
      name: 'custom-routing',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url || '';

          // All routes now use the main entry point which handles routing internally
          // Serve game for room codes (5 alphanumeric characters with game prefix)
          if (/^\/room\/[A-Z0-9]{5}$/i.test(url)) {
            req.url = '/index.html';
          }
          // Serve game-specific paths
          else if (/^\/[a-z-]+$/i.test(url) && url !== '/') {
            req.url = '/index.html';
          }

          next();
        });
      }
    }
  ]
});
