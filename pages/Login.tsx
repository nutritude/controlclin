

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../services/db';
import { User, Clinic, Role } from '../types';
import { Icons } from '../constants';

interface LoginProps {
  onLogin: (user: User, clinic: Clinic, loginMode: 'ADMIN' | 'PROFESSIONAL') => void;
}

type LoginMode = 'ADMIN' | 'PROFESSIONAL';

const TOTAL_FRAMES = 80;
const FRAME_RATE = 12; // fps — suave sem sobrecarregar

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loginMode, setLoginMode] = useState<LoginMode>('PROFESSIONAL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [slug, setSlug] = useState('control');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const accentColor = loginMode === 'ADMIN' ? 'blue' : 'emerald';

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center p-4">

      {/* === ANIMATED BACKGROUND (Canvas) === */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 0 }}
      />

      {/* Overlay — tom ainda mais claro para ver melhor a animação e o fundo */}
      <div className="absolute inset-0 bg-black/5" style={{ zIndex: 1 }} />

      {/* Gradient accent overlay - suavizado */}
      <div
        className={`absolute inset-0 ${loginMode === 'ADMIN' ? 'bg-gradient-to-br from-blue-900/10 via-transparent to-slate-900/20' : 'bg-gradient-to-br from-emerald-900/10 via-transparent to-slate-900/20'}`}
        style={{ zIndex: 2 }}
      />

      {/* === LOGIN CARD (Glassmorphism) === */}
      <div className="relative w-full max-w-lg" style={{ zIndex: 10 }}>

        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-2xl">
            Control<span className={`${loginMode === 'ADMIN' ? 'text-blue-400' : 'text-emerald-400'}`}>Clin</span>
          </h1>
          <p className="text-white/80 text-sm mt-2 font-medium tracking-wide drop-shadow-md">Plataforma Inteligente de Saúde</p>
        </div>

        {/* Glass Card - Mais opaco e brilhante */}
        <div className="bg-white/85 backdrop-blur-3xl border border-white/50 rounded-3xl overflow-hidden shadow-2xl shadow-black/30">

          {/* Mode Tabs */}
          <div className="flex border-b border-slate-200/50">
            <button
              type="button"
              onClick={() => { setLoginMode('ADMIN'); setError(''); }}
              className={`flex-1 py-4 text-sm font-bold text-center transition-all duration-300 relative ${loginMode === 'ADMIN'
                ? 'text-blue-600'
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              {loginMode === 'ADMIN' && <div className="absolute bottom-0 left-[15%] right-[15%] h-[3px] bg-blue-500 rounded-full shadow-lg shadow-blue-500/40" />}
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                Gestor
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('PROFESSIONAL'); setError(''); }}
              className={`flex-1 py-4 text-sm font-bold text-center transition-all duration-300 relative ${loginMode === 'PROFESSIONAL'
                ? 'text-emerald-600'
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              {loginMode === 'PROFESSIONAL' && <div className="absolute bottom-0 left-[15%] right-[15%] h-[3px] bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/40" />}
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Profissional
              </span>
            </button>
          </div>

          {/* Form Body */}
          <div className="p-8 space-y-6">

            {/* Context Info */}
            <div className={`rounded-xl p-4 border ${loginMode === 'ADMIN'
              ? 'bg-blue-50/80 border-blue-200'
              : 'bg-emerald-50/80 border-emerald-200'
              }`}>
              <h3 className={`text-xs font-black uppercase tracking-widest mb-1 ${loginMode === 'ADMIN' ? 'text-blue-700' : 'text-emerald-700'
                }`}>
                {loginMode === 'ADMIN' ? '🏢 Área Administrativa' : '🩺 Área Clínica'}
              </h3>
              <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                {loginMode === 'ADMIN'
                  ? 'Acesso completo: configurações da clínica, relatórios financeiros, auditoria e gestão de usuários.'
                  : 'Foco no atendimento: agenda pessoal, prontuário eletrônico, evolução clínica e planejamento nutricional.'
                }
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Slug */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">Slug da Clínica</label>
                <div className="flex rounded-xl overflow-hidden border border-slate-200 focus-within:border-slate-400 transition-colors shadow-sm">
                  <span className="inline-flex items-center px-3 bg-slate-100/80 text-slate-400 text-sm border-r border-slate-200">
                    https://
                  </span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="flex-1 min-w-0 block w-full px-3 py-2.5 bg-white/80 text-slate-800 placeholder-slate-300 text-sm focus:outline-none"
                    placeholder="control"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">E-mail de Acesso</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white/80 text-slate-800 placeholder-slate-300 focus:outline-none focus:border-slate-400 text-sm shadow-sm transition-colors"
                  placeholder={loginMode === 'ADMIN' ? "admin@clinica.com" : "doutor@clinica.com"}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">Senha</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white/80 text-slate-800 placeholder-slate-300 focus:outline-none focus:border-slate-400 text-sm shadow-sm transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 text-white font-black text-lg transition-all shadow-xl active:scale-[0.98] ${isSubmitting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : loginMode === 'ADMIN'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 shadow-blue-500/30'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-emerald-500/30'
                  }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <Icons.Activity />
                    <span>Entrar como {loginMode === 'ADMIN' ? 'Gestor' : 'Profissional'}</span>
                  </>
                )}
              </button>

              {/* Footer / Bypass */}
              <div className="pt-4 flex flex-col items-center gap-4">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] opacity-60">
                  ControlClin Security Protocol v3.4
                </p>

                <button
                  type="button"
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="text-[10px] text-red-400 hover:text-red-500 font-bold uppercase tracking-widest border-b border-red-400/20 pb-0.5"
                >
                  Limpar Cache e Sessão Forçado
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-white/20 text-[10px] uppercase font-bold tracking-[0.2em]">
            Powered by ControlClin — Intelligent Health Architecture
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;