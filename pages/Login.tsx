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

const TOTAL_FRAMES = 80;
const FRAME_RATE = 12;

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<ViewState>('LANDING');
  const [loginMode, setLoginMode] = useState<LoginMode>('PROFESSIONAL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [slug, setSlug] = useState('control');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // --- ANIMATION STATE ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const [animReady, setAnimReady] = useState(false);

  // Preload all frames
  useEffect(() => {
    let mounted = true;
    const images: HTMLImageElement[] = [];
    let loaded = 0;

    const fileNamePrefix = 'Usar_a_imagem_enviada_como_referncia_visual_princi_d6af91336a_';

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      const num = i.toString().padStart(3, '0');
      img.src = `/imagebk/${fileNamePrefix}${num}.jpg`;
      img.onload = () => {
        loaded++;
        if (loaded === TOTAL_FRAMES && mounted) {
          framesRef.current = images;
          setAnimReady(true);
        }
      };
      img.onerror = () => {
        loaded++;
        if (loaded === TOTAL_FRAMES && mounted) {
          framesRef.current = images;
          setAnimReady(true);
        }
      };
      images.push(img);
    }

    return () => { mounted = false; };
  }, []);

  // Canvas drawing loop
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const frames = framesRef.current;
    if (!canvas || !ctx || frames.length === 0) return;

    const frame = frames[currentFrameRef.current];
    if (frame && frame.complete && frame.naturalWidth > 0) {
      const imgRatio = frame.naturalWidth / frame.naturalHeight;
      const canvasRatio = canvas.width / canvas.height;

      let drawWidth, drawHeight, drawX, drawY;

      if (canvasRatio > imgRatio) {
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgRatio;
        drawX = 0;
        drawY = (canvas.height - drawHeight) / 2;
      } else {
        drawHeight = canvas.height;
        drawWidth = canvas.height * imgRatio;
        drawX = (canvas.width - drawWidth) / 2;
        drawY = 0;
      }

      ctx.drawImage(frame, drawX, drawY, drawWidth, drawHeight);
    }

    currentFrameRef.current = (currentFrameRef.current + 1) % TOTAL_FRAMES;
  }, []);

  // Start animation loop
  useEffect(() => {
    if (!animReady) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const interval = setInterval(drawFrame, 1000 / FRAME_RATE);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animReady, drawFrame]);

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
      {/* Seção de Abertura (Hero Section) */}
      <section className="relative w-full pt-40 pb-32 px-4 md:px-6 overflow-hidden bg-emerald-50/30 border-b border-emerald-100/50">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-emerald-200 bg-white shadow-sm mb-8 hover:scale-105 transition-transform">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black tracking-[0.2em] text-emerald-800 uppercase">Gestão de Alta Performance</span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.05] tracking-tight text-slate-900 mb-8 max-w-5xl">
            ControlClin: Onde o cuidado encontra a <span className="italic text-emerald-500">gestão</span>.
          </h1>
          <p className="text-lg md:text-2xl text-slate-500 font-medium leading-relaxed max-w-3xl mb-12">
            Uma plataforma pensada para Nutricionistas que amam o que fazem, Pacientes que buscam resultados e Gestores que valorizam a inteligência. Unimos o melhor da tecnologia e da humanização para transformar a sua clínica.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-16">
            <button onClick={() => setView('REGISTER')} className="px-10 py-5 rounded-full text-lg font-black text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-1">
              Experimente Grátis por 14 Dias
            </button>
            <button onClick={() => setView('LOGIN')} className="px-10 py-5 rounded-full text-lg font-black text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
              Acessar Minha Conta
            </button>
          </div>

          {/* Hero Main Screenshot */}
          <div className="w-full max-w-7xl relative group">
            <div className="bg-white rounded-[2.5rem] p-2 md:p-4 shadow-[0_40px_80px_-15px_rgba(16,185,129,0.12)] border border-emerald-100 relative overflow-hidden flex flex-col items-center">
              <img src="/screenshots/dashboard_main.png" alt="Dashboard Principal" className="w-full h-auto rounded-[1.5rem] border border-slate-100 shadow-sm transition-transform duration-700 hover:scale-[1.01]" />
            </div>
          </div>
        </div>
      </section>

      {/* Seção 1: Para o Profissional de Nutrição */}
      <section className="w-full py-32 px-4 md:px-6 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight">Sua paixão é cuidar. <br /><span className="text-emerald-500 italic">A nossa é cuidar de você.</span></h2>
            <p className="text-xl text-slate-600 leading-relaxed">Nós entendemos a sua jornada. Você se formou para transformar vidas, não para se perder em planilhas e papéis. O ControlClin foi desenhado por profissionais como você, para ser o seu braço direito, automatizando o que é repetitivo para que você possa focar no que realmente importa: o atendimento humanizado.</p>

            <div className="space-y-6 pt-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.Sparkles className="h-5 w-5 text-emerald-500" /> Inteligência Artificial que Trabalha por Você</h4>
                <p className="text-slate-600 font-medium">Enquanto outros sistemas oferecem apenas prontuários digitais, nossa IA (desenvolvida com a tecnologia Gemini) sugere termos técnicos, analisa históricos e gera insights, economizando seu tempo e enriquecendo suas consultas. É como ter um assistente especialista ao seu lado, 24/7.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.Activity className="h-5 w-5 text-emerald-500" /> Planejamento Alimentar sem Limites</h4>
                <p className="text-slate-600 font-medium">Vá além dos cálculos básicos. Com o ControlClin, você tem acesso a múltiplos protocolos de antropometria, um banco de alimentos completo e uma interface visual para montar planos alimentares que seus pacientes realmente vão amar e seguir.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.Monitor className="h-5 w-5 text-emerald-500" /> Liberdade e Flexibilidade</h4>
                <p className="text-slate-600 font-medium">Chega de ficar preso a um sistema engessado. Nossa plataforma é 100% web, com um design que se adapta ao seu fluxo de trabalho, e não o contrário.</p>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full relative group">
            <div className="bg-white rounded-[2rem] p-2 md:p-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 relative text-center">
              <img src="/screenshots/professional_mode.png" alt="Modo Profissional" className="w-full h-auto rounded-[1.5rem] border border-slate-50 transition-transform duration-700 hover:scale-[1.01]" />
              <img src="/screenshots/relatorio_ind.png" alt="Relatórios" className="w-full h-auto rounded-[1.5rem] border border-slate-50 transition-transform duration-700 hover:scale-[1.01] mt-4" />
            </div>
          </div>
        </div>
      </section>

      {/* Seção 2: Para o Paciente */}
      <section className="w-full py-32 px-4 md:px-6 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-16">
          <div className="flex-1 space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight">Sua jornada de saúde, <br /><span className="text-emerald-500 italic">simples e na palma da sua mão.</span></h2>
            <p className="text-xl text-slate-600 leading-relaxed">Chega de dietas de papel e dúvidas perdidas no WhatsApp. Com o aplicativo ControlClin, você tem acesso direto ao seu plano alimentar, pode registrar seu progresso, tirar dúvidas e visualizar sua evolução de forma clara e motivadora. É a sua saúde, organizada e acessível como nunca antes.</p>

            <div className="space-y-6 pt-4">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.Smartphone className="h-5 w-5 text-emerald-500" /> Um Aplicativo que Motiva</h4>
                <p className="text-slate-600 font-medium">Diferente de apps genéricos, o nosso é uma extensão do cuidado do seu nutricionista. Visualize gráficos de progresso, receba lembretes e compartilhe suas conquistas com apenas um clique.</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.MessageCircle className="h-5 w-5 text-emerald-500" /> Comunicação Direta e Segura</h4>
                <p className="text-slate-600 font-medium">Esqueça a troca de e-mails e mensagens. Tenha um canal direto e seguro para se comunicar com seu profissional, garantindo que suas dúvidas sejam respondidas rapidamente.</p>
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

      {/* Seção 3: Para a Clínica */}
      <section className="w-full py-32 px-4 md:px-6 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight">Menos planilhas, mais estratégia. <br /><span className="text-emerald-500 italic">Sua clínica na velocidade da inteligência.</span></h2>
            <p className="text-xl text-slate-600 leading-relaxed">Gerenciar uma clínica é mais do que agendar consultas. É sobre tomar decisões inteligentes que garantam o crescimento e a saúde financeira do seu negócio. O ControlClin oferece um painel de gestão que transforma dados em decisões, de forma visual e intuitiva.</p>

            <div className="space-y-6 pt-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.TrendingUp className="h-5 w-5 text-emerald-500" /> Dashboard com IA</h4>
                <p className="text-slate-600 font-medium">Enquanto concorrentes focam em gestão geral, o ControlClin analisa seus dados e sugere ações estratégicas imediatas.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.DollarSign className="h-5 w-5 text-emerald-500" /> Financeiro sem Complicação</h4>
                <p className="text-slate-600 font-medium">DRE, fluxo de caixa, controle de pagamentos e relatórios que fazem sentido. Visão clara da sua saúde financeira.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.PieChart className="h-5 w-5 text-emerald-500" /> Visão 360°</h4>
                <p className="text-slate-600 font-medium">Do absenteísmo ao perfil de pacientes, tenha as informações que você precisa para crescer de fato.</p>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full relative group">
            <div className="bg-white rounded-[2rem] p-2 md:p-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 relative text-center">
              <img src="/screenshots/gestor_mode.png" alt="Modo Gestor" className="w-full h-auto rounded-[1.5rem] border border-slate-50 transition-transform duration-700 hover:scale-[1.01]" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-16 px-6 bg-white flex flex-col items-center gap-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Control<span className="text-emerald-500">Clin</span></h2>
        <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <a href="#" className="hover:text-emerald-500 transition-colors">Termos</a>
          <a href="#" className="hover:text-emerald-500 transition-colors">Privacidade</a>
          <a href="#" className="hover:text-emerald-500 transition-colors">Contato</a>
        </div>
        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-4">
          © 2026 ControlClin Sistemas de Gestão. Software de Alta Performance.
        </p>
      </footer>
    </div>
  );

  const renderRegister = () => (
    <div className="relative w-full max-w-xl animate-fadeIn mt-24 mb-12 px-4" style={{ zIndex: 10 }}>
      <div className="bg-white/95 backdrop-blur-3xl border border-white/50 rounded-[40px] overflow-hidden shadow-2xl p-10 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Comece sua Jornada</h2>
          <p className="text-slate-500 text-sm font-medium">Provisionamento imediato do seu workspace.</p>
        </div>

        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-black text-slate-800 mb-2 uppercase tracking-widest">Nome Completo</label>
            <input
              required
              type="text"
              value={regData.name}
              onChange={e => setRegData({ ...regData, name: e.target.value })}
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
              placeholder="Ex: Dr. João Silva"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-800 mb-2 uppercase tracking-widest">E-mail</label>
            <input
              required
              type="email"
              value={regData.email}
              onChange={e => setRegData({ ...regData, email: e.target.value })}
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
              placeholder="joao@clinica.com"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-800 mb-2 uppercase tracking-widest">WhatsApp</label>
            <input
              required
              type="tel"
              value={regData.phone}
              onChange={e => setRegData({ ...regData, phone: e.target.value })}
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
              placeholder="(11) 99999-9999"
            />
          </div>
          <div className="md:col-span-2 space-y-4">
            <label className="block text-xs font-black text-slate-800 mb-2 uppercase tracking-widest text-center">Escolha seu Plano</label>
            <div className="grid grid-cols-2 gap-4">
              {['ESSENTIAL', 'PROFESSIONAL'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setRegData({ ...regData, planId: p as PlanType })}
                  className={`p-6 rounded-3xl border-2 transition-all text-left ${regData.planId === p
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}
                >
                  <p className={`font-black text-lg ${regData.planId === p ? 'text-emerald-600' : 'text-slate-800'}`}>{p === 'ESSENTIAL' ? 'Essencial' : 'Pro'}</p>
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
              className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
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
      <div className="mx-auto w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
        <Icons.CheckCircle size={48} />
      </div>
      <div className="space-y-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Workspace Pronto!</h2>
        <p className="text-slate-600 font-medium">Provisionamos sua clínica com sucesso. Verifique seu e-mail para os dados de acesso iniciais.</p>
      </div>
      <div className="p-6 bg-slate-50 rounded-[28px] border border-slate-100 flex items-center gap-4 text-left">
        <div className="w-12 h-12 bg-white shadow-sm rounded-xl flex items-center justify-center text-emerald-500">
          <Icons.Lock size={24} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-800">Senha Padrão Temporal</p>
          <p className="text-xl font-mono text-emerald-600 font-black">123</p>
        </div>
      </div>
      <button
        onClick={() => setView('LOGIN')}
        className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all"
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

      <div className="bg-white/85 backdrop-blur-3xl border border-white/50 rounded-[40px] overflow-hidden shadow-2xl shadow-black/30 animate-scaleIn">

        <div className="flex border-b border-slate-200/50">
          <button
            type="button"
            onClick={() => { setLoginMode('ADMIN'); setError(''); }}
            className={`flex-1 py-5 text-sm font-black text-center transition-all duration-300 relative ${loginMode === 'ADMIN' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {loginMode === 'ADMIN' && <div className="absolute bottom-0 left-[15%] right-[15%] h-[3px] bg-blue-500 rounded-full" />}
            Gestor
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('PROFESSIONAL'); setError(''); }}
            className={`flex-1 py-5 text-sm font-black text-center transition-all duration-300 relative ${loginMode === 'PROFESSIONAL' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {loginMode === 'PROFESSIONAL' && <div className="absolute bottom-0 left-[15%] right-[15%] h-[3px] bg-emerald-500 rounded-full" />}
            Profissional
          </button>
        </div>

        <div className="p-10 space-y-6">
          <div className={`rounded-2xl p-4 border ${loginMode === 'ADMIN' ? 'bg-blue-50/80 border-blue-200' : 'bg-emerald-50/80 border-emerald-200'}`}>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${loginMode === 'ADMIN' ? 'text-blue-700' : 'text-emerald-700'}`}>
              {loginMode === 'ADMIN' ? 'Área Administrativa' : 'Área Clínica'}
            </h3>
            <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
              {loginMode === 'ADMIN' ? 'Gestão 360°, BI e Auditoria.' : 'Prontuários, Agenda e Bioimpedância.'}
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
              <div className="flex rounded-2xl overflow-hidden border border-slate-200 focus-within:border-slate-400 transition-colors bg-white/50">
                <span className="inline-flex items-center px-4 bg-slate-100 text-slate-400 text-xs font-bold border-r border-slate-200">https://</span>
                <input type="text" required value={slug} onChange={(e) => setSlug(e.target.value)} className="flex-1 px-4 py-3.5 bg-transparent text-slate-800 text-sm focus:outline-none" placeholder="control" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-800 mb-2 uppercase tracking-widest">E-mail</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl bg-white/50 text-slate-800 focus:outline-none focus:border-slate-400 text-sm shadow-sm" placeholder="seu@email.com" />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-800 mb-2 uppercase tracking-widest">Senha</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl bg-white/50 text-slate-800 focus:outline-none focus:border-slate-400 text-sm shadow-sm" placeholder="••••••••" />
            </div>

            <button type="submit" disabled={isSubmitting} className={`w-full py-5 rounded-[20px] flex items-center justify-center gap-3 text-white font-black text-lg transition-all shadow-xl active:scale-[0.98] ${isSubmitting ? 'bg-slate-400' : loginMode === 'ADMIN' ? 'bg-blue-600 shadow-blue-500/30' : 'bg-emerald-600 shadow-emerald-500/30'}`}>
              {isSubmitting ? 'Autenticando...' : `Entrar como ${loginMode === 'ADMIN' ? 'Gestor' : 'Profissional'}`}
            </button>

            <button type="button" onClick={() => setView('LANDING')} className="w-full py-2 text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest transition-all">
              Voltar para ínicio
            </button>

            <div className="pt-4 border-t border-slate-200/50 mt-4">
              <a href="/#/patient/login" className="w-full py-3 flex items-center justify-center gap-2 text-purple-600 hover:text-purple-700 font-black text-sm uppercase tracking-wider transition-all hover:bg-purple-50 rounded-2xl">
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

      {/* Background Animated Canvas (only visible when outside landing) */}
      <div className={`fixed inset-0 transition-opacity duration-1000 ${view === 'LANDING' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ zIndex: 0 }}>
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
      </div>

      {/* Header / Nav */}
      <header className={`fixed top-0 left-0 right-0 h-20 px-4 md:px-6 lg:px-12 flex items-center justify-between z-50 transition-all duration-500 backdrop-blur-xl ${view === 'LANDING' ? 'bg-white/90 border-b border-slate-200' : 'bg-slate-950/30 border-b border-white/5'}`}>
        <button onClick={() => setView('LANDING')} className={`text-2xl font-black tracking-tighter ${view === 'LANDING' ? 'text-slate-900' : 'text-white'}`}>
          Control<span className="text-emerald-500">Clin</span>
        </button>
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => setView('LOGIN')}
            className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-black transition-all ${view === 'LANDING' ? 'bg-slate-100 text-slate-800 hover:bg-slate-200' : 'bg-white/10 hover:bg-white/20 text-white'}`}
          >
            Entrar
          </button>
          <button
            onClick={() => setView('REGISTER')}
            className="px-4 md:px-6 py-2 md:py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs md:text-sm font-black shadow-lg shadow-emerald-500/20 transition-all"
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