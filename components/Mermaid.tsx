import React, { useEffect, useRef } from 'react';

interface MermaidProps {
    chart: string;
}

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current && chart) {
            const mermaid = (window as any).mermaid;
            if (mermaid) {
                ref.current.removeAttribute('data-processed');
                mermaid.contentLoaded();
                // Alternativamente, se o contentLoaded não disparar o render:
                mermaid.render('mermaid-svg-' + Math.random().toString(36).substr(2, 9), chart).then((res: any) => {
                    if (ref.current) {
                        ref.current.innerHTML = res.svg;
                    }
                });
            }
        }
    }, [chart]);

    return (
        <div className="mermaid flex justify-center w-full overflow-x-auto py-4" ref={ref}>
            {/* O conteúdo será injetado pelo Mermaid */}
        </div>
    );
};
