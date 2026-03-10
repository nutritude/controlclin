
import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { Patient, Clinic } from '../../types';
import { Icons } from '../../constants';

interface PatientLoginProps {
    onLogin: (patient: Patient, clinic: Clinic) => void;
}

export const PatientLogin: React.FC<PatientLoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [slug, setSlug] = useState('control');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [bgIndex, setBgIndex] = useState(0);

    const backgrounds = [
        '/backgrounds/bg7.jpg',
        '/backgrounds/bg8.png'
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setBgIndex((prev) => (prev + 1) % backgrounds.length);
        }, 10000); // Mudar a cada 10 segundos
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await db.loginPatient(email.trim(), password.trim(), slug.trim());
            if (result) {
                onLogin(result.patient, result.clinic);
            } else {
                setError('E-mail, senha ou código da clínica inválidos.');
            }
        } catch (err: any) {
            setError(err?.message || 'Erro ao entrar na sua conta.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans">
            {/* Background Images with Fade Transition */}
            {backgrounds.map((bg, idx) => (
                <div
                    key={bg}
                    className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ${idx === bgIndex ? 'opacity-100' : 'opacity-0'}`}
                    style={{ backgroundImage: `url('${bg}')` }}
                />
            ))}

            {/* Dark/Glass Overlay */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"></div>

            <div className="w-full max-w-md mx-auto relative z-10 px-6">
                <div className="bg-white/95 backdrop-blur-xl p-8 sm:p-12 rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border border-white/20">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-600 text-white shadow-2xl shadow-emerald-500/30 mb-6 transform hover:rotate-6 transition-transform">
                            <Icons.Activity size={40} />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Control<span className="text-emerald-600">Clin</span> Pacientes</h1>
                        <p className="text-slate-500 font-medium mt-2">Bem-vindo(a) ao seu portal de saúde</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs rounded-2xl font-bold flex items-center gap-3">
                                <Icons.AlertTriangle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Código da Clínica</label>
                            <input
                                type="text"
                                required
                                value={slug}
                                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-slate-800 placeholder:text-slate-300 font-bold"
                                placeholder="control"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">E-mail</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-slate-800 placeholder:text-slate-300 font-bold"
                                placeholder="seu@email.com"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Sua Senha</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-slate-800 placeholder:text-slate-300 font-bold"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-emerald-600 text-white font-black text-lg rounded-2xl shadow-2xl shadow-emerald-500/30 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-6"
                        >
                            {loading ? 'Validando Acesso...' : 'Acessar Meu Portal'}
                        </button>
                    </form>

                    <div className="text-center mt-12 pt-8 border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.3em]">Ainda não tem os dados?</p>
                        <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">Sua senha é entregue pessoalmente pelo seu profissional durante a consulta clínica.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
