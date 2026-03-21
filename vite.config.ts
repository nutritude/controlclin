import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

// Gera a versão de build com hash temporal
const buildId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

// Escreve a versão fisicamente de modo que o cliente possa fazer polling em produçao.
fs.writeFileSync('public/version.json', JSON.stringify({ version: buildId, buildDate: new Date().toISOString() }));

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(buildId)
  },
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom']
        }
      }
    }
  },
  server: {
    host: true
  }
});