import React, { useState, useRef, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
    ComposedChart, Line, Bar, BarChart, Cell, ReferenceArea, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
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
    const [financialData, setFinancialData] = useState<any[]>([]);
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
                const opData = await db.getReportData(clinic.id, startDate, endDate, professionalIdFilter);
                setReportData(opData);
                break;
            case 'FINANCIAL':
                if (isProfessional) { setLoading(false); return; }
                const finData = await db.getFinancialReportData(clinic.id, startDate, endDate);
                setFinancialData(finData);
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
                // Use the new comprehensive data fetching function
                const indData = await db.buildIndividualReportDataset(selectedPatientId, professionalIdFilter);
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
        if (financialData.length === 0) return;
        setAnalyzing(true);
        const result = await db.generateFinancialAnalysis(clinic.id, financialData);
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
                const freshData = await db.buildIndividualReportDataset(selectedPatientId, professionalIdFilter);

                if (!freshData || !freshData.patient) {
                    throw new Error("Dados desatualizados ou incompletos. Recarregue a página e tente novamente.");
                }

                // Update State & Wait for Render
                setIndividualReportData(freshData);
                await new Promise(resolve => setTimeout(resolve, 500)); // Allow DOM to repaint
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
    const VariationIndicator = ({ value }: { value: number }) => {
        if (value === 0 || !isFinite(value)) return <span className="text-xs text-gray-500">(vs ant. <strong>=</strong>)</span>;
        const isBad = value > 0; // More no-shows is bad
        const color = isBad ? 'text-red-500' : 'text-green-500';
        const arrow = isBad ? '↑' : '↓';
        return <span className={`text-xs font-bold ${color}`}>{arrow} {Math.abs(value)}% vs ant.</span>;
    };

    const SimpleBarChart = ({ data }: { data: any[] }) => {
        const grouped: Record<string, number> = {};
        data.forEach(t => {
            if (t.status === 'PAGO') {
                const d = new Date(t.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
                grouped[d] = (grouped[d] || 0) + t.amount;
            }
        });

        const keys = Object.keys(grouped).sort();
        const values = keys.map(k => grouped[k]);
        const maxVal = Math.max(...values, 100);

        if (keys.length === 0) return <p className={`text-xs text-center py-10 ${isManagerMode ? 'text-gray-400' : 'text-gray-400'}`}>Sem dados.</p>;

        return (
            <div className="flex items-end justify-between h-32 gap-1 mt-2 px-2">
                {keys.map((date, idx) => {
                    const val = grouped[date];
                    const heightPerc = (val / maxVal) * 100;
                    return (
                        <div key={idx} className="flex flex-col items-center flex-1 group">
                            <div className={`text-[9px] mb-0.5 opacity-0 group-hover:opacity-100 font-bold ${isManagerMode ? 'text-gray-300' : 'text-gray-500'}`}>R${val}</div>
                            <div
                                className={`w-full rounded-t hover:bg-blue-600 transition-colors ${isManagerMode ? 'bg-indigo-500' : 'bg-blue-500'}`}
                                style={{ height: `${Math.max(heightPerc, 5)}%` }}
                            ></div>
                            <div className={`text-[8px] mt-1 truncate w-full text-center ${isManagerMode ? 'text-gray-400' : 'text-gray-400'}`}>{date}</div>
                        </div>
                    )
                })}
            </div>
        );
    };

    const MethodDistributionChart = ({ data }: { data: any[] }) => {
        const grouped: Record<string, number> = {};
        let total = 0;
        data.forEach(t => {
            if (t.status === 'PAGO') {
                grouped[t.method] = (grouped[t.method] || 0) + t.amount;
                total += t.amount;
            }
        });

        const sorted = Object.entries(grouped).sort(([, a], [, b]) => b - a);

        if (sorted.length === 0) return <p className={`text-xs text-center py-10 ${isManagerMode ? 'text-gray-400' : 'text-gray-400'}`}>Sem dados.</p>;

        const colors: Record<string, string> = {
            'PIX': 'bg-green-500',
            'CARTAO_CREDITO': 'bg-blue-500',
            'DINHEIRO': 'bg-yellow-500',
            'GUIA_CONVENIO': 'bg-purple-500',
            'CARTAO_DEBITO': 'bg-sky-500',
            'BOLETO': 'bg-orange-500',
        };

        return (
            <div className="space-y-2 mt-2">
                {sorted.map(([method, amount]) => {
                    const perc = total > 0 ? (amount / total) * 100 : 0;
                    return (
                        <div key={method}>
                            <div className="flex justify-between text-xs mb-1">
                                <span className={`font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-600'}`}>{method}</span>
                                <span className={`${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>R${amount.toFixed(2)}</span>
                            </div>
                            <div className={`w-full rounded-full h-2 ${isManagerMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                <div className={`h-2 rounded-full ${colors[method] || 'bg-gray-500'}`} style={{ width: `${perc}%` }}></div>
                            </div>
                        </div>
                    )
                })}
            </div>
        );
    };

    // --- RENDER ---
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className={`text-2xl font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'} flex items-center gap-2`}>
                        <Icons.FileText />
                        Central de Relatórios
                    </h1>
                    <p className={`mt-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Extraia dados para análises operacionais e financeiras.</p>
                </div>
            </div>

            {/* FILTERS & CONTROLS */}
            <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-xl shadow-sm border space-y-4 print:hidden`}>
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Report Type */}
                    <div className="flex-1">
                        <label className={`block text-sm font-bold mb-2 ${isManagerMode ? 'text-gray-300' : 'text-emerald-800'}`}>1. Selecione o Tipo de Relatório</label>
                        <div className={`flex p-1 rounded-lg border ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                            <button onClick={() => setReportType('OPERATIONAL')} className={`flex-1 py-2 text-sm rounded-md font-bold transition-colors ${reportType === 'OPERATIONAL' ? (isManagerMode ? 'bg-indigo-600 shadow text-white' : 'bg-white shadow text-emerald-600') : (isManagerMode ? 'text-gray-300' : 'text-gray-600')}`}>Operacional</button>
                            {!isProfessional && <button onClick={() => setReportType('FINANCIAL')} className={`flex-1 py-2 text-sm rounded-md font-bold transition-colors ${reportType === 'FINANCIAL' ? (isManagerMode ? 'bg-indigo-600 shadow text-white' : 'bg-white shadow text-emerald-600') : (isManagerMode ? 'text-gray-300' : 'text-gray-600')}`}>Financeiro</button>}
                            <button onClick={() => setReportType('ATTENDANCE')} className={`flex-1 py-2 text-sm rounded-md font-bold transition-colors ${reportType === 'ATTENDANCE' ? (isManagerMode ? 'bg-indigo-600 shadow text-white' : 'bg-white shadow text-emerald-600') : (isManagerMode ? 'text-gray-300' : 'text-gray-600')}`}>Absenteísmo</button>
                            <button onClick={() => setReportType('INDIVIDUAL')} className={`flex-1 py-2 text-sm rounded-md font-bold transition-colors ${reportType === 'INDIVIDUAL' ? (isManagerMode ? 'bg-indigo-600 shadow text-white' : 'bg-white shadow text-emerald-600') : (isManagerMode ? 'text-gray-300' : 'text-gray-600')}`}>Individual</button>
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
                <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-xl shadow-sm border`}>
                    {/* Report Header */}
                    <div className="flex justify-between items-start mb-6 pb-4 border-b border-dashed border-gray-300 print:hidden">
                        <div>
                            <h2 className={`text-xl font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>Resultado do Relatório</h2>
                            <p className={`text-sm ${isManagerMode ? 'text-gray-300' : 'text-gray-600'}`}>Período de {new Date(startDate + 'T00:00:00').toLocaleDateString()} a {new Date(endDate + 'T23:59:59').toLocaleDateString()}</p>
                        </div>
                        <button onClick={handleDownloadPDF} disabled={generatingPdf} className={`text-sm flex items-center gap-2 font-bold px-4 py-2 rounded-md transition-colors ${isManagerMode ? 'text-red-300 bg-red-900 hover:bg-red-800' : 'text-red-600 bg-red-100 hover:bg-red-200'}`}>
                            {generatingPdf ? 'Gerando...' : 'Exportar PDF'}
                        </button>
                    </div>

                    <div ref={reportContentRef} className="print-area">
                        {/* --- OPERATIONAL REPORT --- */}
                        {reportType === 'OPERATIONAL' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-emerald-50 border-emerald-100'} p-4 rounded-lg border`}>
                                        <p className={`text-xs font-bold uppercase ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Total de Agendamentos no Período</p>
                                        <p className={`text-3xl font-bold mt-1 ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>{reportData.length}</p>
                                    </div>
                                    {!isProfessional && (
                                        <div className={`${isManagerMode ? 'bg-gray-700' : 'bg-white'} p-4 rounded-lg flex items-center justify-between`}>
                                            <p className={`text-sm font-bold ${isManagerMode ? 'text-gray-200' : 'text-emerald-800'}`}>Análise com IA (Gemini)</p>
                                            <button onClick={handleOperationalAI} disabled={analyzing} className={`text-xs px-3 py-1.5 rounded-lg shadow-sm font-bold flex items-center gap-1 ${analyzing ? 'bg-gray-400' : (isManagerMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700')}`}>
                                                {analyzing ? 'Analisando...' : <>✨ Gerar Insights</>}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {aiAnalysis && (
                                    <div className="bg-white text-black p-5 rounded-xl border border-gray-300">
                                        <h4 className="font-bold mb-2 text-gray-900">Análise Clínica (IA)</h4>
                                        <p className="text-sm mb-4 italic text-gray-800">"{aiAnalysis.clinicalAnalysis}"</p>
                                        <h4 className="font-bold mb-2 text-gray-900">Sugestões Estratégicas (IA)</h4>
                                        <ul className="text-sm list-disc list-inside space-y-1 text-gray-800">
                                            {aiAnalysis.strategicSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </div>
                                )}

                                {/* Column Selector */}
                                {!isProfessional && (
                                    <div>
                                        <label className={`block text-xs font-bold uppercase mb-2 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Colunas Visíveis</label>
                                        <div className="flex flex-wrap gap-2">
                                            {availableColumns.map(col => (
                                                <button key={col.id} onClick={() => toggleColumn(col.id)} className={`px-2 py-1 text-xs rounded border ${selectedColumns.includes(col.id) ? (isManagerMode ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-emerald-600 text-white border-emerald-700') : (isManagerMode ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-white text-gray-600 border-gray-300')}`}>
                                                    {col.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="overflow-x-auto">
                                    <table className={`min-w-full divide-y ${isManagerMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                        <thead className={`${isManagerMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                            <tr>
                                                {selectedColumns.map(colId => (
                                                    <th key={colId} className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${isManagerMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                                        {availableColumns.find(c => c.id === colId)?.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className={`${isManagerMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                                            {reportData.map(row => (
                                                <tr key={row.id}>
                                                    {selectedColumns.map(colId => (
                                                        <td key={colId} className={`px-4 py-3 whitespace-nowrap text-sm ${isManagerMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                                            {colId === 'date' ? new Date(row[colId]).toLocaleString() : row[colId]}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* --- FINANCIAL REPORT --- */}
                        {reportType === 'FINANCIAL' && !isProfessional && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-emerald-50 border-emerald-100'} p-4 rounded-lg border`}><p className={`text-xs font-bold uppercase ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Receita Bruta</p><p className={`text-2xl font-bold mt-1 ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>R$ {financialData.reduce((a, b) => a + (b.originalAmount || b.amount), 0).toFixed(2)}</p></div>
                                    <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-emerald-50 border-emerald-100'} p-4 rounded-lg border`}><p className={`text-xs font-bold uppercase ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Descontos</p><p className={`text-2xl font-bold mt-1 ${isManagerMode ? 'text-orange-400' : 'text-orange-600'}`}>- R$ {financialData.reduce((a, b) => a + ((b.originalAmount || b.amount) * (b.discountPercent || 0) / 100), 0).toFixed(2)}</p></div>
                                    <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-emerald-50 border-emerald-100'} p-4 rounded-lg border`}><p className={`text-xs font-bold uppercase ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Receita Líquida</p><p className={`text-2xl font-bold mt-1 ${isManagerMode ? 'text-green-400' : 'text-green-600'}`}>R$ {financialData.reduce((a, b) => a + b.amount, 0).toFixed(2)}</p></div>
                                    <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-emerald-50 border-emerald-100'} p-4 rounded-lg border`}><p className={`text-xs font-bold uppercase ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Pendentes</p><p className={`text-2xl font-bold mt-1 ${isManagerMode ? 'text-red-400' : 'text-red-600'}`}>R$ {financialData.filter(d => d.status === 'PENDENTE').reduce((a, b) => a + b.amount, 0).toFixed(2)}</p></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 space-y-4">
                                        <div className={`${isManagerMode ? 'bg-gray-700' : 'bg-white'} p-4 rounded-lg flex items-center justify-between`}>
                                            <p className={`text-sm font-bold ${isManagerMode ? 'text-gray-200' : 'text-emerald-800'}`}>Análise Financeira (IA)</p>
                                            <button onClick={handleFinancialAI} disabled={analyzing} className={`text-xs px-3 py-1.5 rounded-lg shadow-sm font-bold flex items-center gap-1 ${analyzing ? 'bg-gray-400' : (isManagerMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700')}`}>
                                                {analyzing ? 'Analisando...' : <>💡 Gerar Análise</>}
                                            </button>
                                        </div>
                                        {finAnalysis && (
                                            <div className="bg-white text-black p-5 rounded-xl border border-gray-300">
                                                <h4 className="font-bold mb-2 text-gray-900">Saúde Financeira (IA)</h4>
                                                <p className="text-sm mb-4 italic text-gray-800">"{finAnalysis.financialHealth}"</p>
                                                <h4 className="font-bold mb-2 text-gray-900">Ação Sugerida (IA)</h4>
                                                <p className="text-sm font-medium text-gray-800">{finAnalysis.revenueAction}</p>
                                            </div>
                                        )}
                                        <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'} p-4 rounded-lg border`}>
                                            <h4 className={`text-sm font-bold mb-2 ${isManagerMode ? 'text-gray-200' : 'text-emerald-800'}`}>Receita por Dia</h4>
                                            <SimpleBarChart data={financialData} />
                                        </div>
                                    </div>
                                    <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'} p-4 rounded-lg border`}>
                                        <h4 className={`text-sm font-bold mb-2 ${isManagerMode ? 'text-gray-200' : 'text-emerald-800'}`}>Distribuição por Método</h4>
                                        <MethodDistributionChart data={financialData} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- ATTENDANCE REPORT --- */}
                        {reportType === 'ATTENDANCE' && attendanceData && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'} p-4 rounded-lg border`}>
                                        <p className={`text-xs font-bold uppercase ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Amostra (N)</p>
                                        <p className={`text-2xl font-bold mt-1 ${isManagerMode ? 'text-white' : 'text-gray-900'}`}>{attendanceData.stats.total}</p>
                                    </div>
                                    <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'} p-4 rounded-lg border`}>
                                        <p className={`text-xs font-bold uppercase ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Taxa de Faltas</p>
                                        <p className={`text-2xl font-bold mt-1 ${isManagerMode ? 'text-red-400' : 'text-red-600'}`}>{attendanceData.stats.noShowRate}%</p>
                                        <VariationIndicator value={attendanceData.stats.variation} />
                                    </div>
                                    <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'} p-4 rounded-lg border`}>
                                        <p className={`text-xs font-bold uppercase ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Impacto Estimado</p>
                                        <p className={`text-2xl font-bold mt-1 ${isManagerMode ? 'text-orange-400' : 'text-orange-600'}`}>R$ {attendanceData.financial.estimatedImpact.toFixed(2)}</p>
                                    </div>
                                    <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'} p-4 rounded-lg border`}>
                                        <p className={`text-xs font-bold uppercase ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Pacientes em Risco</p>
                                        <p className={`text-2xl font-bold mt-1 ${isManagerMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{attendanceData.risk.patientsAtRisk.length}</p>
                                    </div>
                                </div>

                                <div className={`${isManagerMode ? 'bg-gray-700' : 'bg-white'} p-4 rounded-lg flex items-center justify-between`}>
                                    <p className={`text-sm font-bold ${isManagerMode ? 'text-gray-200' : 'text-emerald-800'}`}>Análise de Absenteísmo (IA)</p>
                                    <button onClick={handleAttendanceAI} disabled={analyzing} className={`text-xs px-3 py-1.5 rounded-lg shadow-sm font-bold flex items-center gap-1 ${analyzing ? 'bg-gray-400' : (isManagerMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700')}`}>
                                        {analyzing ? 'Analisando...' : <>💡 Sumarizar</>}
                                    </button>
                                </div>
                                {attendanceAiAnalysis && (
                                    <div className="bg-white text-black p-5 rounded-xl border border-gray-300">
                                        <h4 className="font-bold mb-2 text-gray-900">Insight Operacional (IA)</h4>
                                        <p className="text-sm mb-4 italic text-gray-800">"{attendanceAiAnalysis.insight}"</p>
                                        <h4 className="font-bold mb-2 text-gray-900">Ação Sugerida (IA)</h4>
                                        <p className="text-sm font-medium text-gray-800">{attendanceAiAnalysis.action}</p>
                                    </div>
                                )}
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
        <div className={`w-full rounded-2xl p-6 ${isManagerMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-emerald-50 shadow-sm'}`} style={{ height: isPdf ? '280px' : '360px' }}>
            <div className="flex flex-col items-center mb-6">
                <h4 className={`text-sm font-black uppercase tracking-[0.2em] ${isManagerMode ? 'text-indigo-400' : 'text-emerald-800'}`}>Dinâmica de Composição</h4>
                <p className={`text-[10px] font-bold ${isManagerMode ? 'text-gray-500' : 'text-slate-400'} uppercase mt-1`}>Evolução de Tecidos Adiposo vs. Magro</p>
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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isManagerMode ? '#374151' : '#f1f5f9'} />
                    <XAxis dataKey="dateFormatted" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isManagerMode ? '#9ca3af' : '#6b7280' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isManagerMode ? '#9ca3af' : '#6b7280' }} />
                    {!isPdf && <RechartsTooltip
                        contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: isManagerMode ? '#1f2937' : '#fff',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                        }}
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

    const chartData = data.filter(d => d.waistCircumference && d.circHip).map(d => ({
        ...d,
        dateFormatted: new Date(d.date).toLocaleDateString(undefined, { month: '2-digit', year: '2-digit' }),
        rcq: Number((d.waistCircumference / d.circHip).toFixed(2))
    }));

    if (chartData.length < 2) return null;

    return (
        <div className="w-full" style={{ height: isPdf ? '180px' : '200px' }}>
            <p className={`text-center text-xs font-bold uppercase mb-2 ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>Risco Metabólico (RCQ)</p>
            <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isManagerMode ? '#374151' : '#e5e7eb'} />
                    <XAxis dataKey="dateFormatted" tick={{ fontSize: 10, fill: isManagerMode ? '#9ca3af' : '#6b7280' }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: isManagerMode ? '#9ca3af' : '#6b7280' }} />
                    {!isPdf && <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />}

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
            <div className={`w-full rounded-2xl p-6 flex flex-col items-center justify-center border border-dashed ${isManagerMode ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-white border-emerald-100 text-slate-400'}`} style={{ height: isPdf ? '320px' : '400px' }}>
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
        <div className={`w-full rounded-2xl p-6 ${isManagerMode ? 'bg-gray-900 shadow-2xl border border-gray-800' : 'bg-white shadow-xl border border-emerald-50'}`} style={{ height: isPdf ? '320px' : '420px' }}>
            <div className="flex flex-col items-center mb-2">
                <h4 className={`text-sm font-black uppercase tracking-[0.2em] ${isManagerMode ? 'text-indigo-400' : 'text-emerald-800'}`}>Assinatura Antropométrica</h4>
                <p className={`text-[9px] font-bold ${isManagerMode ? 'text-gray-500' : 'text-slate-400'} uppercase mt-1`}>Evolução Proporcional vs. 1ª Avaliação (Base 100%)</p>
            </div>

            {/* Legenda única e clara */}
            <div className="flex justify-center gap-6 mb-2">
                <div className="flex items-center gap-1.5">
                    <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke={isManagerMode ? '#6b7280' : '#94a3b8'} strokeWidth="2" strokeDasharray="5 3" /></svg>
                    <span className={`text-[9px] font-bold uppercase ${isManagerMode ? 'text-gray-400' : 'text-slate-500'}`}>Marco Zero (1ª Avaliação)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-[9px] font-bold uppercase text-emerald-600">Variação Real (Atual)</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height="73%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={mapData}>
                    <PolarGrid stroke={isManagerMode ? '#374151' : '#e2e8f0'} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: isManagerMode ? '#9ca3af' : '#475569', fontSize: 10, fontWeight: 'bold' }} />
                    <PolarRadiusAxis domain={domainRange} tick={false} axisLine={false} />
                    {!isPdf && <RechartsTooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                const chg = d.change;
                                const pct = Number((d.B - 100).toFixed(1));
                                return (
                                    <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} p-3 rounded-xl shadow-2xl border text-xs`}>
                                        <p className="font-bold mb-1 uppercase tracking-wider border-b pb-1">{d.subject}</p>
                                        <div className="space-y-1 mt-2">
                                            <div className="flex justify-between gap-4"><span className={isManagerMode ? 'text-gray-400' : 'text-gray-500'}>1ª Avaliação:</span><strong>{d.orig_a} cm</strong></div>
                                            <div className="flex justify-between gap-4"><span className={isManagerMode ? 'text-gray-400' : 'text-gray-500'}>Avaliação Atual:</span><strong>{d.orig_b} cm</strong></div>
                                            <div className={`flex justify-between gap-4 font-bold border-t pt-1 mt-1 ${chg < 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                <span>Variação:</span>
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
                    <Radar name="Marco Zero" dataKey="A" stroke={isManagerMode ? '#6b7280' : '#94a3b8'} fill="transparent" fillOpacity={0} strokeWidth={1.5} strokeDasharray="5 3" />
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
            <p className={`text-center text-xs font-bold uppercase mb-4 ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>Progresso do Objetivo (%GC)</p>
            <ResponsiveContainer width="100%" height="45%">
                <BarChart layout="vertical" data={data} margin={{ top: 0, right: 30, left: 20, bottom: 0 }} barGap="-100%">
                    <XAxis type="number" domain={[0, Math.max(currentBF, safeTarget, 30) + 5]} hide />
                    <YAxis dataKey="name" type="category" hide />

                    {/* Background track */}
                    <Bar dataKey="name" fill={isManagerMode ? '#1f2937' : '#f1f5f9'} radius={[10, 10, 10, 10]} barSize={24} isAnimationActive={false} />

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
        <div className={`h-40 flex items-center justify-center text-sm ${isManagerMode ? 'text-gray-400 border-gray-700' : 'text-slate-400 border-emerald-100'} rounded border border-dashed`}>
            Sem variações detectadas entre as avaliações.
        </div>
    );

    const dynamicHeight = Math.max(280, data.length * 38 + 90);

    return (
        <div className={`w-full rounded-2xl p-6 ${isManagerMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-emerald-50 shadow-sm'}`} style={{ height: isPdf ? '300px' : `${dynamicHeight}px` }}>
            <div className="flex flex-col items-center mb-4">
                <h4 className={`text-sm font-black uppercase tracking-[0.2em] ${isManagerMode ? 'text-indigo-400' : 'text-emerald-800'}`}>Dinâmica de Perdas e Ganhos</h4>
                <p className={`text-[9px] font-bold ${isManagerMode ? 'text-gray-500' : 'text-slate-400'} uppercase mt-1 text-center`}>Variação Líquida de Todos os Perímetros (cm)</p>
            </div>
            <ResponsiveContainer width="100%" height="82%">
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 55, left: 5, bottom: 5 }} barSize={Math.min(16, Math.floor(220 / data.length))}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isManagerMode ? '#374151' : '#f1f5f9'} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: isManagerMode ? '#9ca3af' : '#64748b' }} unit=" cm" domain={['auto', 'auto']} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: isManagerMode ? '#9ca3af' : '#475569', fontWeight: 'bold' }} axisLine={false} tickLine={false} width={82} />
                    {!isPdf && <RechartsTooltip
                        cursor={{ fill: isManagerMode ? '#1f2937' : '#f8fafc' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-2 rounded-lg shadow-xl border text-[10px]`}>
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
        <div className={`w-full rounded-2xl p-6 ${isManagerMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-emerald-50 shadow-sm'}`} style={{ height: isPdf ? '280px' : `${dynamicH}px` }}>
            <div className="flex flex-col items-center mb-2">
                <h4 className={`text-sm font-black uppercase tracking-[0.2em] ${isManagerMode ? 'text-indigo-400' : 'text-emerald-800'}`}>Dinâmica de Gordura Localizada</h4>
                <p className={`text-[9px] font-bold ${isManagerMode ? 'text-gray-500' : 'text-slate-400'} uppercase mt-1 text-center`}>Variação de Dobras Cutâneas (mm)</p>
                {activeProtocol && (
                    <span className={`text-[8px] font-bold mt-1 px-2 py-0.5 rounded-full ${isManagerMode ? 'bg-indigo-900 text-indigo-300' : 'bg-emerald-50 text-emerald-700'}`}>
                        Protocolo: {PROTOCOL_NAMES[activeProtocol] || activeProtocol}
                    </span>
                )}
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
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isManagerMode ? '#374151' : '#f1f5f9'} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: isManagerMode ? '#9ca3af' : '#64748b' }} unit=" mm" domain={['auto', 'auto']} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: isManagerMode ? '#9ca3af' : '#475569', fontWeight: 'bold' }} axisLine={false} tickLine={false} width={68} />
                    {!isPdf && <RechartsTooltip
                        cursor={{ fill: isManagerMode ? '#1f2937' : '#f8fafc' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-2 rounded-lg shadow-xl border text-[10px]`}>
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

            {/* 1. Header & ID */}
            <div className={`flex items-center gap-6 p-6 rounded-xl ${isManagerMode ? 'bg-gray-700' : 'bg-emerald-50'} border border-emerald-100`}>
                <div className={`h-20 w-20 rounded-full flex items-center justify-center text-4xl font-bold border-4 ${isManagerMode ? 'bg-gray-800 text-gray-300 border-gray-600' : 'bg-white text-emerald-600 border-emerald-200'}`}>
                    {patient.name.charAt(0)}
                </div>
                <div className="flex-1">
                    <h3 className={`text-2xl font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>{patient.name}</h3>
                    <p className={`text-sm ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>{patient.gender}, {new Date().getFullYear() - new Date(patient.birthDate).getFullYear()} anos</p>
                    <div className="flex gap-4 mt-2 text-xs opacity-80">
                        <span>📧 {patient.email}</span>
                        <span>📞 {patient.phone}</span>
                        {patient.financial?.insuranceName && <span className="font-bold">🏥 {patient.financial.insuranceName}</span>}
                    </div>
                </div>
            </div>

            {/* 2. KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'} p-4 rounded-lg border text-center`}><p className={`text-xs font-bold uppercase ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>Paciente Desde</p><p className={`text-lg font-bold mt-1 ${isManagerMode ? 'text-white' : 'text-gray-900'}`}>{metrics.patientSince}</p></div>
                <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'} p-4 rounded-lg border text-center`}><p className={`text-xs font-bold uppercase ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>Total de Consultas</p><p className={`text-lg font-bold mt-1 ${isManagerMode ? 'text-white' : 'text-gray-900'}`}>{metrics.totalAppointments}</p></div>
                <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'} p-4 rounded-lg border text-center`}><p className={`text-xs font-bold uppercase ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>Frequência</p><p className={`text-lg font-bold mt-1 ${metrics.attendanceRate < 80 ? (isManagerMode ? 'text-red-400' : 'text-red-600') : (isManagerMode ? 'text-green-400' : 'text-green-600')}`}>{metrics.attendanceRate}%</p></div>
                <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'} p-4 rounded-lg border text-center`}><p className={`text-xs font-bold uppercase ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>Próxima Consulta</p><p className={`text-lg font-bold mt-1 ${isManagerMode ? 'text-white' : 'text-gray-900'}`}>{metrics.nextAppointmentDate ? new Date(metrics.nextAppointmentDate).toLocaleDateString() : 'N/A'}</p></div>
            </div>

            {/* 3. AI Analysis Section */}
            {!isPdf && (
                <div className={`${isManagerMode ? 'bg-gray-700' : 'bg-white'} p-4 rounded-lg flex items-center justify-between print:hidden border border-emerald-100`}>
                    <p className={`text-sm font-bold ${isManagerMode ? 'text-gray-200' : 'text-emerald-800'}`}>Análise Clínica Completa (IA)</p>
                    <button onClick={onAnalyze} disabled={analyzing} className={`text-xs px-3 py-1.5 rounded-lg shadow-sm font-bold flex items-center gap-1 ${analyzing ? 'bg-gray-400' : (isManagerMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700')}`}>
                        {analyzing ? 'Analisando...' : <>🔬 Gerar Resumo</>}
                    </button>
                </div>
            )}
            {aiSummary && (
                <div className="bg-white text-black border-gray-300 p-5 rounded-xl border prose prose-sm max-w-none shadow-sm">
                    <div className="whitespace-pre-line leading-relaxed">{aiSummary}</div>
                </div>
            )}

            {/* 4. Anthropometric Evolution */}
            <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow rounded-lg p-6 border space-y-8`}>
                <h3 className={`text-sm font-bold uppercase tracking-wide mb-4 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Painel de Evolução Corporal</h3>

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
                            <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-emerald-100'} p-6 rounded-xl border`}>
                                <GoalThermometer
                                    currentBF={anthropometry.history[anthropometry.history.length - 1]?.bodyFatPercentage ?? 0}
                                    targetBF={0}
                                    isManagerMode={isManagerMode}
                                    isPdf={isPdf}
                                />
                                {!isPdf && <p className="text-[10px] text-center mt-4 text-gray-500 select-none">O paciente visualiza de forma orgânica o quão próximo está da consolidação do objetivo final de repaginação corporal.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Last Record Table */}
                {anthropometry.current && (
                    <div className="mt-6 pt-4 border-t border-dashed border-gray-300">
                        <h4 className="text-xs font-bold uppercase mb-3">Última Avaliação ({new Date(anthropometry.current.anthro.date).toLocaleDateString()})</h4>
                        <div className="grid grid-cols-3 gap-4 text-xs">
                            <div className="p-2 bg-gray-50 rounded">
                                <strong>Circunferências (cm):</strong>
                                <ul className="mt-1 space-y-1">
                                    <li>Cintura: {anthropometry.current.anthro.circumferencesCm.waist || '-'}</li>
                                    <li>Abdômen: {anthropometry.current.anthro.circumferencesCm.abdomen || '-'}</li>
                                    <li>Quadril: {anthropometry.current.anthro.circumferencesCm.hip || '-'}</li>
                                </ul>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                                <strong>Dobras (mm):</strong>
                                <ul className="mt-1 space-y-1">
                                    <li>Tríceps: {anthropometry.current.anthro.skinfoldsMm.triceps || '-'}</li>
                                    <li>Abdominal: {anthropometry.current.anthro.skinfoldsMm.abdominal || '-'}</li>
                                    <li>Supra-ilíaca: {anthropometry.current.anthro.skinfoldsMm.suprailiac || '-'}</li>
                                </ul>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                                <strong>Composição:</strong>
                                <ul className="mt-1 space-y-1">
                                    <li>% Gordura: {anthropometry.current.anthro.bodyComp.bodyFatPct || '-'}%</li>
                                    <li>Massa Magra: {anthropometry.current.anthro.bodyComp.leanMassKg || '-'}kg</li>
                                    <li>RCQ: {anthropometry.current.anthro.bodyComp.whr || '-'}</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 5. Clinical History & Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow rounded-lg p-6 border`}>
                    <h3 className={`text-sm font-bold uppercase tracking-wide mb-4 ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Contexto Clínico</h3>
                    <div className="space-y-4 text-sm">
                        <div>
                            <span className="block font-bold text-xs text-gray-500 uppercase">Diagnósticos Ativos</span>
                            <p className={`${isManagerMode ? 'text-white' : 'text-gray-900'}`}>{clinical.activeDiagnoses.length > 0 ? clinical.activeDiagnoses.join(', ') : 'Nenhum registrado.'}</p>
                        </div>
                        <div>
                            <span className="block font-bold text-xs text-gray-500 uppercase">Medicamentos</span>
                            <p className={`${isManagerMode ? 'text-white' : 'text-gray-900'}`}>{clinical.medications.length > 0 ? clinical.medications.join(', ') : 'Nenhum registrado.'}</p>
                        </div>
                        <div>
                            <span className="block font-bold text-xs text-gray-500 uppercase">Resumo da Anamnese</span>
                            <p className={`italic ${isManagerMode ? 'text-gray-400' : 'text-gray-600'}`}>{clinical.anamnesisSummary || 'Não preenchida.'}</p>
                        </div>
                    </div>
                </div>

                <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow rounded-lg p-6 border`}>
                    <h3 className={`text-sm font-bold uppercase tracking-wide mb-4 ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Planejamento Nutricional</h3>
                    {nutritional.activePlanTitle ? (
                        <div className="space-y-4">
                            <div className="p-3 bg-green-50 rounded border border-green-100">
                                <span className="block text-xs text-green-800 font-bold mb-1">Plano Ativo</span>
                                <p className="text-green-900 font-medium">{nutritional.activePlanTitle}</p>
                            </div>
                            {nutritional.targets && (
                                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                    <div className="p-2 bg-gray-100 rounded"><div>Kcal</div><strong>{nutritional.targets.kcal}</strong></div>
                                    <div className="p-2 bg-gray-100 rounded"><div>Prot</div><strong>{nutritional.targets.protein}g</strong></div>
                                    <div className="p-2 bg-gray-100 rounded"><div>Carb</div><strong>{nutritional.targets.carbs}g</strong></div>
                                    <div className="p-2 bg-gray-100 rounded"><div>Gord</div><strong>{nutritional.targets.fat}g</strong></div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm italic text-gray-500">Nenhum plano ativo.</p>
                    )}
                </div>
            </div>

            {/* 6. Perfil Psicocomportamental MIPAN-20 */}
            {data.mipanAssessments && data.mipanAssessments.length > 0 && (
                <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow rounded-lg p-6 border`}>
                    <h3 className={`text-sm font-bold uppercase tracking-wide mb-6 ${isManagerMode ? 'text-gray-300' : 'text-indigo-800'}`}>Perfil Psicocomportamental MIPAN-20</h3>

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

            {/* 7. Timeline History */}
            <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow rounded-lg p-6 border`}>
                <h3 className={`text-sm font-bold uppercase tracking-wide mb-4 ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Histórico de Eventos</h3>
                <div className="space-y-4 border-l-2 border-gray-200 ml-2 pl-4">
                    {timeline.length === 0 ? <p className="text-sm text-gray-500 italic">Sem histórico registrado.</p> : timeline.map(event => (
                        <div key={event.id} className="relative">
                            <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-400 ring-4 ring-white"></div>
                            <p className={`text-xs font-bold ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>{new Date(event.createdAt).toLocaleDateString()} {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <p className={`text-sm font-medium ${isManagerMode ? 'text-white' : 'text-gray-900'}`}>{event.summary}</p>
                            <p className={`text-[10px] ${isManagerMode ? 'text-gray-500' : 'text-gray-400'}`}>{event.type.replace('_', ' ')} • {event.createdBy ? event.createdBy.name : 'Sistema'}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
};


export { Reports };
