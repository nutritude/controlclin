
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Clinic, Patient, Role } from '../types';
import { db } from '../services/db';
import { Icons } from '../constants';
import { WhatsAppService } from '../services/whatsappService';

interface SuccessCardProps {
    user?: User | null;
    clinic?: Clinic | null;
}

export const SuccessCard: React.FC<SuccessCardProps> = ({ user: initialUser, clinic: initialClinic }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [resolvedProfessional, setResolvedProfessional] = useState<{ name: string } | null>(null);
    const [resolvedClinic, setResolvedClinic] = useState<{ name: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            if (!id) return;
            setLoading(true);

            // 1. Fetch Patient
            const p = await db.getPatientById(id);
            setPatient(p);

            if (p) {
                // 2. Resolve Clinic
                if (initialClinic) {
                    setResolvedClinic(initialClinic);
                } else if (p.clinicId) {
                    const c = await db.getClinic(p.clinicId);
                    if (c) setResolvedClinic(c);
                }

                // 3. Resolve Professional
                if (initialUser && initialUser.role !== Role.SECRETARY) {
                    setResolvedProfessional({ name: initialUser.name });
                } else if (p.professionalId) {
                    const profs = await db.getProfessionals(p.clinicId);
                    const prof = profs.find(pr => pr.id === p.professionalId);
                    if (prof) setResolvedProfessional({ name: prof.name });
                }
            }
            setLoading(false);
        };
        fetchAll();
    }, [id, initialClinic, initialUser]);

    if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Carregando sua conquista...</div>;
    if (!patient) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Paciente não encontrado.</div>;

    // Sort history by date
    const history = [...(patient.anthropometryHistory || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const currentWeight = patient.anthropometry?.weight || 0;
    const currentLean = patient.anthropometry?.leanMass || 0;

    // Previous Record (Penultimate)
    let previousWeight = currentWeight;
    let previousLean = currentLean;

    // Initial Record (First ever)
    let initialWeight = currentWeight;
    let initialLean = currentLean;

    if (history.length > 0) {
        initialWeight = history[0].weight;
        initialLean = history[0].leanMass || 0;

        if (history.length > 1) {
            // If current matches the last in history, previous is the one before it
            const last = history[history.length - 1];
            if (last.weight === currentWeight) {
                previousWeight = history[history.length - 2].weight;
                previousLean = history[history.length - 2].leanMass || 0;
            } else {
                previousWeight = last.weight;
                previousLean = last.leanMass || 0;
            }
        }
    }

    const weightDiff = currentWeight - previousWeight;
    const leanDiff = currentLean - previousLean;
    const totalWeightDiff = currentWeight - initialWeight;

    const isLoss = weightDiff < 0;
    const absWeightDiff = Math.abs(weightDiff).toFixed(1);
    const absTotalWeightDiff = Math.abs(totalWeightDiff).toFixed(1);

    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 font-sans overflow-hidden relative">
            {/* Animated Background Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 blur-[120px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="max-w-md w-full relative z-10">
                {/* Back Button for internal navigation */}
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 text-gray-400 hover:text-white flex items-center gap-2 text-sm transition-colors"
                >
                    <Icons.Settings /> Voltar ao Prontuário
                </button>

                {/* The Card */}
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    {/* Header Image/Pattern */}
                    <div className="h-40 bg-gradient-to-br from-emerald-400 to-blue-600 relative flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 opacity-20">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="absolute border-2 border-white rounded-full" style={{
                                    width: `${(i + 1) * 100}px`,
                                    height: `${(i + 1) * 100}px`,
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)'
                                }}></div>
                            ))}
                        </div>
                        <div className="relative text-white flex flex-col items-center">
                            <span className="text-5xl mb-2">🏆</span>
                            <h1 className="text-2xl font-black uppercase tracking-widest">Conquista</h1>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 text-center">
                        <p className="text-emerald-400 font-bold text-sm uppercase tracking-widest mb-2">Resultados Alcançados</p>
                        <h2 className="text-3xl font-bold text-white mb-6">Parabéns, {patient.name.split(' ')[0]}!</h2>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            {/* Weight Box */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                                <span className="text-xs text-gray-400 uppercase font-bold mb-1">Peso</span>
                                <div className="text-3xl font-black text-white flex items-baseline">
                                    {absWeightDiff} <span className="text-sm ml-1 font-bold">kg</span>
                                </div>
                                <span className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${weightDiff === 0 ? 'bg-blue-500/20 text-blue-400' : isLoss ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {weightDiff === 0 ? '• Mantido' : isLoss ? '↓ Eliminados' : '↑ Ganhos'}
                                </span>
                                {history.length > 1 && totalWeightDiff !== weightDiff && (
                                    <span className="text-[9px] text-gray-500 mt-2 font-bold uppercase">
                                        Total: {totalWeightDiff < 0 ? '↓' : '↑'} {absTotalWeightDiff}kg acumulados
                                    </span>
                                )}
                            </div>

                            {/* Lean Mass Box */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                                <span className="text-xs text-gray-400 uppercase font-bold mb-1">Massa Magra</span>
                                <div className="text-3xl font-black text-emerald-400 flex items-baseline">
                                    {leanDiff === 0 ? '0.0' : leanDiff > 0 ? `+${leanDiff.toFixed(1)}` : leanDiff.toFixed(1)} <span className="text-sm ml-1 font-bold">kg</span>
                                </div>
                                <span className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                                    {history.length <= 1 ? 'Ponto de Partida' : 'Evolução Muscular'}
                                </span>
                            </div>
                        </div>

                        {/* Metaphor / Visual Impact */}
                        {isLoss && parseFloat(absWeightDiff) > 0 && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-8">
                                <p className="text-sm text-emerald-100 flex items-center justify-center gap-2">
                                    <span className="text-2xl">🔥</span>
                                    <span>Isso equivale a cerca de <b>{Math.floor(parseFloat(absWeightDiff) * 7700 / 500)} potes</b> de gordura eliminados!</span>
                                </p>
                            </div>
                        )}

                        {!isLoss && weightDiff === 0 && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-8">
                                <p className="text-sm text-blue-100 flex items-center justify-center gap-2">
                                    <span className="text-2xl">⚖️</span>
                                    <span>Peso estabilizado! Foco total na manutenção e recomposição corporal.</span>
                                </p>
                            </div>
                        )}

                        {/* Frase motivacional */}
                        <div className="space-y-4">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                <p className="text-gray-300 text-sm italic text-center leading-relaxed">"A constância é o que transforma o objetivo em realidade. Continue firme no propósito!"</p>
                            </div>

                            {/* Dica de próximo passo */}
                            <div className="bg-blue-500/10 border border-blue-400/20 rounded-2xl p-4 flex items-start gap-3">
                                <span className="text-xl mt-0.5">💡</span>
                                <div>
                                    <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">Próximo Passo</p>
                                    <p className="text-blue-100 text-sm">Agende sua próxima avaliação para continuarmos medindo sua evolução e ajustando o plano.</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 flex flex-col items-center">
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Seu acompanhamento por</p>
                                <p className="text-white font-bold text-lg">{resolvedProfessional?.name || 'Seu Nutricionista'}</p>
                                <p className="text-emerald-400 text-[11px] font-bold uppercase tracking-widest mt-1">{resolvedClinic?.name || 'ControlClin Health'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-6 flex flex-col gap-3">
                    {initialUser ? (
                        // --- VIEW DO PROFISSIONAL: Enviar para o paciente ---
                        <button
                            onClick={() => {
                                const text = WhatsAppService.getSuccessCardShareMessage(patient.name, patient.id, resolvedClinic?.name);
                                window.open(WhatsAppService.generateLink(patient.phone, text), '_blank');
                            }}
                            className="w-full bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <span className="text-xl">💬</span>
                            <span>Enviar Conquista ao Paciente</span>
                        </button>
                    ) : (
                        // --- VIEW DO PACIENTE: Compartilhar com amigos ---
                        <button
                            onClick={() => {
                                const text = WhatsAppService.getPatientSelfShareMessage(patient.name, patient.id);
                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-900/50 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <span className="text-xl">🚀</span>
                            <span>Compartilhar minha Conquista</span>
                        </button>
                    )}
                    <p className="text-gray-600 text-[10px] text-center uppercase font-bold tracking-tight">Powered by ControlClin Intelligent Health Architecture</p>
                </div>
            </div>
        </div>
    );
};
