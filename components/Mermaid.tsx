import React, { useEffect, useRef, useState } from 'react';

interface MermaidProps {
    chart: string;
}

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [hasError, setHasError] = useState(false);
    const [isRendering, setIsRendering] = useState(true);

    useEffect(() => {
        if (!ref.current || !chart) return;

        setHasError(false);
        setIsRendering(true);

        const mermaid = (window as any).mermaid;
        if (!mermaid) {
            console.error('[Mermaid] Biblioteca não carregada.');
            setHasError(true);
            setIsRendering(false);
            return;
        }

        // Limpa o container ANTES de renderizar
        ref.current.innerHTML = '';

        const renderId = 'mermaid-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

        mermaid.render(renderId, chart)
            .then((result: { svg: string }) => {
                if (ref.current) {
                    ref.current.innerHTML = result.svg;
                }
                setIsRendering(false);
            })
            .catch((err: Error) => {
                console.error('[Mermaid Render Error]:', err.message);
                console.error('[Mermaid] Código que falhou:\n', chart);
                setHasError(true);
                setIsRendering(false);
            });
    }, [chart]);

    if (isRendering) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-black uppercase tracking-widest">Renderizando Mapa...</p>
            </div>
        );
    }

    if (hasError) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-amber-50 rounded-2xl border border-amber-200 text-center gap-3">
                <span className="text-3xl">⚠️</span>
                <p className="text-sm font-black text-amber-700">Falha na renderização do mapa</p>
                <p className="text-xs text-amber-600">O mapa gerado contém caracteres incompatíveis. Tente gerar novamente.</p>
                <details className="w-full mt-2">
                    <summary className="text-[10px] text-amber-500 cursor-pointer uppercase font-bold">Ver código gerado (debug)</summary>
                    <pre className="mt-2 text-left text-[9px] bg-white border border-amber-100 rounded-lg p-3 overflow-x-auto text-amber-800 whitespace-pre-wrap">{chart}</pre>
                </details>
            </div>
        );
    }

    return (
        <div
            ref={ref}
            className="mermaid-container flex justify-center w-full overflow-x-auto py-4 [&>svg]:max-w-full [&>svg]:h-auto"
        />
    );
};
