import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../services/db';
import { User, Clinic, Role } from '../types';
import { Icons } from '../constants';

import { saasService, PlanType, PaymentCycle } from '../services/saasService';
import { paymentService, PaymentMethod, CreditCardData } from '../services/paymentService';

interface LoginProps {
  onLogin: (user: User, clinic: Clinic, loginMode: 'ADMIN' | 'PROFESSIONAL') => void;
}

type LoginMode = 'ADMIN' | 'PROFESSIONAL';
type ViewState = 'LANDING' | 'LOGIN' | 'REGISTER' | 'SUCCESS' | 'PRICING';

const BACKGROUND_IMAGES = [
  '/imagebk/Tela de fundo01.jpg',
  '/imagebk/Tela de fundo02.jpg',
  '/imagebk/Tela de fundo03.jpg',
  '/imagebk/Tela de fundo04.jpg',
  '/imagebk/Tela de fundo05.jpg'
];

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<ViewState>('LANDING');
  const [loginMode, setLoginMode] = useState<LoginMode>('PROFESSIONAL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [slug, setSlug] = useState('control');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [plans, setPlans] = useState<any[]>([]);

  // Registration State
  const [regStep, setRegStep] = useState(1);
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    phone: '',
    clinicName: '',
    companyName: '',
    fantasyName: '',
    planId: 'PROFESSIONAL' as PlanType,
    cycle: 'monthly' as PaymentCycle,
    personType: 'PF' as 'PF' | 'PJ',
    cpf: '',
    cnpj: '',
    // Endereço de Faturamento
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });
  const [regStatus, setRegStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [cardData, setCardData] = useState<CreditCardData>({
    holderName: '', number: '', expMonth: '', expYear: '', cvv: '', installments: 1,
  });
  const [selectedInstallment, setSelectedInstallment] = useState(1);
  const [docError, setDocError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Sorteia a imagem de fundo ao montar o componente ou mudar para LOGIN
  useEffect(() => {
    if (view === 'LOGIN') {
      const idx = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
      setBackgroundImage(BACKGROUND_IMAGES[idx]);
    }
    if (view === 'REGISTER') {
      setRegStep(1);
    }
  }, [view]);

  useEffect(() => {
    const fetchPlans = async () => {
      const p = await saasService.getPlans();
      setPlans(p);
      // Auto-seleciona o plano: prioriza PROFESSIONAL, senão pega o primeiro ativo
      const activePlans = p.filter((pl: any) => pl.isActive !== false);
      const preferred = activePlans.find((pl: any) => pl.id === 'PROFESSIONAL') || activePlans[0];
      if (preferred && !regData.planId) {
        setRegData(prev => ({ ...prev, planId: preferred.id }));
      }
    };
    fetchPlans();
  }, []);

  const handleRegister = async () => {
    setRegStatus('loading');
    setError('');
    try {
      const newClinic = await saasService.createClinic({
        name: regData.personType === 'PJ' ? (regData.fantasyName || regData.clinicName || regData.name) : regData.name,
        personType: regData.personType,
        responsibleName: regData.name,
        responsibleEmail: regData.email,
        responsiblePhone: regData.phone,
        planId: regData.planId,
        cycle: regData.cycle,
        status: 'trial',
        cpf: regData.personType === 'PF' ? regData.cpf : undefined,
        cnpj: regData.personType === 'PJ' ? regData.cnpj : undefined,
        companyName: regData.personType === 'PJ' ? regData.companyName : undefined,
        fantasyName: regData.personType === 'PJ' ? regData.fantasyName : undefined,
      });

      const selectedPlan = plans.find(p => p.id === regData.planId);
      const amount = paymentService.calculateTotalForCycle(selectedPlan?.basePrice || 0, regData.cycle, selectedPlan?.discounts?.[regData.cycle] || 0);

      // Integração com Gateway de Pagamento
      if (amount > 0) {
        await paymentService.createPaymentIntent({
          clinicId: newClinic.id,
          planId: regData.planId,
          method: paymentMethod,
          amount,
          installments: selectedInstallment,
          customerEmail: regData.email,
          customerDocument: regData.personType === 'PF' ? regData.cpf : regData.cnpj,
          customerName: regData.name,
          cardData: paymentMethod === 'CREDIT_CARD' ? cardData : undefined,
        });
      }
      setRegStatus('success');
      setView('SUCCESS');
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro.');
      setRegStatus('error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const result = await db.login(email.trim(), password.trim(), slug.trim());
      if (result) {
        if (loginMode === 'ADMIN' && result.user.role !== Role.CLINIC_ADMIN && result.user.role !== Role.SUPER_ADMIN) {
          setError('Este usuário não possui perfil de Gestor. Tente a aba Profissional.');
          setIsSubmitting(false);
          return;
        }
        onLogin(result.user, result.clinic, loginMode);
      } else {
        setError('Credenciais (e-mail ou senha) ou slug da clínica inválidos.');
      }
    } catch (err: any) {
      console.error("[Login] Caught error:", err);
      const errorMsg = err instanceof Error ? err.message : (err?.message || 'Ocorreu um erro inesperado.');

      if (errorMsg.includes('auth/invalid-login-credentials') || errorMsg.includes('auth/invalid-credential')) {
        setError('E-mail ou senha incorretos.');
      } else if (errorMsg.includes('API key not valid')) {
        setError('Erro do Sistema: O banco de dados principal de demonstração está offline (API Key Inválida). Por favor, use a senha "123" para acessar no Modo Offline/Bypass.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const [quickEmail, setQuickEmail] = useState('');

  const renderLanding = () => (
    <div className="w-full flex flex-col items-center bg-white text-slate-800 font-sans selection:bg-emerald-500/20">
      {/* Hero Section - Restored with Empire Text */}
      <section className="relative w-full pt-40 pb-32 px-4 md:px-6 overflow-hidden bg-emerald-50/30 border-b border-emerald-100/50">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-emerald-200 bg-white shadow-sm mb-8 hover:scale-105 transition-transform">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black tracking-[0.2em] text-emerald-800 uppercase">A Revolução Digital na Nutrição</span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.05] tracking-tight text-slate-900 mb-8 max-w-5xl">
            Não é só um App. <br /> É o seu <span className="italic text-emerald-500">Império Clínico</span>.
          </h1>
          <p className="text-lg md:text-2xl text-slate-500 font-medium leading-relaxed max-w-3xl mb-12">
            O único ecossistema que entende o nutricionista como <span className="text-slate-900 font-bold italic">empresa</span>. Onde a ciência nutre o corpo e a inteligência prospera o seu negócio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-16">
            <button onClick={() => setView('REGISTER')} className="px-10 py-5 rounded-full text-lg font-black text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-1">
              Começar minha Ascensão
            </button>
            <button onClick={() => setView('LOGIN')} className="px-10 py-5 rounded-full text-lg font-black text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
              Acessar Minha Conta
            </button>
          </div>

          {/* Hero Main Screenshot (Original Restored) */}
          <div className="w-full max-w-7xl relative group">
            <div className="bg-white rounded-[2.5rem] p-2 md:p-4 shadow-[0_40px_80px_-15px_rgba(16,185,129,0.12)] border border-emerald-100 relative overflow-hidden flex flex-col items-center">
              <img src="/screenshots/dashboard_main.png" alt="Dashboard Principal" className="w-full h-auto rounded-[1.5rem] border border-slate-100 shadow-sm transition-transform duration-700 hover:scale-[1.01]" />
            </div>
          </div>
        </div>
      </section>

      {/* Seção 1: Para o Profissional (Restored Info Cards) */}
      <section className="w-full py-32 px-4 md:px-6 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight">Ciência e Prosperidade <br /><span className="text-emerald-500 italic">em um fluxo contínuo.</span></h2>
            <p className="text-xl text-slate-600 leading-relaxed">Assuma o controle total do seu consultório com ferramentas que automatizam a burocracia e potencializam seu conhecimento científico.</p>

            <div className="space-y-6 pt-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.Sparkles className="h-5 w-5 text-emerald-500" /> Inteligência que Trabalha por Você</h4>
                <p className="text-slate-600 font-medium">Desde auditoria clínica até interpretação automática de exames. Nossa IA economiza seu tempo e engrandece o seu desfecho clínico.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.Activity className="h-5 w-5 text-emerald-500" /> Evolução Corporal Científica</h4>
                <p className="text-slate-600 font-medium">Múltiplos protocolos de antropometria, gráficos de dinâmica de perdas e ganhos e relatórios de bioimpedância de alta performance.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.Monitor className="h-5 w-5 text-emerald-500" /> Prontuário Inteligente</h4>
                <p className="text-slate-600 font-medium">Centralize anamnese, prescrições e evolução em uma interface intuitiva feita para profissionais de elite.</p>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full relative group">
            <div className="bg-white rounded-[2rem] p-2 md:p-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 relative text-center">
              <img src="/screenshots/professional_mode.png" alt="Modo Profissional" className="w-full h-auto rounded-[1.5rem] border border-slate-50 transition-transform duration-700 hover:scale-[1.01]" />
              <img src="/screenshots/relatorio_ind.png" alt="Relatórios" className="w-full h-auto rounded-[1.5rem] border border-slate-50 transition-transform duration-700 hover:scale-[1.01] mt-4 shadow-lg" />
            </div>
          </div>
        </div>
      </section>

      {/* Seção 2: Para o Paciente (Restored Portal) */}
      <section className="w-full py-32 px-4 md:px-6 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-16">
          <div className="flex-1 space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight">O Portal do Paciente, <br /><span className="text-emerald-500 italic">engajamento na palma da mão.</span></h2>
            <p className="text-xl text-slate-600 leading-relaxed">Garanta a adesão ao plano com ferramentas de check-in, visualização de metas e canal direto de comunicação segura.</p>

            <div className="space-y-6 pt-4">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.Smartphone className="h-5 w-5 text-emerald-500" /> Aplicativo Exclusivo</h4>
                <p className="text-slate-600 font-medium">Seu paciente visualiza a dieta, o progresso e as orientações em uma interface feita para motivar resultados reais.</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.CheckCircle className="h-5 w-5 text-emerald-500" /> Acompanhamento de Metas</h4>
                <p className="text-slate-600 font-medium">Transforme a jornada de saúde em um processo visual e motivador, reduzindo o absenteísmo e aumentando a retenção.</p>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full relative">
            <div className="relative w-full max-w-[360px] border-[12px] border-slate-900 rounded-[3rem] shadow-2xl overflow-hidden bg-white mx-auto">
              <img src="/screenshots/patient_portal.png" alt="Portal Paciente" className="w-full h-auto block" />
            </div>
          </div>
        </div>
      </section>

      {/* Seção 3: Gestão 360 (Reforced with Gestor/Professional Performance) */}
      <section className="w-full py-40 px-4 md:px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-24">
          <div className="flex-1 space-y-10">
            <div>
              <p className="text-emerald-500 font-black uppercase tracking-[0.3em] text-xs mb-4">Central de Inteligência da Clínica</p>
              <h2 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.0] tracking-tighter">O Gestor na <span className="italic text-emerald-600">Velocidade dos Dados.</span></h2>
            </div>

            <p className="text-2xl text-slate-500 leading-relaxed font-medium">Lidere sua clínica com soberania técnica. O modo Gestor transforma cada atendimento em um indicador estratégico de crescimento.</p>

            <div className="space-y-6 pt-4">
              <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <h4 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-3"><Icons.TrendingUp className="h-6 w-6 text-emerald-500" /> Performance dos Profissionais</h4>
                <p className="text-slate-600 font-medium leading-relaxed">Monitore o desempenho de cada profissional em tempo real. Analise taxas de rotatividade, satisfação e volume de atendimentos para otimizar sua escala e lucratividade.</p>
              </div>
              <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <h4 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-3"><Icons.Users className="h-6 w-6 text-emerald-500" /> Perfil Epidemiológico e BI</h4>
                <p className="text-slate-600 font-medium leading-relaxed">Entenda quem é o seu público. Identifique padrões de diagnóstico, riscos metabólicos prevalentes e tendências de saúde para criar campanhas de marketing precisas e crescer sua base.</p>
              </div>
              <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <h4 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-3"><Icons.Zap className="h-6 w-6 text-emerald-500" /> Oportunidades de Negócio</h4>
                <p className="text-slate-600 font-medium leading-relaxed">Detecte gargalos financeiros e áreas de sub-uso na clínica. Use a inteligência de negócios para transformar dados brutos em novos serviços e parcerias estratégicas.</p>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full relative">
            <div className="bg-white rounded-[2rem] p-2 md:p-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 relative text-center">
              <img src="/screenshots/gestor_mode.png" alt="Modo Gestor" className="w-full h-auto rounded-[1.5rem] border border-slate-50 transition-transform duration-700 hover:scale-[1.01]" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer Restored */}
      <footer className="w-full py-16 px-6 bg-white flex flex-col items-center gap-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Control<span className="text-emerald-500">Clin</span></h2>
        <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <a href="#" className="hover:text-emerald-500 transition-colors">Termos</a>
          <a href="#" className="hover:text-emerald-500 transition-colors">Privacidade</a>
          <a href="#" className="hover:text-emerald-500 transition-colors">Contato</a>
        </div>
        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-4 text-center">
          © 2026 ControlClin. Desenvolvido para transformar profissionais em donos de clínicas de alta performance.
        </p>
      </footer>
    </div>
  );

  const selectedPlan = plans.find((p: any) => p.id === regData.planId);

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setRegData(prev => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  const canAdvanceStep1 = regData.planId && regData.cycle;
  const canAdvanceStep2 = regData.name.trim().length >= 3 && regData.email.includes('@') && regData.phone.replace(/\D/g, '').length >= 10 &&
    (regData.personType === 'PF' ? paymentService.luhnCheck(regData.cpf) || regData.cpf.replace(/\D/g, '').length === 11 : regData.cnpj.replace(/\D/g, '').length === 14) &&
    (regData.personType === 'PJ' ? (regData.clinicName || regData.fantasyName) : true) &&
    regData.cep.replace(/\D/g, '').length === 8 && regData.street.length > 2 && regData.number.length > 0 && regData.city.length > 2 && regData.state.length === 2;

  const renderRegister = () => (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-50 border border-emerald-100 mb-6">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-700">Provisionamento Instantâneo</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-3">Crie sua <span className="text-emerald-500 italic">Clínica</span></h1>
          <p className="text-slate-500 font-medium max-w-md mx-auto">Cada clínica é um universo independente com seus profissionais e pacientes.</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-3 mb-12">
          {[{ n: 1, label: 'Plano' }, { n: 2, label: 'Dados' }, { n: 3, label: 'Pagamento' }, { n: 4, label: 'Confirmar' }].map((s, i) => (
            <React.Fragment key={s.n}>
              {i > 0 && <div className={`w-12 h-[2px] rounded-full transition-all duration-500 ${regStep >= s.n ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
              <button onClick={() => { if (s.n < regStep) setRegStep(s.n); }} className="flex items-center gap-2 group">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all duration-500 ${regStep >= s.n ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-400'}`}>{s.n}</div>
                <span className={`text-[10px] font-black uppercase tracking-widest hidden md:inline transition-colors ${regStep >= s.n ? 'text-emerald-600' : 'text-slate-400'}`}>{s.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Plan Selection */}
        {regStep === 1 && (
          <div className="animate-fadeIn space-y-8">
            {/* Billing Cycle — TOP (Price Anchoring) */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Icons.Zap className="w-4 h-4 text-emerald-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Escolha seu ciclo e economize mais</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { k: 'monthly', l: 'Mensal', d: '', badge: '' },
                  { k: 'quarterly', l: 'Trimestral', d: '10% off', badge: '' },
                  { k: 'semester', l: 'Semestral', d: '20% off', badge: 'Popular' },
                  { k: 'yearly', l: 'Anual', d: '30% off', badge: 'Melhor Valor' }
                ].map(c => (
                  <button key={c.k} onClick={() => setRegData({ ...regData, cycle: c.k as PaymentCycle })}
                    className={`py-3.5 px-4 rounded-xl border-2 transition-all text-center relative ${regData.cycle === c.k ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100' : 'border-slate-100 hover:border-emerald-200'}`}>
                    {c.badge && <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[7px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full shadow-sm ${c.k === 'yearly' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}>{c.badge}</span>}
                    <p className={`text-sm font-black ${regData.cycle === c.k ? 'text-emerald-600' : 'text-slate-800'}`}>{c.l}</p>
                    {c.d && <p className="text-[9px] font-bold text-emerald-500 uppercase mt-0.5">{c.d}</p>}
                  </button>
                ))}
              </div>
            </div>

            {/* Plan Cards with CTA */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.filter((p: any) => p.isActive !== false).map((plan: any) => {
                const discount = plan.discounts?.[regData.cycle] || 0;
                const finalPrice = Math.round(plan.basePrice * (1 - discount));
                const isSelected = regData.planId === plan.id;
                const isRecommended = plan.id === 'PROFESSIONAL';
                return (
                  <div key={plan.id}
                    className={`rounded-[2rem] border-2 text-left transition-all duration-300 relative flex flex-col ${isRecommended
                      ? 'border-emerald-500 bg-gradient-to-b from-emerald-50/50 to-white shadow-xl shadow-emerald-100 scale-[1.02] z-10'
                      : isSelected ? 'border-emerald-500 bg-white shadow-xl shadow-emerald-100' : 'border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md shadow-sm'}`}>
                    {/* Recommended Badge */}
                    {isRecommended && (
                      <div className="bg-emerald-600 text-white text-center py-2.5 rounded-t-[1.75rem] -mt-[2px] -mx-[2px]">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">⭐ Mais Escolhido</span>
                      </div>
                    )}

                    <div className="p-7 flex-1 flex flex-col">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-xl font-black ${isSelected || isRecommended ? 'text-emerald-600' : 'text-slate-900'}`}>{plan.name}</h3>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                          {isSelected && <Icons.Check className="w-4 h-4 text-white" />}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm text-slate-400 font-bold">R$</span>
                          <span className={`text-4xl font-black ${isRecommended ? 'text-emerald-600' : 'text-slate-900'}`}>{finalPrice}</span>
                          <span className="text-xs text-slate-400 font-bold">/mês</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-slate-400 line-through">R$ {plan.basePrice}</span>
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">ECONOMIZE {Math.round(discount * 100)}%</span>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-500 font-medium mb-5 leading-relaxed">{plan.description}</p>

                      {/* Features */}
                      <div className="space-y-2.5 border-t border-slate-100 pt-4 flex-1">
                        <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-600">
                          <Icons.CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>{plan.maxProfessionals === 0 ? '1 Profissional' : `Até ${1 + plan.maxProfessionals} Profissionais`}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-600">
                          <Icons.CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Pacientes Ilimitados</span>
                        </div>
                        {plan.features.map((f: string) => (
                          <div key={f} className="flex items-center gap-2.5 text-[11px] font-bold text-slate-600">
                            <Icons.CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>

                      {/* CTA Button Inside Card */}
                      <button onClick={(e) => { e.stopPropagation(); setRegData({ ...regData, planId: plan.id }); setRegStep(2); }}
                        className={`w-full mt-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${isRecommended
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-emerald-200'}`}>
                        Assinar {plan.name} <Icons.ChevronDown className="-rotate-90 w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Secondary CTA + Trust Indicator */}
            <div className="text-center space-y-4">
              <button onClick={() => setRegStep(2)} disabled={!canAdvanceStep1}
                className="w-full max-w-md mx-auto py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                Continuar com {selectedPlan?.name || 'Plano'} <Icons.ChevronDown className="-rotate-90 w-5 h-5" />
              </button>
              <div className="flex items-center justify-center gap-6 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                <span className="flex items-center gap-1.5"><Icons.Lock className="w-3 h-3" /> Dados Seguros</span>
                <span className="flex items-center gap-1.5"><Icons.Zap className="w-3 h-3" /> Ativação Imediata</span>
                <span className="flex items-center gap-1.5"><Icons.CheckCircle className="w-3 h-3" /> Cancele Quando Quiser</span>
              </div>
            </div>

            <button onClick={() => setView('LANDING')} className="w-full py-2 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest">← Voltar ao Início</button>
          </div>
        )}

        {/* Step 2: Personal Data */}
        {regStep === 2 && (
          <div className="animate-fadeIn">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-lg p-8 md:p-10 space-y-7">
              {/* Person Type Toggle */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Tipo de Cadastro</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['PF', 'PJ'] as const).map(t => (
                    <button key={t} onClick={() => setRegData({ ...regData, personType: t, cpf: '', cnpj: '' })}
                      className={`py-3.5 rounded-xl border-2 font-black text-sm uppercase tracking-wider transition-all ${regData.personType === t ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-emerald-200'}`}>
                      {t === 'PF' ? '👤 Pessoa Física' : '🏢 Pessoa Jurídica'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Nome Completo do Responsável</label>
                <input type="text" value={regData.name} onChange={e => setRegData({ ...regData, name: e.target.value })}
                  className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-slate-900 font-medium transition-all" placeholder="Ex: Dr. João Silva" />
              </div>

              {/* PJ: Clinic Name */}
              {regData.personType === 'PJ' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Razão Social</label>
                    <input type="text" value={regData.companyName} onChange={e => setRegData({ ...regData, companyName: e.target.value })}
                      className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-slate-900 font-medium transition-all" placeholder="Clinica ABC LTDA" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Nome Fantasia</label>
                    <input type="text" value={regData.fantasyName} onChange={e => setRegData({ ...regData, fantasyName: e.target.value, clinicName: e.target.value })}
                      className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-slate-900 font-medium transition-all" placeholder="Clínica NutriVida" />
                  </div>
                </div>
              )}

              {/* Document */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">{regData.personType === 'PF' ? 'CPF' : 'CNPJ'}</label>
                  <input type="text" value={regData.personType === 'PF' ? regData.cpf : regData.cnpj}
                    onChange={e => regData.personType === 'PF' ? setRegData({ ...regData, cpf: saasService.formatCPF(e.target.value) }) : setRegData({ ...regData, cnpj: saasService.formatCNPJ(e.target.value) })}
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-slate-900 font-medium transition-all"
                    placeholder={regData.personType === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'} maxLength={regData.personType === 'PF' ? 14 : 18} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">E-mail</label>
                  <input type="email" value={regData.email} onChange={e => setRegData({ ...regData, email: e.target.value })}
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-slate-900 font-medium transition-all" placeholder="joao@clinica.com" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">WhatsApp</label>
                <input type="tel" value={regData.phone} onChange={e => setRegData({ ...regData, phone: saasService.formatPhone(e.target.value) })}
                  className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-slate-900 font-medium transition-all" placeholder="(11) 99999-9999" maxLength={15} />
              </div>

              {/* Endereço de Faturamento */}
              <div className="pt-6 border-t border-slate-100 mt-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Endereço de Faturamento</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">CEP</label>
                      <input type="text" value={regData.cep} onChange={e => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 8) val = val.slice(0, 8);
                        
                        // Busca CEP automaticamente se tiver 8 digitos
                        if (val.length === 8) {
                          fetchAddressByCep(val);
                        }
                        
                        if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
                        setRegData({ ...regData, cep: val });
                      }}
                        className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-slate-900 font-medium transition-all" placeholder="00000-000" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Rua / Avenida</label>
                      <input type="text" value={regData.street} onChange={e => setRegData({ ...regData, street: e.target.value })}
                        className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-slate-900 font-medium transition-all" placeholder="Ex: Av. Paulista" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Número</label>
                      <input type="text" value={regData.number} onChange={e => setRegData({ ...regData, number: e.target.value })}
                        className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-slate-900 font-medium transition-all" placeholder="1000" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Complemento</label>
                      <input type="text" value={regData.complement} onChange={e => setRegData({ ...regData, complement: e.target.value })}
                        className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-slate-900 font-medium transition-all" placeholder="Sala 123" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Bairro</label>
                      <input type="text" value={regData.neighborhood} onChange={e => setRegData({ ...regData, neighborhood: e.target.value })}
                        className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-slate-900 font-medium transition-all" placeholder="Bela Vista" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Cidade</label>
                      <input type="text" value={regData.city} onChange={e => setRegData({ ...regData, city: e.target.value })}
                        className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-slate-900 font-medium transition-all" placeholder="São Paulo" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">UF</label>
                      <input type="text" value={regData.state} onChange={e => setRegData({ ...regData, state: e.target.value.toUpperCase().slice(0, 2) })}
                        className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-slate-900 font-medium transition-all text-center" placeholder="SP" maxLength={2} />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
                  <Icons.AlertTriangle size={16} /> <span>{error}</span>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setRegStep(1)} className="flex-1 py-5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all">← Voltar</button>
              <button onClick={() => { setError(''); setRegStep(3); }} disabled={!canAdvanceStep2}
                className="flex-[2] py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                Ir para Pagamento <Icons.ChevronDown className="-rotate-90 w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {regStep === 3 && (
          <div className="animate-fadeIn">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-lg p-8 md:p-10 space-y-7">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Pagamento Seguro</h3>
                <p className="text-sm font-medium text-slate-500 mt-2">Escolha como prefere iniciar sua assinatura.</p>
              </div>

              {/* Payment Method Toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setPaymentMethod('PIX')}
                  className={`py-4 rounded-xl border-2 font-black text-sm transition-all ${paymentMethod === 'PIX' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-500 hover:border-emerald-200'}`}>
                  Pix (Aprovação Imediata)
                </button>
                <button onClick={() => setPaymentMethod('CREDIT_CARD')}
                  className={`py-4 rounded-xl border-2 font-black text-sm transition-all ${paymentMethod === 'CREDIT_CARD' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-500 hover:border-emerald-200'}`}>
                  Cartão de Crédito
                </button>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Total a Pagar</span>
                  <span className="text-2xl font-black text-emerald-600">
                    {paymentService.formatCurrency(paymentService.calculateTotalForCycle(selectedPlan?.basePrice || 0, regData.cycle, selectedPlan?.discounts?.[regData.cycle] || 0))}
                  </span>
                </div>

                {paymentMethod === 'PIX' && (
                  <div className="text-center space-y-3 py-4">
                    <Icons.Zap className="w-8 h-8 mx-auto text-emerald-500 opacity-50" />
                    <p className="text-sm text-slate-600 font-medium">O código PIX será gerado no próximo passo.</p>
                  </div>
                )}

                {paymentMethod === 'CREDIT_CARD' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Nome no Cartão</label>
                      <input type="text" value={cardData.holderName} onChange={e => setCardData({ ...cardData, holderName: e.target.value.toUpperCase() })}
                        className="w-full p-4 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium text-slate-900" placeholder="Como impresso no cartão" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Número do Cartão</label>
                      <input type="text" value={cardData.number} onChange={e => setCardData({ ...cardData, number: paymentService.formatCardNumber(e.target.value) })}
                        className="w-full p-4 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium text-slate-900" placeholder="0000 0000 0000 0000" maxLength={19} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Validade (MM/YY)</label>
                        <input type="text" value={`${cardData.expMonth ? cardData.expMonth + '/' : ''}${cardData.expYear}`} onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          const m = val.slice(0, 2);
                          const y = val.slice(2, 4);
                          setCardData({ ...cardData, expMonth: m, expYear: y });
                        }}
                          className="w-full p-4 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium text-slate-900 center" placeholder="MM/YY" maxLength={5} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">CVV</label>
                        <input type="text" value={cardData.cvv} onChange={e => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                          className="w-full p-4 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium text-slate-900 center" placeholder="123" maxLength={4} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Opções de Parcelamento</label>
                      <select value={selectedInstallment} onChange={e => setSelectedInstallment(Number(e.target.value))}
                        className="w-full p-4 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-bold text-slate-800">
                        {paymentService.getInstallmentOptions(paymentService.calculateTotalForCycle(selectedPlan?.basePrice || 0, regData.cycle, selectedPlan?.discounts?.[regData.cycle] || 0), regData.cycle).map(opt => (
                          <option key={opt.installments} value={opt.installments}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setRegStep(2)} className="flex-1 py-5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all">← Voltar</button>
              <button onClick={() => setRegStep(4)} disabled={paymentMethod === 'CREDIT_CARD' && (cardData.number.length < 15 || !cardData.holderName || cardData.cvv.length < 3)}
                className="flex-[2] py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                Revisar Resumo <Icons.ChevronDown className="-rotate-90 w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {regStep === 4 && (
          <div className="animate-fadeIn">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-lg overflow-hidden">
              {/* Summary Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-8 text-white text-center">
                <Icons.Sparkles className="w-8 h-8 mx-auto mb-3 opacity-80" />
                <h3 className="text-2xl font-black mb-1">Resumo da Assinatura</h3>
                <p className="text-emerald-100 text-sm font-medium">Revise e confirme a criação da sua clínica.</p>
              </div>

              <div className="p-8 space-y-5">
                {/* Plan */}
                <div className="flex items-center justify-between p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Plano Selecionado</p>
                    <p className="text-xl font-black text-slate-900">{selectedPlan?.name || regData.planId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-600">{paymentService.formatCurrency(paymentService.calculateTotalForCycle(selectedPlan?.basePrice || 0, regData.cycle, selectedPlan?.discounts?.[regData.cycle] || 0))}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">{regData.cycle} • {paymentMethod === 'PIX' ? 'Pagamento via PIX' : `${selectedInstallment}x no Cartão`}</p>
                  </div>
                </div>

                {/* Data Summary */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Responsável', value: regData.name },
                    { label: 'E-mail', value: regData.email },
                    { label: 'WhatsApp', value: regData.phone },
                    { label: regData.personType === 'PF' ? 'CPF' : 'CNPJ', value: regData.personType === 'PF' ? regData.cpf : regData.cnpj },
                    ...(regData.personType === 'PJ' ? [{ label: 'Clínica', value: regData.fantasyName || regData.clinicName || '—' }] : []),
                  ].map(item => (
                    <div key={item.label} className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.label}</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{item.value || '—'}</p>
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
                    <Icons.AlertTriangle size={16} /> <span>{error}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setRegStep(3)} className="flex-1 py-5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all">← Voltar</button>
              <button onClick={handleRegister} disabled={regStatus === 'loading'}
                className="flex-[2] py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-200 hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                {regStatus === 'loading' ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processando...</>) : (<><Icons.Lock className="w-5 h-5" /> Confirmar e Pagar</>)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 pt-28 pb-20 px-4 flex items-center justify-center">
      <div className="max-w-lg w-full text-center space-y-8 animate-fadeIn">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-12 space-y-8">
          <div className="mx-auto w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner animate-bounce">
            <Icons.CheckCircle size={40} />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Clínica Provisionada!</h2>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">Seu universo clínico foi criado com sucesso. Agora você pode fazer login para começar a configurar seus profissionais e atender seus pacientes.</p>
          </div>

          <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-5 text-left">
            <div className="w-14 h-14 bg-white shadow-sm rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
              <Icons.Lock size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Senha Padrão Inicial</p>
              <p className="text-3xl font-mono text-emerald-600 font-black tracking-widest">123</p>
              <p className="text-[9px] text-slate-400 font-bold mt-1">Altere após o primeiro acesso</p>
            </div>
          </div>

          <button onClick={() => setView('LOGIN')}
            className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3">
            <Icons.ChevronDown className="-rotate-90 w-5 h-5" /> Acessar minha conta
          </button>
        </div>
      </div>
    </div>
  );

  const renderPricing = () => (
    <div className="w-full bg-slate-50 font-sans py-32 px-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto text-center mb-24">
        <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-emerald-200 bg-white shadow-sm mb-6">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
          <span className="text-[9px] font-black tracking-[0.2em] text-emerald-800 uppercase">Investimento com Retorno Real</span>
        </div>
        <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">Potencialize sua <span className="text-emerald-500 italic">Clínica.</span></h2>
        <p className="text-lg text-slate-500 max-w-xl mx-auto font-medium">Modelos de assinatura pensados para escalar sua produtividade e faturamento.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-6xl mx-auto items-stretch">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white border border-slate-100 rounded-[40px] p-10 flex flex-col shadow-2xl shadow-slate-200/50 hover:border-emerald-200 hover:shadow-emerald-500/5 transition-all group relative">
            {plan.id === 'PROFESSIONAL' && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-6 py-2 rounded-full shadow-lg">Mais Escolhido</div>
            )}
            
            <div className="mb-10">
              <h3 className="text-2xl font-black text-slate-900 mb-1">{plan.name}</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{plan.maxProfessionals === 0 ? 'Individual' : 'Equipe'}</p>
            </div>
            
            <div className="mb-10 flex items-baseline gap-1">
              <span className="text-sm font-black text-slate-400 uppercase tracking-tighter">R$</span>
              <span className="text-5xl font-black text-slate-900 tracking-tighter">{plan.basePrice}</span>
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px] ml-1">/mês</span>
            </div>

            <p className="text-xs text-slate-500 mb-10 font-medium leading-relaxed border-b border-slate-50 pb-8">{plan.description}</p>

            <div className="space-y-4 mb-12 flex-grow">
              <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <div className="size-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Icons.CheckCircle size={14} />
                </div>
                <span>{plan.maxProfessionals === 0 ? '1 Profissional Autônomo' : `${1 + plan.maxProfessionals} Profissionais`}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <div className="size-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Icons.CheckCircle size={14} />
                </div>
                <span>Pacientes Ilimitados</span>
              </div>
              {plan.features.map((feature: string) => (
                <div key={feature} className="flex items-center gap-3 text-[11px] font-black uppercase tracking-wider text-slate-600">
                  <div className="size-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Icons.CheckCircle size={14} />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => {
                setRegData({...regData, planId: plan.id});
                setView('REGISTER');
              }}
              className={`w-full py-5 rounded-[20px] font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl ${plan.id === 'PROFESSIONAL' ? 'bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-700' : 'bg-slate-50 text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-slate-200/20'}`}
            >
              Assinar agora
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLogin = () => (
    <div className="relative w-full max-w-lg mt-24 mb-24 animate-fadeIn px-4" style={{ zIndex: 10 }}>
      <div className="text-center mb-8">
        <button
          onClick={() => setView('LANDING')}
          className="text-4xl font-black text-white tracking-tight drop-shadow-2xl hover:scale-105 transition-all"
        >
          Control<span className={`${loginMode === 'ADMIN' ? 'text-blue-400' : 'text-emerald-400'}`}>Clin</span>
        </button>
      </div>

      <div className="bg-white/95 backdrop-blur-3xl border border-emerald-100 rounded-[40px] overflow-hidden shadow-2xl shadow-black/30 animate-scaleIn">

        <div className="flex border-b border-slate-100">
          <button
            type="button"
            onClick={() => { setLoginMode('ADMIN'); setError(''); }}
            className={`flex-1 py-5 text-sm font-black text-center transition-all duration-300 relative ${loginMode === 'ADMIN' ? 'text-blue-600' : 'text-slate-400 hover:text-blue-400'}`}
          >
            {loginMode === 'ADMIN' && <div className="absolute bottom-0 left-[15%] right-[15%] h-[4px] bg-blue-500 rounded-full" />}
            Gestor
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('PROFESSIONAL'); setError(''); }}
            className={`flex-1 py-5 text-sm font-black text-center transition-all duration-300 relative ${loginMode === 'PROFESSIONAL' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-400'}`}
          >
            {loginMode === 'PROFESSIONAL' && <div className="absolute bottom-0 left-[15%] right-[15%] h-[4px] bg-emerald-500 rounded-full" />}
            Profissional
          </button>
        </div>

        <div className="p-10 space-y-6">
          <div className={`rounded-2xl p-6 border transition-all duration-500 ${loginMode === 'ADMIN' ? 'bg-blue-50 border-blue-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] mb-2 ${loginMode === 'ADMIN' ? 'text-blue-600' : 'text-emerald-600'}`}>
              {loginMode === 'ADMIN' ? 'Visão Estratégica: GESTOR' : 'Excelência Clínica: PROFISSIONAL'}
            </h3>
            <p className="text-[11px] text-slate-700 font-bold leading-relaxed">
              {loginMode === 'ADMIN'
                ? 'Auditoria completa, análise epidemiológica e performance de profissionais em tempo real.'
                : 'Prontuários dinâmicos, antropometria avançada e fidelização de pacientes com ciência.'}
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-2xl border border-red-200 flex items-center gap-2">
              <Icons.AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-800 mb-2 uppercase tracking-widest">Slug da Clínica</label>
              <div className="flex rounded-2xl overflow-hidden border border-slate-200 focus-within:border-emerald-500 transition-colors bg-white">
                <span className="inline-flex items-center px-4 bg-slate-50 text-slate-400 text-xs font-bold border-r border-slate-100">https://</span>
                <input type="text" required value={slug} onChange={(e) => setSlug(e.target.value)} className="flex-1 px-4 py-3.5 bg-transparent text-slate-900 text-sm focus:outline-none" placeholder="control" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-dark mb-2 uppercase tracking-widest">E-mail</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl bg-white text-slate-900 focus:outline-none focus:border-emerald-500 text-sm shadow-sm" placeholder="seu@email.com" />
            </div>

            <div>
              <label className="block text-[10px] font-black text-dark mb-2 uppercase tracking-widest">Senha</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl bg-white text-slate-900 focus:outline-none focus:border-emerald-500 text-sm shadow-sm" placeholder="••••••••" />
            </div>

            <button type="submit" disabled={isSubmitting} className={`w-full py-5 rounded-[20px] flex items-center justify-center gap-3 text-white font-black text-lg transition-all shadow-xl active:scale-[0.98] ${isSubmitting ? 'bg-slate-400' : loginMode === 'ADMIN' ? 'bg-blue-600 shadow-blue-500/30 hover:shadow-blue-500/50 hover:bg-blue-700' : 'bg-emerald-600 shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:bg-emerald-700'}`}>
              {isSubmitting ? 'Autenticando...' : `Entrar como ${loginMode === 'ADMIN' ? 'Gestor' : 'Profissional'}`}
            </button>

            <button type="button" onClick={() => setView('LANDING')} className="w-full py-2 text-[10px] text-slate-400 hover:text-emerald-500 font-bold uppercase tracking-widest transition-all">
              Voltar para início
            </button>

            <div className="pt-4 border-t border-secondary/20 mt-4">
              <a href="/#/patient/login" className={`w-full py-3 flex items-center justify-center gap-2 font-black text-sm uppercase tracking-wider transition-all rounded-2xl ${loginMode === 'ADMIN' ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'}`}>
                <Icons.User className="h-4 w-4" />
                Sou Paciente
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const isCleanView = view === 'LANDING' || view === 'PRICING' || view === 'REGISTER' || view === 'SUCCESS';

  return (
    <div className={`min-h-screen w-full relative ${isCleanView ? 'bg-white overflow-y-auto' : 'bg-slate-950 overflow-y-auto lg:overflow-hidden'} transition-colors duration-700`}>

      {/* Background (only visible when outside landing) */}
      <div
        className={`fixed inset-0 transition-opacity duration-1000 ${isCleanView ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{
          zIndex: 0,
          backgroundImage: `url("${backgroundImage}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
      </div>

      {/* Header / Nav */}
      <header className={`fixed top-0 left-0 right-0 h-20 px-4 md:px-6 lg:px-12 flex items-center justify-between z-50 transition-all duration-500 backdrop-blur-xl ${isCleanView ? 'bg-white/95 border-b border-emerald-100' : 'bg-emerald-950/90 border-b border-emerald-900/50'}`}>
        <button onClick={() => setView('LANDING')} className={`text-2xl font-black tracking-tighter ${isCleanView ? 'text-slate-900' : 'text-white'}`}>
          Control<span className={`${isCleanView ? 'text-emerald-500' : 'text-emerald-400'}`}>Clin</span>
        </button>

        <div className="hidden lg:flex items-center gap-6 ml-10">
          <button onClick={() => setView('LANDING')} className={`text-[10px] font-black uppercase tracking-widest ${view === 'LANDING' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-500'}`}>Início</button>
        </div>

        <div className="flex items-center gap-3 md:gap-4 ml-auto">
          <button
            onClick={() => setView('LOGIN')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isCleanView ? 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200' : 'bg-white/10 hover:bg-white/20 text-white'}`}
          >
            Entrar
          </button>
          <button
            onClick={() => setView('PRICING')}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all"
          >
            Assinatura
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative w-full min-h-screen flex flex-col items-center justify-center pt-20" style={{ zIndex: 10 }}>
        {view === 'LANDING' && renderLanding()}
        {view === 'LOGIN' && renderLogin()}
        {view === 'REGISTER' && renderRegister()}
        {view === 'SUCCESS' && renderSuccess()}
        {view === 'PRICING' && renderPricing()}
      </div>
    </div>
  );
};

export default Login;