import React, { useState, useRef, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
    ComposedChart, Line, Bar, BarChart, Cell, ReferenceArea, ReferenceLine, ReferenceDot, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Pie, PieChart
} from 'recharts';
import { User, Clinic, Role, Patient, AppointmentStatus, IndividualReportSnapshot, MipanAssessment } from '../types';
import { db } from '../services/db';
import { AIClinicalSummaryService } from '../services/aiClinicalSummary';
import { Icons } from '../constants';

interface ReportsProps {
    user: User;
    clinic: Clinic;
    isManagerMode: boolean;
}

// --- UPDATED CHART COMPONENT FOR PDF SUPPORT ---
interface SimpleLineChartProps {
    data: any[];
    dataKey: string;
    color: string;
    label: string;
    isManagerMode: boolean;
    isPdf?: boolean; // New prop to control PDF rendering behavior
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ data, dataKey, color, label, isManagerMode, isPdf = false }) => {
    // Robust Data Validation: Ensure data point exists, is a number, and is finite.
    const validData = data.filter(d => d && typeof d[dataKey] === 'number' && isFinite(d[dataKey]));

    if (!validData || validData.length < 2) {
        return (
            <div className={`h-40 flex items-center justify-center text-sm ${isPdf ? 'text-gray-400 bg-gray-50 border-gray-200' : (isManagerMode ? 'text-gray-400 bg-gray-700 border-gray-600' : 'text-slate-400 bg-emerald-50 border-emerald-200')} rounded border`}>
                {validData.length === 1 ? (
                    <span>Histórico insuficiente (1 registro). Valor atual: <strong>{validData[0][dataKey]}</strong></span>
                ) : (
                    "Registre ao menos 2 avaliações para gerar evolução"
                )}
            </div>
        );
    }

    const values = validData.map(d => d[dataKey]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    // Explicit Dimensions for PDF stability
    const width = 600;
    const height = 200;
    const padding = 20;

    const points = validData.map((d, i) => {
        const x = padding + (i / (validData.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((d[dataKey] - min) / range) * (height - 2 * padding);
        if (isNaN(x) || isNaN(y)) return null;
        return `${x},${y}`;
    }).filter(Boolean).join(' ');

    const textColor = isPdf ? '#333' : (isManagerMode ? '#9ca3af' : '#475569');
    const axisColor = isPdf ? '#ccc' : (isManagerMode ? '#4b5563' : '#e2e8f0');

    return (
        <div className="w-full overflow-hidden" style={isPdf ? { width: '600px', height: '220px' } : {}}>
            <svg
                viewBox={`0 0 ${width} ${height}`}
                width={isPdf ? "600" : "100%"}
                height={isPdf ? "200" : "100%"}
                className="w-full h-full"
                preserveAspectRatio="none"
            >
                {/* Background Lines */}
                <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke={axisColor} strokeWidth="1" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={axisColor} strokeWidth="1" />

                {/* The Line */}
                <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                {/* Dots & Labels */}
                {validData.map((d, i) => {
                    const x = padding + (i / (validData.length - 1)) * (width - 2 * padding);
                    const y = height - padding - ((d[dataKey] - min) / range) * (height - 2 * padding);

                    if (isNaN(x) || isNaN(y)) return null;

                    return (
                        <g key={i}>
                            <circle cx={x} cy={y} r="4" fill={isPdf ? 'white' : (isManagerMode ? '#374151' : 'white')} stroke={color} strokeWidth="2" />
                            {/* Hide text labels in PDF mode to prevent 'giant numbers' issue, show strictly on start/end or rely on table data */}
                            {!isPdf && (
                                <text x={x} y={y - 12} textAnchor="middle" fontSize="11" fontWeight="bold" fill={textColor}>{d[dataKey]}</text>
                            )}
                            {/* Show date for all points on screen, limited on PDF if needed, keeping simple here */}
                            <text x={x} y={height + 15} textAnchor="middle" fontSize="10" fill={textColor}>{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>
                        </g>
                    );
                })}
            </svg>
            <p className={`text-center text-xs mt-2 font-semibold uppercase tracking-wider ${isPdf ? 'text-emerald-700' : (isManagerMode ? 'text-gray-400' : 'text-emerald-700')}`}>{label} ao longo do tempo</p>
        </div>
    );
};

const Reports: React.FC<ReportsProps> = ({ user, clinic, isManagerMode }) => {
    // Report Type Toggle
    const [reportType, setReportType] = useState<'OPERATIONAL' | 'FINANCIAL' | 'ATTENDANCE' | 'INDIVIDUAL'>('OPERATIONAL');

    // Date Filters - Default expanded to 90 days to ensure mock data visibility
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]);

    // Individual Patient Selection
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');

    // Operational Column Selection
    const availableColumns = [
        { id: 'date', label: 'Data/Hora' },
        { id: 'professionalName', label: 'Profissional' },
        { id: 'patientName', label: 'Paciente' },
        { id: 'patientGender', label: 'Sexo' },
        { id: 'patientAge', label: 'Idade' },
        { id: 'type', label: 'Tipo' },
        { id: 'status', label: 'Status' },
        { id: 'insurance', label: 'Convênio/Pagamento' },
        { id: 'pathologies', label: 'Patologias' },
    ];
    const [selectedColumns, setSelectedColumns] = useState<string[]>(['date', 'professionalName', 'patientName', 'type', 'status', 'insurance']);

    // Data State
    const [reportData, setReportData] = useState<any[]>([]);
    const [operationalStats, setOperationalStats] = useState<any | null>(null);
    const [financialData, setFinancialData] = useState<any[]>([]);
    const [financialDataset, setFinancialDataset] = useState<any | null>(null);
    const [attendanceData, setAttendanceData] = useState<any | null>(null);
    const [individualReportData, setIndividualReportData] = useState<IndividualReportSnapshot | null>(null);

    const [loading, setLoading] = useState(false);
    const [generated, setGenerated] = useState(false);

    // AI Analysis State
    const [analyzing, setAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<{ clinicalAnalysis: string, strategicSuggestions: string[] } | null>(null);
    const [finAnalysis, setFinAnalysis] = useState<{ financialHealth: string, revenueAction: string } | null>(null);
    const [attendanceAiAnalysis, setAttendanceAiAnalysis] = useState<{ insight: string, action: string } | null>(null);
    const [individualPatientSummary, setIndividualPatientSummary] = useState<string | null>(null);

    // PDF Ref
    const reportContentRef = useRef<HTMLDivElement>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // Permissions
    // In manager mode, see ALL data; in professional mode, filter by professionalId
    const isProfessional = !isManagerMode;

    useEffect(() => {
        // Fetch patients for the individual report dropdown
        const fetchPatientsForDropdown = async () => {
            const professionalId = isProfessional ? user.professionalId : undefined;
            const patientList = await db.getPatients(clinic.id, professionalId, isManagerMode ? 'ADMIN' : 'PROFESSIONAL');
            setPatients(patientList);
            if (patientList.length > 0) {
                setSelectedPatientId(patientList[0].id);
            }
        };
        fetchPatientsForDropdown();
    }, [clinic.id, user.professionalId, isProfessional]);


    // --- Handlers ---

    const handleGenerate = async () => {
        setLoading(true);
        setGenerated(false);
        setAiAnalysis(null);
        setFinAnalysis(null);
        setAttendanceAiAnalysis(null);
        setIndividualPatientSummary(null);
        setIndividualReportData(null); // Clear previous

        const professionalIdFilter = isProfessional ? user.professionalId : undefined;

        switch (reportType) {
            case 'OPERATIONAL':
                const opDataset = await db.getOperationalReportDataset(clinic.id, startDate, endDate, professionalIdFilter);
                setReportData(opDataset.appointments);
                setOperationalStats({ ...opDataset.stats, patientsInBase: opDataset.patientsInBase, comparative: opDataset.comparative });
                break;
            case 'FINANCIAL':
                if (isProfessional) { setLoading(false); return; }
                const finDataset = await db.getFinancialReportDataset(clinic.id, startDate, endDate);
                setFinancialData(finDataset.transactions);
                setFinancialDataset(finDataset);
                break;
            case 'ATTENDANCE':
                const attData = await db.getAttendanceReportData(clinic.id, startDate, endDate, professionalIdFilter);
                setAttendanceData(attData);
                break;
            case 'INDIVIDUAL':
                if (!selectedPatientId) {
                    alert("Por favor, selecione um paciente.");
                    setLoading(false);
                    return;
                }
                const indData = await db.buildIndividualReportDataset(selectedPatientId, professionalIdFilter);
                if (!indData) {
                    alert("Não foi possível carregar os dados deste paciente. Verifique se ele está vinculado ao seu perfil ou se possui agendamentos registrados.");
                    setLoading(false);
                    return;
                }
                setIndividualReportData(indData);
                break;
        }

        setGenerated(true);
        setLoading(false);
    };

    const handleOperationalAI = async () => {
        if (reportData.length === 0) return;
        setAnalyzing(true);
        const result = await db.generateReportCrossAnalysis(clinic.id, reportData);
        setAiAnalysis(result);
        setAnalyzing(false);
    };

    const handleFinancialAI = async () => {
        if (!financialDataset) return;
        setAnalyzing(true);
        const result = await db.generateFinancialAnalysis(clinic.id, financialDataset);
        setFinAnalysis(result);
        setAnalyzing(false);
    };

    const handleAttendanceAI = async () => {
        if (!attendanceData) return;
        setAnalyzing(true);
        const result = await db.generateAttendanceInsights(attendanceData);
        setAttendanceAiAnalysis(result);
        setAnalyzing(false);
    };

    const handleIndividualAI = async () => {
        if (!individualReportData) return;
        setAnalyzing(true);
        // Use the new dedicated service
        const summary = await AIClinicalSummaryService.generateSummary(individualReportData);
        setIndividualPatientSummary(summary);
        setAnalyzing(false);
    };

    const handleDownloadPDF = async () => {
        // Validation Check
        if (!reportContentRef.current) {
            alert("Conteúdo do relatório não encontrado.");
            return;
        }

        setGeneratingPdf(true);

        try {
            // --- FRESH DATA FETCH STRATEGY ---
            // Requirement: "Fresh data mandatory before rendering PDF"
            if (reportType === 'INDIVIDUAL' && selectedPatientId) {
                const professionalIdFilter = isProfessional ? user.professionalId : undefined;
                let freshData = await db.buildIndividualReportDataset(selectedPatientId, professionalIdFilter);

                // Fallback to currently displayed data if fresh fetch fails but we already successfully generated it on screen
                if ((!freshData || !freshData.patient) && individualReportData && individualReportData.patient.id === selectedPatientId) {
                    console.warn("[Reports] Fresh re-fetch failed, falling back to cached individual data for PDF.");
                    freshData = individualReportData;
                }

                if (!freshData || !freshData.patient) {
                    throw new Error("Dados desatualizados ou incompletos. Recarregue a página e tente novamente.");
                }

                // Update State & Wait for Render
                setIndividualReportData(freshData);
                await new Promise(resolve => setTimeout(resolve, 800)); // Increased for DOM stability with heavy charts
            }

            const element = reportContentRef.current;
            const html2pdf = (window as any).html2pdf;

            if (!html2pdf) {
                throw new Error("Biblioteca de geração de PDF não está disponível.");
            }

            const opt = {
                margin: [5, 5, 5, 5],
                filename: `Relatorio_${reportType}_${clinic.slug}_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            await html2pdf().set(opt).from(element).save();

        } catch (err: any) {
            console.error("PDF Generation Error:", err);
            alert("Falha ao gerar relatório: " + (err.message || "Erro desconhecido"));
        } finally {
            setGeneratingPdf(false);
        }
    };

    const toggleColumn = (colId: string) => {
        setSelectedColumns(prev =>
            prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]
        );
    };

    // --- CHART COMPONENTS & HELPERS ---
    const VariationIndicator = ({ value, label = "vs ant." }: { value: number, label?: string }) => {
        if (value === 0 || !isFinite(value)) return <span className="text-[10px] text-gray-400 font-medium">({label} <strong>=</strong>)</span>;
        const isBad = value > 0; // More no-shows is bad
        const color = isBad ? 'text-rose-500' : 'text-emerald-500';
        const arrow = isBad ? '↑' : '↓';
        const bgColor = isBad ? 'bg-rose-50' : 'bg-emerald-50';
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${color} ${bgColor}`}>
                {arrow} {Math.abs(value).toFixed(1)}% {label}
            </span>
        );
    };

    const RevenueHistoryChart = ({ dataset, isPdf }: { dataset: any, isPdf: boolean }) => {
        const { transactions, metrics } = dataset;
        const grouped: Record<string, { paid: number, gross: number }> = {};

        transactions.forEach((t: any) => {
            const dateObj = new Date(t.date);
            // Use UTC parts to avoid timezone shifting
            const d = `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dateObj.getUTCDate()).padStart(2, '0')}`;

            if (!grouped[d]) grouped[d] = { paid: 0, gross: 0 };
            const amt = Number(t.amount) || 0;
            const origAmt = Number(t.originalAmount || t.amount) || 0;

            if (t.status === 'PAGO') {
                grouped[d].paid += amt;
            }
            grouped[d].gross += origAmt;
        });

        const chartData = Object.entries(grouped).map(([date, vals]) => ({
            date,
            displayDate: new Date(date + 'T12:00:00').toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' }),
            paid: vals.paid,
            gross: vals.gross
        })).sort((a, b) => a.date.localeCompare(b.date));

        if (chartData.length === 0) return <div className="h-48 flex items-center justify-center text-gray-400 italic text-sm">Sem dados de faturamento no período.</div>;

        const avg = chartData.reduce((acc, d) => acc + d.paid, 0) / chartData.length;
        const peak = chartData.reduce((prev, current) => (prev.paid > current.paid) ? prev : current);

        const textColor = '#64748b';
        const axisColor = '#f1f5f9';

        const efficiency = metrics.gross > 0 ? (metrics.confirmedAmount / metrics.gross) * 100 : 0;

        return (
            <div className="flex flex-col">
                <div className="h-64 mt-4">
                    <div className="flex justify-between items-center px-4 mb-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                                <span className="text-[10px] font-black uppercase text-slate-500">Bruto (Previsto)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="text-[10px] font-black uppercase text-slate-500">Líquido (Efetivado)</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Melhor Dia: {peak.displayDate} (R$ {peak.paid.toFixed(0)})</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height="80%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={axisColor} />
                            <XAxis dataKey="displayDate" tick={{ fontSize: 9, fill: textColor, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: textColor, fontWeight: 'bold' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${v}`} />
                            {!isPdf && <RechartsTooltip
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                                cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '5 5' }}
                            />}
                            <Area type="monotone" dataKey="gross" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorGross)" />
                            <Area type="monotone" dataKey="paid" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPaid)" isAnimationActive={!isPdf} />
                            <ReferenceLine y={avg} stroke="#f43f5e" strokeDasharray="5 5" label={{ position: 'right', value: 'Média', fill: '#f43f5e', fontSize: 8, fontWeight: 'bold' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Insight Contextualizado */}
                <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-3xl flex gap-5 items-start shadow-inner">
                    <div className="p-3 bg-white rounded-2xl shadow-xl border border-slate-100">
                        <Icons.TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Análise de Fluxo & Conversão</h5>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${efficiency > 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                Eficiência: {efficiency.toFixed(1)}%
                            </span>
                        </div>
                        <p className="text-xs text-slate-700 font-bold leading-relaxed">
                            O faturamento efetivado no período atingiu <strong className="text-emerald-600">R$ {metrics.confirmedAmount.toFixed(0)}</strong>.
                            {metrics.pendingAmount > 0 ? (
                                ` Nota-se uma pendência de R$ ${metrics.pendingAmount.toFixed(0)} (${((metrics.pendingAmount / metrics.gross) * 100).toFixed(1)}% do total), sugerindo potencial de conversão imediata.`
                            ) : (
                                " Excelência operacional detectada: 100% dos recebíveis projetados foram liquidados."
                            )}
                            {metrics.discountIndex > 5 && ` A taxa de descontos aplicada foi de ${metrics.discountIndex.toFixed(1)}%, impactando a margem operacional.`}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    const ComparativePerformanceChart = ({ current, prev, isPdf }: { current: any, prev: any, isPdf: boolean }) => {
        const data = [
            { name: 'R. Bruta', Atual: current.gross, Anterior: prev.gross },
            { name: 'R. Líquida', Atual: current.netReal, Anterior: prev.netReal },
            { name: 'Pendente', Atual: current.pendingAmount, Anterior: prev.pendingAmount },
        ];

        const textColor = '#64748b';
        const axisColor = '#e2e8f0';

        return (
            <div className="h-56 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ left: 10, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={axisColor} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold', fill: textColor }} axisLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: textColor }} axisLine={false} />
                        {!isPdf && <RechartsTooltip formatter={(v: any) => `R$ ${v.toFixed(1)}`} />}
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px', color: textColor }} />
                        <Bar dataKey="Anterior" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="Atual" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const MethodDistributionChart = ({ dataset, isPdf }: { dataset: any, isPdf: boolean }) => {
        const { transactions, fees } = dataset;
        const grouped: Record<string, { value: number, net: number }> = {};
        transactions.forEach((t: any) => {
            if (t.status === 'PAGO') {
                const label = t.method?.replace('_', ' ') || 'Outro';
                if (!grouped[label]) grouped[label] = { value: 0, net: 0 };
                grouped[label].value += t.amount;
                const fee = (fees as any)[t.method] || 0;
                grouped[label].net += t.amount * (1 - fee);
            }
        });
        const chartData = Object.entries(grouped).map(([name, d]) => ({ name, value: d.value, net: d.net }));
        const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#eab308'];

        if (chartData.length === 0) return <div className="h-56 flex items-center justify-center text-gray-400 italic text-sm">Sem transações efetivadas.</div>;

        return (
            <div className="h-56 mt-4 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" isAnimationActive={!isPdf}>
                            {chartData.map((_entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        {!isPdf && <RechartsTooltip formatter={(v: any, name: any, props: any) => {
                            const d = props.payload;
                            return [`Bruto: R$ ${v.toFixed(1)}`, `Líquido (est.): R$ ${d.net.toFixed(1)}`];
                        }} />}
                        <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const OperationalTypeChart = ({ data, isPdf }: { data: any[], isPdf: boolean }) => {
        const grouped: Record<string, number> = {};
        data.forEach(t => { const label = t.type || 'Consulta'; grouped[label] = (grouped[label] || 0) + 1; });
        const chartData = Object.entries(grouped).map(([name, value]) => ({ name, value }));
        const textColor = '#64748b';
        const axisColor = '#e2e8f0';

        return (
            <div className="h-48 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontWeight: 'bold', fill: textColor }} width={80} axisLine={false} tickLine={false} />
                        {!isPdf && <RechartsTooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />}
                        <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={15} isAnimationActive={!isPdf} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const ProfessionalPerformanceChart = ({ data, isPdf }: { data: any[], isPdf: boolean }) => {
        if (!data || data.length === 0) return null;

        const textColor = '#64748b';
        const axisColor = '#e2e8f0';

        return (
            <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={axisColor} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold', fill: textColor }} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: textColor }} axisLine={false} />
                        {!isPdf && <RechartsTooltip formatter={(v: any) => [`${v} atendimentos`]} />}
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px', color: textColor }} />
                        <Bar dataKey="prev" name="Anterior" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="current" name="Atual" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // --- RENDER ---
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2">
                <div>
                    <h1 className={`text-2xl md:text-3xl font-black uppercase tracking-tight ${isManagerMode ? 'text-white' : 'text-emerald-900'} flex items-center gap-2`}>
                        <Icons.FileText />
                        Relatórios Inteligentes
                    </h1>
                    <p className={`text-xs md:text-sm font-medium ${isManagerMode ? 'text-gray-400' : 'text-slate-600'}`}>Analise dados clínicos e operacionais para tomada de decisão.</p>
                </div>
            </div>

            {/* FILTERS & CONTROLS */}
            <div className="bg-white border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xl border space-y-4 print:hidden">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Report Type */}
                    <div className="flex-1">
                        <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${isManagerMode ? 'text-gray-300' : 'text-emerald-800'}`}>1. Tipo de Relatório</label>
                        <div className={`flex flex-wrap p-1 rounded-lg border gap-1 ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                            <button onClick={() => setReportType('OPERATIONAL')} className={`flex-1 min-w-[100px] py-2 text-[10px] md:text-xs rounded-md font-black uppercase tracking-wider transition-all ${reportType === 'OPERATIONAL' ? (isManagerMode ? 'bg-indigo-600 shadow-lg text-white' : 'bg-white shadow-lg text-emerald-600') : (isManagerMode ? 'text-gray-300' : 'text-gray-600')}`}>Operacional</button>
                            {!isProfessional && <button onClick={() => setReportType('FINANCIAL')} className={`flex-1 min-w-[100px] py-2 text-[10px] md:text-xs rounded-md font-black uppercase tracking-wider transition-all ${reportType === 'FINANCIAL' ? (isManagerMode ? 'bg-indigo-600 shadow-lg text-white' : 'bg-white shadow-lg text-emerald-600') : (isManagerMode ? 'text-gray-300' : 'text-gray-600')}`}>Financeiro</button>}
                            <button onClick={() => setReportType('ATTENDANCE')} className={`flex-1 min-w-[100px] py-2 text-[10px] md:text-xs rounded-md font-black uppercase tracking-wider transition-all ${reportType === 'ATTENDANCE' ? (isManagerMode ? 'bg-indigo-600 shadow-lg text-white' : 'bg-white shadow-lg text-emerald-600') : (isManagerMode ? 'text-gray-300' : 'text-gray-600')}`}>Presença</button>
                            <button onClick={() => setReportType('INDIVIDUAL')} className={`flex-1 min-w-[100px] py-2 text-[10px] md:text-xs rounded-md font-black uppercase tracking-wider transition-all ${reportType === 'INDIVIDUAL' ? (isManagerMode ? 'bg-indigo-600 shadow-lg text-white' : 'bg-white shadow-lg text-emerald-600') : (isManagerMode ? 'text-gray-300' : 'text-gray-600')}`}>Individual</button>
                        </div>
                    </div>

                    {/* Date / Patient Filter */}
                    <div className="flex-1">
                        <label className={`block text-sm font-bold mb-2 ${isManagerMode ? 'text-gray-300' : 'text-emerald-800'}`}>2. Defina os Filtros</label>
                        {reportType === 'INDIVIDUAL' ? (
                            <select value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)} className={`w-full border rounded-md p-2.5 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-emerald-900'}`}>
                                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        ) : (
                            <div className="flex items-center gap-2">
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-emerald-900'}`} />
                                <span className={`${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>até</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-emerald-900'}`} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-center pt-4 border-t border-dashed border-gray-200">
                    <button onClick={handleGenerate} disabled={loading} className={`px-8 py-3 rounded-lg shadow font-bold text-white flex items-center gap-2 transition-transform active:scale-95 ${loading ? 'bg-gray-400' : (isManagerMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700')}`}>
                        {loading ? 'Gerando...' : 'Gerar Relatório'}
                    </button>
                </div>
            </div>

            {/* REPORT AREA */}
            {generated && (
                <div className="bg-white border-slate-200 p-4 sm:p-8 rounded-3xl shadow-xl border overflow-hidden">
                    {/* Report Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-4 mb-8 pb-6 border-b border-dashed border-slate-200 print:hidden">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Resultado do Relatório</h2>
                            <p className="text-sm text-slate-500 font-medium">Período Analisado: {new Date(startDate + 'T00:00:00').toLocaleDateString()} a {new Date(endDate + 'T23:59:59').toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleDownloadPDF} disabled={generatingPdf} className="text-xs flex items-center gap-2 font-black px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100">
                                <Icons.Files className="w-4 h-4" />
                                {generatingPdf ? 'Gerando...' : 'Exportar PDF'}
                            </button>
                        </div>
                    </div>

                    <div ref={reportContentRef} className="print-area">
                        {/* --- OPERATIONAL REPORT --- */}
                        {reportType === 'OPERATIONAL' && reportData && (
                            <div className="space-y-6">
                                {/* Operational Analytics Cards */}
                                {/* Operational Analytics Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-white border-slate-100 shadow-sm p-6 rounded-2xl border hover:border-emerald-200 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Volume Assistencial</p>
                                            <VariationIndicator value={((operationalStats.totalActivities / (operationalStats.comparative?.totalActivities || 1)) - 1) * 100} label="vs ant." />
                                        </div>
                                        <p className="text-3xl font-black text-slate-900 tracking-tighter">{operationalStats.totalActivities}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">Total de Agendamentos</p>
                                    </div>

                                    <div className="bg-white border-slate-100 shadow-sm p-6 rounded-2xl border hover:border-indigo-200 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Pacientes Atendidos</p>
                                            <VariationIndicator value={((operationalStats.uniquePatientsInPeriod / (operationalStats.comparative?.uniquePatients || 1)) - 1) * 100} />
                                        </div>
                                        <p className="text-3xl font-black text-slate-900 tracking-tighter">{operationalStats.uniquePatientsInPeriod}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">Pessoas Únicas no Período</p>
                                    </div>

                                    <div className="bg-white border-slate-100 shadow-sm p-6 rounded-2xl border hover:border-slate-300 transition-colors">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Base Total Ativa</p>
                                        <p className="text-3xl font-black text-slate-900 tracking-tighter">{operationalStats?.activePatients || 0}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">Pacientes no CRM</p>
                                    </div>

                                    <div className="bg-indigo-50/50 border-indigo-100 shadow-sm p-6 rounded-2xl border">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Icons.Brain className="text-indigo-600 w-4 h-4" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Audit IA</h4>
                                        </div>
                                        <button onClick={handleOperationalAI} disabled={analyzing} className={`w-full py-2.5 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transform active:scale-95 transition-all shadow-md ${analyzing ? 'bg-slate-300 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg'}`}>
                                            {analyzing ? 'Analisando...' : 'Análise Estratégica'}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white border-slate-200 shadow-sm p-6 rounded-2xl border">
                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-slate-500 px-2 border-l-2 border-indigo-500">Mix de Especialidades / Tipos</h4>
                                        <OperationalTypeChart data={reportData} isPdf={generatingPdf} />
                                    </div>
                                    <div className="bg-white border-slate-200 shadow-sm p-6 rounded-2xl border">
                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-slate-500 px-2 border-l-2 border-indigo-500">Performance por Profissional</h4>
                                        <ProfessionalPerformanceChart data={operationalStats.professionalPerformance} isPdf={generatingPdf} />
                                    </div>
                                </div>

                                {aiAnalysis && (
                                    <div className="bg-slate-50 p-8 rounded-3xl border border-indigo-100 shadow-inner relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-6 opacity-5"><Icons.Brain className="w-40 h-40 text-indigo-900" /></div>
                                        <div className="flex items-center gap-3 mb-6 relative z-10">
                                            <span className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200"><Icons.Brain className="text-white w-5 h-5" /></span>
                                            <h3 className="text-slate-900 font-black uppercase tracking-[0.2em] text-xs underline decoration-indigo-500 decoration-2 underline-offset-4">Parecer Estratégico AI</h3>
                                        </div>
                                        <p className="text-base leading-relaxed text-slate-700 font-bold mb-8 italic relative z-10">"{aiAnalysis.clinicalAnalysis}"</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                            {aiAnalysis.strategicSuggestions.map((s: string, i: number) => (
                                                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 flex gap-4 items-start shadow-sm hover:border-indigo-400 transition-all transform hover:-translate-y-0.5">
                                                    <div className="w-6 h-6 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 text-[10px] font-black border border-indigo-100">{i + 1}</div>
                                                    <p className="text-xs text-slate-600 leading-relaxed font-bold">{s}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-3 border-l-4 border-slate-300">Detalhamento Agendamentos</h3>
                                        {!isProfessional && (
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Colunas:</span>
                                                <div className="flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-emerald-500 ring-offset-2 rounded-lg">
                                                    {availableColumns.map(col => (
                                                        <button key={col.id} onClick={() => toggleColumn(col.id)} className={`px-3 py-1 text-[9px] rounded-lg border font-black transition-all ${selectedColumns.includes(col.id) ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}>
                                                            {col.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                                        <table className="min-w-full divide-y divide-slate-100">
                                            <thead className="bg-slate-50/80">
                                                <tr>
                                                    {selectedColumns.map(colId => (
                                                        <th key={colId} className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                            {availableColumns.find(c => c.id === colId)?.label}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-50">
                                                {reportData.map(row => (
                                                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                                        {selectedColumns.map(colId => (
                                                            <td key={colId} className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-700">
                                                                {colId === 'date' ? (
                                                                    <div className="flex flex-col">
                                                                        <span>{new Date(row[colId]).toLocaleDateString()}</span>
                                                                        <span className="text-[10px] text-slate-400">{new Date(row[colId]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </div>
                                                                ) : row[colId]}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="mt-16 bg-slate-50/30 p-10 rounded-[3rem] border-2 border-dashed border-slate-200">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-100 rotate-3">
                                            <Icons.Users className="text-emerald-500 w-8 h-8" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black uppercase tracking-[0.3em] text-slate-900">Censo de Pacientes</h4>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Base de Dados Geral (Registros Únicos)</p>
                                        </div>
                                    </div>
                                    <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-2xl bg-white">
                                        <table className="min-w-full divide-y divide-slate-100">
                                            <thead className="bg-slate-50/50">
                                                <tr>
                                                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Perfil do Paciente</th>
                                                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Contato E-mail</th>
                                                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">WhatsApp</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {operationalStats.patientsInBase.map((p: any) => (
                                                    <tr key={p.id} className="hover:bg-emerald-50/30 transition-all group">
                                                        <td className="px-8 py-6 whitespace-nowrap">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white bg-gradient-to-tr from-emerald-500 to-emerald-400 shadow-lg shadow-emerald-200 group-hover:rotate-6 transition-transform">
                                                                    {p.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-800">{p.name}</p>
                                                                    <p className="text-[9px] text-slate-400 uppercase font-black mt-0.5 tracking-tighter">ID: {p.id?.slice(0, 8)}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 whitespace-nowrap">
                                                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{p.email || 'N/A'}</span>
                                                        </td>
                                                        <td className="px-8 py-6 whitespace-nowrap">
                                                            <div className="flex items-center gap-2 text-emerald-600 font-black text-xs bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                                                <Icons.Phone className="w-3.5 h-3.5" />
                                                                {p.phone || 'N/A'}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- FINANCIAL REPORT --- */}
                        {reportType === 'FINANCIAL' && !isProfessional && financialDataset && (
                            <div className="space-y-6">
                                {/* Core Totals */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-white border-slate-100 p-6 rounded-2xl border shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Receita Bruta</p>
                                            <VariationIndicator value={((financialDataset.metrics.gross / (financialDataset.comparative.gross || 1)) - 1) * 100} label="vs ant." />
                                        </div>
                                        <p className="text-2xl font-black text-slate-900 tracking-tight">R$ {financialDataset.metrics.gross.toFixed(1)}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Total faturado</p>
                                    </div>
                                    <div className="bg-white border-slate-100 p-6 rounded-2xl border shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Descontos</p>
                                            <VariationIndicator value={financialDataset.metrics.discountIndex - financialDataset.comparative.discountIndex} label="ppt" />
                                        </div>
                                        <p className="text-2xl font-black text-slate-900 tracking-tight">{financialDataset.metrics.discountIndex.toFixed(1)}%</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Índice Médio</p>
                                    </div>
                                    <div className="bg-white border-slate-100 p-6 rounded-2xl border shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Receita Real Líquida</p>
                                            <VariationIndicator value={((financialDataset.metrics.netReal / (financialDataset.comparative.netReal || 1)) - 1) * 100} />
                                        </div>
                                        <p className="text-2xl font-black text-slate-900 tracking-tight">R$ {financialDataset.metrics.netReal.toFixed(1)}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Após taxas</p>
                                    </div>
                                    <div className="bg-white border-slate-100 p-6 rounded-2xl border shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Inadimplência</p>
                                            <VariationIndicator value={((financialDataset.metrics.pendingAmount / (financialDataset.comparative.pendingAmount || 1)) - 1) * 100} />
                                        </div>
                                        <p className="text-2xl font-black text-slate-900 tracking-tight">R$ {financialDataset.metrics.pendingAmount.toFixed(1)}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Pendentes</p>
                                    </div>
                                </div>

                                {/* KPIs of Efficiency (Analyst View) */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className={`${isManagerMode ? 'bg-indigo-900/10 border-indigo-500/10' : 'bg-slate-50 border-slate-200'} p-6 rounded-2xl border`}>
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">KPI: Ticket Médio</h4>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-black text-slate-900">R$ {financialDataset.metrics.ticketMedio.toFixed(1)}</span>
                                            <VariationIndicator value={((financialDataset.metrics.ticketMedio / financialDataset.comparative.ticketMedio) - 1) * 100} />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Rentabilidade por agendamento realizado</p>
                                    </div>
                                    <div className="bg-slate-50 border-slate-200 p-6 rounded-2xl border">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Taxa de Conversão</h4>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-black text-slate-900">{financialDataset.metrics.conversionRate.toFixed(1)}%</span>
                                            <VariationIndicator value={financialDataset.metrics.conversionRate - financialDataset.comparative.conversionRate} label="ppt" />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Eficiência da recepção (Confirmados / Total)</p>
                                    </div>
                                    <div className="bg-rose-50/50 border-rose-100 p-6 rounded-2xl border">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 mb-3">Custo de Oportunidade</h4>
                                        <span className="text-2xl font-black text-rose-600">R$ {financialDataset.metrics.lostRevenue.toFixed(1)}</span>
                                        <p className="text-[10px] text-rose-400 mt-1 font-bold">Receita perdida por faltas (Absenteísmo)</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 bg-white border-slate-200 p-6 rounded-2xl border shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 underline decoration-emerald-500 decoration-2 underline-offset-4">Histórico de Faturamento</h4>
                                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold border border-emerald-100 italic">Ponto Verde = Melhor dia do período</span>
                                        </div>
                                        <RevenueHistoryChart dataset={financialDataset} isPdf={generatingPdf} />
                                    </div>
                                    <div className="bg-white border-slate-200 p-6 rounded-2xl border shadow-sm">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 px-2 border-l-2 border-indigo-500">Desempenho Comparativo</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-4 tracking-tighter">Período Atual vs Anterior</p>
                                        <ComparativePerformanceChart current={financialDataset.metrics} prev={financialDataset.comparative} isPdf={generatingPdf} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white border-slate-200 p-6 rounded-2xl border shadow-sm">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 px-2 border-l-2 border-indigo-500">Mix de Pagamento (Gross vs Net)</h4>
                                        <MethodDistributionChart dataset={financialDataset} isPdf={generatingPdf} />
                                    </div>
                                    <div className="bg-white border-slate-200 p-8 rounded-3xl border shadow-inner">
                                        <div className="flex items-center gap-2 mb-6">
                                            <span className="text-xl">⏳</span>
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Aging de Recebíveis (Inadimplência)</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Valores pendentes por tempo de atraso</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                                                <p className="text-[9px] font-black text-amber-500 uppercase">0-15d</p>
                                                <p className="text-sm font-black text-slate-900">R$ {financialDataset.aging['0-15'].toFixed(1)}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                                                <p className="text-[9px] font-black text-orange-600 uppercase">16-30d</p>
                                                <p className="text-sm font-black text-slate-900">R$ {financialDataset.aging['16-30'].toFixed(1)}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                                                <p className="text-[9px] font-black text-rose-600 uppercase">30d+</p>
                                                <p className="text-sm font-black text-slate-900">R$ {financialDataset.aging['30+'].toFixed(1)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-[2rem] flex items-center justify-between border border-indigo-100 shadow-inner">
                                    <div>
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Auditoria de Saúde Financeira (IA)</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Fluxo, tickets e aging de recebíveis</p>
                                    </div>
                                    <button onClick={handleFinancialAI} disabled={analyzing} className={`text-xs px-8 py-3 rounded-2xl font-black uppercase tracking-widest shadow-xl transform active:scale-95 transition-all ${analyzing ? 'bg-slate-300 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'}`}>
                                        {analyzing ? 'Analisando...' : 'Consultar Auditora'}
                                    </button>
                                </div>

                                {finAnalysis && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-500">
                                        <div className="bg-white border-l-4 border-indigo-500 p-5 rounded-r-xl shadow-md">
                                            <p className="text-[10px] font-black text-indigo-600 uppercase mb-2">Parecer do Auditor (AI)</p>
                                            <p className="text-sm font-medium text-gray-800 leading-relaxed italic">"{finAnalysis.financialHealth}"</p>
                                        </div>
                                        <div className="bg-indigo-600 p-6 rounded-2xl shadow-xl text-white border-2 border-indigo-500">
                                            <p className="text-[10px] font-black text-indigo-100 uppercase mb-3 tracking-[0.2em]">Estratégia Recomendada</p>
                                            <p className="text-sm font-black tracking-tight leading-relaxed">{finAnalysis.revenueAction}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- ATTENDANCE REPORT --- */}
                        {reportType === 'ATTENDANCE' && attendanceData && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-white border-slate-100 p-6 rounded-2xl border shadow-sm">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Amostra (N)</p>
                                        <p className="text-3xl font-black mt-2 text-slate-900">{attendanceData.stats.total}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Consultas Avaliadas</p>
                                    </div>
                                    <div className="bg-white border-slate-100 p-6 rounded-2xl border shadow-sm">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Abstenção</p>
                                        <div className="flex items-baseline gap-2 mt-2">
                                            <p className={`text-3xl font-black ${attendanceData.stats.noShowRate > 20 ? 'text-rose-500' : 'text-emerald-500'}`}>{attendanceData.stats.noShowRate}%</p>
                                            <VariationIndicator value={attendanceData.stats.variation} />
                                        </div>
                                    </div>
                                    <div className="bg-white border-slate-100 p-6 rounded-2xl border shadow-sm">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Impacto Estimado</p>
                                        <p className="text-3xl font-black mt-2 text-orange-600">R$ {attendanceData.financial.estimatedImpact.toFixed(1)}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Perda Potencial</p>
                                    </div>
                                    <div className="bg-white border-slate-100 p-6 rounded-2xl border shadow-sm">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Retenção Crítica</p>
                                        <p className="text-3xl font-black mt-2 text-indigo-600">{attendanceData.risk.patientsAtRisk.length}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Pacientes no Limite</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 bg-white shadow-xl border-slate-200 rounded-3xl border p-8">
                                        <h4 className="text-sm font-black uppercase tracking-widest mb-6 text-slate-700 underline decoration-indigo-500/30 decoration-2 underline-offset-8">Mapeamento de Evasão (Churn)</h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-slate-50 border-b border-slate-200">
                                                    <tr className="text-slate-500">
                                                        <th className="py-4 px-2 font-black uppercase tracking-widest text-[9px]">Paciente</th>
                                                        <th className="py-4 px-2 font-black uppercase tracking-widest text-[9px] text-center">Faltas</th>
                                                        <th className="py-4 px-2 font-black uppercase tracking-widest text-[9px] text-center">Última Visita</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {attendanceData?.churnRisk?.map((p: any) => (
                                                        <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                            <td className="py-4 px-2 font-black text-slate-800 text-sm">{p.name}</td>
                                                            <td className="py-4 px-2 text-center">
                                                                <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded-lg text-[10px] font-black border border-rose-100">{p.missedCount}</span>
                                                            </td>
                                                            <td className="py-4 px-2 text-center text-[10px] font-bold text-slate-500 italic">{p.lastVisit}</td>
                                                        </tr>
                                                    ))}
                                                    {(!attendanceData?.churnRisk || attendanceData.churnRisk.length === 0) && (
                                                        <tr><td colSpan={3} className="py-10 text-center text-gray-400 italic">Nenhum alerta de evasão para o período selecionado.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="space-y-6 text-emerald-900">
                                        <div className="bg-emerald-50 rounded-2xl p-6 shadow-xl border border-emerald-100 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10"><span className="text-5xl">📊</span></div>
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 mb-4 px-2 border-l-2 border-emerald-500">Parecer Estratégico AI</h4>

                                            <button onClick={handleAttendanceAI} disabled={analyzing} className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transform active:scale-95 transition-all ${analyzing ? 'bg-slate-200 text-slate-400' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-200/50 hover:bg-emerald-700'}`}>
                                                {analyzing ? 'Analitica...' : <>⚡ Gerar Insights</>}
                                            </button>

                                            {attendanceAiAnalysis && (
                                                <div className="mt-6 animate-in slide-in-from-bottom-2 duration-500 space-y-3">
                                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100">
                                                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">Insight de Fluxo</p>
                                                        <p className="text-xs text-slate-700 leading-relaxed font-medium italic">"{attendanceAiAnalysis.insight}"</p>
                                                    </div>
                                                    <div className="bg-emerald-600 p-4 rounded-xl shadow-md border border-emerald-500">
                                                        <p className="text-[10px] font-black text-emerald-100 uppercase mb-2">Ação Recomendada</p>
                                                        <p className="text-xs text-emerald-50 leading-relaxed font-black">{attendanceAiAnalysis.action}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* --- INDIVIDUAL REPORT (SUPER PRONTUÁRIO) --- */}
                        {reportType === 'INDIVIDUAL' && individualReportData && (
                            <IndividualPatientReportView
                                data={individualReportData}
                                isManagerMode={isManagerMode}
                                onAnalyze={handleIndividualAI}
                                analyzing={analyzing}
                                aiSummary={individualPatientSummary}
                                isPdf={generatingPdf} // Pass PDF state
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- ADVANCED RECHARTS COMPONENTS ---

const CompositionEvolutionChart = ({ data, isManagerMode, isPdf }: { data: any[], isManagerMode: boolean, isPdf: boolean }) => {
    const chartData = data.filter(d => d.fatMass != null && d.leanMass != null).map(d => ({
        ...d,
        dateFormatted: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }),
        pesoTotal: Number((d.fatMass + d.leanMass).toFixed(1))
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

const MetabolicRiskChart = ({ data, isManagerMode, isPdf, gender }: { data: any[], isManagerMode: boolean, isPdf: boolean, gender: string }) => {
    // Determine risk thresholds based on gender (WHO guidelines for WHR)
    const lowRisk = gender === 'Feminino' ? 0.80 : 0.90;
    const modRisk = gender === 'Feminino' ? 0.85 : 0.95;

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

                    {/* Background risk zones */}
                    <ReferenceArea y1={0} y2={lowRisk} fill="#10b981" fillOpacity={isPdf ? 0.1 : 0.1} />
                    <ReferenceArea y1={lowRisk} y2={modRisk} fill="#f59e0b" fillOpacity={isPdf ? 0.1 : 0.1} />
                    <ReferenceArea y1={modRisk} y2={1.5} fill="#ef4444" fillOpacity={isPdf ? 0.1 : 0.1} />

                    <Line type="monotone" dataKey="rcq" name="Relação C/Q" stroke="#3b82f6" strokeWidth={3} dot={{ stroke: '#3b82f6', strokeWidth: 2, fill: 'white', r: 4 }} activeDot={{ r: 6 }} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

const HabitRadarChart = ({ history, isManagerMode, isPdf }: { history: any[], isManagerMode: boolean, isPdf: boolean }) => {
    if (!history || history.length < 2) return null;

    // CONFIRMED: history[0] = MAIS ANTIGO (1ª avaliação = marco zero)
    //            history[length-1] = MAIS RECENTE (variação real)
    const first = history[0];                    // 1ª coleta = base 100%
    const latest = history[history.length - 1];   // última coleta = variação real

    // Para cada campo: valor da 1ª avaliação que contenha esse dado
    const getFirst = (getter: (r: any) => number | undefined): number => {
        for (let i = 0; i < history.length; i++) {
            const v = getter(history[i]);
            if (v != null && v > 0) return v;
        }
        return 0;
    };

    // Para cada campo: valor mais recente disponível
    const getLatest = (getter: (r: any) => number | undefined): number => {
        for (let i = history.length - 1; i >= 0; i--) {
            const v = getter(history[i]);
            if (v != null && v > 0) return v;
        }
        return 0;
    };

    const mapData = [
        { subject: 'Cintura', orig_a: getFirst(r => r.circWaist || r.waistCircumference), orig_b: getLatest(r => r.circWaist || r.waistCircumference) },
        { subject: 'Abdômen', orig_a: getFirst(r => r.circAbdomen), orig_b: getLatest(r => r.circAbdomen) },
        { subject: 'Quadril', orig_a: getFirst(r => r.circHip || r.hipCircumference), orig_b: getLatest(r => r.circHip || r.hipCircumference) },
        { subject: 'Tórax', orig_a: getFirst(r => r.circChest), orig_b: getLatest(r => r.circChest) },
        { subject: 'Coxa', orig_a: getFirst(r => r.circThigh), orig_b: getLatest(r => r.circThigh) },
        { subject: 'Braço', orig_a: getFirst(r => r.circArmRelaxed || r.circArmContracted), orig_b: getLatest(r => r.circArmRelaxed || r.circArmContracted) }
    ]
        .filter(d => d.orig_a > 0 && d.orig_b > 0)
        .map(d => ({
            subject: d.subject,
            A: 100,
            B: Number(((d.orig_b / d.orig_a) * 100).toFixed(1)),
            orig_a: d.orig_a,
            orig_b: d.orig_b,
            change: Number((d.orig_b - d.orig_a).toFixed(1))
        }));

    if (mapData.length < 3) {
        return (
            <div className="w-full rounded-2xl p-6 flex flex-col items-center justify-center border border-dashed bg-white border-slate-200 text-slate-400" style={{ height: isPdf ? '320px' : '400px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs font-bold uppercase">Análise de Proporção Corporal</p>
                <p className="text-[10px] text-center mt-2 px-4">Dados insuficientes para gerar a assinatura circular de proporções corporais.</p>
            </div>
        );
    }

    const deviations = mapData.map(d => Math.abs(100 - d.B));
    const maxDev = Math.max(...deviations, 3);
    const padding = Math.max(maxDev * 0.5, 3);
    const domainRange = [100 - maxDev - padding, 100 + maxDev + padding];

    return (
        <div className="w-full rounded-[2rem] p-8 bg-white shadow-xl border border-slate-100" style={{ height: isPdf ? '320px' : '420px' }}>
            <div className="flex flex-col items-center mb-4">
                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-indigo-600">Assinatura Antropométrica</h4>
                <p className="text-[10px] font-black text-slate-300 uppercase mt-1 tracking-widest">Evolução Proporcional (Base 100%)</p>
            </div>

            {/* Legenda única e clara */}
            <div className="flex justify-center gap-6 mb-2">
                <div className="flex items-center gap-1.5">
                    <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 3" /></svg>
                    <span className={`text-[9px] font-bold uppercase text-slate-500`}>Marco Zero (1ª Avaliação)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-[9px] font-bold uppercase text-emerald-600">Variação Real (Atual)</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height="73%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={mapData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} />
                    <PolarRadiusAxis domain={domainRange} tick={false} axisLine={false} />
                    {!isPdf && <RechartsTooltip
                        cursor={{ fill: 'transparent' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                const chg = d.change;
                                const pct = Number((d.B - 100).toFixed(1));
                                return (
                                    <div className="bg-white border-slate-200 text-slate-900 p-4 rounded-2xl shadow-2xl border text-[11px] font-bold">
                                        <p className="font-black mb-2 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 text-indigo-600">{d.subject}</p>
                                        <div className="space-y-1.5 mt-2">
                                            <div className="flex justify-between gap-6"><span className="text-slate-400">Primeiro:</span><strong>{d.orig_a} cm</strong></div>
                                            <div className="flex justify-between gap-6"><span className="text-slate-400">Atual:</span><strong>{d.orig_b} cm</strong></div>
                                            <div className={`flex justify-between gap-6 font-black border-t border-slate-100 pt-2 mt-2 ${chg < 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                <span className="uppercase tracking-tighter">Variação:</span>
                                                <span>{chg > 0 ? '+' : ''}{chg} cm ({pct > 0 ? '+' : ''}{pct}%)</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />}
                    {/* A = 100% sempre — representa a 1ª avaliação (marco zero tracejado) */}
                    <Radar name="Marco Zero" dataKey="A" stroke="#94a3b8" fill="transparent" fillOpacity={0} strokeWidth={1.5} strokeDasharray="5 3" />
                    {/* B = % da última em relação à 1ª — área verde de variação real */}
                    <Radar name="Variação Real" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={isPdf ? 0.25 : 0.45} strokeWidth={3} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};

const GoalThermometer = ({ currentBF, targetBF, isManagerMode, isPdf }: { currentBF: number, targetBF: number, isManagerMode: boolean, isPdf: boolean }) => {
    if (!currentBF) return null;

    // Mock target if none exists
    const roundedCurrent = Number(currentBF.toFixed(1));
    const safeTarget = targetBF ? Number(targetBF.toFixed(1)) : Number((roundedCurrent * 0.85).toFixed(1)); // fallback to -15%
    const data = [{
        name: '% de Gordura',
        Atual: roundedCurrent,
        Alvo: safeTarget,
        'Diferença': Number(Math.abs(roundedCurrent - safeTarget).toFixed(1))
    }];

    return (
        <div className="w-full" style={{ height: isPdf ? '100px' : '140px' }}>
            <p className={`text-center text-xs font-bold uppercase mb-4 text-gray-500`}>Progresso do Objetivo (%GC)</p>
            <ResponsiveContainer width="100%" height="45%">
                <BarChart layout="vertical" data={data} margin={{ top: 0, right: 30, left: 20, bottom: 0 }} barGap="-100%">
                    <XAxis type="number" domain={[0, Math.max(currentBF, safeTarget, 30) + 5]} hide />
                    <YAxis dataKey="name" type="category" hide />

                    {/* Background track */}
                    <Bar dataKey="name" fill="#f8fafc" radius={[10, 10, 10, 10]} barSize={24} isAnimationActive={false} />

                    {/* Progress bar (Overlay) */}
                    <Bar dataKey="Atual" fill={currentBF <= safeTarget ? '#10b981' : '#f59e0b'} radius={[10, 10, 10, 10]} barSize={24} />

                    {/* Target Landmark */}
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

const MeasurementDeltaChart = ({ history, isManagerMode, isPdf }: { history: any[], isManagerMode: boolean, isPdf: boolean }) => {
    if (!history || history.length < 2) return null;

    // history[0] = MAIS ANTIGO (1ª coleta) | history[length-1] = MAIS RECENTE
    const getFirst = (getter: (r: any) => number | undefined): number => {
        for (let i = 0; i < history.length; i++) {
            const v = getter(history[i]);
            if (v != null && v > 0) return v;
        }
        return 0;
    };
    const getLatest = (getter: (r: any) => number | undefined): number => {
        for (let i = history.length - 1; i >= 0; i--) {
            const v = getter(history[i]);
            if (v != null && v > 0) return v;
        }
        return 0;
    };

    const riskKeys = ['Cintura', 'Abdômen', 'Quadril'];

    const measures = [
        { key: 'Pescoço', a: getFirst(r => r.circNeck), b: getLatest(r => r.circNeck) },
        { key: 'Ombro', a: getFirst(r => r.circShoulder), b: getLatest(r => r.circShoulder) },
        { key: 'Tórax', a: getFirst(r => r.circChest), b: getLatest(r => r.circChest) },
        { key: 'Cintura', a: getFirst(r => r.circWaist || r.waistCircumference), b: getLatest(r => r.circWaist || r.waistCircumference) },
        { key: 'Abdômen', a: getFirst(r => r.circAbdomen), b: getLatest(r => r.circAbdomen) },
        { key: 'Quadril', a: getFirst(r => r.circHip || r.hipCircumference), b: getLatest(r => r.circHip || r.hipCircumference) },
        { key: 'Braço (R)', a: getFirst(r => r.circArmRelaxed), b: getLatest(r => r.circArmRelaxed) },
        { key: 'Braço (C)', a: getFirst(r => r.circArmContracted), b: getLatest(r => r.circArmContracted) },
        { key: 'Antebraço', a: getFirst(r => r.circForearm), b: getLatest(r => r.circForearm) },
        { key: 'Coxa', a: getFirst(r => r.circThigh), b: getLatest(r => r.circThigh) },
        { key: 'Panturrilha', a: getFirst(r => r.circCalf), b: getLatest(r => r.circCalf) },
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

    if (data.length === 0) return (
        <div className={`h-40 flex items-center justify-center text-sm text-slate-400 border-emerald-100 rounded border border-dashed`}>
            Sem variações detectadas entre as avaliações.
        </div>
    );

    const dynamicHeight = Math.max(280, data.length * 38 + 90);

    return (
        <div className="w-full rounded-2xl p-6 bg-white border border-slate-200 shadow-sm" style={{ height: isPdf ? '300px' : `${dynamicHeight}px` }}>
            <div className="flex flex-col items-center mb-4">
                <h4 className={`text-sm font-black uppercase tracking-[0.2em] text-emerald-800`}>Dinâmica de Perdas e Ganhos</h4>
                <p className={`text-[9px] font-bold text-slate-400 uppercase mt-1 text-center`}>Variação Líquida de Todos os Perímetros (cm)</p>
            </div>
            <ResponsiveContainer width="100%" height="82%">
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 55, left: 5, bottom: 5 }} barSize={Math.min(16, Math.floor(220 / data.length))}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={'#f1f5f9'} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} unit=" cm" domain={['auto', 'auto']} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#475569', fontWeight: 'bold' }} axisLine={false} tickLine={false} width={82} />
                    {!isPdf && <RechartsTooltip
                        cursor={{ fill: 'transparent' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className={`bg-white border-gray-200 p-2 rounded-lg shadow-xl border text-[10px]`}>
                                        <p className="font-bold uppercase mb-1">{d.name}</p>
                                        <p className={d.isPositive ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                                            {d.delta > 0 ? '+' : ''}{d.delta} cm ({d.pct > 0 ? '+' : ''}{d.pct}%)
                                        </p>
                                        <p className="text-gray-400 italic mt-1">{d.isRisk ? '⚠ Zona de Risco Metabólico' : '💪 Zona de Desempenho Muscular'}</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />}
                    <Bar dataKey="delta" radius={[0, 6, 6, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.isPositive ? '#10b981' : '#f43f5e'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-1">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-emerald-500"></div><span className="text-[8px] font-bold text-gray-400">Positivo</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-rose-500"></div><span className="text-[8px] font-bold text-gray-400">Negativo</span></div>
            </div>
        </div>
    );
};

const SkinfoldDeltaChart = ({ history, isManagerMode, isPdf, gender }: { history: any[], isManagerMode: boolean, isPdf: boolean, gender?: string }) => {
    if (!history || history.length < 2) return null;

    // ─── Mapeamento de protocolos → dobras relevantes ───────────────────────
    type FoldKey = 'triceps' | 'subscapular' | 'biceps' | 'chest' | 'axillary' | 'suprailiac' | 'abdominal' | 'thigh' | 'calf';

    const PROTOCOL_FOLDS: Record<string, FoldKey[]> = {
        JacksonPollock7: ['chest', 'axillary', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh'],
        JacksonPollock3: gender === 'Feminino' || gender === 'F'
            ? ['triceps', 'suprailiac', 'thigh']
            : ['chest', 'abdominal', 'thigh'],
        Guedes: gender === 'Feminino' || gender === 'F'
            ? ['triceps', 'suprailiac', 'thigh']
            : ['subscapular', 'abdominal', 'thigh'],
        DurninWomersley: ['biceps', 'triceps', 'subscapular', 'suprailiac'],
        Faulkner: ['triceps', 'subscapular', 'suprailiac', 'abdominal'],
        ISAK: ['biceps', 'triceps', 'subscapular', 'suprailiac', 'abdominal', 'thigh', 'calf'],
    };

    const FOLD_LABELS: Record<FoldKey, string> = {
        triceps: 'Tríceps',
        subscapular: 'Subescap.',
        biceps: 'Bíceps',
        chest: 'Peitoral',
        axillary: 'Axilar Med.',
        suprailiac: 'Suprailíaca',
        abdominal: 'Abdominal',
        thigh: 'Coxa',
        calf: 'Panturr.',
    };

    const FOLD_GETTER: Record<FoldKey, (r: any) => number | undefined> = {
        triceps: r => r.skinfoldTriceps,
        subscapular: r => r.skinfoldSubscapular,
        biceps: r => r.skinfoldBiceps,
        chest: r => r.skinfoldChest,
        axillary: r => r.skinfoldAxillary,
        suprailiac: r => r.skinfoldSuprailiac,
        abdominal: r => r.skinfoldAbdominal,
        thigh: r => r.skinfoldThigh,
        calf: r => r.skinfoldCalf,
    };

    const PROTOCOL_NAMES: Record<string, string> = {
        JacksonPollock7: 'Jackson & Pollock (7 dobras)',
        JacksonPollock3: 'Jackson & Pollock (3 dobras)',
        Guedes: 'Guedes',
        DurninWomersley: 'Durnin & Womersley',
        Faulkner: 'Faulkner',
        ISAK: 'ISAK',
    };

    // Protocolo da 1ª avaliação (marco zero) e da última (variação real)
    const firstProtocol = history.find((r: any) => r.skinfoldProtocol)?.skinfoldProtocol as string | undefined;
    const latestProtocol = [...history].reverse().find((r: any) => r.skinfoldProtocol)?.skinfoldProtocol as string | undefined;
    const protocolMismatch = firstProtocol && latestProtocol && firstProtocol !== latestProtocol;

    // Usa o protocolo da avaliação mais recente para definir quais dobras exibir
    const activeProtocol = latestProtocol || firstProtocol;

    // getFirst: valor mais antigo disponível para o campo
    const getFirst = (getter: (r: any) => number | undefined): number => {
        for (let i = 0; i < history.length; i++) {
            const v = getter(history[i]);
            if (v != null && v > 0) return v;
        }
        return 0;
    };
    // getLatest: valor mais recente disponível
    const getLatest = (getter: (r: any) => number | undefined): number => {
        for (let i = history.length - 1; i >= 0; i--) {
            const v = getter(history[i]);
            if (v != null && v > 0) return v;
        }
        return 0;
    };

    // Seleciona apenas as dobras conforme o protocolo ativo
    const activeFolds: FoldKey[] = activeProtocol && PROTOCOL_FOLDS[activeProtocol]
        ? PROTOCOL_FOLDS[activeProtocol]
        : (Object.keys(FOLD_GETTER) as FoldKey[]); // fallback: todas

    const data = activeFolds
        .map(fk => ({
            name: FOLD_LABELS[fk],
            a: getFirst(FOLD_GETTER[fk]),
            b: getLatest(FOLD_GETTER[fk]),
        }))
        .filter(f => f.a > 0 && f.b > 0)
        .map(f => ({
            name: f.name,
            delta: Number((f.b - f.a).toFixed(1)),
            pct: Number(((f.b / f.a - 1) * 100).toFixed(1))
        }))
        .filter(f => Math.abs(f.delta) >= 0.1);

    if (data.length === 0) return null;

    const dynamicH = Math.max(280, data.length * 30 + 100);

    return (
        <div className="w-full rounded-2xl p-6 bg-white border border-slate-200 shadow-sm" style={{ height: isPdf ? '280px' : `${dynamicH}px` }}>
            <div className="flex flex-col items-center mb-2">
                <h4 className={`text-sm font-black uppercase tracking-[0.2em] text-emerald-800`}>Dinâmica de Gordura Localizada</h4>
                <p className={`text-[9px] font-bold text-slate-400 uppercase mt-1 text-center`}>Variação de Dobras Cutâneas (mm)</p>
            </div>
            <div className="flex-1 min-h-0 flex flex-col pt-2">
                <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-[8px] font-black mt-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 italic">
                        Redução de Dobras = Eficiência Lipolítica
                    </span>
                </div>
            </div>

            {/* Alerta de inconsistência de protocolo */}
            {protocolMismatch && (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-3 text-[9px] text-amber-700 font-bold">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    Atenção: protocolos diferentes ({PROTOCOL_NAMES[firstProtocol!] || firstProtocol} → {PROTOCOL_NAMES[latestProtocol!] || latestProtocol}). Comparação pode ser imprecisa.
                </div>
            )}

            <ResponsiveContainer width="100%" height="68%">
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 50, left: 5, bottom: 5 }} barSize={Math.min(14, Math.floor(180 / data.length))}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} unit=" mm" domain={['auto', 'auto']} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#475569', fontWeight: 'bold' }} axisLine={false} tickLine={false} width={68} />
                    {!isPdf && <RechartsTooltip
                        cursor={{ fill: 'transparent' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-white border-slate-200 text-slate-900 p-4 rounded-2xl shadow-2xl border text-[11px] font-bold">
                                        <p className="font-bold uppercase mb-1">{d.name}</p>
                                        <p className={d.delta < 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                                            {d.delta > 0 ? '+' : ''}{d.delta} mm ({d.pct > 0 ? '+' : ''}{d.pct}%)
                                        </p>
                                        <p className="text-gray-400 italic mt-1">{d.delta < 0 ? '↓ Redução de gordura subcutânea' : '↑ Aumento de gordura subcutânea'}</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />}
                    <Bar dataKey="delta" radius={[0, 6, 6, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`sf-${index}`} fill={entry.delta < 0 ? '#10b981' : '#f43f5e'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <p className="text-[8px] text-center text-gray-400 mt-1 italic">
                * Dobras do protocolo {activeProtocol ? (PROTOCOL_NAMES[activeProtocol] || activeProtocol) : 'selecionado'}. Negativo = redução de gordura.
            </p>
        </div>
    );
};


// --- NEW COMPONENT: INDIVIDUAL PATIENT REPORT VIEW (SUPER PRONTUÁRIO) ---
const IndividualPatientReportView = ({ data, isManagerMode, onAnalyze, analyzing, aiSummary, isPdf }: { data: IndividualReportSnapshot, isManagerMode: boolean, onAnalyze: () => void, analyzing: boolean, aiSummary: string | null, isPdf: boolean }) => {
    const { patient, metrics, anthropometry, clinical, exams, nutritional, financial, timeline, metadata } = data;

    return (
        <div className="space-y-8">
            {/* Metadata Footer for Consistency Validation */}
            <div className="text-[8px] text-gray-400 text-right font-mono border-b pb-2 mb-4">
                Report Gen: {new Date(metadata.generatedAt).toLocaleString()} | Ver: {metadata.dataVersion} | Source: {metadata.source}
            </div>

            {/* 1. Header & ID - SIZED DOWN */}
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="h-14 w-14 rounded-xl flex items-center justify-center text-2xl font-black bg-slate-50 text-emerald-600 border border-slate-100 shadow-inner">
                    {patient.name.charAt(0)}
                </div>
                <div className="flex-1">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">{patient.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">{patient.gender}, {new Date().getFullYear() - new Date(patient.birthDate).getFullYear()} anos</p>
                    <div className="flex gap-4 mt-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-md border border-slate-100"><Icons.Mail className="w-3 h-3 text-indigo-400" /> {patient.email}</span>
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-100"><Icons.Phone className="w-3 h-3 text-emerald-500" /> {patient.phone}</span>
                    </div>
                </div>
            </div>

            {/* 2. KPI Cards - SIZED DOWN AND OPTIMIZED */}
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
                {isManagerMode && (
                    <div className="bg-emerald-50 border-emerald-100 p-4 rounded-xl border text-center shadow-inner">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Receita</p>
                        <p className="text-base font-black text-emerald-900">R$ {financial.totalPaid.toFixed(0)}</p>
                    </div>
                )}
                {!isManagerMode && (
                    <div className="bg-white border-slate-200 p-4 rounded-xl border text-center shadow-sm">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Próxima</p>
                        <p className="text-base font-black text-indigo-600">{metrics.nextAppointmentDate ? new Date(metrics.nextAppointmentDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                )}
            </div>

            {/* 3. AI Analysis Section */}
            {!isPdf && (
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

            {/* 4. Anthropometric Evolution */}
            <div className="bg-white border-slate-200 shadow-xl rounded-[2.5rem] p-8 border space-y-8">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-4 text-slate-400 underline decoration-emerald-500 decoration-2 underline-offset-8">Painel de Evolução Corporal</h3>

                {/* Advanced Charts Grid */}
                <div
                    className={isPdf ? 'flex flex-col gap-10 items-center justify-center border-b border-gray-100 pb-8' : 'grid grid-cols-1 lg:grid-cols-2 gap-8 items-center border-b border-gray-100 pb-8'}
                    style={isPdf ? { width: '15cm', margin: '0 auto' } : {}}
                >
                    <div className="w-full">
                        <CompositionEvolutionChart data={anthropometry.history} isManagerMode={isManagerMode} isPdf={isPdf} />
                    </div>

                    <div className={isPdf ? 'w-full flex flex-col gap-10' : 'space-y-6 w-full'}>
                        <div className="w-full">
                            <MetabolicRiskChart data={anthropometry.history} isManagerMode={isManagerMode} isPdf={isPdf} gender={patient.gender} />
                        </div>
                        {anthropometry.history.length > 1 && (
                            <div className="w-full">
                                <HabitRadarChart
                                    history={anthropometry.history}
                                    isManagerMode={isManagerMode}
                                    isPdf={isPdf}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Secondary Charts Grid */}
                {anthropometry.history.length > 1 && (
                    <div
                        className={isPdf ? 'flex flex-col gap-10 items-center justify-center border-b border-gray-100 pb-8 mt-8' : 'grid grid-cols-1 lg:grid-cols-2 gap-8 items-center border-b border-gray-100 pb-8 mt-8'}
                        style={isPdf ? { width: '15cm', margin: '0 auto' } : {}}
                    >
                        <div className="w-full">
                            <MeasurementDeltaChart
                                history={anthropometry.history}
                                isManagerMode={isManagerMode}
                                isPdf={isPdf}
                            />
                        </div>
                        <div className="w-full">
                            <SkinfoldDeltaChart
                                history={anthropometry.history}
                                isManagerMode={isManagerMode}
                                isPdf={isPdf}
                                gender={patient.gender}
                            />
                        </div>
                        <div className="w-full">
                            <div className="bg-slate-50 border-slate-200 p-8 rounded-[2rem] border shadow-inner">
                                <GoalThermometer
                                    currentBF={anthropometry.history[anthropometry.history.length - 1]?.bodyFatPercentage ?? 0}
                                    targetBF={0}
                                    isManagerMode={isManagerMode}
                                    isPdf={isPdf}
                                />
                                {!isPdf && <p className="text-[10px] text-center mt-6 text-slate-400 font-bold uppercase tracking-widest select-none">Progresso em direção ao objetivo de composição corporal</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Last Record Table */}
                {anthropometry.current && (
                    <div className="mt-8 pt-8 border-t border-dashed border-slate-200">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-slate-500 text-center">Snapshot da Última Avaliação ({new Date(anthropometry.current.anthro.date).toLocaleDateString()})</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-colors">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Icons.Ruler className="w-12 h-12 text-indigo-600" /></div>
                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-4">Circunferências (cm)</p>
                                <ul className="space-y-2">
                                    <li className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-500 uppercase">Cintura</span><span className="text-sm font-black text-slate-900">{anthropometry.current.anthro.circumferencesCm.waist ? Number(anthropometry.current.anthro.circumferencesCm.waist).toFixed(1) : '-'}</span></li>
                                    <li className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-500 uppercase">Abdômen</span><span className="text-sm font-black text-slate-900">{anthropometry.current.anthro.circumferencesCm.abdomen ? Number(anthropometry.current.anthro.circumferencesCm.abdomen).toFixed(1) : '-'}</span></li>
                                    <li className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-500 uppercase">Quadril</span><span className="text-sm font-black text-slate-900">{anthropometry.current.anthro.circumferencesCm.hip ? Number(anthropometry.current.anthro.circumferencesCm.hip).toFixed(1) : '-'}</span></li>
                                </ul>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-colors">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Icons.Activity className="w-12 h-12 text-emerald-600" /></div>
                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-4">Dobras (mm)</p>
                                <ul className="space-y-2">
                                    <li className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-500 uppercase">Tríceps</span><span className="text-sm font-black text-slate-900">{anthropometry.current.anthro.skinfoldsMm.triceps ? Number(anthropometry.current.anthro.skinfoldsMm.triceps).toFixed(1) : '-'}</span></li>
                                    <li className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-500 uppercase">Abdominal</span><span className="text-sm font-black text-slate-900">{anthropometry.current.anthro.skinfoldsMm.abdominal ? Number(anthropometry.current.anthro.skinfoldsMm.abdominal).toFixed(1) : '-'}</span></li>
                                    <li className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-500 uppercase">Supra-ilíaca</span><span className="text-sm font-black text-slate-900">{anthropometry.current.anthro.skinfoldsMm.suprailiac ? Number(anthropometry.current.anthro.skinfoldsMm.suprailiac).toFixed(1) : '-'}</span></li>
                                </ul>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-colors">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Icons.Zap className="w-12 h-12 text-amber-600" /></div>
                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-4">Composição</p>
                                <ul className="space-y-2">
                                    <li className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-500 uppercase">% Gordura</span><span className="text-sm font-black text-slate-900">{anthropometry.current.anthro.bodyComp.bodyFatPct ? Number(anthropometry.current.anthro.bodyComp.bodyFatPct).toFixed(1) : '-'}%</span></li>
                                    <li className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-500 uppercase">Massa Magra</span><span className="text-sm font-black text-slate-900">{anthropometry.current.anthro.bodyComp.leanMassKg ? Number(anthropometry.current.anthro.bodyComp.leanMassKg).toFixed(1) : '-'}kg</span></li>
                                    <li className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-500 uppercase">RCQ</span><span className="text-sm font-black text-slate-900">{anthropometry.current.anthro.bodyComp.whr ? Number(anthropometry.current.anthro.bodyComp.whr).toFixed(1) : '-'}</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 5. Adherence Dashboard (NEW) */}
            <div className="bg-white border-slate-200 shadow-xl rounded-[2.5rem] p-8 border space-y-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 underline decoration-indigo-500 decoration-2 underline-offset-8">Check-in de Adesão & Hidratação</h3>
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 rounded-full border border-indigo-100 shadow-sm">
                        <Icons.Zap className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                        <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">Score Semanal: {data.adherence.score}%</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Daily Progress Grid */}
                    <div className="lg:col-span-2 space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Últimos 7 Dias</p>
                        <div className="grid grid-cols-7 gap-2">
                            {Array.from({ length: 7 }).map((_, i) => {
                                const d = new Date();
                                d.setDate(d.getDate() - (6 - i));
                                const dayStr = d.toISOString().split('T')[0];
                                const checkin = data.adherence.history.find(h => h.day === dayStr);

                                let colorClass = "bg-slate-50 border-slate-100 text-slate-300";
                                let icon = "○";
                                if (checkin?.status === 'TOTAL') { colorClass = "bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-200"; icon = "✓"; }
                                if (checkin?.status === 'PARCIAL') { colorClass = "bg-amber-400 border-amber-500 text-white shadow-lg shadow-amber-100"; icon = "!"; }
                                if (checkin?.status === 'NAO_SEGUI') { colorClass = "bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-200"; icon = "✕"; }

                                return (
                                    <div key={dayStr} className="flex flex-col items-center gap-2">
                                        <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl border-2 flex items-center justify-center font-black text-lg transition-all ${colorClass}`}>
                                            {icon}
                                        </div>
                                        <span className="text-[8px] font-black text-slate-400 uppercase">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Meta Insights */}
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b pb-2 mb-4">Métricas de Engajamento</h4>
                        <div className="flex justify-between items-center text-emerald-900">
                            <span className="text-[10px] font-bold text-slate-600 uppercase">Hidratação Média</span>
                            <span className="text-sm font-black text-indigo-600">
                                {data.adherence.history.length > 0
                                    ? (data.adherence.history.reduce((acc, h) => acc + (h.waterIntakeLiters || 0), 0) / data.adherence.history.length).toFixed(1)
                                    : "0"
                                }L / dia
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: '70%' }}></div>
                        </div>
                        <p className="text-[9px] text-slate-400 italic">O paciente apresenta maior desistência no período noturno (jantares sociais).</p>
                    </div>
                </div>

                {/* Patient Notes / Feedback */}
                {data.adherence.history.some(h => h.notes) && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Observações do Paciente</p>
                        <div className="space-y-3">
                            {data.adherence.history.filter(h => h.notes).slice(0, 3).map((h, i) => (
                                <div key={i} className="flex gap-3 items-start p-3 bg-white rounded-xl border border-slate-100 shadow-sm group hover:border-indigo-100 transition-colors">
                                    <div className="p-1.5 bg-indigo-50 rounded-lg group-hover:bg-indigo-100"><Icons.Info className="w-3 h-3 text-indigo-500" /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 mb-1">{new Date(h.date).toLocaleDateString('pt-BR')}</p>
                                        <p className="text-xs text-slate-700 font-medium italic">"{h.notes}"</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 6. Clinical History & Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border-slate-200 shadow-xl rounded-[2.5rem] p-8 border">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 px-3 border-l-4 border-emerald-500">Contexto Clínico & Diagnósticos</h3>
                    <div className="space-y-6 text-sm">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <span className="block font-black text-[9px] text-slate-400 uppercase tracking-widest mb-1">Diagnósticos Ativos</span>
                            <p className="text-slate-900 font-bold">{clinical.activeDiagnoses.length > 0 ? clinical.activeDiagnoses.join(', ') : 'Nenhum registrado.'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <span className="block font-black text-[9px] text-slate-400 uppercase tracking-widest mb-1">Medicamentos & Suplementos</span>
                            <p className="text-slate-900 font-bold">{clinical.medications.length > 0 ? clinical.medications.join(', ') : 'Nenhum registrado.'}</p>
                        </div>
                        <div>
                            <span className="block font-black text-[9px] text-slate-400 uppercase tracking-widest mb-2 px-1">Resumo da Anamnese</span>
                            <p className="italic text-slate-600 text-xs leading-relaxed font-bold bg-white p-3 rounded-xl border border-dashed border-slate-200">{clinical.anamnesisSummary || 'Não preenchida.'}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-slate-200 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] rounded-[2.5rem] p-8 border relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform"><Icons.Utensils className="w-24 h-24 text-indigo-600" /></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 px-3 border-l-4 border-indigo-500">Planejamento Nutricional Ativo</h3>
                    {nutritional.activePlanTitle ? (
                        <div className="space-y-6 relative z-10">
                            <div className="p-5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl shadow-lg shadow-indigo-100 border border-indigo-400">
                                <span className="block text-[9px] text-indigo-100 font-black uppercase tracking-widest mb-1">Título do Plano</span>
                                <p className="text-white text-lg font-black tracking-tight">{nutritional.activePlanTitle}</p>
                            </div>
                            {nutritional.targets && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center shadow-sm">
                                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1">VET (Kcal)</div>
                                        <div className="text-sm font-black text-slate-900">{Number(nutritional.targets.kcal).toFixed(0)}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center shadow-sm">
                                        <div className="text-[9px] font-black text-emerald-500 uppercase mb-1">Prot (g)</div>
                                        <div className="text-sm font-black text-slate-900">{Number(nutritional.targets.protein).toFixed(1)}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center shadow-sm">
                                        <div className="text-[9px] font-black text-indigo-500 uppercase mb-1">Carb (g)</div>
                                        <div className="text-sm font-black text-slate-900">{Number(nutritional.targets.carbs).toFixed(1)}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center shadow-sm">
                                        <div className="text-[9px] font-black text-amber-500 uppercase mb-1">Gord (g)</div>
                                        <div className="text-sm font-black text-slate-900">{Number(nutritional.targets.fat).toFixed(1)}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-10 border-2 border-dashed border-slate-100 rounded-3xl flex items-center justify-center">
                            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Nenhum plano ativo no momento</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 6. Lab Analysis (Exames) */}
            {exams && exams.length > 0 && (
                <div className="bg-white border-slate-200 shadow-xl rounded-[2.5rem] p-8 border">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 px-3 border-l-4 border-amber-500">Análise Laboratorial (Exames)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {exams.slice(0, 2).map((exam) => (
                            <div key={exam.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform"><Icons.Beaker className="w-16 h-16 text-amber-600" /></div>
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div>
                                        <p className="text-xs font-black text-slate-900 tracking-tight">{exam.name}</p>
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">{new Date(exam.date).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black ${exam.status === 'ANALISADO' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>{exam.status}</span>
                                </div>
                                <div className="space-y-2 relative z-10">
                                    {exam.markers?.slice(0, 4).map((marker, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-[10px] font-bold py-1.5 border-b border-slate-200 last:border-0">
                                            <span className="text-slate-500">{marker.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className={`${marker.interpretation === 'NORMAL' ? 'text-emerald-600' : 'text-rose-600'} font-black`}>{marker.value} {marker.unit}</span>
                                                <span className="text-[8px] text-slate-300 font-mono tracking-tighter">Ref: {marker.reference.label}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 7. Perfil Psicocomportamental MIPAN-20 */}
            {data.mipanAssessments && data.mipanAssessments.length > 0 && (
                <div className="bg-white border-slate-200 shadow-xl rounded-[2.5rem] p-8 border">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 px-3 border-l-4 border-indigo-500">Perfil Psicocomportamental MIPAN-20</h3>

                    {(() => {
                        const lastMipan = data.mipanAssessments![0];
                        const radarData = [
                            { subject: 'Desregulação', A: lastMipan.scores.axisA },
                            { subject: 'Emocional', A: lastMipan.scores.axisB },
                            { subject: 'Estresse', A: lastMipan.scores.axisC },
                            { subject: 'Baixa Adesão', A: 100 - lastMipan.scores.axisD },
                        ];

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <div className="h-64 bg-slate-50 rounded-2xl flex items-center justify-center p-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} />
                                            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar
                                                name="MIPAN"
                                                dataKey="A"
                                                stroke="#6366f1"
                                                fill="#6366f1"
                                                fillOpacity={0.4}
                                                strokeWidth={2}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-indigo-400">Índice ICRN</p>
                                            <p className="text-3xl font-black text-indigo-900">{lastMipan.icrn}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-indigo-800 uppercase tracking-widest">{lastMipan.classification}</p>
                                            <p className="text-[9px] text-indigo-400 mt-1 uppercase font-bold tracking-tighter">Risco Comportamental</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Insights Primários</p>
                                        {lastMipan.insights.priorities.map((p, i) => (
                                            <div key={i} className="flex gap-2 items-start text-[11px] font-medium text-slate-700 bg-white border border-slate-100 p-2 rounded-xl">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0"></span>
                                                {p}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-3 bg-slate-900 rounded-2xl text-white">
                                        <p className="text-[9px] font-black uppercase text-indigo-400 mb-1">Estratégia</p>
                                        <p className="text-[10px] italic leading-tight opacity-90">{lastMipan.insights.recommendation}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )
            }

            {/* 8. Timeline History */}
            {/* 8. Timeline History - Excluded from PDF explicitly via Logic and Canvas Filter */}
            {!isPdf && (
                <div data-html2canvas-ignore="true" className="bg-white border-slate-200 shadow-xl rounded-[2.5rem] p-8 border print:hidden">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 px-3 border-l-4 border-slate-500">Histórico de Eventos</h3>
                    <div className="space-y-4 border-l-2 border-gray-200 ml-2 pl-4">
                        {timeline.length === 0 ? <p className="text-sm text-gray-500 italic">Sem histórico registrado.</p> : timeline.map(event => (
                            <div key={event.id} className="relative">
                                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-400 ring-4 ring-white"></div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{new Date(event.createdAt).toLocaleDateString()} {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                <p className="text-sm font-black text-slate-900 tracking-tight">{event.summary}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{event.type.replace('_', ' ')} • {event.createdBy ? event.createdBy.name : 'Sistema'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div >
    );
};


export { Reports };
