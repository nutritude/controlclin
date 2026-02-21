
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Uncaught error in ErrorBoundary [${this.props.name || 'Global'}]:`, error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-6 bg-red-50 border border-red-200 rounded-xl m-4 text-center">
                    <h2 className="text-lg font-bold text-red-800 mb-2">Ops! Algo deu errado aqui.</h2>
                    <p className="text-sm text-red-600 mb-4">
                        Ocorreu um erro inesperado neste componente. A equipe técnica já foi notificada.
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-red-700"
                    >
                        Tentar Recarregar Componente
                    </button>
                    {this.state.error && (
                        <details className="mt-4 text-left">
                            <summary className="text-[10px] text-red-400 cursor-pointer uppercase font-bold">Ver detalhes técnicos</summary>
                            <pre className="mt-2 p-2 bg-gray-900 text-gray-100 text-[10px] rounded overflow-auto max-h-40">
                                {this.state.error.stack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
