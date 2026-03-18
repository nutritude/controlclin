import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../services/db';
import { User, Clinic, Role } from '../types';
import { Icons } from '../constants';

import { saasService, PlanType, PaymentCycle } from '../services/saasService';

interface LoginProps {
  onLogin: (user: User, clinic: Clinic, loginMode: 'ADMIN' | 'PROFESSIONAL') => void;
}

type LoginMode = 'ADMIN' | 'PROFESSIONAL';
type ViewState = 'LANDING' | 'LOGIN' | 'REGISTER' | 'SUCCESS';

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

  // Registration State
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    phone: '',
    clinicName: '',
    planId: 'PROFESSIONAL' as PlanType,
    cycle: 'monthly' as PaymentCycle
  });
  const [regStatus, setRegStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const containerRef = useRef<HTMLDivElement>(null);

  // Sorteia a imagem de fundo ao montar o componente ou mudar para LOGIN/REGISTER
  useEffect(() => {
    if (view === 'LOGIN' || view === 'REGISTER' || view === 'SUCCESS') {
      const idx = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
      setBackgroundImage(BACKGROUND_IMAGES[idx]);
    }
  }, [view]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegStatus('loading');
    setError('');
    try {
      await saasService.registerFromLandingPage({
        name: regData.name,
        email: regData.email,
        phone: regData.phone,
        planId: regData.planId,
        cycle: regData.cycle
      });
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

  const renderRegister = () => (
    <div className="relative w-full max-w-xl animate-fadeIn mt-24 mb-12 px-4" style={{ zIndex: 10 }}>
      <div className="bg-white/95 backdrop-blur-3xl border border-white/50 rounded-[40px] overflow-hidden shadow-2xl p-10 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-dark tracking-tight">Comece sua Jornada</h2>
          <p className="text-slate-500 text-sm font-medium">Provisionamento imediato do seu workspace.</p>
        </div>

        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-black text-dark mb-2 uppercase tracking-widest">Nome Completo</label>
            <input
              required
              type="text"
              value={regData.name}
              onChange={e => setRegData({ ...regData, name: e.target.value })}
              className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
              placeholder="Ex: Dr. João Silva"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-dark mb-2 uppercase tracking-widest">E-mail</label>
            <input
              required
              type="email"
              value={regData.email}
              onChange={e => setRegData({ ...regData, email: e.target.value })}
              className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
              placeholder="joao@clinica.com"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-dark mb-2 uppercase tracking-widest">WhatsApp</label>
            <input
              required
              type="tel"
              value={regData.phone}
              onChange={e => setRegData({ ...regData, phone: e.target.value })}
              className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
              placeholder="(11) 99999-9999"
            />
          </div>
          <div className="md:col-span-2 space-y-4">
            <label className="block text-xs font-black text-dark mb-2 uppercase tracking-widest text-center">Escolha seu Plano</label>
            <div className="grid grid-cols-2 gap-4">
              {['ESSENTIAL', 'PROFESSIONAL'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setRegData({ ...regData, planId: p as PlanType })}
                  className={`p-6 rounded-3xl border-2 transition-all text-left ${regData.planId === p
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-100 bg-white hover:border-emerald-200'}`}
                >
                  <p className={`font-black text-lg ${regData.planId === p ? 'text-emerald-600' : 'text-slate-900'}`}>{p === 'ESSENTIAL' ? 'Essencial' : 'Pro'}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {p === 'ESSENTIAL' ? 'R$ 147/mês' : 'R$ 197/mês'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="md:col-span-2 text-red-500 text-xs font-bold text-center">{error}</p>}

          <div className="md:col-span-2 pt-4">
            <button
              disabled={regStatus === 'loading'}
              type="submit"
              className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {regStatus === 'loading' ? 'Provisionando...' : 'Criar minha Clínica agora'}
            </button>
          </div>
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => setView('LANDING')}
              className="w-full py-2 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest"
            >
              ← Voltar
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="relative w-full max-w-lg text-center p-12 bg-white/95 backdrop-blur-3xl rounded-[40px] shadow-2xl space-y-8 animate-fadeIn mt-24 mb-12 px-4" style={{ zIndex: 10 }}>
      <div className="mx-auto w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
        <Icons.CheckCircle size={48} />
      </div>
      <div className="space-y-4">
        <h2 className="text-4xl font-black text-dark tracking-tight">Workspace Pronto!</h2>
        <p className="text-slate-600 font-medium">Provisionamos sua clínica com sucesso. Verifique seu e-mail para os dados de acesso iniciais.</p>
      </div>
      <div className="p-6 bg-emerald-50 rounded-[28px] border border-emerald-100 flex items-center gap-4 text-left">
        <div className="w-12 h-12 bg-white shadow-sm rounded-xl flex items-center justify-center text-emerald-600">
          <Icons.Lock size={24} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-dark">Senha Padrão Temporal</p>
          <p className="text-xl font-mono text-emerald-600 font-black">123</p>
        </div>
      </div>
      <button
        onClick={() => setView('LOGIN')}
        className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20"
      >
        Acessar minha conta
      </button>
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

  return (
    <div className={`min-h-screen w-full relative ${view === 'LANDING' ? 'bg-white overflow-y-auto' : 'bg-slate-950 overflow-y-auto lg:overflow-hidden'} transition-colors duration-700`}>

      {/* Background (only visible when outside landing) */}
      <div
        className={`fixed inset-0 transition-opacity duration-1000 ${view === 'LANDING' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
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
      <header className={`fixed top-0 left-0 right-0 h-20 px-4 md:px-6 lg:px-12 flex items-center justify-between z-50 transition-all duration-500 backdrop-blur-xl ${view === 'LANDING' ? 'bg-white/95 border-b border-emerald-100' : 'bg-emerald-950/90 border-b border-emerald-900/50'}`}>
        <button onClick={() => setView('LANDING')} className={`text-2xl font-black tracking-tighter ${view === 'LANDING' ? 'text-slate-900' : 'text-white'}`}>
          Control<span className={`${view === 'LANDING' ? 'text-emerald-500' : 'text-emerald-400'}`}>Clin</span>
        </button>
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => setView('LOGIN')}
            className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-black transition-all ${view === 'LANDING' ? 'bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200' : 'bg-white/10 hover:bg-white/20 text-white'}`}
          >
            Entrar
          </button>
          <button
            onClick={() => setView('REGISTER')}
            className="px-4 md:px-6 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs md:text-sm font-black shadow-lg shadow-emerald-500/20 transition-all"
          >
            Teste Grátis
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative w-full min-h-screen flex flex-col items-center justify-center pt-20" style={{ zIndex: 10 }}>
        {view === 'LANDING' && renderLanding()}
        {view === 'LOGIN' && renderLogin()}
        {view === 'REGISTER' && renderRegister()}
        {view === 'SUCCESS' && renderSuccess()}
      </div>
    </div>
  );
};

export default Login;