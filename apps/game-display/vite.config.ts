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
        main: path.resolve(__dirname, 'index.html'),
        landing: path.resolve(__dirname, 'index.landing.html')
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
      '@': path.resolve(__dirname, './src')
    }
  },
  plugins: [
    {
      name: 'custom-routing',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url || '';

          // Serve landing page at root
          if (url === '/') {
            req.url = '/index.landing.html';
          }
          // Serve game for room codes (4 alphanumeric characters)
          else if (/^\/[A-Z0-9]{4}$/i.test(url)) {
            req.url = '/index.html';
          }

          next();
        });
      }
    }
  ]
});
