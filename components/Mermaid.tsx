import React, { useEffect, useRef, useState, useCallback } from 'react';

interface MermaidProps {
    chart: string;
}

/**
 * Componente Mermaid robusto.
 * 
 * PROBLEMA ANTERIOR: quando isRendering=true, o componente retornava o spinner
 * e NÃO renderizava o <div ref={ref}> no DOM. Isso fazia ref.current ser null
 * eternamente, impedindo o mermaid.render() de executar. Looping infinito.
 *
 * SOLUÇÃO: o <div ref={ref}> está SEMPRE no DOM (pode estar hidden),
 * e o spinner é um overlay separado. Assim o ref.current nunca é null.
 */
export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const renderAttempted = useRef(false);

    const doRender = useCallback(async () => {
        if (!chart || !chart.trim()) {
            setStatus('error');
            setErrorMsg('Código do mapa está vazio.');
            return;
        }

        // Aguarda o ref estar disponível no DOM
        const container = ref.current;
        if (!container) {
            // Se o ref ainda não está pronto, tenta de novo em 100ms (máx 1 vez)
            if (!renderAttempted.current) {
                renderAttempted.current = true;
                setTimeout(doRender, 150);
            } else {
                setStatus('error');
                setErrorMsg('Container DOM não disponível.');
            }
            return;
        }

        setStatus('loading');
        setErrorMsg('');

        try {
            const mermaid = (window as any).mermaid;
            if (!mermaid) {
                setStatus('error');
                setErrorMsg('Biblioteca Mermaid.js não foi carregada. Verifique sua conexão com a internet e recarregue a página.');
                return;
            }

            // Limpa container
            container.innerHTML = '';

            // ID único para evitar colisão
            const renderId = 'mm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

            // Timeout de segurança — se o Mermaid travar por mais de 8 segundos,
            // consideramos como falha silenciosa e mostramos erro.
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: renderização excedeu 8 segundos')), 8000)
            );

            const renderPromise = Promise.resolve().then(() => mermaid.render(renderId, chart));

            const result = await Promise.race([renderPromise, timeoutPromise]);

            if (container && result && result.svg) {
                container.innerHTML = result.svg;
                setStatus('success');
            } else {
                setStatus('error');
                setErrorMsg('O mapa foi gerado mas o SVG veio vazio.');
            }
        } catch (err: any) {
            console.error('[Mermaid Render Error]:', err?.message || err);
            console.error('[Mermaid] Código que falhou:\n', chart);
            setStatus('error');
            setErrorMsg(err?.message || 'Erro desconhecido na renderização');
        }
    }, [chart]);

    useEffect(() => {
        renderAttempted.current = false;
        // Delay mínimo para garantir que o DOM está pronto
        const timer = setTimeout(doRender, 50);
        return () => clearTimeout(timer);
    }, [doRender]);

    return (
        <div className="relative w-full min-h-[200px]">
            {/* Container do SVG — SEMPRE no DOM para que ref.current nunca seja null */}
            <div
                ref={ref}
                className={`mermaid-container flex justify-center w-full overflow-x-auto py-4 [&>svg]:max-w-full [&>svg]:h-auto ${status !== 'success' ? 'hidden' : ''}`}
            />

            {/* Loading overlay */}
            {status === 'loading' && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest">Renderizando Mapa...</p>
                </div>
            )}

            {/* Error state com botão de retry */}
            {status === 'error' && (
                <div className="flex flex-col items-center justify-center p-6 bg-amber-50 rounded-2xl border border-amber-200 text-center gap-3">
                    <span className="text-3xl">⚠️</span>
                    <p className="text-sm font-black text-amber-700">Falha na renderização do mapa</p>
                    <p className="text-xs text-amber-600 max-w-md">{errorMsg || 'O mapa gerado contém caracteres incompatíveis.'}</p>
                    <button
                        onClick={() => {
                            renderAttempted.current = false;
                            doRender();
                        }}
                        className="mt-2 px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                        🔄 Tentar Novamente
                    </button>
                    <details className="w-full mt-2">
                        <summary className="text-[10px] text-amber-500 cursor-pointer uppercase font-bold">Ver código gerado (debug)</summary>
                        <pre className="mt-2 text-left text-[9px] bg-white border border-amber-100 rounded-lg p-3 overflow-x-auto text-amber-800 whitespace-pre-wrap">{chart}</pre>
                    </details>
                </div>
            )}
        </div>
    );
};
