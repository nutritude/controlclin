

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

    // Novo padrão de nome de arquivo fornecido pelo usuário
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
      // Logic for "COVER" (Full Screen end-to-end)
      const imgRatio = frame.naturalWidth / frame.naturalHeight;
      const canvasRatio = canvas.width / canvas.height;

      let drawWidth, drawHeight, drawX, drawY;

      if (canvasRatio > imgRatio) {
        // Canvas is wider than image aspect ratio
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgRatio;
        drawX = 0;
        drawY = (canvas.height - drawHeight) / 2;
      } else {
        // Canvas is taller than image aspect ratio
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

    // Resize canvas to window
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

  const accentColor = loginMode === 'ADMIN' ? 'blue' : 'emerald';

  const renderLanding = () => (
    <div className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full max-w-7xl px-6 pt-32 pb-20 flex flex-col lg:flex-row items-center gap-16 min-h-[80vh]">
        <div className="flex-1 space-y-8 text-center lg:text-left z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
            <Icons.Star size={12} />
            Lançamento ControlClin NEXT
          </div>
          <h1 className="text-6xl lg:text-8xl font-black text-white leading-[0.95] tracking-tighter drop-shadow-2xl">
            A Inteligência que sua <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">Clínica</span> merece.
          </h1>
          <p className="text-xl text-slate-400 font-medium max-w-2xl leading-relaxed">
            Gestão 360°, Prontuário Inteligente e Analytics Avançado em uma plataforma única.
            Desenvolvido para profissionais que buscam excelência e alta performance.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch justify-center lg:justify-start gap-4 pt-6 max-w-xl mx-auto lg:mx-0">
            <div className="flex-1 flex bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
              <input
                type="email"
                value={quickEmail}
                onChange={(e) => setQuickEmail(e.target.value)}
                placeholder="Seu e-mail profissional"
                className="flex-1 bg-transparent px-5 text-white font-medium focus:outline-none placeholder:text-slate-600"
              />
              <button
                onClick={() => {
                  setRegData({ ...regData, email: quickEmail });
                  setView('REGISTER');
                }}
                className="px-8 py-4 bg-white text-slate-950 rounded-[14px] font-black text-sm hover:bg-slate-100 transition-all active:scale-95 whitespace-nowrap"
              >
                Começar Trial
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center lg:text-left pl-2">
            ✓ 14 dias grátis  ·  ✓ Sem cartão  ·  ✓ Setup em 30s
          </p>
        </div>

        {/* Hero Card / Dashboard Screenshot */}
        <div className="flex-1 relative w-full aspect-[4/3] max-w-2xl bg-slate-900/60 rounded-[40px] border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.15)] group animate-float">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-emerald-500/10" />

          {/* Main Screenshot Container */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/screenshots/dashboard_main.png"
              alt="Dashboard ControlClin"
              className="w-[90%] h-[90%] object-cover rounded-2xl shadow-2xl transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.classList.add('flex-col');
              }}
            />
            {/* Fallback Display if image missing */}
            <div className="hidden group-[.flex-col]:flex flex-col items-center justify-center p-12 text-center">
              <div className="p-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6 group-hover:scale-110 transition-transform duration-500">
                <Icons.Monitor size={48} />
              </div>
              <p className="text-2xl font-black text-white tracking-tight mb-2 opacity-50 uppercase">Inteligência de Dados</p>
              <p className="text-sm text-slate-500 font-medium max-w-xs leading-relaxed italic">
                (Aguardando: dashboard_main.png - Screenshot 4 Analytics)
              </p>
            </div>
          </div>

          <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-20">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/40" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
              <div className="w-3 h-3 rounded-full bg-green-500/40" />
            </div>
            <div className="px-4 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 text-[10px] text-white/40 font-bold tracking-widest uppercase">
              v1.0.4 Next Gen
            </div>
          </div>

          <div className="absolute bottom-10 left-10 right-10 p-6 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-all translate-y-8 group-hover:translate-y-0 duration-500 z-30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                <Icons.Zap />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-white uppercase tracking-wider leading-none mb-1">Performance Extrema</p>
                <p className="text-xs text-slate-400 font-bold">Relatórios 4x mais rápidos que o mercado.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Metrics */}
      <section className="w-full max-w-7xl px-6 py-12 flex flex-wrap justify-center gap-8 lg:gap-24 opacity-60">
        <div className="flex items-center gap-3 text-white border-r border-white/10 pr-12 last:border-0">
          <span className="text-3xl font-black text-indigo-400">+1.5k</span>
          <span className="text-xs font-bold leading-tight">Profissionais<br />Ativos</span>
        </div>
        <div className="flex items-center gap-3 text-white border-r border-white/10 pr-12 last:border-0">
          <span className="text-3xl font-black text-emerald-400">20M</span>
          <span className="text-xs font-bold leading-tight">Dados<br />Processados</span>
        </div>
        <div className="flex items-center gap-3 text-white border-r border-white/10 pr-12 last:border-0">
          <span className="text-3xl font-black text-purple-400">4.9/5</span>
          <span className="text-xs font-bold leading-tight">Satisfação<br />do Cliente</span>
        </div>
      </section>

      {/* DETAILED FEATURES SECTIONS */}

      {/* 1. MODO GESTOR */}
      <section className="w-full max-w-7xl px-6 py-32 flex flex-col lg:flex-row items-center gap-20">
        <div className="flex-1 order-2 lg:order-1 relative group">
          <div className="absolute -inset-4 bg-blue-500/20 rounded-[40px] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative aspect-video bg-slate-900 rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
            <img
              src="/screenshots/gestor_mode.png"
              alt="Modo Gestor"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/50"><div class="p-6 bg-blue-500/10 rounded-3xl text-blue-400 mb-4"><svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></div><p class="font-black uppercase tracking-widest text-[10px]">Aguardando: gestor_mode.png - Screenshot 5 Alertas</p></div>`;
              }}
            />
          </div>
        </div>
        <div className="flex-1 order-1 lg:order-2 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-widest">
            <Icons.AlertTriangle size={12} />
            Monitoramento Ativo
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">Alertas Clínicos <span className="text-blue-500">Inteligentes</span></h2>
          <p className="text-lg text-slate-400 leading-relaxed font-medium">
            Nunca perca um paciente de vista. O sistema detecta automaticamente exames críticos sem retorno, inatividade prolongada e riscos iminentes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            {[
              { title: 'Alta, Média e Baixa Prioridade', desc: 'Triagem automática e inteligente por grau de urgência.' },
              { title: 'Ação com 1 Clique', desc: 'WhatsApp, notificação ou resolução direta da tela.' },
              { title: 'Histórico de Alertas', desc: 'Rastreabilidade de todas as pendências e ações tomadas.' },
              { title: 'Análise por IA', desc: 'IA identifica padrões e sugere ações preventivas.' }
            ].map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-widest">
                  <Icons.Check size={14} />
                  {item.title}
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. AGENDA CLÍNICA */}
      <section className="w-full max-w-7xl px-6 py-32 flex flex-col lg:flex-row items-center gap-20">
        <div className="flex-1 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            <Icons.Calendar size={12} />
            Gestão de Horários
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight text-right lg:text-left">Agenda <span className="text-emerald-500">Multi-profissional</span></h2>
          <p className="text-lg text-slate-400 leading-relaxed font-medium text-right lg:text-left">
            Organize todos os profissionais da clínica em uma única visualização. Filtre por especialista, tipo de consulta e veja sua semana em segundos.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            {[
              { title: 'Filtro por Profissional', desc: 'Veja a agenda de cada especialista de forma isolada.' },
              { title: 'Visão Dia, Semana, Mês', desc: 'Múltiplas visualizações para planejamento ágil.' },
              { title: 'Status de Consulta', desc: 'AVA, ROT, e outros tipos com cores personalizadas.' },
              { title: 'Novo Agendamento Rápido', desc: 'Crie consultas em segundos diretamente na agenda.' }
            ].map((item, idx) => (
              <div key={idx} className="space-y-2 text-right lg:text-left">
                <div className="flex items-center justify-end lg:justify-start gap-2 text-emerald-400 font-black text-xs uppercase tracking-widest">
                  <Icons.Check size={14} />
                  {item.title}
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 relative group">
          <div className="absolute -inset-4 bg-emerald-500/20 rounded-[40px] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative aspect-video bg-slate-900 rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
            <img
              src="/screenshots/professional_mode.png"
              alt="Modo Profissional"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/50"><div class="p-6 bg-emerald-500/10 rounded-3xl text-emerald-400 mb-4"><svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div><p class="font-black uppercase tracking-widest text-[10px]">Aguardando: professional_mode.png - Screenshot 2 Agenda</p></div>`;
              }}
            />
          </div>
        </div>
      </section>

      {/* 3. PORTAL DO PACIENTE (Multiusuário) */}
      <section className="w-full max-w-7xl px-6 py-32 flex flex-col lg:flex-row items-center gap-20">
        {/* Mobile Frame Container */}
        <div className="relative w-full max-w-[320px] mx-auto aspect-[9/19.5] bg-slate-900 rounded-[3rem] border-8 border-slate-800 overflow-hidden shadow-2xl ring-1 ring-white/10">
          <img
            src="/screenshots/patient_portal.png"
            alt="Portal do Paciente"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/50"><div class="p-6 bg-purple-500/10 rounded-3xl text-purple-400 mb-4"><svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></div><p class="font-black uppercase tracking-widest text-[10px] text-center px-4">Aguardando: patient_portal.png - Screenshot 3 App</p></div>`;
            }}
          />
        </div>
        <div className="flex-1 space-y-8">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-600/20">
            <Icons.Smartphone size={32} />
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">Portal do <span className="text-purple-500">Paciente</span></h2>
          <p className="text-lg text-slate-400 leading-relaxed font-medium">
            Fidelize seus pacientes com uma experiência mobile premium. Planos alimentares, lembretes de hidratação e chat em um só app.
          </p>
          <ul className="space-y-4 pt-4">
            {[
              'Acesso 24/7 a prescrições e orientações',
              'Check-in de adesão ao plano nutricional',
              'Download de PDFs e Exames em um clique',
              'Comunicação direta e segura'
            ].map((text, idx) => (
              <li key={idx} className="flex items-center gap-3 text-white font-bold">
                <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400">
                  <Icons.Check size={14} />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. RELATÓRIO INDIVIDUAL & BI */}
      <section className="w-full max-w-7xl px-6 py-32 flex flex-col lg:flex-row items-center gap-20">
        <div className="flex-1 space-y-8">
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-600/20">
            <Icons.TrendingUp size={32} />
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">Relatórios <span className="text-orange-500">Individuais</span></h2>
          <p className="text-lg text-slate-400 leading-relaxed font-medium">
            Histórico completo de evolução de cada paciente. Gráficos interativos de composição corporal, assinatura antropométrica e cruzamento de marcadores.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            {[
              { title: 'Comparativo Inicial vs. Atual', desc: 'Variação percentual automática em todos os índices.' },
              { title: 'Assinatura Antropométrica', desc: 'Radar comparativo (Marco Zero vs. Atual).' },
              { title: 'Dinâmica de Composição', desc: 'Evolução visual de Massa Gorda vs. Massa Magra.' },
              { title: 'Auditoria Clínica por IA', desc: 'Resumo automático gerado por inteligência artificial.' }
            ].map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center gap-2 text-orange-400 font-black text-xs uppercase tracking-widest">
                  <Icons.Check size={14} />
                  {item.title}
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 relative group">
          <div className="absolute -inset-4 bg-orange-500/20 rounded-[40px] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative aspect-video bg-slate-900 rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
            <img
              src="/screenshots/relatorio_ind.png"
              alt="Relatório Individual"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>
      </section>

      {/* Lead Capture CTA Section */}
      <section className="w-full max-w-5xl px-6 py-32 text-center space-y-16">
        <h2 className="text-5xl lg:text-6xl font-black text-white tracking-widest uppercase">
          Pronto para o <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">próximo nível</span>?
        </h2>
        <div className="relative group p-[2px] rounded-[48px] bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 overflow-hidden">
          <div className="bg-slate-900/90 backdrop-blur-3xl rounded-[46px] p-10 lg:p-24 space-y-12 flex flex-col items-center">
            <p className="text-2xl text-slate-300 font-medium max-w-xl">Junte-se a centenas de clínicas que transformaram sua gestão.</p>
            <div className="w-full max-w-lg flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-white/[0.08] transition-all">
                  <Icons.Database className="text-indigo-400 mb-2" />
                  <p className="text-sm font-black text-white uppercase tracking-widest">Migração Grátis</p>
                  <p className="text-[10px] text-slate-500 font-bold">Importamos seus dados de outros softwares.</p>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-white/[0.08] transition-all">
                  <Icons.Smartphone className="text-emerald-400 mb-2" />
                  <p className="text-sm font-black text-white uppercase tracking-widest">Mobile First</p>
                  <p className="text-[10px] text-slate-500 font-bold">Tudo na palma da sua mão em qualquer lugar.</p>
                </div>
              </div>
              <button
                onClick={() => setView('REGISTER')}
                className="w-full h-20 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xl rounded-3xl shadow-2xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
              >
                Criar minha conta grátis
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 px-6 border-t border-white/5 flex flex-col items-center gap-6 opacity-40">
        <h2 className="text-xl font-black text-white tracking-widest uppercase">ControlClin</h2>
        <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-white">
          <a href="#">Termos</a>
          <a href="#">Privacidade</a>
          <a href="#">Contato</a>
        </div>
        <p className="text-[10px] text-white/50 uppercase font-bold tracking-[0.2em]">
          © 2026 ControlClin — Intelligent Health Architecture
        </p>
      </footer>
    </div>
  );

  const renderRegister = () => (
    <div className="relative w-full max-w-xl animate-fadeIn" style={{ zIndex: 10 }}>
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
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
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
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
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
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
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
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}
                >
                  <p className={`font-black text-lg ${regData.planId === p ? 'text-indigo-600' : 'text-slate-800'}`}>{p === 'ESSENTIAL' ? 'Essencial' : 'Pro'}</p>
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
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
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
    <div className="relative w-full max-w-lg text-center p-12 bg-white/95 backdrop-blur-3xl rounded-[40px] shadow-2xl space-y-8 animate-fadeIn" style={{ zIndex: 10 }}>
      <div className="mx-auto w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
        <Icons.CheckCircle size={48} />
      </div>
      <div className="space-y-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Workspace Pronto!</h2>
        <p className="text-slate-600 font-medium">Provisionamos sua clínica com sucesso. Verifique seu e-mail para os dados de acesso iniciais.</p>
      </div>
      <div className="p-6 bg-slate-50 rounded-[28px] border border-slate-100 flex items-center gap-4 text-left">
        <div className="w-12 h-12 bg-white shadow-sm rounded-xl flex items-center justify-center text-indigo-500">
          <Icons.Lock size={24} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-800">Senha Padrão Temporal</p>
          <p className="text-xl font-mono text-indigo-600 font-black">123</p>
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
    <div className="relative w-full max-w-lg mb-20 md:mb-0" style={{ zIndex: 10 }}>
      {/* Brand Header */}
      <div className="text-center mb-8">
        <button
          onClick={() => setView('LANDING')}
          className="text-4xl font-black text-white tracking-tight drop-shadow-2xl hover:scale-105 transition-all"
        >
          Control<span className={`${loginMode === 'ADMIN' ? 'text-blue-400' : 'text-emerald-400'}`}>Clin</span>
        </button>
      </div>

      {/* Glass Card */}
      <div className="bg-white/85 backdrop-blur-3xl border border-white/50 rounded-[40px] overflow-hidden shadow-2xl shadow-black/30 animate-scaleIn">

        {/* Mode Tabs */}
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

            <button type="submit" disabled={isSubmitting} className={`w-full py-5 rounded-[20px] flex items-center justify-center gap-3 text-white font-black text-lg transition-all shadow-xl active:scale-[0.98] ${isSubmitting ? 'bg-slate-400' : loginMode === 'ADMIN' ? 'bg-indigo-600 shadow-blue-500/30' : 'bg-emerald-600 shadow-emerald-500/30'}`}>
              {isSubmitting ? 'Autenticando...' : `Entrar como ${loginMode === 'ADMIN' ? 'Gestor' : 'Profissional'}`}
            </button>

            <button type="button" onClick={() => setView('LANDING')} className="w-full py-2 text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest transition-all">
              Voltar para ínicio
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen w-full relative ${view === 'LANDING' ? 'overflow-y-auto' : 'overflow-hidden flex items-center justify-center'} transition-all duration-700`}>

      {/* === ANIMATED BACKGROUND === */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ zIndex: 0 }} />
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-[2px]" style={{ zIndex: 1 }} />

      {/* Header / Nav */}
      <header className="fixed top-0 left-0 right-0 h-20 px-6 lg:px-12 flex items-center justify-between z-50 bg-slate-950/30 backdrop-blur-xl border-b border-white/5">
        <button onClick={() => setView('LANDING')} className="text-2xl font-black text-white tracking-tighter">
          Control<span className="text-indigo-500">Clin</span>
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setView('LOGIN')}
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-black transition-all"
          >
            Entrar
          </button>
          <button
            onClick={() => setView('REGISTER')}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-600/20 transition-all"
          >
            Teste Grátis
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative w-full min-h-screen pt-20 flex flex-col items-center" style={{ zIndex: 10 }}>
        {view === 'LANDING' && renderLanding()}
        {view === 'LOGIN' && renderLogin()}
        {view === 'REGISTER' && renderRegister()}
        {view === 'SUCCESS' && renderSuccess()}
      </div>

      {/* Floating Bottom Nav para Paciente */}
      {view === 'LANDING' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <a href="/#/patient/login" className="px-6 py-4 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl">
            <Icons.User size={16} />
            Acesso ao Portal do Paciente
          </a>
        </div>
      )}
    </div>
  );
};

export default Login;