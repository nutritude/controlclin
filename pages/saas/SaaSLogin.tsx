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

    const FIXED_BACKGROUND = '/login_bg.jpg';

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">

            {/* Background Image with Global Rules */}
            <div
                className="fixed inset-0 transition-opacity duration-1000"
                style={{
                    zIndex: 0,
                    backgroundImage: `url("${FIXED_BACKGROUND}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            >
                <div className="absolute inset-0 bg-primary/30 backdrop-blur-[4px]" />
            </div>

            {/* Header / Logo */}
            <div className="text-center mb-8 relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent shadow-2xl shadow-accent/20 mb-4 border border-white/50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                <h1 className="text-3xl font-black text-dark tracking-tight">Control<span className="text-accent underline decoration-secondary">Clin</span></h1>
                <p className="text-secondary text-[11px] font-black uppercase tracking-[0.25em] mt-2">Backoffice Administration</p>
            </div>

            {/* Card */}
            <div className="w-full max-w-md bg-white/95 backdrop-blur-2xl border border-secondary/30 rounded-[32px] p-10 shadow-2xl relative z-10">
                <div className="text-center mb-8">
                    <h2 className="text-xl font-black text-dark mb-1">Acesso Administrativo</h2>
                    <p className="text-slate-500 text-xs font-medium">Gerenciamento de Planos, Assinaturas e Métricas</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-dark/60 mb-2 ml-1">
                            E-mail do Administrador
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-primary/20 border border-secondary/20 rounded-xl px-5 py-4 text-dark placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all font-medium"
                            placeholder="admin@controlclin.com"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-dark/60 mb-2 ml-1">
                            Senha
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-primary/20 border border-secondary/20 rounded-xl px-5 py-4 text-dark placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all font-medium"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                            <p className="text-xs font-bold text-red-500">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-accent hover:bg-dark text-white font-black text-sm rounded-xl shadow-xl shadow-accent/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
                    >
                        <svg className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {loading ? (
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            )}
                        </svg>
                        {loading ? 'Autenticando...' : 'Acessar Backoffice'}
                    </button>

                    <div className="pt-2 text-center text-white/20 text-[10px]">
                        Demo: admin@controlclin.com / admin123
                    </div>
                </form>
            </div>

            {/* Footer link */}
            <Link to="/" className="mt-8 flex items-center gap-2 text-dark hover:text-accent text-xs transition-colors font-black group relative z-10">
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar para o Sistema
            </Link>

            <div className="mt-12 text-slate-400 text-[10px] font-bold tracking-widest relative z-10">
                ControlClin SaaS Backoffice v1.0
            </div>
        </div>
    );
};

export { SaaSLogin };
