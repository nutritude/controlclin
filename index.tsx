
import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';

console.log("[ControlClin] Initializing system...");

import App from './App';
import { logService } from './services/logService'; // Import logService
import { CacheManager } from './services/cacheService';

// --- AUTO-CLEAN CACHE GUARD (GLOBAL) ---
// Resolve visualizações antigas em navegadores diferentes automaticamente.
CacheManager.checkAndPurge();

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Simple Error Boundary to catch render crashes
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
    logService.addLog('ERROR', 'Uncaught React Error:', error, errorInfo); // Log to service

    // SE for um erro de carregamento de chunk (módulo dinâmico), força o reload automático.
    // Isso resolve o erro "Failed to fetch dynamically imported module" após um novo deploy.
    const errorStr = error?.toString() || "";
    if (errorStr.includes("dynamically imported module") || errorStr.includes("ChunkLoadError")) {
      console.warn("[ErrorBoundary] Detectado erro de módulo desatualizado. Forçando reload...");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  }

  render() {
    if (this.state.hasError) {
      // Diferenciar visualmente se estiver em processo de reload
      const isModuleError = this.state.error?.toString().includes("dynamically imported module");

      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#333', textAlign: 'center', marginTop: '50px' }}>
          <h1 style={{ color: '#e11d48' }}>{isModuleError ? "Atualizando Sistema..." : "Algo deu errado."}</h1>
          <p>{isModuleError ? "Uma nova versão foi detectada. Recarregando dados seguros..." : "Ocorreu um erro ao carregar a aplicação."}</p>
          {!isModuleError && (
            <pre style={{ background: '#f1f1f1', padding: '15px', borderRadius: '5px', overflow: 'auto', textAlign: 'left', margin: '20px auto', maxWidth: '800px' }}>
              {this.state.error?.toString()}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '10px', padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);