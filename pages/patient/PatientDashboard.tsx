
import React, { useState, useRef, useEffect } from 'react';
import { Patient, Clinic, Prescription, ExamRequest } from '../../types';
import { Icons } from '../../constants';
import { db } from '../../services/db';
import { IndividualPatientReportView } from '../../components/IndividualReportView';
import { IndividualReportSnapshot } from '../../types';
import { PwaInstallBanner } from '../../components/patient/PwaInstallBanner';

interface PatientDashboardProps {
    patient: Patient;
    clinic: Clinic;
    onLogout: () => void;
}

type Tab = 'home' | 'plan' | 'progress' | 'prescricao' | 'exames' | 'profile';

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ patient, clinic, onLogout }) => {
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
    const [waterIntake, setWaterIntake] = useState(0);
    const [mealsCompleted, setMealsCompleted] = useState<string[]>([]);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [prescricoes, setPrescricoes] = useState<Prescription[]>([]);
    const [pedidosExame, setPedidosExame] = useState<ExamRequest[]>([]);
    const planExportRef = useRef<HTMLDivElement>(null);
    const prescricaoRef = useRef<HTMLDivElement>(null);
    const pedidoRef = useRef<HTMLDivElement>(null);


    // Report State
    const [individualReportData, setIndividualReportData] = useState<IndividualReportSnapshot | null>(null);
    const [isLoadingReport, setIsLoadingReport] = useState(false);


    useEffect(() => {
        db.getPrescriptions(patient.id).then(setPrescricoes);
        db.getExamRequests(patient.id).then(setPedidosExame);
    }, [patient.id]);

    useEffect(() => {
        if (activeTab === 'progress' && !individualReportData) {
            setIsLoadingReport(true);
            // We use the patient's own ID and their assigned professional ID to satisfy DB security locks
            db.buildIndividualReportDataset(patient.id, patient.professionalId)
                .then(setIndividualReportData)
                .finally(() => setIsLoadingReport(false));
        }
    }, [activeTab, patient.id, patient.professionalId, individualReportData]);

    // Registro mais recente do histórico (mesma fonte da aba Antropometria)
    const lastAnthro = patient.anthropometryHistory && patient.anthropometryHistory.length > 0
        ? [...patient.anthropometryHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        : null;

    const displayBodyFat: string = (() => {
        const val = lastAnthro?.bodyFatPercentage ?? patient.anthropometry?.bodyFatPercentage;
        return (val !== undefined && val !== null && val > 0) ? `${val}%` : '--';
    })();

    const activePlan = patient.nutritionalPlans
        ? patient.nutritionalPlans.find(p => p.status === 'ATIVO') || patient.nutritionalPlans[patient.nutritionalPlans.length - 1]
        : patient.nutritionalPlan || null;

    // Prescrições finalizadas (não rascunho)
    const prescricoesFinalizadas = prescricoes.filter(p => p.status === 'FINALIZADA');

    function calculateAge(birthDate: string) {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    }

    const generatePdf = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
        if (!ref.current || isGeneratingPdf) return;
        setIsGeneratingPdf(true);
        try {
            const html2pdf = (window as any).html2pdf;
            if (!html2pdf) { alert('Erro ao carregar gerador de PDF.'); return; }
            await html2pdf().set({
                margin: 10, filename,
                image: { type: 'jpeg', quality: 0.97 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from(ref.current).save();
        } catch (e) { alert('Erro ao gerar PDF.'); }
        finally { setIsGeneratingPdf(false); }
    };

    // ── TABS ─────────────────────────────────────────────────────────

    const renderHome = () => (
        <div className="space-y-6 animate-fadeIn pb-4">
            <PwaInstallBanner />

            <div className="mx-6 rounded-[32px] p-6 bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400 rounded-full -mr-24 -mt-24 opacity-20 blur-3xl pointer-events-none" />
                <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Área do Paciente</p>
                <h1 className="text-2xl font-black tracking-tight">{patient.name.split(' ')[0]} 👋</h1>
                <p className="text-emerald-100 text-sm mt-1 opacity-80">{clinic.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3"><Icons.TrendingUp className="w-4 h-4" /></div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Peso Atual</p>
                    <p className="text-xl font-black text-slate-800">{lastAnthro?.weight ?? patient.anthropometry?.weight ?? '--'} <span className="text-xs font-medium text-slate-500">kg</span></p>
                </div>
                <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-3"><Icons.Activity className="w-4 h-4" /></div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">% Gordura</p>
                    <p className="text-xl font-black text-slate-800">{displayBodyFat}</p>
                </div>
            </div>

            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black text-slate-800">Acesso Rápido</h2>
                </div>
                <div className="space-y-3">
                    <button onClick={() => setIsCheckInModalOpen(true)} className="w-full bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-all text-left group">
                        <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"><Icons.CheckCircle className="w-5 h-5" /></div>
                        <div className="min-w-0"><p className="font-bold text-slate-800">Registrar Check-in</p><p className="text-xs text-slate-500">Aderência do dia</p></div>
                        <Icons.ChevronRight className="w-5 h-5 ml-auto text-slate-400" />
                    </button>
                    <button onClick={() => setActiveTab('plan')} className="w-full bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-all text-left group">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"><Icons.Utensils className="w-5 h-5" /></div>
                        <div className="min-w-0"><p className="font-bold text-slate-800">Plano Alimentar</p><p className="text-xs text-slate-500">{activePlan ? activePlan.strategyName || 'Ver dieta' : 'Nenhum ativo'}</p></div>
                        <Icons.ChevronRight className="w-5 h-5 ml-auto text-slate-400" />
                    </button>
                    {prescricoesFinalizadas.length > 0 && (
                        <button onClick={() => setActiveTab('prescricao')} className="w-full bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-all text-left group">
                            <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"><Icons.FileText className="w-5 h-5" /></div>
                            <div className="min-w-0"><p className="font-bold text-slate-800">Prescrições</p><p className="text-xs text-slate-500">{prescricoesFinalizadas.length} prescrição(ões)</p></div>
                            <Icons.ChevronRight className="w-5 h-5 ml-auto text-slate-400" />
                        </button>
                    )}
                    {pedidosExame.length > 0 && (
                        <button onClick={() => setActiveTab('exames')} className="w-full bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-all text-left group">
                            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"><Icons.Beaker className="w-5 h-5" /></div>
                            <div className="min-w-0"><p className="font-bold text-slate-800">Pedido de Exames</p><p className="text-xs text-slate-500">{pedidosExame.length} solicitação(ões)</p></div>
                            <Icons.ChevronRight className="w-5 h-5 ml-auto text-slate-400" />
                        </button>
                    )}
                    <button onClick={() => setActiveTab('progress')} className="w-full bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-all text-left group">
                        <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"><Icons.TrendingUp className="w-5 h-5" /></div>
                        <div className="min-w-0"><p className="font-bold text-slate-800">Minha Evolução</p><p className="text-xs text-slate-500">Peso, IMC e Medidas</p></div>
                        <Icons.ChevronRight className="w-5 h-5 ml-auto text-slate-400" />
                    </button>
                </div>
            </section>
        </div>
    );

    const renderPlan = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Plano Alimentar</h1>
                {activePlan && (
                    <button onClick={() => generatePdf(planExportRef, `Plano_${patient.name.split(' ')[0]}.pdf`)} disabled={isGeneratingPdf}
                        className="p-3 bg-white text-emerald-600 rounded-2xl shadow-sm border border-slate-100 hover:bg-emerald-50 transition-all flex items-center gap-2 disabled:opacity-50">
                        <Icons.Download className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase">{isGeneratingPdf ? 'Gerando...' : 'PDF'}</span>
                    </button>
                )}
            </div>
            {activePlan ? (
                <>
                    <div className="space-y-4">
                        {activePlan.meals.map((meal, idx) => (
                            <div key={idx} className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-5 flex items-center gap-4 border-b border-slate-50">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-xs flex-shrink-0">{meal.time || '--'}</div>
                                    <div><h3 className="font-black text-slate-800">{meal.name}</h3><p className="text-[10px] font-bold text-slate-400 uppercase">{meal.items.length} itens</p></div>
                                </div>
                                <div className="p-5 space-y-3">
                                    {meal.items.map((item, iIdx) => (
                                        <div key={iIdx} className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-700">{item.name}</p>
                                                <p className="text-xs text-slate-500">{item.quantity}{item.unit} • {item.calculatedCalories ?? '--'} kcal</p>
                                                {item.substitutes && item.substitutes.length > 0 && (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {item.substitutes.map((s, si) => <span key={si} className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-md font-bold">Ou: {s.name}</span>)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="hidden">
                        <div ref={planExportRef} className="p-10 font-sans text-slate-800 bg-white">
                            <div className="border-b-2 border-emerald-600 pb-6 mb-8 flex justify-between items-end">
                                <div><h1 className="text-3xl font-black text-emerald-800 uppercase">Plano Alimentar</h1><p className="text-sm text-slate-500">{patient.name}</p></div>
                                <div className="text-right"><h2 className="text-xl font-bold text-emerald-600">{clinic.name}</h2><p className="text-xs text-slate-400">Gerado em {new Date().toLocaleDateString('pt-BR')}</p></div>
                            </div>
                            {activePlan.meals.map((meal, idx) => (
                                <div key={idx} className="mb-8 break-inside-avoid">
                                    <div className="flex items-center gap-3 mb-3"><span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-black">{meal.time || '--'}</span><h3 className="text-xl font-black text-slate-800 uppercase">{meal.name}</h3></div>
                                    <div className="ml-4 space-y-2">
                                        {meal.items.map((item, iIdx) => (
                                            <div key={iIdx} className="border-l-2 border-slate-200 pl-4">
                                                <p className="font-bold">{item.name} — {item.quantity}{item.unit}</p>
                                                {item.substitutes && item.substitutes.length > 0 && <p className="text-xs text-slate-400 italic">Substituições: {item.substitutes.map(s => s.name).join(', ')}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="mt-16 pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
                                <p className="font-black uppercase tracking-widest">ControlClin — Portal do Paciente</p>
                                <p>Documento de uso exclusivo de {patient.name}</p>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300"><Icons.Utensils className="w-10 h-10" /></div>
                    <p className="text-slate-500 font-bold">Nenhum plano alimentar ativo.</p>
                </div>
            )}
        </div>
    );

    const renderProgress = () => (
        <div className="space-y-8 animate-fadeIn">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Evolução & Métricas</h1>
                    <p className="text-xs text-slate-500 font-medium">Relatório detalhado do seu progresso clínico</p>
                </div>
                {individualReportData && (
                    <button
                        onClick={() => generatePdf(null as any, `Relatorio-Evolucao-${patient.name.replace(/\s+/g, '-')}.pdf`)}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition-all active:scale-95"
                        title="Exportar PDF"
                    >
                        <Icons.Download className="w-5 h-5" />
                    </button>
                )}
            </header>

            {isLoadingReport && !individualReportData ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Compilando suas métricas...</p>
                </div>
            ) : individualReportData ? (
                <div className="pb-12">
                    <IndividualPatientReportView
                        data={individualReportData}
                        isManagerMode={false}
                        isPdf={false}
                    />
                </div>
            ) : (
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto">
                        <Icons.TrendingUp className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="font-black text-slate-800">Nenhum dado de evolução ainda.</p>
                        <p className="text-xs text-slate-400 mt-1">Seus dados aparecerão aqui após sua primeira avaliação física.</p>
                    </div>
                </div>
            )}
        </div>
    );

    // ── PRESCRIÇÃO ───────────────────────────────────────────────────
    const renderPrescricao = () => (
        <div className="space-y-6 animate-fadeIn">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Minhas Prescrições</h1>
            {prescricoesFinalizadas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300"><Icons.FileText className="w-10 h-10" /></div>
                    <p className="text-slate-500 font-bold">Nenhuma prescrição disponível.</p>
                </div>
            ) : (
                prescricoesFinalizadas.map((rx, rxIdx) => (
                    <div key={rx.id} className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
                        {/* Cabeçalho */}
                        <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                            <div>
                                <p className="font-black text-slate-800">{new Date(rx.date).toLocaleDateString('pt-BR')}</p>
                                <p className="text-xs text-slate-500">Dr(a). {rx.authorName}</p>
                            </div>
                            <button
                                onClick={() => generatePdf(prescricaoRef, `Prescricao_${patient.name.split(' ')[0]}_${rxIdx + 1}.pdf`)}
                                disabled={isGeneratingPdf}
                                className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-all flex items-center gap-1.5 text-xs font-black disabled:opacity-50"
                            >
                                <Icons.Download className="w-4 h-4" /> PDF
                            </button>
                        </div>
                        {/* Itens */}
                        <div className="p-5 space-y-3">
                            {rx.items.map((item, i) => (
                                <div key={i} className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100/80">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <p className="font-black text-slate-800">{item.name}</p>
                                        <span className="text-[9px] font-black bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full uppercase whitespace-nowrap">{item.type}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
                                        {item.dose && <p><span className="font-bold">Dose:</span> {item.dose}</p>}
                                        {item.form && <p><span className="font-bold">Forma:</span> {item.form}</p>}
                                        {item.frequency && <p><span className="font-bold">Frequência:</span> {item.frequency}</p>}
                                        {item.durationDays && <p><span className="font-bold">Duração:</span> {item.durationDays} dias</p>}
                                    </div>
                                    {item.instructions && <p className="text-xs text-slate-500 mt-2 italic border-t border-purple-100 pt-2">{item.instructions}</p>}
                                </div>
                            ))}
                            {rx.observations && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Observações</p>
                                    <p className="text-sm text-slate-700">{rx.observations}</p>
                                </div>
                            )}
                        </div>

                        {/* Template oculto para PDF */}
                        {rxIdx === 0 && (
                            <div className="hidden">
                                <div ref={prescricaoRef} className="p-10 font-sans text-slate-800 bg-white">
                                    <div className="border-b-2 border-purple-600 pb-6 mb-8 flex justify-between items-end">
                                        <div><h1 className="text-3xl font-black text-purple-800 uppercase">Prescrição</h1><p className="text-sm text-slate-500">{patient.name}</p></div>
                                        <div className="text-right"><h2 className="text-xl font-bold text-purple-600">{clinic.name}</h2><p className="text-xs text-slate-400">Data: {new Date(rx.date).toLocaleDateString('pt-BR')}</p><p className="text-xs text-slate-400">Profissional: {rx.authorName}</p></div>
                                    </div>
                                    {rx.items.map((item, i) => (
                                        <div key={i} className="mb-6 pb-6 border-b border-slate-100 last:border-0">
                                            <p className="font-black text-slate-900 text-lg">{i + 1}. {item.name}</p>
                                            <p className="text-sm text-slate-600 mt-1">{item.dose} — {item.form} — {item.frequency}{item.durationDays ? ` — ${item.durationDays} dias` : ''}</p>
                                            {item.instructions && <p className="text-sm text-slate-500 italic mt-1">{item.instructions}</p>}
                                        </div>
                                    ))}
                                    {rx.observations && <div className="mt-6 p-4 bg-slate-50 rounded-2xl"><p className="font-bold text-slate-700 mb-1">Observações:</p><p className="text-slate-600">{rx.observations}</p></div>}
                                    <div className="mt-20 pt-10 border-t text-center text-xs text-slate-400">
                                        <p className="font-black uppercase tracking-widest">ControlClin — Portal do Paciente</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );

    // ── PEDIDOS DE EXAME ─────────────────────────────────────────────
    const renderExames = () => (
        <div className="space-y-6 animate-fadeIn">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Pedidos de Exames</h1>
            {pedidosExame.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300"><Icons.Beaker className="w-10 h-10" /></div>
                    <p className="text-slate-500 font-bold">Nenhum pedido de exame.</p>
                </div>
            ) : (
                pedidosExame.map((pedido, pedIdx) => (
                    <div key={pedido.id} className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                            <div>
                                <p className="font-black text-slate-800">{new Date(pedido.date).toLocaleDateString('pt-BR')}</p>
                                <p className="text-xs text-slate-500">Dr(a). {pedido.authorName} — {pedido.authorRegistration}</p>
                            </div>
                            <button
                                onClick={() => generatePdf(pedidoRef, `Pedido_Exame_${patient.name.split(' ')[0]}_${pedIdx + 1}.pdf`)}
                                disabled={isGeneratingPdf}
                                className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-1.5 text-xs font-black disabled:opacity-50"
                            >
                                <Icons.Download className="w-4 h-4" /> PDF
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Exames Solicitados</p>
                                <div className="flex flex-wrap gap-2">
                                    {pedido.exams.map((ex, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-100">{ex}</span>
                                    ))}
                                </div>
                            </div>
                            {pedido.clinicalIndication && (
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Indicação Clínica</p>
                                    <p className="text-sm text-slate-700">{pedido.clinicalIndication}</p>
                                </div>
                            )}
                            {pedido.fastingRequired && (
                                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-2">
                                    <span className="text-amber-600 text-lg">⚠️</span>
                                    <p className="text-xs font-bold text-amber-700">Jejum de {pedido.fastingHours}h necessário</p>
                                </div>
                            )}
                            {pedido.complementaryInfo && (
                                <p className="text-xs text-slate-500 italic px-2">{pedido.complementaryInfo}</p>
                            )}
                        </div>

                        {/* Template oculto para PDF */}
                        {pedIdx === 0 && (
                            <div className="hidden">
                                <div ref={pedidoRef} className="p-10 font-sans text-slate-800 bg-white">
                                    <div className="border-b-2 border-blue-600 pb-6 mb-8 flex justify-between items-end">
                                        <div><h1 className="text-3xl font-black text-blue-800 uppercase">Pedido de Exames</h1><p className="text-sm text-slate-500">{patient.name}</p></div>
                                        <div className="text-right"><h2 className="text-xl font-bold text-blue-600">{clinic.name}</h2><p className="text-xs text-slate-400">Data: {new Date(pedido.date).toLocaleDateString('pt-BR')}</p><p className="text-xs text-slate-400">{pedido.authorName} — {pedido.authorRegistration}</p></div>
                                    </div>
                                    <div className="mb-8">
                                        <h3 className="font-black text-slate-700 mb-4 uppercase text-sm tracking-wide">Exames Solicitados</h3>
                                        <div className="space-y-2">
                                            {pedido.exams.map((ex, i) => <p key={i} className="text-slate-800">• {ex}</p>)}
                                        </div>
                                    </div>
                                    {pedido.clinicalIndication && <div className="mb-6 p-4 bg-slate-50 rounded-2xl"><p className="font-bold text-slate-700 mb-1">Indicação Clínica:</p><p>{pedido.clinicalIndication}</p></div>}
                                    {pedido.fastingRequired && <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-200"><p className="font-bold text-amber-700">⚠️ Jejum obrigatório: {pedido.fastingHours} horas</p></div>}
                                    {pedido.complementaryInfo && <div className="mb-6 p-4 bg-slate-50 rounded-2xl"><p className="font-bold text-slate-700 mb-1">Informações Complementares:</p><p className="italic">{pedido.complementaryInfo}</p></div>}
                                    <div className="mt-24 pt-10 border-t text-center text-xs text-slate-400">
                                        <p className="font-black uppercase tracking-widest">ControlClin — Portal do Paciente</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );

    const renderProfile = () => (
        <div className="space-y-6 animate-fadeIn">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Meu Perfil</h1>
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-emerald-100 border-4 border-emerald-50 text-emerald-600 flex items-center justify-center text-4xl font-black mb-4">{patient.name.charAt(0)}</div>
                <h2 className="text-xl font-black text-slate-800 text-center">{patient.name}</h2>
                <p className="text-sm text-slate-500 mb-5">{patient.email}</p>
                <div className="flex gap-2 flex-wrap justify-center">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase">{patient.gender}</span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase">{calculateAge(patient.birthDate)} anos</span>
                    {patient.estadoCivil && <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase">{patient.estadoCivil}</span>}
                </div>
            </div>
            <div className="bg-white rounded-[28px] border border-slate-100 overflow-hidden shadow-sm">
                <div className="p-5 flex items-center gap-3 border-b border-slate-50">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Icons.Home className="w-4 h-4" /></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Clínica</p><p className="text-sm font-black text-slate-700">{clinic.name}</p></div>
                </div>
                <button onClick={onLogout} className="w-full p-5 flex items-center gap-3 text-red-500 hover:bg-red-50 transition-all">
                    <div className="p-2 bg-red-100 text-red-600 rounded-xl"><Icons.Logout className="w-4 h-4" /></div>
                    <span className="text-sm font-black uppercase tracking-tighter">Sair da Conta</span>
                    <Icons.ChevronRight className="w-4 h-4 ml-auto" />
                </button>
            </div>
            <p className="text-center text-[10px] text-slate-300 font-bold uppercase tracking-[4px] pt-4">ControlClin v1.0.5</p>
        </div>
    );


    // ── NAV ──────────────────────────────────────────────────────────

    const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'home', label: 'Início', icon: <Icons.Home className="w-5 h-5" /> },
        { id: 'plan', label: 'Dieta', icon: <Icons.Utensils className="w-5 h-5" /> },
        { id: 'progress', label: 'Evolução', icon: <Icons.TrendingUp className="w-5 h-5" /> },
        { id: 'prescricao', label: 'Rx', icon: <Icons.FileText className="w-5 h-5" /> },
        { id: 'profile', label: 'Perfil', icon: <Icons.User className="w-5 h-5" /> },
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-36 overflow-x-hidden">
            <header className="bg-emerald-600 text-white pt-12 pb-8 px-6 rounded-b-[48px] shadow-2xl shadow-emerald-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full -mr-32 -mt-32 opacity-20 blur-3xl pointer-events-none" />
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Portal do Paciente</p>
                        <h1 className="text-3xl font-black tracking-tight">{patient.name.split(' ')[0]}</h1>
                    </div>
                    <button onClick={onLogout} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all" title="Sair">
                        <Icons.Logout className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="px-6 pt-6 max-w-lg mx-auto">
                {activeTab === 'home' && renderHome()}
                {activeTab === 'plan' && renderPlan()}
                {activeTab === 'progress' && renderProgress()}
                {activeTab === 'prescricao' && renderPrescricao()}
                {activeTab === 'exames' && renderExames()}
                {activeTab === 'profile' && renderProfile()}
            </main>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none">
                <nav className="bg-slate-900/92 backdrop-blur-2xl border border-white/10 px-4 py-3 flex justify-between items-center max-w-md mx-auto w-full rounded-[36px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] pointer-events-auto">
                    {NAV_ITEMS.map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id)}
                            className={`flex flex-col items-center gap-1 px-2 transition-all rounded-2xl py-1 ${activeTab === item.id ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                            {item.icon}
                            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Check-in Modal */}
            {isCheckInModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsCheckInModalOpen(false)} />
                    <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-14 relative animate-slideUp shadow-2xl">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                        <h2 className="text-2xl font-black text-slate-800 mb-6">Como foi seu dia?</h2>
                        <div className="space-y-6">
                            <section>
                                <p className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Refeições Realizadas</p>
                                <div className="space-y-3">
                                    {(activePlan?.meals || []).map((meal, idx) => {
                                        const mealId = `${activePlan?.id}-${idx}`;
                                        const done = mealsCompleted.includes(mealId);
                                        return (
                                            <button key={idx} onClick={() => setMealsCompleted(done ? mealsCompleted.filter(i => i !== mealId) : [...mealsCompleted, mealId])}
                                                className={`w-full p-4 rounded-[28px] border-2 transition-all flex items-center gap-3 ${done ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${done ? 'bg-white text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>{done ? '✓' : idx + 1}</div>
                                                <span className="font-black text-[11px] uppercase truncate">{meal.name}</span>
                                            </button>
                                        );
                                    })}
                                    {(!activePlan?.meals || activePlan.meals.length === 0) && <p className="text-slate-400 text-sm text-center py-4">Nenhuma refeição no plano ativo.</p>}
                                </div>
                            </section>
                            <section>
                                <div className="flex justify-between items-end mb-4">
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Consumo de Água</p>
                                    <p className="text-xl font-black text-blue-600">{waterIntake.toFixed(1)}<span className="text-xs ml-0.5">L</span></p>
                                </div>
                                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-[32px] border border-slate-100">
                                    <button onClick={() => setWaterIntake(Math.max(0, waterIntake - 0.25))} className="w-14 h-14 rounded-2xl bg-white shadow-sm text-slate-800 font-black text-2xl active:scale-90 transition-all">-</button>
                                    <div className="flex-1 px-2"><div className="h-4 bg-white rounded-full overflow-hidden shadow-inner p-1"><div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (waterIntake / 3) * 100)}%` }} /></div></div>
                                    <button onClick={() => setWaterIntake(waterIntake + 0.25)} className="w-14 h-14 rounded-2xl bg-white shadow-sm text-blue-600 font-black text-2xl active:scale-90 transition-all">+</button>
                                </div>
                            </section>
                            <button onClick={() => setIsCheckInModalOpen(false)} className="w-full py-5 bg-slate-900 text-white font-black rounded-[32px] shadow-2xl transition-all hover:bg-slate-800 active:scale-95 text-sm tracking-[0.2em]">FINALIZAR CHECK-IN</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
                @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
                .animate-slideUp { animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
            `}</style>
        </div>
    );
};
