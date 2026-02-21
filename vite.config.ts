import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente do sistema ou arquivo .env
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    base: '/', // Garante caminhos absolutos para deploy na raiz
    plugins: [react()],
    define: {
      // Polyfill seguro para process.env no navegador
      'process.env': JSON.stringify(env)
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['react', 'react-dom', 'react-router-dom'],
            'ai': ['@google/genai']
          }
        }
      }
    },
    server: {
      host: true // Permite acesso via IP na rede local
    }
  };
});