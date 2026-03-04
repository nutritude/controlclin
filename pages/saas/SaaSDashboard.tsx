import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saasService, SaaSMetrics, SaaSClinic, PLANS } from '../../services/saasService';
import {
    LayoutDashboard,
    Package,
    Ticket,
    Users,
    FileText,
    LogOut,
    TrendingUp,
    BarChart3,
    DollarSign,
    Timer,
    ArrowDownRight,
    Target
} from 'lucide-react';

const SaaSDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState<SaaSMetrics | null>(null);
    const [recentClinics, setRecentClinics] = useState<SaaSClinic[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');

    useEffect(() => {
        if (!saasService.isAuthenticated()) {
            navigate('/saas/login');
            return;
        }

        const loadData = async () => {
            const m = await saasService.getMetrics();
            const c = await saasService.getAllClinics();
            setMetrics(m);
            setRecentClinics(c.slice(0, 5));
            setLoading(false);
        };
        loadData();
    }, [navigate]);

    const handleLogout = () => {
        saasService.logout();
        navigate('/saas/login');
    };

    if (loading || !metrics) return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
    );

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { id: 'plans', label: 'Planos', icon: <Package size={18} /> },
        { id: 'coupons', label: 'Cupons', icon: <Ticket size={18} /> },
        { id: 'subscribers', label: 'Assinantes', icon: <Users size={18} /> },
        { id: 'invoices', label: 'Faturas', icon: <FileText size={18} /> },
    ];

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-slate-300 font-sans pb-12">

            {/* Top Navigation */}
            <header className="bg-[#111827] border-b border-white/5 py-4 px-8 flex items-center justify-between sticky top-0 z-50 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg border border-white/10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-white font-bold leading-none mb-1">ControlClin Backoffice</h1>
                        <p className="text-purple-400 text-[10px] font-black uppercase tracking-wider">Gestão SaaS</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-white text-xs font-bold">{saasService.getAdminName()}</p>
                        <p className="text-slate-500 text-[10px] uppercase font-black">Administrador SaaS</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5 group"
                    >
                        <LogOut size={16} className="group-hover:rotate-12 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-wider">Sair</span>
                    </button>
                </div>
            </header>

            {/* Menu Tabs */}
            <nav className="px-8 mt-6">
                <div className="flex gap-2 bg-[#111827] p-1.5 rounded-2xl w-fit border border-white/5 shadow-2xl">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-wide ${activeTab === tab.id
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </nav>

            <main className="px-8 mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
                    {[
                        { label: 'MRR', value: `R$ ${metrics.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <DollarSign size={18} />, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                        { label: 'ARR', value: `R$ ${metrics.arr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <TrendingUp size={18} />, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                        { label: 'Assinantes Ativos', value: metrics.activeClinics, icon: <Users size={18} />, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                        { label: 'Em Trial', value: metrics.trialClinics, icon: <Timer size={18} />, color: 'text-orange-400', bg: 'bg-orange-400/10' },
                        { label: 'Churn Rate', value: `${metrics.churnRate}%`, icon: <ArrowDownRight size={18} />, color: 'text-red-400', bg: 'bg-red-400/10' },
                        { label: 'Conversão Trial → Pago', value: `${metrics.conversionRate}%`, icon: <Target size={18} />, color: 'text-teal-400', bg: 'bg-teal-400/10' },
                    ].map((card, i) => (
                        <div key={i} className="bg-[#111827] border border-white/5 p-6 rounded-3xl shadow-lg relative overflow-hidden group hover:border-white/10 transition-colors">
                            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gradient-to-br from-white/5 to-transparent blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            <div className={`w-10 h-10 ${card.bg} ${card.color} flex items-center justify-center rounded-2xl mb-4 shadow-inner`}>
                                {card.icon}
                            </div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{card.label}</p>
                            <h3 className="text-xl font-bold text-white tracking-tight">{card.value}</h3>
                        </div>
                    ))}
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Subscribers by Plan */}
                    <div className="bg-[#111827] border border-white/5 p-8 rounded-[40px] shadow-xl">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-3">
                                <BarChart3 className="text-purple-500" size={20} />
                                Assinantes por Plano
                            </h3>
                        </div>
                        <div className="space-y-6">
                            {[
                                { label: 'Starter', count: metrics.starterCount, color: 'from-slate-500 to-slate-600' },
                                { label: 'Essencial', count: metrics.essentialCount, color: 'from-emerald-500 to-teal-600' },
                                { label: 'Profissional', count: metrics.professionalCount, color: 'from-blue-500 to-indigo-600' },
                                { label: 'Clínica', count: metrics.clinicCount, color: 'from-purple-500 to-violet-600' },
                                { label: 'Enterprise', count: metrics.enterpriseCount, color: 'from-amber-500 to-orange-600' },
                            ].map((plan, i) => {
                                const percentage = metrics.totalClinics > 0 ? (plan.count / metrics.totalClinics) * 100 : 0;
                                return (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                            <span className="text-slate-400">{plan.label}</span>
                                            <span className="text-white">{plan.count}</span>
                                        </div>
                                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                                            <div
                                                className={`h-full rounded-full bg-gradient-to-r ${plan.color} shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all duration-1000 ease-out`}
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Subscribers by Cycle */}
                    <div className="bg-[#111827] border border-white/5 p-8 rounded-[40px] shadow-xl">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-3">
                                <Timer className="text-teal-500" size={20} />
                                Assinantes por Ciclo
                            </h3>
                        </div>
                        <div className="space-y-6">
                            {[
                                { label: 'Mensal', count: recentClinics.filter(c => c.cycle === 'monthly').length, color: 'from-teal-400 to-teal-600' },
                                { label: 'Trimestral', count: recentClinics.filter(c => c.cycle === 'quarterly').length, color: 'from-teal-400 to-teal-600' },
                                { label: 'Semestral', count: recentClinics.filter(c => c.cycle === 'semester').length, color: 'from-teal-400 to-teal-600' },
                                { label: 'Anual', count: recentClinics.filter(c => c.cycle === 'yearly').length, color: 'from-teal-400 to-teal-600' },
                            ].map((cycle, i) => {
                                const percentage = metrics.totalClinics > 0 ? (cycle.count / metrics.totalClinics) * 100 : 0;
                                return (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                            <span className="text-slate-400">{cycle.label}</span>
                                            <span className="text-white">{cycle.count}</span>
                                        </div>
                                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                                            <div
                                                className={`h-full rounded-full bg-gradient-to-r ${cycle.color} transition-all duration-1000 delay-300 ease-out`}
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Recent Subscriptions Table */}
                <div className="bg-[#111827] border border-white/5 rounded-[40px] shadow-xl overflow-hidden">
                    <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Últimas Assinaturas</h3>
                        <button className="text-purple-400 hover:text-purple-300 text-xs font-black uppercase tracking-widest transition-colors">Ver todos</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                                <tr>
                                    <th className="px-8 py-4">Clínica</th>
                                    <th className="px-8 py-4">Plano</th>
                                    <th className="px-8 py-4 text-center">Status</th>
                                    <th className="px-8 py-4 text-right">Data</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {recentClinics.map((clinic) => (
                                    <tr key={clinic.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-slate-400 border border-white/5">
                                                    {clinic.name.charAt(0)}
                                                </div>
                                                <span className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">{clinic.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-xs font-medium text-slate-400">{PLANS[clinic.plan]?.label}</span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${clinic.status === 'active'
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    : clinic.status === 'trial'
                                                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                        : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                                }`}>
                                                {clinic.status === 'active' ? 'Ativo' : clinic.status === 'trial' ? 'Trial' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right font-mono text-xs text-slate-500">
                                            {new Date(clinic.createdAt).toLocaleDateString('pt-BR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SaaSDashboard;
