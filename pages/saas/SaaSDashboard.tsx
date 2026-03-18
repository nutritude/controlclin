import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    saasService,
    SaaSMetrics,
    SaaSClinic,
    SaaSPlan,
    SaaSCoupon,
    PlanType,
    SubscriptionStatus,
    PaymentCycle
} from '../../services/saasService';

const SYSTEM_FEATURES = [
    'Agenda Inteligente',
    'Prontuário Digital',
    'Avaliação Antropométrica',
    'Anamnese Personalizada',
    'IA Nutricional (NutriAI)',
    'Gestão Financeira',
    'Múltiplas Agendas',
    'Dashboard de BI',
    'Integração WhatsApp',
    'Aplicativo do Paciente',
    'Relatórios Avançados',
    'Suporte VIP'
];
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
    Target,
    Plus,
    CheckCircle2,
    XCircle,
    AlertCircle,
    MoreHorizontal,
    Search,
    ShieldCheck,
    CreditCard,
    Zap
} from 'lucide-react';
import { Icons } from '../../constants';

// --- SUB-COMPONENTS ---

const InputField: React.FC<{ label: string, value: any, onChange: (v: string) => void, placeholder?: string, type?: string }> = ({ label, value, onChange, placeholder, type = 'text' }) => (
    <div className="space-y-2">
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-4 text-dark placeholder-slate-300 text-sm focus:outline-none focus:ring-4 focus:ring-accent/5 transition-all font-medium"
            placeholder={placeholder}
        />
    </div>
);

const AnalyticsTab: React.FC<{ metrics: SaaSMetrics }> = ({ metrics }) => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard label="MRR" value={`R$ ${metrics.mrr.toLocaleString()}`} icon={<DollarSign size={20} />} color="amber" />
            <MetricCard label="ARR" value={`R$ ${metrics.arr.toLocaleString()}`} icon={<TrendingUp size={20} />} color="indigo" />
            <MetricCard label="LTV" value={`R$ ${metrics.ltv.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={<CreditCard size={20} />} color="emerald" />
            <MetricCard label="Churn Rate" value={`${metrics.churnRate}%`} icon={<ArrowDownRight size={20} />} color="red" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-secondary/20 p-8 rounded-[32px] shadow-sm">
                <h3 className="text-sm font-black text-dark uppercase tracking-widest flex items-center gap-3 mb-8">
                    <BarChart3 className="text-accent" size={20} />
                    Distribuição por Plano
                </h3>
                <div className="space-y-6">
                    {Object.entries(metrics.plansDistribution).map(([plan, count]) => {
                        const pct = (count / (metrics.totalClinics || 1)) * 100;
                        return (
                            <div key={plan} className="space-y-2">
                                <div className="flex justify-between text-xs font-black uppercase tracking-wider text-slate-500">
                                    <span>{plan}</span>
                                    <span className="text-dark">{count} ({pct.toFixed(0)}%)</span>
                                </div>
                                <div className="h-2 bg-primary/30 rounded-full overflow-hidden">
                                    <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white border border-secondary/20 p-8 rounded-[32px] shadow-sm">
                <h3 className="text-sm font-black text-dark uppercase tracking-widest flex items-center gap-3 mb-8">
                    <Target className="text-secondary" size={20} />
                    Funil de Conversão
                </h3>
                <div className="space-y-10 py-4">
                    <FunilStep label="Novos Leads (Trail)" value={metrics.trialClinics} total={metrics.totalClinics} color="bg-secondary" />
                    <FunilStep label="Assinantes Pagos" value={metrics.activeClinics} total={metrics.totalClinics} color="bg-emerald-500" />
                    <FunilStep label="Taxa de Conversão" value={`${metrics.conversionRate}%`} total={100} color="bg-accent" />
                </div>
            </div>
        </div>
    </div>
);

const PlansTab: React.FC<{ plans: SaaSPlan[], onRefresh: () => void }> = ({ plans, onRefresh }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<SaaSPlan | null>(null);

    const handleOpenModal = (plan?: SaaSPlan) => {
        setEditingPlan(plan || null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center bg-white border border-secondary/20 p-6 rounded-[24px]">
                <div>
                    <h2 className="text-lg font-black text-dark">Configuração de Planos</h2>
                    <p className="text-xs text-slate-500 font-medium">Gerencie limites, preços e features de cada nível de assinatura.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-accent hover:bg-dark text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-accent/10"
                >
                    <Plus size={18} /> Novo Plano
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div key={plan.id} className="bg-white border border-secondary/10 rounded-[32px] p-8 relative overflow-hidden group hover:border-accent/30 transition-all shadow-sm flex flex-col h-full">
                        {!plan.isActive && <div className="absolute top-4 right-4 bg-red-100 text-red-500 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest">Inativo</div>}
                        <h4 className="text-xl font-black text-dark mb-2">{plan.name}</h4>
                        <p className="text-xs text-slate-500 mb-6 font-medium line-clamp-2">{plan.description}</p>

                        <div className="text-2xl font-black text-dark mb-8">
                            R$ {plan.basePrice.toLocaleString()} <span className="text-xs font-medium text-slate-400">/mês</span>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Usuários</span>
                                <span className="text-dark font-black">{1 + (plan.maxProfessionals || 0)} (1+ {(plan.maxProfessionals || 0)})</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Gestores Totais</span>
                                <span className="text-dark font-black">{plan.maxManagers || 1}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Pacientes</span>
                                <span className="text-dark font-black">{plan.maxPatients === 'unlimited' ? '∞ Ilimitado' : plan.maxPatients}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-8 flex-grow">
                            {plan.features.map(f => (
                                <span key={f} className="text-[9px] font-black uppercase tracking-wider bg-primary/30 text-secondary px-2.5 py-1.5 rounded-lg border border-secondary/10">{f}</span>
                            ))}
                        </div>

                        <button
                            onClick={() => handleOpenModal(plan)}
                            className="w-full py-3 mt-auto rounded-2xl bg-primary/20 hover:bg-primary/40 text-dark text-xs font-black uppercase tracking-widest transition-all border border-secondary/10"
                        >
                            Editar Plano
                        </button>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <PlanModal
                    plan={editingPlan}
                    onClose={() => setIsModalOpen(false)}
                    onSave={async (p) => {
                        const allPlans = [...plans];
                        const idx = allPlans.findIndex(x => x.id === p.id);
                        if (idx >= 0) allPlans[idx] = p;
                        else allPlans.push(p);
                        await saasService.updatePlans(allPlans);
                        onRefresh();
                    }}
                />
            )}
        </div>
    );
};

const PlanModal: React.FC<{ plan: SaaSPlan | null, onClose: () => void, onSave: (p: SaaSPlan) => Promise<void> }> = ({ plan, onClose, onSave }) => {
    const [formData, setFormData] = useState<SaaSPlan>(plan || {
        id: 'CUSTOM' as any,
        name: '',
        slug: '',
        description: '',
        maxManagers: 1,
        maxProfessionals: 0,
        maxPatients: 'unlimited',
        features: [],
        availableCycles: ['monthly', 'yearly'],
        basePrice: 0,
        discounts: { monthly: 0, quarterly: 0.1, semester: 0.15, yearly: 0.2 },
        isActive: true
    });
    const [loading, setLoading] = useState(false);
    const [newFeature, setNewFeature] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!formData.slug) formData.slug = saasService.generateSlug(formData.name);
            if (formData.id === 'CUSTOM' as any) formData.id = formData.slug.toUpperCase() as any;
            await onSave(formData);
            onClose();
        } catch (err: any) { alert(err.message); }
        finally { setLoading(false); }
    };


    const toggleFeature = (f: string) => {
        const current = formData.features;
        if (current.includes(f)) {
            setFormData({ ...formData, features: current.filter(x => x !== f) });
        } else {
            setFormData({ ...formData, features: [...current, f] });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-dark/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white border border-secondary/10 rounded-[48px] shadow-2xl w-full max-w-5xl p-12 max-h-[92vh] overflow-y-auto relative custom-scrollbar flex flex-col">
                <button onClick={onClose} className="absolute top-10 right-10 text-slate-300 hover:text-dark transition-colors bg-slate-50 p-3 rounded-full">
                    <Icons.X size={20} />
                </button>

                <div className="mb-12 border-b border-slate-50 pb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="size-3 rounded-full bg-accent animate-pulse"></div>
                        <h2 className="text-3xl font-black text-dark tracking-tight">{plan ? 'Refinar Plano' : 'Novo Arquétipo de Plano'}</h2>
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black">Escalabilidade & Configuração Estratégica</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                        {/* COLUNA ESQUERDA: INFOS BÁSICAS */}
                        <div className="md:col-span-5 space-y-8">
                            <div className="space-y-6">
                                <InputField label="Nome Comercial" value={formData.name} onChange={v => setFormData({ ...formData, name: v })} placeholder="Ex: Starter Edition" />
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Posicionamento de Mercado</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-5 text-dark placeholder-slate-300 text-sm focus:outline-none focus:ring-4 focus:ring-accent/5 transition-all font-medium h-32 resize-none"
                                        placeholder="Descreva a dor que este plano resolve..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-primary/20 p-6 rounded-[32px] border border-secondary/10">
                                <InputField label="Profissionais (+)" value={formData.maxProfessionals} onChange={v => setFormData({ ...formData, maxProfessionals: parseInt(v) || 0 })} placeholder="0" />
                                <InputField label="Gestores Máx" value={formData.maxManagers} onChange={v => setFormData({ ...formData, maxManagers: parseInt(v) || 1 })} placeholder="1" />
                            </div>
                        </div>

                        {/* COLUNA DIREITA: PREÇO E RECURSOS */}
                        <div className="md:col-span-7 space-y-10">
                            {/* FINANCEIRO */}
                            <div className="bg-dark text-white rounded-[40px] p-10 shadow-xl shadow-dark/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 skew-x-12 translate-x-10"></div>
                                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Investimento Mensal Base</label>
                                        <div className="flex items-center bg-white/10 rounded-2xl px-6 border border-white/10 focus-within:border-accent transition-all">
                                            <span className="text-accent font-black mr-2">R$</span>
                                            <input
                                                type="number"
                                                value={formData.basePrice}
                                                onChange={e => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-transparent py-4 text-xl font-black focus:outline-none text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tabela de Descontos (%)</label>
                                        <div className="flex gap-3">
                                            {['Trimestral', 'Semestral', 'Anual'].map((c, i) => {
                                                const key = i === 0 ? 'quarterly' : i === 1 ? 'semester' : 'yearly';
                                                return (
                                                    <div key={c} className="flex-1 bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                                                        <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">{c}</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={formData.discounts[key as keyof typeof formData.discounts]}
                                                            onChange={e => setFormData({ ...formData, discounts: { ...formData.discounts, [key]: parseFloat(e.target.value) } })}
                                                            className="w-full bg-transparent text-center font-black text-sm text-accent focus:outline-none"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SISTEMA REAL FEATURES */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Recursos do Ecossistema</label>
                                    <span className="text-[9px] font-bold text-accent uppercase tracking-widest">{formData.features.length} selecionados</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {SYSTEM_FEATURES.map(f => (
                                        <button
                                            key={f}
                                            type="button"
                                            onClick={() => toggleFeature(f)}
                                            className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-wider text-left transition-all border ${formData.features.includes(f)
                                                    ? 'bg-accent text-white border-accent shadow-lg shadow-accent/10 scale-[1.02]'
                                                    : 'bg-white text-slate-500 border-slate-100 hover:border-accent/30'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span>{f}</span>
                                                {formData.features.includes(f) && <Icons.CheckCircle size={12} />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-10 border-t border-slate-50">
                        <button type="button" onClick={onClose} className="px-10 py-4 rounded-2xl bg-slate-50 text-slate-400 hover:text-dark font-black text-[10px] uppercase tracking-widest transition-all">Descartar</button>
                        <button type="submit" disabled={loading} className="px-16 py-4 rounded-2xl bg-accent text-white font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-accent/20 hover:shadow-accent/40 transition-all active:scale-95">
                            {loading ? 'Sincronizando...' : 'Publicar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CouponsTab: React.FC<{ coupons: SaaSCoupon[] }> = ({ coupons }) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center bg-white border border-secondary/20 p-6 rounded-[24px]">
            <div>
                <h2 className="text-lg font-black text-dark">Gestão de Cupons</h2>
                <p className="text-xs text-slate-500 font-medium">Crie códigos promocionais para campanhas de marketing.</p>
            </div>
            <button className="flex items-center gap-2 bg-accent hover:bg-dark text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-accent/10">
                <Plus size={18} /> Criar Cupom
            </button>
        </div>

        <div className="bg-white border border-secondary/20 rounded-[32px] overflow-hidden shadow-sm">
            <table className="w-full">
                <thead className="bg-primary/20 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                    <tr>
                        <th className="px-8 py-5 text-left">Código</th>
                        <th className="px-8 py-5 text-left">Valor / Tipo</th>
                        <th className="px-8 py-5 text-center">Uso</th>
                        <th className="px-8 py-5 text-center">Status</th>
                        <th className="px-8 py-5 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-secondary/10">
                    {coupons.map(coupon => (
                        <tr key={coupon.id} className="hover:bg-primary/10 transition-colors group">
                            <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="bg-secondary/10 text-secondary p-2 rounded-lg"><Ticket size={16} /></div>
                                    <span className="font-black text-dark tracking-widest">{coupon.code}</span>
                                </div>
                            </td>
                            <td className="px-8 py-5">
                                <span className="text-sm font-bold text-slate-700">
                                    {coupon.type === 'PERCENTAGE' ? `${coupon.value}% de desconto` : `R$ ${coupon.value} OFF`}
                                </span>
                                <p className="text-[10px] text-slate-400 uppercase font-black mt-1 tracking-widest">Validade: {new Date(coupon.expiresAt).toLocaleDateString('pt-BR')}</p>
                            </td>
                            <td className="px-8 py-5">
                                <div className="space-y-2 max-w-[120px] mx-auto">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                                        <span className="text-slate-400">Progresso</span>
                                        <span className="text-dark">{coupon.currentUses}/{coupon.maxUses}</span>
                                    </div>
                                    <div className="h-1.5 bg-primary/30 rounded-full overflow-hidden">
                                        <div className="h-full bg-secondary" style={{ width: `${(coupon.currentUses / coupon.maxUses) * 100}%` }}></div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-8 py-5 text-center">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${coupon.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                    {coupon.isActive ? 'Ativo' : 'Inativo'}
                                </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                                <button className="p-2 text-slate-400 hover:text-dark transition-colors"><MoreHorizontal size={20} /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const SubscribersTab: React.FC<{ subscribers: SaaSClinic[], plans: SaaSPlan[], onRefresh: () => void }> = ({ subscribers, plans, onRefresh }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<SaaSClinic>>({
        name: '',
        cnpj: '',
        responsibleName: '',
        responsibleEmail: '',
        responsiblePhone: '',
        planId: 'PROFESSIONAL',
        cycle: 'monthly',
        status: 'trial'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await saasService.createClinic(formData);
            setIsModalOpen(false);
            onRefresh();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white border border-secondary/20 p-6 rounded-[24px] gap-4">
                <div className="flex bg-primary/10 p-3 rounded-xl border border-secondary/10 text-slate-500 w-full md:max-w-md">
                    <Search size={20} className="mr-3 text-secondary" />
                    <input
                        type="text"
                        placeholder="Buscar por clínica, CNPJ ou responsável..."
                        className="bg-transparent border-none text-dark text-sm focus:ring-0 w-full placeholder-slate-400 font-medium"
                    />
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 bg-accent hover:bg-dark text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-accent/10 w-full md:w-auto overflow-hidden relative group"
                >
                    <Plus size={18} /> Novo Assinante
                </button>
            </div>

            <div className="bg-white border border-secondary/20 rounded-[32px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-primary/20 text-slate-500 text-[10px] uppercase font-black tracking-[0.2em]">
                            <tr>
                                <th className="px-8 py-6">Clínica / Responsável</th>
                                <th className="px-8 py-6">Status / Plano</th>
                                <th className="px-8 py-6 text-center">Uso (Pac. / Prof.)</th>
                                <th className="px-8 py-6 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary/10 text-slate-600">
                            {subscribers.map(sub => (
                                <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-black text-secondary shadow-sm overflow-hidden border border-secondary/20">
                                                {sub.id === 'c1' ? <img src="/logo192.png" alt="logo" className="w-6 h-6" onError={(e) => (e.currentTarget.style.display = 'none')} /> : sub.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-dark text-sm">{sub.name}</p>
                                                <p className="text-[11px] text-slate-500 font-medium">{sub.responsibleName} • {sub.responsibleEmail}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <StatusBadge status={sub.status} />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">• {sub.cycle}</span>
                                        </div>
                                        <p className="text-xs font-black text-secondary">{sub.planId}</p>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="flex items-center justify-center gap-4">
                                            <div className="text-center">
                                                <p className="text-sm font-black text-dark">{sub.patientsCount}</p>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Pac</p>
                                            </div>
                                            <div className="w-px h-6 bg-secondary/20"></div>
                                            <div className="text-center">
                                                <p className="text-sm font-black text-dark">{sub.professionalsCount}</p>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Prof</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2 text-slate-500">
                                            {(sub.status === 'trial' || sub.status === 'past_due') && (
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`Simular pagamento e ativação para ${sub.name}?`)) {
                                                            await saasService.processPayment(sub.id, 'TX-' + Date.now());
                                                            onRefresh();
                                                        }
                                                    }}
                                                    className="bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-emerald-400 border border-emerald-500/10 transition-all"
                                                >
                                                    Ativar
                                                </button>
                                            )}
                                            <button className="bg-primary/20 hover:bg-primary/40 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-secondary border border-secondary/10 transition-all">Detalhes</button>
                                            <button className="p-2 text-slate-400 hover:text-dark transition-colors"><MoreHorizontal size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CREATE SUBSCRIBER MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white border border-secondary/20 rounded-[40px] shadow-2xl w-full max-w-4xl p-10 max-h-[90vh] overflow-y-auto relative custom-scrollbar">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-dark transition-colors font-black">✕</button>

                        <div className="mb-10 text-center">
                            <h2 className="text-2xl font-black text-dark uppercase tracking-tight mb-2">Novo Assinante SaaS</h2>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Registro Administrativo de Clínica / Profissional</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {/* DADOS DA CLÍNICA */}
                                <div className="space-y-6 md:col-span-2 lg:col-span-3">
                                    <div className="flex items-center gap-3 border-b border-white/5 pb-2 mb-2">
                                        <Zap size={18} className="text-purple-500" />
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Dados da Clínica</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <InputField label="Nome da Clínica / Profissional" value={formData.name} onChange={v => setFormData({ ...formData, name: v })} placeholder="Ex: Clínica Nutri Vida" />
                                        <InputField label="CNPJ / CPF" value={formData.cnpj} onChange={v => setFormData({ ...formData, cnpj: v })} placeholder="00.000.000/0000-00" />
                                    </div>
                                </div>

                                {/* DADOS DO RESPONSÁVEL */}
                                <div className="space-y-6 md:col-span-2 lg:col-span-3">
                                    <div className="flex items-center gap-3 border-b border-white/5 pb-2 mb-2">
                                        <Users size={18} className="text-indigo-500" />
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Responsável Administrativo</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <InputField label="Nome Completo" value={formData.responsibleName} onChange={v => setFormData({ ...formData, responsibleName: v })} placeholder="Ex: Dr. João Silva" />
                                        <InputField label="E-mail (Login)" value={formData.responsibleEmail} onChange={v => setFormData({ ...formData, responsibleEmail: v })} placeholder="joao@clinica.com" />
                                        <InputField label="Telefone / WhatsApp" value={formData.responsiblePhone} onChange={v => setFormData({ ...formData, responsiblePhone: v })} placeholder="(11) 99999-9999" />
                                    </div>
                                </div>

                                {/* PLANO E CICLO */}
                                <div className="space-y-6 md:col-span-2 lg:col-span-3">
                                    <div className="flex items-center gap-3 border-b border-white/5 pb-2 mb-2">
                                        <Package size={18} className="text-amber-500" />
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Plano & Assinatura</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <SelectField
                                            label="Selecione o Plano"
                                            value={formData.planId}
                                            options={plans.map(p => ({ label: p.name, value: p.id }))}
                                            onChange={v => setFormData({ ...formData, planId: v as PlanType })}
                                        />
                                        <SelectField
                                            label="Ciclo de Pagamento"
                                            value={formData.cycle}
                                            options={[
                                                { label: 'Mensal', value: 'monthly' },
                                                { label: 'Trimestral', value: 'quarterly' },
                                                { label: 'Semestral', value: 'semester' },
                                                { label: 'Anual', value: 'yearly' }
                                            ]}
                                            onChange={v => setFormData({ ...formData, cycle: v as PaymentCycle })}
                                        />
                                        <SelectField
                                            label="Status Inicial"
                                            value={formData.status}
                                            options={[
                                                { label: 'Período Trial', value: 'trial' },
                                                { label: 'Assinatura Ativa', value: 'active' },
                                                { label: 'Inadimplente (Bloqueado)', value: 'past_due' }
                                            ]}
                                            onChange={v => setFormData({ ...formData, status: v as SubscriptionStatus })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-10 mt-8 border-t border-secondary/10">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-8 py-3 rounded-2xl border border-secondary/20 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-primary/20 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-10 py-3 rounded-2xl bg-accent text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-accent/20 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Processando...' : 'Finalizar Cadastro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};


const SelectField: React.FC<{ label: string, value: any, options: { label: string, value: string }[], onChange: (v: string) => void }> = ({ label, value, options, onChange }) => (
    <div className="space-y-2">
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{label}</label>
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-primary/20 border border-secondary/20 rounded-2xl px-5 py-4 text-dark text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all font-black"
        >
            {options.map(opt => <option key={opt.value} value={opt.value} className="bg-white text-dark py-2">{opt.label}</option>)}
        </select>
    </div>
);

// --- HELPER COMPONENTS ---

const MetricCard: React.FC<{ label: string, value: any, icon: any, color: string }> = ({ label, value, icon, color }) => {
    const colors: any = {
        amber: 'bg-amber-100 text-amber-600',
        indigo: 'bg-indigo-100 text-indigo-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        red: 'bg-red-100 text-red-600',
        purple: 'bg-primary/40 text-accent',
    };
    return (
        <div className="bg-white border border-secondary/20 p-6 rounded-[32px] hover:border-accent/20 transition-all group shadow-sm">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm font-black ${colors[color] || 'bg-primary text-secondary'}`}>
                {icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
            <h3 className="text-2xl font-black text-dark tracking-tight">{value}</h3>
        </div>
    );
};

const FunilStep: React.FC<{ label: string, value: any, total: number, color: string }> = ({ label, value, total, color }) => (
    <div className="relative">
        <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <span className="text-sm font-black text-dark">{value}</span>
        </div>
        <div className="h-2 bg-primary/30 rounded-full overflow-hidden">
            <div className={`h-full ${color} transition-all duration-1000 shadow-sm`} style={{ width: '100%' }}></div>
        </div>
    </div>
);

const StatusBadge: React.FC<{ status: SubscriptionStatus }> = ({ status }) => {
    const styles: any = {
        trial: 'bg-blue-100 text-blue-600 border-blue-200',
        active: 'bg-emerald-100 text-emerald-600 border-emerald-200',
        past_due: 'bg-amber-100 text-amber-600 border-amber-200',
        canceled: 'bg-red-100 text-red-600 border-red-200',
    };
    const labels: any = { trial: 'Trial', active: 'Ativo', past_due: 'Inadimplente', canceled: 'Cancelado' };
    return (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${styles[status]}`}>
            {labels[status]}
        </span>
    );
};

// --- MAIN DASHBOARD COMPONENT ---

const SaaSDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState<SaaSMetrics | null>(null);
    const [plans, setPlans] = useState<SaaSPlan[]>([]);
    const [coupons, setCoupons] = useState<SaaSCoupon[]>([]);
    const [subscribers, setSubscribers] = useState<SaaSClinic[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');

    useEffect(() => {
        if (!saasService.isAuthenticated()) {
            navigate('/saas/login');
            return;
        }

        const loadAll = async () => {
            const [m, p, c, s] = await Promise.all([
                saasService.getMetrics(),
                saasService.getPlans(),
                saasService.getCoupons(),
                saasService.getAllClinics()
            ]);
            setMetrics(m);
            setPlans(p);
            setCoupons(c);
            setSubscribers(s);
            setLoading(false);
        };
        loadAll();
    }, [navigate]);

    return (
        <div className="min-h-screen bg-primary/30 text-slate-700 font-sans pb-12">
            <header className="bg-white border-b border-secondary/20 py-4 px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg border border-white/10">
                        <ShieldCheck className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-dark font-black leading-none mb-1">Control<span className="text-secondary">Clin</span></h1>
                        <p className="text-accent text-[10px] font-black uppercase tracking-[0.2em]">Backoffice Admin</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:block text-right mr-4">
                        <p className="text-dark text-xs font-black">{saasService.getAdminName()}</p>
                        <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest">Root Account</p>
                    </div>
                    <button
                        onClick={() => { saasService.logout(); navigate('/saas/login'); }}
                        className="p-2.5 rounded-xl bg-primary/20 hover:bg-primary/40 text-accent transition-all border border-secondary/20"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <div className="px-8 mt-8">
                <nav className="flex gap-2 bg-white p-1.5 rounded-2xl w-fit border border-secondary/20 mb-10 shadow-sm">
                    <TabBtn id="dashboard" icon={<LayoutDashboard size={18} />} label="Analytics" activeTab={activeTab} setTab={setActiveTab} />
                    <TabBtn id="plans" icon={<Package size={18} />} label="Planos" activeTab={activeTab} setTab={setActiveTab} />
                    <TabBtn id="coupons" icon={<Ticket size={18} />} label="Cupons" activeTab={activeTab} setTab={setActiveTab} />
                    <TabBtn id="subscribers" icon={<Users size={18} />} label="Assinantes" activeTab={activeTab} setTab={setActiveTab} />
                </nav>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sincronizando Dados...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'dashboard' && metrics && <AnalyticsTab metrics={metrics} />}
                        {activeTab === 'plans' && <PlansTab plans={plans} onRefresh={async () => {
                            const p = await saasService.getPlans();
                            setPlans(p);
                        }} />}
                        {activeTab === 'coupons' && <CouponsTab coupons={coupons} />}
                        {activeTab === 'subscribers' && (
                            <SubscribersTab
                                subscribers={subscribers}
                                plans={plans}
                                onRefresh={async () => {
                                    const m = await saasService.getMetrics();
                                    const s = await saasService.getAllClinics();
                                    setMetrics(m);
                                    setSubscribers(s);
                                }}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const TabBtn: React.FC<{ id: string, icon: any, label: string, activeTab: string, setTab: any }> = ({ id, icon, label, activeTab, setTab }) => (
    <button
        onClick={() => setTab(id)}
        className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${activeTab === id
            ? 'bg-accent text-white shadow-lg shadow-accent/20'
            : 'text-slate-500 hover:text-dark hover:bg-primary/20'
            }`}
    >
        {icon} {label}
    </button>
);

export default SaaSDashboard;
