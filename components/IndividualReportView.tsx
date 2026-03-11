
import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
    ComposedChart, Line, Bar, BarChart, Cell, ReferenceArea, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { IndividualReportSnapshot, Clinic, User } from '../types';
import { Icons } from '../constants';
import PDFHeader from './PDFHeader';
import { Mermaid } from './Mermaid';
import { MindMapService } from '../services/ai/mindMapService';

// --- HELPERS ---
const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
};

// --- CHART COMPONENTS ---

export const CompositionEvolutionChart = ({ data, isPdf }: { data: any[], isPdf: boolean }) => {
    const chartData = data.filter(d => d.fatMass != null && d.leanMass != null).map(d => ({
        ...d,
        dateFormatted: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }),
        leanMass: Number(d.leanMass),
        fatMass: Number(d.fatMass),
        pesoTotal: Number((Number(d.fatMass) + Number(d.leanMass)).toFixed(1))
    }));

    if (chartData.length < 2) return <div className={`h-40 flex items-center justify-center text-sm ${isPdf ? 'text-gray-400 border-gray-200' : 'text-gray-500 border-emerald-100 bg-emerald-50'} rounded border border-dashed`}>Dados de composição corporal insuficientes (mín. 2 avaliações).</div>;

    return (
        <div className="w-full rounded-2xl p-6 bg-white border border-slate-200 shadow-sm" style={{ height: isPdf ? '280px' : '360px' }}>
            <div className="flex flex-col items-center mb-6">
                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-600">Dinâmica de Composição</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Evolução de Tecidos Adiposo vs. Magro</p>
            </div>
            <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorLean" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="dateFormatted" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                    {!isPdf && <RechartsTooltip
                        contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: '#fff',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                        }}
                        cursor={{ fill: 'transparent' }}
                    />}
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                    <Area type="monotone" dataKey="leanMass" name="Massa Magra (kg)" stackId="1" stroke="#10b981" strokeWidth={3} fill="url(#colorLean)" activeDot={{ r: 6 }} />
                    <Area type="monotone" dataKey="fatMass" name="Massa Gorda (kg)" stackId="1" stroke="#f43f5e" strokeWidth={3} fill="url(#colorFat)" />
                    <Line type="monotone" dataKey="pesoTotal" name="Peso Total (kg)" stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={!isPdf} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export const MetabolicRiskChart = ({ data, isPdf, gender }: { data: any[], isPdf: boolean, gender: string }) => {
    const lowRisk = gender === 'Feminino' || gender === 'F' ? 0.80 : 0.90;
    const modRisk = gender === 'Feminino' || gender === 'F' ? 0.85 : 0.95;

    const chartData = data.filter(d => (d.waistCircumference || d.circWaist) && (d.hipCircumference || d.circHip)).map(d => {
        const w = d.waistCircumference || d.circWaist;
        const h = d.hipCircumference || d.circHip;
        return {
            ...d,
            dateFormatted: new Date(d.date).toLocaleDateString(undefined, { month: '2-digit', year: '2-digit' }),
            rcq: Number((w / h).toFixed(2))
        };
    });

    if (chartData.length < 1) return null;

    return (
        <div className="w-full" style={{ height: isPdf ? '180px' : '200px' }}>
            <p className={`text-center text-xs font-bold uppercase mb-2 text-gray-500`}>Risco Metabólico (RCQ)</p>
            <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="dateFormatted" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    {!isPdf && <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }} cursor={{ fill: 'transparent' }} />}
                    <ReferenceArea y1={0} y2={lowRisk} fill="#10b981" fillOpacity={0.1} />
                    <ReferenceArea y1={lowRisk} y2={modRisk} fill="#f59e0b" fillOpacity={0.1} />
                    <ReferenceArea y1={modRisk} y2={1.5} fill="#ef4444" fillOpacity={0.1} />
                    <Line type="monotone" dataKey="rcq" name="Relação C/Q" stroke="#3b82f6" strokeWidth={3} dot={{ stroke: '#3b82f6', strokeWidth: 2, fill: 'white', r: 4 }} activeDot={{ r: 6 }} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export const HabitRadarChart = ({ history, isPdf }: { history: any[], isPdf: boolean }) => {
    if (!history || history.length < 1) return null;
    const getFirst = (getter: (r: any) => number | undefined): number => {
        for (let i = 0; i < history.length; i++) {
            const v = getter(history[i]);
            if (v != null && Number(v) > 0) return Number(v);
        }
        return 0;
    };
    const getLatest = (getter: (r: any) => number | undefined): number => {
        for (let i = history.length - 1; i >= 0; i--) {
            const v = getter(history[i]);
            if (v != null && Number(v) > 0) return Number(v);
        }
        return 0;
    };

    const radarData = [
        { subject: 'IMC', A: Math.min(100, (getFirst(r => r.bmi) || 25) * 2), B: Math.min(100, (getLatest(r => r.bmi) || 25) * 2), full: 100 },
        { subject: '%Gordura', A: getFirst(r => r.bodyFatPercentage), B: getLatest(r => r.bodyFatPercentage), full: 100 }
    ];

    return (
        <div className="w-full flex flex-col items-center" style={{ height: isPdf ? '200px' : '260px' }}>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Perfil Comparativo (%)</p>
            <ResponsiveContainer width="100%" height="90%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Início" dataKey="A" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} strokeWidth={2} />
                    <Radar name="Atual" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={isPdf ? 0.25 : 0.45} strokeWidth={3} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const GoalThermometer = ({ currentBF, targetBF, isPdf }: { currentBF: number, targetBF: number, isPdf: boolean }) => {
    if (!currentBF) return null;
    const roundedCurrent = Number(currentBF.toFixed(1));
    const safeTarget = targetBF ? Number(targetBF.toFixed(1)) : Number((roundedCurrent * 0.85).toFixed(1));
    const data = [{ name: '% de Gordura', Atual: roundedCurrent, Alvo: safeTarget }];

    return (
        <div className="w-full" style={{ height: isPdf ? '100px' : '140px' }}>
            <p className="text-center text-xs font-bold uppercase mb-4 text-gray-500">Progresso do Objetivo (%GC)</p>
            <ResponsiveContainer width="100%" height="45%">
                <BarChart layout="vertical" data={data} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                    <XAxis type="number" domain={[0, Math.max(currentBF, safeTarget, 30) + 5]} hide />
                    <YAxis dataKey="name" type="category" hide />
                    <Bar dataKey="name" fill="#f8fafc" radius={[10, 10, 10, 10]} barSize={24} isAnimationActive={false} />
                    <Bar dataKey="Atual" fill={currentBF <= safeTarget ? '#10b981' : '#f59e0b'} radius={[10, 10, 10, 10]} barSize={24} />
                    <ReferenceArea x1={safeTarget - 0.2} x2={safeTarget + 0.2} fill="#3b82f6" label={{ position: 'top', value: 'ALVO', fontSize: 10, fill: '#3b82f6', fontWeight: '900' }} />
                </BarChart>
            </ResponsiveContainer>
            <div className={`flex justify-between items-center ${isPdf ? 'text-[10px]' : 'text-xs'} px-8 mt-1 font-bold`}>
                <span className="text-emerald-600">Alvo: {safeTarget}%</span>
                <span className={roundedCurrent <= safeTarget ? 'text-emerald-500' : 'text-amber-500'}>Atual: {roundedCurrent}%</span>
            </div>
        </div>
    );
};

export const MeasurementDeltaChart = ({ history, isPdf }: { history: any[], isPdf: boolean }) => {
    if (!history || history.length < 2) return null;
    const getFirst = (getter: (r: any) => number | undefined): number => {
        for (let i = 0; i < history.length; i++) {
            const v = getter(history[i]);
            if (v != null && Number(v) > 0) return Number(v);
        }
        return 0;
    };
    const getLatest = (getter: (r: any) => number | undefined): number => {
        for (let i = history.length - 1; i >= 0; i--) {
            const v = getter(history[i]);
            if (v != null && Number(v) > 0) return Number(v);
        }
        return 0;
    };

    const riskKeys = ['Peso', '% Gordura', 'Cintura', 'Abdômen', 'Quadril'];
    const measures = [
        { key: 'Peso', a: getFirst(r => r.weight), b: getLatest(r => r.weight) },
        { key: '% Gordura', a: getFirst(r => r.bodyFatPercentage), b: getLatest(r => r.bodyFatPercentage) },
        { key: 'Cintura', a: getFirst(r => r.circWaist || r.waistCircumference), b: getLatest(r => r.circWaist || r.waistCircumference) },
        { key: 'Abdômen', a: getFirst(r => r.circAbdomen), b: getLatest(r => r.circAbdomen) },
        { key: 'Quadril', a: getFirst(r => r.circHip || r.hipCircumference), b: getLatest(r => r.circHip || r.hipCircumference) },
    ];

    const data = measures
        .filter(m => m.a > 0 && m.b != null && (m.b as number) > 0)
        .map(m => {
            const delta = Number(((m.b as number) - m.a).toFixed(1));
            const pct = Number((((m.b as number) / m.a - 1) * 100).toFixed(1));
            const isRisk = riskKeys.includes(m.key);
            return { name: m.key, delta, pct, isPositive: isRisk ? delta < 0 : delta > 0, isRisk };
        })
        .filter(m => Math.abs(m.delta) >= 0.1);

    if (data.length === 0) return null;

    const dynamicHeight = Math.max(280, data.length * 38 + 90);

    return (
        <div className="w-full rounded-2xl p-6 bg-white border border-slate-200 shadow-sm" style={{ height: isPdf ? '300px' : `${dynamicHeight}px` }}>
            <div className="flex flex-col items-center mb-4">
                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-800">Dinâmica de Perdas e Ganhos</h4>
            </div>
            <ResponsiveContainer width="100%" height="82%">
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 55, left: 5, bottom: 5 }} barSize={Math.min(16, Math.floor(220 / data.length))}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={'#f1f5f9'} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} unit=" cm" domain={['auto', 'auto']} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#475569', fontWeight: 'bold' }} axisLine={false} tickLine={false} width={82} />
                    {!isPdf && <RechartsTooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                                <div className="bg-white border-gray-200 p-2 rounded-lg shadow-xl border text-[10px]">
                                    <p className="font-bold uppercase mb-1">{d.name}</p>
                                    <p className={d.isPositive ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                                        {d.delta > 0 ? '+' : ''}{d.delta} ({d.pct > 0 ? '+' : ''}{d.pct}%)
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    }} />}
                    <Bar dataKey="delta" radius={[0, 6, 6, 0]}>
                        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.isPositive ? '#10b981' : '#f43f5e'} />)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const SkinfoldDeltaChart = ({ history, isPdf, gender }: { history: any[], isPdf: boolean, gender?: string }) => {
    if (!history || history.length < 2) return null;
    const PROTOCOL_FOLDS: Record<string, string[]> = {
        JacksonPollock7: ['chest', 'axillary', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh'],
        JacksonPollock3: gender === 'Feminino' || gender === 'F' ? ['triceps', 'suprailiac', 'thigh'] : ['chest', 'abdominal', 'thigh'],
        Guedes: gender === 'Feminino' || gender === 'F' ? ['triceps', 'suprailiac', 'thigh'] : ['subscapular', 'abdominal', 'thigh'],
        DurninWomersley: ['biceps', 'triceps', 'subscapular', 'suprailiac'],
        Faulkner: ['triceps', 'subscapular', 'suprailiac', 'abdominal'],
        ISAK: ['biceps', 'triceps', 'subscapular', 'suprailiac', 'abdominal', 'thigh', 'calf'],
    };
    const FOLD_LABELS: Record<string, string> = { triceps: 'Tríceps', subscapular: 'Subescap.', biceps: 'Bíceps', chest: 'Peitoral', axillary: 'Axilar Med.', suprailiac: 'Suprailíaca', abdominal: 'Abdominal', thigh: 'Coxa', calf: 'Panturr.' };
    const FOLD_GETTER: Record<string, (r: any) => number | undefined> = { triceps: r => r.skinfoldTriceps, subscapular: r => r.skinfoldSubscapular, biceps: r => r.skinfoldBiceps, chest: r => r.skinfoldChest, axillary: r => r.skinfoldAxillary, suprailiac: r => r.skinfoldSuprailiac, abdominal: r => r.skinfoldAbdominal, thigh: r => r.skinfoldThigh, calf: r => r.skinfoldCalf };

    const getFirst = (getter: (r: any) => number | undefined): number => {
        for (let i = 0; i < history.length; i++) {
            const v = getter(history[i]);
            if (v != null && Number(v) > 0) return Number(v);
        }
        return 0;
    };
    const getLatest = (getter: (r: any) => number | undefined): number => {
        for (let i = history.length - 1; i >= 0; i--) {
            const v = getter(history[i]);
            if (v != null && Number(v) > 0) return Number(v);
        }
        return 0;
    };

    const latestProtocol = [...history].reverse().find((r: any) => r.skinfoldProtocol)?.skinfoldProtocol as string | undefined;
    const activeFolds = latestProtocol && PROTOCOL_FOLDS[latestProtocol] ? PROTOCOL_FOLDS[latestProtocol] : Object.keys(FOLD_GETTER);

    const data = activeFolds
        .map(fk => ({ name: FOLD_LABELS[fk] || fk, a: getFirst(FOLD_GETTER[fk]), b: getLatest(FOLD_GETTER[fk]) }))
        .filter(f => f.a > 0 && f.b > 0)
        .map(f => ({ name: f.name, delta: Number((f.b - f.a).toFixed(1)), pct: Number(((f.b / f.a - 1) * 100).toFixed(1)) }))
        .filter(f => Math.abs(f.delta) >= 0.1);

    if (data.length === 0) return null;
    const dynamicH = Math.max(280, data.length * 30 + 100);

    return (
        <div className="w-full rounded-2xl p-6 bg-white border border-slate-200 shadow-sm" style={{ height: isPdf ? '280px' : `${dynamicH}px` }}>
            <div className="flex flex-col items-center mb-2">
                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-800">Dinâmica de Gordura Localizada</h4>
            </div>
            <ResponsiveContainer width="100%" height="68%">
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 50, left: 5, bottom: 5 }} barSize={Math.min(14, Math.floor(180 / data.length))}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} unit=" mm" domain={['auto', 'auto']} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#475569', fontWeight: 'bold' }} axisLine={false} tickLine={false} width={68} />
                    {!isPdf && <RechartsTooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                                <div className="bg-white border-slate-200 text-slate-900 p-4 rounded-2xl shadow-2xl border text-[11px] font-bold">
                                    <p className="font-bold uppercase mb-1">{d.name}</p>
                                    <p className={d.delta < 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>{d.delta > 0 ? '+' : ''}{d.delta} mm ({d.pct > 0 ? '+' : ''}{d.pct}%)</p>
                                </div>
                            );
                        }
                        return null;
                    }} />}
                    <Bar dataKey="delta" radius={[0, 6, 6, 0]}>
                        {data.map((entry, index) => <Cell key={`sf-${index}`} fill={entry.delta < 0 ? '#10b981' : '#f43f5e'} />)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const MeasurementsComparisonTable = ({ history }: { history: any[] }) => {
    if (!history || history.length < 2) return null;
    const first = history[0];
    const latest = history[history.length - 1];
    const metrics = [{ label: 'Peso', key: 'weight', unit: 'kg' }, { label: 'Gordura corporal', key: 'bodyFatPercentage', unit: '%' }, { label: 'Massa Magra', key: 'leanMass', unit: 'kg' }, { label: 'Cintura', key: 'circWaist', unit: 'cm' }, { label: 'Abdômen', key: 'circAbdomen', unit: 'cm' }, { label: 'Quadril', key: 'circHip', unit: 'cm' }];

    return (
        <div className="bg-white border-slate-200 rounded-2xl border shadow-sm overflow-hidden mb-8">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Comparativo de Evolução: Início vs. Atual</p>
            </div>
            <table className="w-full text-left">
                <thead><tr className="bg-slate-50/50 border-b border-slate-100"><th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase">Indicador</th><th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-right">Inicial</th><th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-right">Atual</th><th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-center">Variação</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                    {metrics.map(m => {
                        const v1 = first[m.key] || first[m.key === 'circWaist' ? 'waistCircumference' : m.key === 'circHip' ? 'hipCircumference' : m.key];
                        const v2 = latest[m.key] || latest[m.key === 'circWaist' ? 'waistCircumference' : m.key === 'circHip' ? 'hipCircumference' : m.key];
                        if (v1 == null || v2 == null) return null;
                        const diff = v2 - v1;
                        const pct = ((v2 / v1) - 1) * 100;
                        const isGood = ['weight', 'bodyFatPercentage', 'circWaist', 'circAbdomen', 'circHip'].includes(m.key) ? diff < 0 : diff > 0;
                        return (
                            <tr key={m.key} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase">{m.label}</td>
                                <td className="px-4 py-2.5 text-xs font-black text-slate-400 text-right">{Number(v1).toFixed(1)} {m.unit}</td>
                                <td className="px-4 py-2.5 text-xs font-black text-slate-900 text-right">{Number(v2).toFixed(1)} {m.unit}</td>
                                <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${isGood ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}{m.unit} ({diff > 0 ? '+' : ''}{pct.toFixed(1)}%)</span></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// --- MAIN VIEW ---

export const IndividualPatientReportView = ({
    data,
    isManagerMode,
    onAnalyze,
    analyzing,
    aiSummary,
    isPdf,
    clinic,
    user
}: {
    data: IndividualReportSnapshot,
    isManagerMode: boolean,
    onAnalyze?: () => void,
    analyzing?: boolean,
    aiSummary?: string | null,
    isPdf: boolean,
    clinic?: Clinic,
    user?: User
}) => {
    const { patient, metrics, anthropometry, clinical, exams, nutritional, financial, timeline, metadata } = data;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Metadata Footer */}
            <div className="text-[8px] text-gray-400 text-right font-mono border-b pb-2 mb-4">
                Report Gen: {new Date(metadata.generatedAt).toLocaleString()} | Ver: {metadata.dataVersion}
            </div>

            {/* Header */}
            {isPdf && clinic ? (
                <PDFHeader
                    clinic={clinic}
                    user={user}
                    patient={patient}
                    title="Relatório de Evolução"
                    showObjective={true}
                />
            ) : (
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="h-14 w-14 rounded-xl flex items-center justify-center text-2xl font-black bg-slate-50 text-emerald-600 border border-slate-100 shadow-inner">
                        {patient.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">{patient.name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">{patient.gender}, {calculateAge(patient.birthDate)} anos</p>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white border-slate-200 p-4 rounded-xl border text-center shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Desde</p>
                    <p className="text-base font-black text-slate-900">{metrics.patientSince}</p>
                </div>
                <div className="bg-white border-slate-200 p-4 rounded-xl border text-center shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Consultas</p>
                    <p className="text-base font-black text-slate-900">{metrics.totalAppointments}</p>
                </div>
                <div className="bg-white border-slate-200 p-4 rounded-xl border text-center shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 underline decoration-emerald-500 decoration-2 underline-offset-4">Presença</p>
                    <p className={`text-base font-black ${metrics.attendanceRate < 80 ? 'text-rose-500' : 'text-emerald-500'}`}>{Number(metrics.attendanceRate).toFixed(1)}%</p>
                </div>
                {isManagerMode ? (
                    <div className="bg-emerald-50 border-emerald-100 p-4 rounded-xl border text-center shadow-inner">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Receita</p>
                        <p className="text-base font-black text-emerald-900">R$ {financial.totalPaid.toFixed(0)}</p>
                    </div>
                ) : (
                    <div className="bg-white border-slate-200 p-4 rounded-xl border text-center shadow-sm">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Próxima</p>
                        <p className="text-base font-black text-indigo-600">{metrics.nextAppointmentDate ? new Date(metrics.nextAppointmentDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                )}
            </div>

            {/* AI Analysis */}
            {onAnalyze && !isPdf && (
                <div className="bg-indigo-50/30 p-4 rounded-2xl flex items-center justify-between print:hidden border border-indigo-100">
                    <p className="text-sm font-black text-indigo-900 uppercase tracking-widest">Auditoria Clínica Digital (IA)</p>
                    <button onClick={onAnalyze} disabled={analyzing} className={`text-xs px-5 py-2 rounded-xl shadow-lg font-black flex items-center gap-2 transform active:scale-95 transition-all ${analyzing ? 'bg-slate-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                        {analyzing ? 'Processando...' : <>🔬 Gerar Análise</>}
                    </button>
                </div>
            )}
            {aiSummary && (
                <div className="bg-white text-black border-gray-300 p-5 rounded-xl border prose prose-sm max-w-none shadow-sm">
                    <div className="whitespace-pre-line leading-relaxed">{aiSummary}</div>
                </div>
            )}

            <MeasurementsComparisonTable history={anthropometry.history} />

            <div className="bg-white border-slate-200 shadow-xl rounded-[2.5rem] p-8 border space-y-8">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-4 text-slate-400 underline decoration-emerald-500 decoration-2 underline-offset-8">Painel de Evolução Corporal</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center border-b border-gray-100 pb-8">
                    <CompositionEvolutionChart data={anthropometry.history} isPdf={isPdf} />
                    <div className="space-y-6">
                        <MetabolicRiskChart data={anthropometry.history} isPdf={isPdf} gender={patient.gender} />
                        {anthropometry.history.length > 1 && <HabitRadarChart history={anthropometry.history} isPdf={isPdf} />}
                    </div>
                </div>

                {anthropometry.history.length > 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center border-b border-gray-100 pb-8 mt-8">
                        <MeasurementDeltaChart history={anthropometry.history} isPdf={isPdf} />
                        <SkinfoldDeltaChart history={anthropometry.history} isPdf={isPdf} gender={patient.gender} />
                    </div>
                )}

                <div className="mt-8 pt-8 border-t border-dashed border-slate-200 text-center">
                    <GoalThermometer currentBF={anthropometry.history[anthropometry.history.length - 1]?.bodyFatPercentage || 0} targetBF={0} isPdf={isPdf} />
                </div>

                {/* NOVO: Bloco PICA no Relatório */}
                {anthropometry.history.length > 0 && anthropometry.history[anthropometry.history.length - 1].picaDiagnosis && (
                    <div className={`mt-8 p-6 rounded-3xl border-2 ${isPdf ? 'bg-gray-50 border-gray-200' : 'bg-indigo-50/50 border-indigo-100 shadow-inner'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-xl">📋</span>
                            <h4 className={`text-xs font-black uppercase tracking-[0.2em] ${isPdf ? 'text-gray-700' : 'text-indigo-900'}`}>Protocolo PICA (Diagnóstico Clínico Integrado)</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnóstico Principal</p>
                                    <p className="text-sm font-black text-slate-900 leading-tight underline decoration-emerald-500 decoration-2 underline-offset-4">
                                        {anthropometry.history[anthropometry.history.length - 1].picaDiagnosis}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Síntese do Perfil</p>
                                    <p className="text-xs font-medium text-slate-700 italic leading-snug">
                                        "{anthropometry.history[anthropometry.history.length - 1].picaSynthesis}"
                                    </p>
                                </div>
                            </div>
                            <div className={`p-4 rounded-2xl ${isPdf ? 'bg-white border-gray-100' : 'bg-white/80 border-indigo-50 border font-black'} shadow-sm`}>
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Conduta Prioritária</p>
                                <p className="text-xs font-black text-emerald-900 leading-relaxed uppercase">
                                    {anthropometry.history[anthropometry.history.length - 1].picaConduct}
                                </p>
                            </div>
                        </div>
                        <p className="mt-4 text-[9px] text-slate-400 font-bold italic">
                            * O Protocolo PICA integra IMC, adiposidade, massa magra e repercussão clínica para além do peso isolado.
                        </p>
                    </div>
                )}

                {/* NOVO: Mapas Mentais Clínicos */}
                {!isPdf && (
                    <div className="mt-8 border-t border-slate-100 pt-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-700 flex items-center gap-2">
                                🧠 Mapas Mentais Visuais (Vision IA)
                            </h3>
                            <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">Alpha</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 border border-slate-200 p-6 rounded-[32px] flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Icons.TrendingUp className="w-12 h-12" />
                                </div>
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Mapa de Tratamento Metabólico</h4>
                                <p className="text-xs text-slate-400 italic text-center mb-6 px-4">Diagnóstico → Fisiopatologia → Conduta</p>
                                <button
                                    onClick={async () => {
                                        await MindMapService.generatePatientMindMap(data, 'TREATMENT');
                                        alert('Mapa de Tratamento (Científico) gerado! Visualize na aba de Insights do Paciente.');
                                    }}
                                    className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all active:scale-95"
                                >
                                    Gerar Mapa de Tratamento
                                </button>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 p-6 rounded-[32px] flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Icons.Star className="w-12 h-12" />
                                </div>
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Estratégia de Metas</h4>
                                <p className="text-xs text-slate-400 italic text-center mb-6 px-4">Objetivos Metabólicos de Curto a Longo Prazo</p>
                                <button
                                    onClick={async () => {
                                        await MindMapService.generatePatientMindMap(data, 'GOALS');
                                        alert('Estratégia de Metas gerada! Visualize na aba de Insights do Paciente.');
                                    }}
                                    className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-sm hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100 transition-all active:scale-95"
                                >
                                    Gerar Estratégia de Metas
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Timeline History */}
            {timeline.length > 0 && !isPdf && (
                <div className="bg-white border-slate-200 shadow-xl rounded-[2.5rem] p-8 border">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 px-3 border-l-4 border-slate-500">Histórico de Eventos</h3>
                    <div className="space-y-4 border-l-2 border-gray-200 ml-2 pl-4">
                        {timeline.map(event => (
                            <div key={event.id} className="relative">
                                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-400 ring-4 ring-white"></div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{new Date(event.createdAt).toLocaleDateString()}</p>
                                <p className="text-sm font-black text-slate-900 tracking-tight">{event.summary}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
