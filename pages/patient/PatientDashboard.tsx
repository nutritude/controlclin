
import React, { useState } from 'react';
import { Patient, Clinic, NutritionalPlan } from '../../types';
import { Icons } from '../../constants';

interface PatientDashboardProps {
    patient: Patient;
    clinic: Clinic;
    onLogout: () => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ patient, clinic, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'home' | 'plan' | 'progress' | 'profile'>('home');

    const lastAnthro = patient.anthropometryHistory && patient.anthropometryHistory.length > 0
        ? patient.anthropometryHistory[patient.anthropometryHistory.length - 1]
        : null;

    const activePlan = patient.nutritionalPlan || patient.nutritionalPlans?.find(p => p.status === 'ATIVO');

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pb-20 font-sans">
            {/* Header */}
            <header className="bg-emerald-600 text-white p-6 pt-12 rounded-b-[40px] shadow-lg shadow-emerald-500/20">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest opacity-80">Bem-vindo(a)</p>
                        <h1 className="text-2xl font-black tracking-tight">{patient.name.split(' ')[0]}</h1>
                    </div>
                    <button
                        onClick={onLogout}
                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <Icons.Logout className="w-5 h-5" />
                    </button>
                </div>

                {/* Quick Info Card */}
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                        <p className="text-[10px] font-bold text-emerald-100 uppercase mb-1 whitespace-nowrap">Peso Atual</p>
                        <p className="text-xl font-black">{lastAnthro?.weight || '--'} <span className="text-sm font-medium">kg</span></p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                        <p className="text-[10px] font-bold text-emerald-100 uppercase mb-1 whitespace-nowrap">Gordura Corp.</p>
                        <p className="text-xl font-black">{lastAnthro?.bodyFatPercentage || '--'} <span className="text-sm font-medium">%</span></p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full">

                {/* Daily Status */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-black text-slate-800">Seu Dia</h2>
                        <span className="text-[10px] font-black bg-slate-200 text-slate-500 px-2 py-1 rounded-full uppercase">Progresso</span>
                    </div>
                    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                            <Icons.CheckCircle className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">Check-in de Aderência</p>
                            <p className="text-xs text-slate-500 truncate">Como foi sua alimentação hoje?</p>
                        </div>
                        <button className="ml-auto p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                            <Icons.ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </section>

                {/* Next Meal or Active Plan */}
                <section>
                    <h2 className="text-lg font-black text-slate-800 mb-4">Plano Alimentar</h2>
                    {activePlan ? (
                        <div className="bg-emerald-50 p-6 rounded-[32px] border-2 border-emerald-100/50">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-emerald-600 text-white rounded-xl flex-shrink-0">
                                    <Icons.Utensils className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-emerald-900 text-sm truncate">Plano: {activePlan.title || 'Ativo'}</p>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Estratégia: {activePlan.strategyName}</p>
                                </div>
                            </div>
                            <button className="w-full py-3 bg-white text-emerald-600 font-black rounded-2xl shadow-sm border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all text-sm">
                                Visualizar Dieta Completa
                            </button>
                        </div>
                    ) : (
                        <div className="bg-slate-100 p-8 rounded-[32px] border-2 border-dashed border-slate-200 text-center">
                            <p className="text-slate-500 text-sm font-bold">Nenhum plano ativo no momento.</p>
                            <p className="text-[10px] text-slate-400 uppercase mt-1">Consulte seu nutricionista</p>
                        </div>
                    )}
                </section>

                {/* Important Alerts */}
                <section>
                    <h2 className="text-lg font-black text-slate-800 mb-4">Lembretes</h2>
                    <div className="space-y-3">
                        <div className="bg-white p-4 rounded-2xl flex items-center gap-4 border border-slate-100 shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                <Icons.History className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800">Beber Água</p>
                                <p className="text-[10px] text-slate-500">Meta: 2.5L a 3L diários</p>
                            </div>
                            <Icons.Bell className="w-4 h-4 text-slate-300" />
                        </div>
                    </div>
                </section>

            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-6 py-4 flex justify-between items-center max-w-lg mx-auto w-full rounded-t-[32px] shadow-2xl z-50">
                <button
                    onClick={() => setActiveTab('home')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-emerald-600' : 'text-slate-400'}`}
                >
                    <div className={`p-2 rounded-xl transition-all ${activeTab === 'home' ? 'bg-emerald-50' : ''}`}>
                        <Icons.Home className="w-6 h-6" />
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('plan')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'plan' ? 'text-emerald-600' : 'text-slate-400'}`}
                >
                    <div className={`p-2 rounded-xl transition-all ${activeTab === 'plan' ? 'bg-emerald-50' : ''}`}>
                        <Icons.FileText className="w-6 h-6" />
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('progress')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'progress' ? 'text-emerald-600' : 'text-slate-400'}`}
                >
                    <div className={`p-2 rounded-xl transition-all ${activeTab === 'progress' ? 'bg-emerald-50' : ''}`}>
                        <Icons.TrendingUp className="w-6 h-6" />
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-emerald-600' : 'text-slate-400'}`}
                >
                    <div className={`p-2 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-emerald-50' : ''}`}>
                        <Icons.User className="w-6 h-6" />
                    </div>
                </button>
            </nav>
        </div>
    );
};
