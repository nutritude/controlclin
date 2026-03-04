import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { saasService } from '../../services/saasService';

const SaaSLogin: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        await new Promise(r => setTimeout(r, 800)); // UX delay
        const ok = saasService.login(email, password);
        if (ok) {
            navigate('/saas/dashboard');
        } else {
            setError('Credenciais inválidas.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#1a0b2e] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">

            {/* Background elements to create the purple vibe */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

            {/* Header / Logo */}
            <div className="text-center mb-8 relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl shadow-purple-500/40 mb-4 border border-white/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">ControlClin</h1>
                <p className="text-purple-300/60 text-[10px] font-black uppercase tracking-[0.2em] mt-1">SaaS Backoffice</p>
            </div>

            {/* Glassmorphism Card */}
            <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-10 shadow-2xl relative z-10">
                <div className="text-center mb-8">
                    <h2 className="text-xl font-bold text-white mb-1">Acesso Administrativo</h2>
                    <p className="text-white/40 text-xs">Gerenciamento de Planos, Assinaturas e Métricas</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2 ml-1">
                            E-mail do Administrador
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                            placeholder="admin@controlclin.com"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2 ml-1">
                            Senha
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                            <p className="text-xs font-bold text-red-400">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-purple-600/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
                    >
                        <svg className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {loading ? (
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            )}
                            {loading && <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>}
                        </svg>
                        {loading ? 'Autenticando...' : 'Acessar Backoffice'}
                    </button>

                    <div className="pt-2 text-center text-white/20 text-[10px]">
                        Demo: admin@controlclin.com / admin123
                    </div>
                </form>
            </div>

            {/* Footer link */}
            <Link to="/" className="mt-8 flex items-center gap-2 text-white/40 hover:text-white/60 text-xs transition-colors group relative z-10">
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar para o Sistema
            </Link>

            <div className="mt-12 text-white/10 text-[10px] font-medium tracking-widest relative z-10">
                ControlClin SaaS Backoffice v1.0
            </div>
        </div>
    );
};

export { SaaSLogin };
