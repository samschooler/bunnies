import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/controller/',
  plugins: [react()],
  envDir: '../../',
  envPrefix: ['VITE_'],
  server: {
    port: 5174,
    host: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
