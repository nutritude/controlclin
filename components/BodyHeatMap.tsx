
import React from 'react';

interface BodyHeatMapProps {
    data: {
        circNeck?: number;
        circChest?: number;
        circWaist?: number;
        circHip?: number;
        circArmContracted?: number;
        circThigh?: number;
    };
    results: {
        waistToHipRatio: number;
    };
    isManagerMode?: boolean;
}

const BodyHeatMap: React.FC<BodyHeatMapProps> = ({ data, results, isManagerMode }) => {
    const isHighRisk = results.waistToHipRatio > 0.9;

    return (
        <div className={`relative p-6 rounded-[2rem] border transition-all duration-500 ${isManagerMode
                ? 'bg-slate-900/40 border-indigo-500/30 backdrop-blur-xl shadow-2xl'
                : 'bg-white border-emerald-100 shadow-xl'
            }`}>
            {/* Header do Card */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${isManagerMode ? 'text-indigo-400' : 'text-emerald-800'}`}>
                        Scan Biométrico
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Mapeamento Termográfico</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isManagerMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                    Live Preview
                </div>
            </div>

            {/* Container do SVG */}
            <div className="relative flex justify-center items-center py-4 group">
                {/* Glow de Background */}
                <div className={`absolute inset-0 opacity-20 blur-[50px] transition-all duration-1000 group-hover:opacity-40 ${isHighRisk ? 'bg-red-500' : (isManagerMode ? 'bg-indigo-500' : 'bg-emerald-500')
                    }`} />

                <svg viewBox="0 0 100 200" className="h-64 w-auto relative z-10 filter drop-shadow-2xl">
                    <defs>
                        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={isManagerMode ? "#1e293b" : "#f8fafc"} />
                            <stop offset="100%" stopColor={isManagerMode ? "#0f172a" : "#e2e8f0"} />
                        </linearGradient>

                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>

                        <style>{`
              @keyframes pulse {
                0% { transform: scale(1); opacity: 0.6; }
                50% { transform: scale(1.3); opacity: 0.9; }
                100% { transform: scale(1); opacity: 0.6; }
              }
              .heat-point {
                animation: pulse 2s infinite ease-in-out;
                filter: url(#glow);
              }
            `}</style>
                    </defs>

                    {/* Silhueta Humana Aperfeiçoada */}
                    <path
                        d="M50,12 c-6,0-11,5-11,11 c0,5,4,10,10,11 c-8,2-14,8-16,18 l-2,35 c-1,6,4,7,5,1 l2-30 h3 v85 c0,8,10,8,10,0 v-45 h8 v45 c0,8,10,8,10,0 v-85 h3 l2,30 c1,6,6,5,5-1 l-2-35 c-2-10-8-16-16-18 c6-1,10-6,10-11 C61,17,56,12,50,12z"
                        fill="url(#bodyGradient)"
                        stroke={isManagerMode ? "#334155" : "#cbd5e1"}
                        strokeWidth="0.5"
                        className="transition-all duration-700"
                    />

                    {/* Pontos de Calor Dinâmicos */}
                    {/* Pescoço */}
                    {data.circNeck && data.circNeck > 0 && (
                        <circle cx="50" cy="35" r="3" fill="#fbbf24" className="heat-point" style={{ animationDelay: '0s' }} />
                    )}

                    {/* Tórax */}
                    {data.circChest && data.circChest > 0 && (
                        <ellipse cx="50" cy="58" rx="10" ry="7" fill="#10b981" fillOpacity="0.5" className="heat-point" style={{ animationDelay: '0.3s' }} />
                    )}

                    {/* Cintura (Risco) */}
                    {data.circWaist && data.circWaist > 0 && (
                        <ellipse cx="50" cy="78" rx="9" ry="6"
                            fill={isHighRisk ? "#ef4444" : "#10b981"}
                            fillOpacity="0.6"
                            className="heat-point"
                            style={{ animationDelay: '0.6s' }}
                        />
                    )}

                    {/* Quadril */}
                    {data.circHip && data.circHip > 0 && (
                        <ellipse cx="50" cy="98" rx="12" ry="8" fill="#3b82f6" fillOpacity="0.5" className="heat-point" style={{ animationDelay: '0.9s' }} />
                    )}

                    {/* Braço */}
                    {data.circArmContracted && data.circArmContracted > 0 && (
                        <circle cx="30" cy="68" r="4.5" fill="#f59e0b" fillOpacity="0.6" className="heat-point" style={{ animationDelay: '1.2s' }} />
                    )}

                    {/* Coxa */}
                    {data.circThigh && data.circThigh > 0 && (
                        <circle cx="43" cy="125" r="5.5" fill="#8b5cf6" fillOpacity="0.5" className="heat-point" style={{ animationDelay: '1.5s' }} />
                    )}
                </svg>

                {/* Scan Line Decorativo */}
                <div className={`absolute left-0 w-full h-[1px] opacity-20 animate-scan pointer-events-none ${isManagerMode ? 'bg-indigo-400' : 'bg-emerald-400'
                    }`} />
            </div>

            {/* Indicadores Footer */}
            <div className="grid grid-cols-3 gap-2 mt-6">
                {[
                    { label: 'Foco', value: 'Hipertrofia', color: 'text-emerald-500', underline: true },
                    { label: 'Risco', value: isHighRisk ? 'Alto' : 'Baixo', color: isHighRisk ? 'text-red-500' : 'text-emerald-500' },
                    { label: 'Biometria', value: 'Completa', color: 'text-blue-500' }
                ].map((item, id) => (
                    <div key={id} className={`text-center p-2 rounded-xl border transition-all hover:scale-105 ${isManagerMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'
                        }`}>
                        <span className="block text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</span>
                        <span className={`text-[9px] font-black uppercase ${item.color} ${item.underline ? 'underline decoration-2 underline-offset-2' : ''}`}>
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>

            <style>{`
        @keyframes scan {
          0% { top: 20%; opacity: 0; }
          50% { opacity: 0.5; }
          100% { top: 80%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 4s infinite linear;
        }
      `}</style>
        </div>
    );
};

export default BodyHeatMap;
