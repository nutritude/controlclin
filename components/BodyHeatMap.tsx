
import React from 'react';

interface BodyHeatMapProps {
    data: {
        circNeck?: number;
        circChest?: number;
        circWaist?: number;
        circHip?: number;
        circArmContracted?: number;
        circArmRelaxed?: number;
        circThigh?: number;
        measurementSide?: 'Direito' | 'Esquerdo';
    };
    results: {
        waistToHipRatio: number;
        picaDiagnosis?: string;
        clinicalGravity?: string;
        functionalStatus?: string;
    };
    pathologies?: string[];
    isManagerMode?: boolean;
}

const BodyHeatMap: React.FC<BodyHeatMapProps> = ({ data, results, pathologies, isManagerMode }) => {
    const isHighRisk = results.waistToHipRatio > 0.9;

    return (
        <div className={`relative p-6 rounded-[2.5rem] border transition-all duration-700 ${isManagerMode
            ? 'bg-slate-950/40 border-indigo-500/20 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)]'
            : 'bg-white border-emerald-50 shadow-[0_20px_40px_rgba(16,185,129,0.05)]'
            }`}>
            {/* Header do Card */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] ${isManagerMode ? 'text-indigo-400' : 'text-emerald-900'}`}>
                        Scan Biométrico ({data.measurementSide || 'Direito'})
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-wider">Mapeamento Termográfico</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.15em] animate-pulse ${isManagerMode ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                    {results.functionalStatus || 'Live Analysis'}
                </div>
            </div>

            {/* Container do SVG */}
            <div className="relative flex justify-center items-center py-6 group">
                {/* Glow de Background Dinâmico */}
                <div className={`absolute inset-0 opacity-15 blur-[60px] transition-all duration-1000 group-hover:opacity-25 ${isHighRisk ? 'bg-rose-500' : (isManagerMode ? 'bg-indigo-600' : 'bg-emerald-400')
                    }`} />

                <svg viewBox="0 0 100 200" className="h-72 w-auto relative z-10 transition-transform duration-700 group-hover:scale-[1.02]">
                    <defs>
                        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={isManagerMode ? "#1e293b" : "#f1f5f9"} />
                            <stop offset="100%" stopColor={isManagerMode ? "#020617" : "#cbd5e1"} />
                        </linearGradient>

                        <filter id="glow-point">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>

                        <style>{`
                            @keyframes glow-pulse {
                                0% { opacity: 0.3; filter: brightness(1) drop-shadow(0 0 2px currentColor); }
                                50% { opacity: 0.9; filter: brightness(1.4) drop-shadow(0 0 8px currentColor); }
                                100% { opacity: 0.3; filter: brightness(1) drop-shadow(0 0 2px currentColor); }
                            }
                            .heat-point {
                                animation: glow-pulse 3s infinite ease-in-out;
                                transform-origin: center;
                            }
                        `}</style>
                    </defs>

                    {/* Silhueta Humana Realista (Path Curvado) */}
                    <path
                        d="M50,10c-4.5,0-8.2,3.7-8.2,8.2s3.7,8.2,8.2,8.2s8.2-3.7,8.2-8.2S54.5,10,50,10z M37.5,27.5c-4.2,0-8.5,1.5-11.2,4.8c-2.8,3.5-3.8,8.2-4.2,12.5l-3.2,38c-0.5,5.8,5.5,8.2,6.8,2.5l2.8-28.5c0.4-3.5,1.8-3.5,2.2,0v96c0,8.5,12.5,8.5,12.5,0v-52h9.2v52c0,8.5,12.5,8.5,12.5,0v-96c0.4-3.5,1.8-3.5,2.2,0l2.8,28.5c1.3,5.7,7.3,3.3,6.8-2.5l-3.2-38c-0.4-4.3-1.4-9-4.2-12.5c-2.7-3.3-7-4.8-11.2-4.8H37.5z"
                        fill="url(#bodyGradient)"
                        stroke={isManagerMode ? "#334155" : "#94a3b8"}
                        strokeWidth="0.4"
                        className="transition-all duration-1000"
                    />

                    {/* Pontos de Calor (Fixos com Luz Pulsante Lenta) */}

                    {/* Pescoço */}
                    {data.circNeck && data.circNeck > 0 && (
                        <circle cx="50" cy="33" r="3.2" fill="#FBBF24" className="heat-point text-[#FBBF24]" style={{ animationDelay: '0s' }} />
                    )}

                    {/* Tórax / Peitoral */}
                    {data.circChest && data.circChest > 0 && (
                        <ellipse cx="50" cy="55" rx="11" ry="8" fill="#10B981" fillOpacity="0.5" className="heat-point text-[#10B981]" style={{ animationDelay: '0.5s' }} />
                    )}

                    {/* Abdômen / Cintura */}
                    {data.circWaist && data.circWaist > 0 && (
                        <ellipse cx="50" cy="78" rx="10" ry="7"
                            fill={isHighRisk ? "#EF4444" : "#10B981"}
                            fillOpacity="0.6"
                            className="heat-point text-[#EF4444]"
                            style={{ animationDelay: '1s' }}
                        />
                    )}

                    {/* Quadril */}
                    {data.circHip && data.circHip > 0 && (
                        <ellipse cx="50" cy="100" rx="13" ry="9" fill="#3B82F6" fillOpacity="0.5" className="heat-point text-[#3B82F6]" style={{ animationDelay: '1.5s' }} />
                    )}

                    {/* Braço Relaxado (Novo) */}
                    {data.circArmRelaxed && data.circArmRelaxed > 0 && (
                        <circle cx="28.5" cy="65" r="4" fill="#60A5FA" fillOpacity="0.4" className="heat-point text-[#60A5FA]" style={{ animationDelay: '1.8s' }} />
                    )}

                    {/* Braço Direito (Contraído) */}
                    {data.circArmContracted && data.circArmContracted > 0 && (
                        <circle cx="28.5" cy="65" r="5" fill="#F59E0B" fillOpacity="0.6" className="heat-point text-[#F59E0B]" style={{ animationDelay: '2s' }} />
                    )}

                    {/* Coxa Direita (Referência) */}
                    {data.circThigh && data.circThigh > 0 && (
                        <circle cx="42.5" cy="130" r="6" fill="#8B5CF6" fillOpacity="0.5" className="heat-point text-[#8B5CF6]" style={{ animationDelay: '2.5s' }} />
                    )}
                </svg>

                {/* INOVAÇÃO: Bio-Vitality Aura (Anel de Saturação Clínica) */}
                <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none">
                    <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 mb-[-12px] shadow-lg backdrop-blur-md transition-all duration-500 ${results.clinicalGravity === 'G3' ? 'bg-rose-500/10 border-rose-500/30 text-rose-600' :
                        results.clinicalGravity === 'G2' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' :
                            'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full animate-ping ${results.clinicalGravity === 'G3' ? 'bg-rose-500' :
                            results.clinicalGravity === 'G2' ? 'bg-amber-500' :
                                'bg-emerald-500'
                            }`} />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">
                            Vitalidade: {results.clinicalGravity || 'G0'}
                        </span>
                    </div>
                </div>

                {/* Scan Line Laser Decorativa */}
                <div className={`absolute left-0 w-full h-[2px] opacity-30 animate-scan pointer-events-none blur-[1px] ${isManagerMode ? 'bg-indigo-400' : 'bg-emerald-400'
                    }`} />
            </div>

            {/* Indicadores Premium Footer */}
            <div className="grid grid-cols-3 gap-3 mt-8">
                {[
                    {
                        label: 'Foco Clínico',
                        value: results.picaDiagnosis || 'Aguardando...',
                        color: isManagerMode ? 'text-emerald-400' : 'text-emerald-600',
                        active: true
                    },
                    {
                        label: 'Risco Metabólico',
                        value: results.waistToHipRatio > 0.9 ? 'Alto (Elevado)' : 'Normal/Baixo',
                        color: results.waistToHipRatio > 0.9 ? 'text-rose-500' : 'text-emerald-500'
                    },
                    {
                        label: 'Prioridade Patológica',
                        value: pathologies && pathologies.length > 0 ? pathologies[0] : 'Nenhuma Detectada',
                        color: pathologies && pathologies.length > 0 ? 'text-amber-500' : (isManagerMode ? 'text-blue-400' : 'text-blue-600')
                    }
                ].map((item, id) => (
                    <div key={id} className={`text-center p-3 rounded-2xl border transition-all duration-300 hover:translate-y-[-2px] ${isManagerMode ? 'bg-slate-900/60 border-slate-800 shadow-inner' : 'bg-slate-50/50 border-slate-100 shadow-sm'
                        }`}>
                        <span className="block text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-80">{item.label}</span>
                        <span className={`text-[9px] font-black uppercase tracking-tight break-words line-clamp-2 ${item.color} ${item.active ? 'underline decoration-2 underline-offset-4 decoration-emerald-500/30' : ''}`}>
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes scan {
                    0% { top: 15%; opacity: 0; transform: scaleX(0.8); }
                    10% { opacity: 0.4; transform: scaleX(1); }
                    90% { opacity: 0.4; transform: scaleX(1); }
                    100% { top: 85%; opacity: 0; transform: scaleX(0.8); }
                }
                .animate-scan {
                    animation: scan 6s infinite cubic-bezier(0.4, 0, 0.2, 1);
                }
            `}</style>
        </div>
    );
};

export default BodyHeatMap;
