
import React, { useState, useRef } from 'react';
import { Patient, Clinic } from '../../types';
import { Icons } from '../../constants';

interface PatientDashboardProps {
    patient: Patient;
    clinic: Clinic;
    onLogout: () => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ patient, clinic, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'home' | 'plan' | 'progress' | 'profile'>('home');
    const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
    const [waterIntake, setWaterIntake] = useState(0);
    const [mealsCompleted, setMealsCompleted] = useState<string[]>([]);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const planExportRef = useRef<HTMLDivElement>(null);

    const lastAnthro = patient.anthropometryHistory && patient.anthropometryHistory.length > 0
        ? [...patient.anthropometryHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        : null;

    const activePlan = patient.nutritionalPlans
        ? patient.nutritionalPlans.find(p => p.status === 'ATIVO') || patient.nutritionalPlans[patient.nutritionalPlans.length - 1]
        : patient.nutritionalPlan || null;

    function calculateAge(birthDate: string) {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    }

    const handleDownloadPlan = async () => {
        if (!planExportRef.current || isGeneratingPdf) return;
        setIsGeneratingPdf(true);
        try {
            const html2pdf = (window as any).html2pdf;
            if (!html2pdf) { alert('Erro ao carregar gerador de PDF.'); return; }
            const opt = {
                margin: 10,
                filename: `Plano_Alimentar_${patient.name.split(' ')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            await html2pdf().set(opt).from(planExportRef.current).save();
        } catch (e) {
            alert('Erro ao gerar PDF.');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // ── TABS ────────────────────────────────────────────────

    const renderHome = () => (
        <div className="space-y-8 animate-fadeIn">
            {/* Boas-vindas */}
            <div className={`rounded-[32px] p-6 bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400 rounded-full -mr-24 -mt-24 opacity-20 blur-3xl pointer-events-none" />
                <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Área do Paciente</p>
                <h1 className="text-2xl font-black tracking-tight">{patient.name.split(' ')[0]} 👋</h1>
                <p className="text-emerald-100 text-sm mt-1 opacity-80">{clinic.name}</p>
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                        <Icons.TrendingUp className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Peso Atual</p>
                    <p className="text-xl font-black text-slate-800">{lastAnthro?.weight ?? patient.anthropometry?.weight ?? '--'} <span className="text-xs font-medium text-slate-500">kg</span></p>
                </div>
                <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                        <Icons.Activity className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">IMC</p>
                    <p className="text-xl font-black text-slate-800">{lastAnthro?.bmi ?? patient.anthropometry?.bmi ?? '--'}</p>
                </div>
            </div>

            {/* Check-in rápido */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black text-slate-800">Seu Dia</h2>
                    <span className="text-[10px] font-black bg-orange-100 text-orange-700 px-2 py-1 rounded-full uppercase">Check-in</span>
                </div>
                <button
                    onClick={() => setIsCheckInModalOpen(true)}
                    className="w-full bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-all text-left group"
                >
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Icons.CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">Registrar Aderência</p>
                        <p className="text-xs text-slate-500 truncate">Como foram suas refeições hoje?</p>
                    </div>
                    <div className="ml-auto p-2 bg-slate-50 text-slate-400 rounded-xl group-hover:text-emerald-600">
                        <Icons.ChevronRight className="w-5 h-5" />
                    </div>
                </button>
            </section>

            {/* Plano Ativo */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black text-slate-800">Plano Ativo</h2>
                    <button onClick={() => setActiveTab('plan')} className="text-[10px] font-black text-emerald-600 uppercase hover:underline">Ver Tudo</button>
                </div>
                {activePlan ? (
                    <div className="bg-emerald-600 p-6 rounded-[32px] shadow-xl shadow-emerald-600/20 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <Icons.Utensils className="w-8 h-8 opacity-40 mb-3" />
                            <p className="font-black text-xl mb-1">{activePlan.strategyName || 'Estratégia Nutricional'}</p>
                            <p className="text-xs text-emerald-100 opacity-80 mb-5">{activePlan.title || 'Plano personalizado'}</p>
                            <button
                                onClick={() => setActiveTab('plan')}
                                className="bg-white text-emerald-600 text-xs font-black px-6 py-3 rounded-2xl shadow-lg border-none active:scale-95 transition-all"
                            >
                                ABRIR DIETA
                            </button>
                        </div>
                        <Icons.Utensils className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12" />
                    </div>
                ) : (
                    <div className="bg-slate-100 p-8 rounded-[32px] border-2 border-dashed border-slate-200 text-center">
                        <p className="text-slate-500 text-sm font-bold">Nenhum plano ativo.</p>
                        <p className="text-[10px] text-slate-400 uppercase mt-1">Fale com seu nutricionista</p>
                    </div>
                )}
            </section>
        </div>
    );

    const renderPlan = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Plano Alimentar</h1>
                {activePlan && (
                    <button
                        onClick={handleDownloadPlan}
                        disabled={isGeneratingPdf}
                        className="p-3 bg-white text-emerald-600 rounded-2xl shadow-sm border border-slate-100 hover:bg-emerald-50 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
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
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-xs uppercase flex-shrink-0">
                                        {meal.time || '--'}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800">{meal.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{meal.items.length} itens</p>
                                    </div>
                                </div>
                                <div className="p-5 space-y-3 bg-slate-50/30">
                                    {meal.items.map((item, iIdx) => (
                                        <div key={iIdx} className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-700">{item.name}</p>
                                                <p className="text-xs text-slate-500">{item.quantity}{item.unit} • {item.calculatedCalories ?? '--'} kcal</p>
                                                {item.substitutes && item.substitutes.length > 0 && (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {item.substitutes.map((s, si) => (
                                                            <span key={si} className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-md font-bold uppercase">Ou: {s.name}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Elemento oculto para export PDF */}
                    <div className="hidden">
                        <div ref={planExportRef} className="p-10 font-sans text-slate-800 bg-white">
                            <div className="border-b-2 border-emerald-600 pb-6 mb-8 flex justify-between items-end">
                                <div>
                                    <h1 className="text-3xl font-black text-emerald-800 uppercase tracking-tighter">Plano Alimentar</h1>
                                    <p className="text-sm font-bold text-slate-500">{patient.name}</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-xl font-bold text-emerald-600">{clinic.name}</h2>
                                    <p className="text-xs text-slate-400">Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                            <div className="space-y-8">
                                {activePlan.meals.map((meal, idx) => (
                                    <div key={idx}>
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="bg-emerald-600 text-white px-4 py-1.5 rounded-full font-black text-sm">{meal.time || '--:--'}</div>
                                            <h3 className="text-xl font-black text-slate-800 uppercase">{meal.name}</h3>
                                        </div>
                                        <div className="ml-4 space-y-2">
                                            {meal.items.map((item, iIdx) => (
                                                <div key={iIdx} className="border-l-2 border-slate-200 pl-4">
                                                    <p className="font-bold text-slate-900">{item.name}</p>
                                                    <p className="text-sm text-slate-500">{item.quantity}{item.unit}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-16 pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
                                <p className="font-black uppercase tracking-widest">ControlClin — Portal do Paciente</p>
                                <p>Documento gerado para uso exclusivo de {patient.name}</p>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                        <Icons.Utensils className="w-10 h-10" />
                    </div>
                    <p className="text-slate-500 font-bold">Nenhum plano alimentar encontrado.</p>
                    <p className="text-xs text-slate-400">Fale com seu nutricionista.</p>
                </div>
            )}
        </div>
    );

    const renderProgress = () => (
        <div className="space-y-8 animate-fadeIn">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Minha Evolução</h1>

            {/* Medidas Principais */}
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                <h3 className="font-black text-slate-800 mb-4">Medidas Registradas</h3>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: 'Peso', value: lastAnthro?.weight ?? patient.anthropometry?.weight, unit: 'kg' },
                        { label: 'IMC', value: lastAnthro?.bmi ?? patient.anthropometry?.bmi, unit: '' },
                        { label: 'Cintura', value: patient.anthropometry?.circWaist, unit: 'cm' },
                        { label: 'Quadril', value: patient.anthropometry?.circHip, unit: 'cm' },
                        { label: 'Altura', value: patient.anthropometry?.height, unit: 'cm' },
                        { label: 'BF Estimado', value: lastAnthro?.bodyFatPercentage ?? patient.anthropometry?.bodyFatPercentage, unit: '%' },
                    ].map(({ label, value, unit }) => (
                        <div key={label} className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase">{label}</p>
                            <p className="font-black text-slate-800 text-lg">{value ?? '--'}<span className="text-xs font-medium text-slate-500 ml-1">{unit}</span></p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Histórico de avaliações */}
            {patient.anthropometryHistory && patient.anthropometryHistory.length > 1 && (
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                    <h3 className="font-black text-slate-800 mb-4">Histórico de Peso</h3>
                    <div className="space-y-3">
                        {[...patient.anthropometryHistory]
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .slice(0, 6)
                            .map((h, i) => (
                                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                                    <span className="text-xs text-slate-500">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                                    <span className="font-black text-slate-800">{h.weight} kg</span>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderProfile = () => (
        <div className="space-y-6 animate-fadeIn">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Meu Perfil</h1>

            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-emerald-100 border-4 border-emerald-50 text-emerald-600 flex items-center justify-center text-4xl font-black mb-4">
                    {patient.name.charAt(0)}
                </div>
                <h2 className="text-xl font-black text-slate-800 text-center">{patient.name}</h2>
                <p className="text-sm text-slate-500 mb-5">{patient.email}</p>
                <div className="flex gap-2 flex-wrap justify-center">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider">{patient.gender}</span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider">{calculateAge(patient.birthDate)} anos</span>
                    {patient.estadoCivil && <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider">{patient.estadoCivil}</span>}
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-2">Clínica</h3>
                <div className="bg-white rounded-[28px] border border-slate-100 overflow-hidden shadow-sm">
                    <div className="p-5 flex items-center gap-3 border-b border-slate-50">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Icons.Home className="w-4 h-4" /></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Unidade</p>
                            <p className="text-sm font-black text-slate-700">{clinic.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full p-5 flex items-center gap-3 text-red-500 hover:bg-red-50 transition-all"
                    >
                        <div className="p-2 bg-red-100 text-red-600 rounded-xl"><Icons.Logout className="w-4 h-4" /></div>
                        <span className="text-sm font-black uppercase tracking-tighter">Sair da Conta</span>
                        <Icons.ChevronRight className="w-4 h-4 ml-auto" />
                    </button>
                </div>
            </div>

            <p className="text-center text-[10px] text-slate-300 font-bold uppercase tracking-[4px] pt-4">ControlClin v1.0.5</p>
        </div>
    );

    // ── RENDER ────────────────────────────────────────────────

    const NAV_ITEMS = [
        { id: 'home', label: 'Início', icon: <Icons.Home className="w-5 h-5" /> },
        { id: 'plan', label: 'Dieta', icon: <Icons.Utensils className="w-5 h-5" /> },
        { id: 'progress', label: 'Evolução', icon: <Icons.TrendingUp className="w-5 h-5" /> },
        { id: 'profile', label: 'Perfil', icon: <Icons.User className="w-5 h-5" /> },
    ] as const;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-32 overflow-x-hidden">
            {/* Header */}
            <header className="bg-emerald-600 text-white pt-12 pb-8 px-6 rounded-b-[48px] shadow-2xl shadow-emerald-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full -mr-32 -mt-32 opacity-20 blur-3xl pointer-events-none" />
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Portal do Paciente</p>
                        <h1 className="text-3xl font-black tracking-tight drop-shadow-sm">{patient.name.split(' ')[0]}</h1>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-3 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all">
                            <Icons.Bell className="w-5 h-5" />
                        </button>
                        <button onClick={onLogout} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all" title="Sair">
                            <Icons.Logout className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="px-6 pt-6 max-w-lg mx-auto">
                {activeTab === 'home' && renderHome()}
                {activeTab === 'plan' && renderPlan()}
                {activeTab === 'progress' && renderProgress()}
                {activeTab === 'profile' && renderProfile()}
            </main>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 p-5 z-50 pointer-events-none">
                <nav className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 px-8 py-4 flex justify-between items-center max-w-md mx-auto w-full rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] pointer-events-auto">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === item.id ? 'text-emerald-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {item.icon}
                            <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Modal Check-in */}
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
                                            <button
                                                key={idx}
                                                onClick={() => setMealsCompleted(done ? mealsCompleted.filter(i => i !== mealId) : [...mealsCompleted, mealId])}
                                                className={`w-full p-4 rounded-[28px] border-2 transition-all flex items-center gap-3 ${done ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-600'}`}
                                            >
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${done ? 'bg-white text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                                    {done ? '✓' : idx + 1}
                                                </div>
                                                <span className="font-black text-[11px] uppercase truncate">{meal.name}</span>
                                            </button>
                                        );
                                    })}
                                    {(!activePlan?.meals || activePlan.meals.length === 0) && (
                                        <p className="text-slate-400 text-sm text-center py-4">Nenhuma refeição no plano ativo.</p>
                                    )}
                                </div>
                            </section>

                            <section>
                                <div className="flex justify-between items-end mb-4">
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Consumo de Água</p>
                                    <p className="text-xl font-black text-blue-600">{waterIntake.toFixed(1)}<span className="text-xs ml-0.5">L</span></p>
                                </div>
                                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-[32px] border border-slate-100">
                                    <button onClick={() => setWaterIntake(Math.max(0, waterIntake - 0.25))} className="w-14 h-14 rounded-2xl bg-white shadow-sm text-slate-800 font-black text-2xl active:scale-90 transition-all">-</button>
                                    <div className="flex-1 px-2">
                                        <div className="h-4 bg-white rounded-full overflow-hidden shadow-inner p-1">
                                            <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (waterIntake / 3) * 100)}%` }} />
                                        </div>
                                    </div>
                                    <button onClick={() => setWaterIntake(waterIntake + 0.25)} className="w-14 h-14 rounded-2xl bg-white shadow-sm text-blue-600 font-black text-2xl active:scale-90 transition-all">+</button>
                                </div>
                            </section>

                            <button
                                onClick={() => { setIsCheckInModalOpen(false); }}
                                className="w-full py-5 bg-slate-900 text-white font-black rounded-[32px] shadow-2xl transition-all hover:bg-slate-800 active:scale-95 text-sm tracking-[0.2em]"
                            >
                                FINALIZAR CHECK-IN
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
                .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};
