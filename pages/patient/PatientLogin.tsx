
import React, { useState } from 'react';
import { db } from '../../services/db';
import { Patient, Clinic, Role } from '../../types';
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // For now, we reuse the db.login logic or create a specific one for patients.
            // Let's create a specific one in db.ts later, but for now we simulate.
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
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center p-6 sm:p-12">
            <div className="w-full max-w-sm mx-auto space-y-8">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white shadow-lg mb-4">
                        <Icons.Activity size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">ControlClin <span className="text-emerald-600">Pacientes</span></h1>
                    <p className="text-slate-500 text-sm mt-1">Acompanhe sua saúde e plano alimentar</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl font-bold">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">Código da Clínica</label>
                        <input
                            type="text"
                            required
                            value={slug}
                            onChange={(e) => setSlug(e.target.value.toLowerCase())}
                            className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800"
                            placeholder="Ex: clinica-abc"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">E-mail</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800"
                            placeholder="seu@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">Senha</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
                    >
                        {loading ? 'Entrando...' : 'Entrar no Portal'}
                    </button>
                </form>

                <div className="text-center pt-8">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Ainda não tem acesso?</p>
                    <p className="text-xs text-slate-500 mt-1">Sua senha é fornecida pelo seu profissional de saúde durante a consulta.</p>
                </div>
            </div>
        </div>
    );
};
