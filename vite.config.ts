import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { apiMiddleware } from './server/apiMiddleware.js';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'secureflow-api-backend',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          apiMiddleware(req, res, next);
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('@tanstack')) return 'vendor-table';
            if (id.includes('@radix-ui') || id.includes('sonner')) return 'vendor-ui';
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
          }
          if (id.includes('/src/mock/mockData')) {
            return 'data-mock';
          }
        },
      },
    },
  },
});
