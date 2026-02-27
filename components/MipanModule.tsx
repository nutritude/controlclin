import React, { useState, useEffect } from 'react';
import { MipanAssessment, Patient, User, Exam } from '../types';
import { MIPAN_QUESTIONS, MipanService } from '../services/mipanService';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer
} from 'recharts';
import { Icons } from '../constants';

interface MipanModuleProps {
    patient: Patient;
    user: User;
    db: any;
    isManagerMode?: boolean;
}

export const MipanModule: React.FC<MipanModuleProps> = ({ patient, user, db, isManagerMode }) => {
    const [assessments, setAssessments] = useState<MipanAssessment[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [currentAnswers, setCurrentAnswers] = useState<Record<number, number>>({});
    const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
    const [step, setStep] = useState(1); // 1 to 4 (Axis A, B, C, D)

    useEffect(() => {
        loadData();
    }, [patient.id]);

    const loadData = async () => {
        const data = await db.getMipanAssessments(patient.id);
        setAssessments(data);
    };

    const handleSave = async (isDraft: boolean = false) => {
        // Validation
        const questionsInCheck = MIPAN_QUESTIONS.map(q => q.id);
        const missing = questionsInCheck.filter(id => currentAnswers[id] === undefined);

        if (!isDraft && missing.length > 0) {
            alert("Por favor, responda todas as questões antes de finalizar.");
            return;
        }

        const assessmentData = MipanService.calculate(patient.id, currentAnswers);

        // Obter dados clínicos para insights
        const exams = await db.getExams(patient.id);
        const lastAnthro = patient.anthropometryHistory?.[0];

        const insights = MipanService.generateInsights(assessmentData, patient, lastAnthro, exams);

        const finalAssessment: Partial<MipanAssessment> = {
            ...assessmentData,
            insights: insights!,
            isDraft
        };

        await db.saveMipanAssessment(user, finalAssessment);
        setIsCreating(false);
        setCurrentAnswers({});
        setStep(1);
        loadData();
    };

    const selectedAssessment = assessments.find(a => a.id === selectedAssessmentId) || assessments[0];

    const radarData = selectedAssessment ? [
        { subject: 'Desregulação', A: selectedAssessment.scores.axisA, fullMark: 100 },
        { subject: 'Emocional', A: selectedAssessment.scores.axisB, fullMark: 100 },
        { subject: 'Estresse', A: selectedAssessment.scores.axisC, fullMark: 100 },
        { subject: 'Baixa Adesão', A: 100 - selectedAssessment.scores.axisD, fullMark: 100 },
    ] : [];

    const getClassificationColor = (cls: string) => {
        switch (cls) {
            case 'ALTO': return 'text-rose-600 bg-rose-50 border-rose-100';
            case 'MODERADO': return 'text-amber-600 bg-amber-50 border-amber-100';
            case 'LEVE': return 'text-blue-600 bg-blue-50 border-blue-100';
            default: return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        }
    };

    const formatClassification = (cls: string) => {
        switch (cls) {
            case 'ALTO': return 'Alto Risco Comportamental';
            case 'MODERADO': return 'Risco Moderado';
            case 'LEVE': return 'Risco Leve';
            default: return 'Perfil Comportamental Organizado';
        }
    };

    return (
        <div className={`mt-8 ${isManagerMode ? 'bg-gray-800' : 'bg-white'} border border-slate-200 shadow-sm rounded-2xl overflow-hidden`}>
            {/* Header */}
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                <div>
                    <h3 className={`text-xl font-black flex items-center gap-2 ${isManagerMode ? 'text-white' : 'text-slate-900'}`}>
                        <Icons.UserCheck className="w-6 h-6 text-indigo-500" />
                        Perfil Psicocomportamental MIPAN-20
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Modelo Integrado Aplicado à Nutrição</p>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-indigo-100 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                    >
                        <span>+</span> Nova Avaliação
                    </button>
                )}
            </div>

            {isCreating ? (
                <div className="p-8 animate-fadeIn">
                    {/* Progress Steps */}
                    <div className="flex gap-2 mb-10 overflow-x-auto pb-2">
                        {['A', 'B', 'C', 'D'].map((axis, i) => (
                            <div
                                key={axis}
                                className={`flex-1 min-w-[120px] p-4 rounded-2xl border-2 transition-all ${step === i + 1 ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white opacity-50'}`}
                            >
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Eixo {axis}</p>
                                <p className="text-[10px] font-bold text-slate-800 text-center">
                                    {axis === 'A' ? 'Desregulação' : axis === 'B' ? 'Emocional' : axis === 'C' ? 'Estresse' : 'Adesão'}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-6 max-w-3xl mx-auto">
                        {MIPAN_QUESTIONS.filter(q => q.axis === ['A', 'B', 'C', 'D'][step - 1]).map(q => (
                            <div key={q.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <p className="text-sm font-bold text-slate-800 mb-4">{q.id}. {q.text}</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {[0, 1, 2, 3, 4].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => setCurrentAnswers(prev => ({ ...prev, [q.id]: val }))}
                                            className={`p-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${currentAnswers[q.id] === val ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'}`}
                                        >
                                            <div className="text-xs mb-1">{val}</div>
                                            {val === 0 ? 'Nunca' : val === 1 ? 'Raramente' : val === 2 ? 'Às vezes' : val === 3 ? 'Freq.' : 'Sempre'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="flex justify-between pt-10 border-t items-center">
                            <button
                                onClick={() => step > 1 ? setStep(step - 1) : setIsCreating(false)}
                                className="text-slate-400 text-xs font-black uppercase tracking-widest px-6 py-2"
                            >
                                {step > 1 ? '« Voltar' : 'Cancelar'}
                            </button>

                            <div className="flex gap-4">
                                <button onClick={() => handleSave(true)} className="text-xs font-black text-slate-400 uppercase px-4">Salvar Rascunho</button>
                                {step < 4 ? (
                                    <button
                                        onClick={() => setStep(step + 1)}
                                        className="bg-slate-800 text-white px-10 py-3 rounded-2xl text-xs font-black shadow-xl"
                                    >
                                        Continuar ➔
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleSave(false)}
                                        className="bg-indigo-600 text-white px-12 py-4 rounded-2xl text-sm font-black shadow-xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        Finalizar Avaliação ✨
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : assessments.length > 0 ? (
                <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Radar e Scores */}
                        <div className="lg:col-span-5 space-y-6">
                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex items-center justify-center h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} axisLine={false} tick={false} />
                                        <Radar
                                            name="MIPAN"
                                            dataKey="A"
                                            stroke="#6366f1"
                                            strokeWidth={3}
                                            fill="#6366f1"
                                            fillOpacity={0.3}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Eixo A (Alimentar)</p>
                                    <p className="text-xl font-black text-slate-800">{selectedAssessment?.scores.axisA}%</p>
                                </div>
                                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Eixo B (Emocional)</p>
                                    <p className="text-xl font-black text-slate-800">{selectedAssessment?.scores.axisB}%</p>
                                </div>
                                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Eixo C (Estresse)</p>
                                    <p className="text-xl font-black text-slate-800">{selectedAssessment?.scores.axisC}%</p>
                                </div>
                                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Eixo D (Adesão)</p>
                                    <p className="text-xl font-black text-emerald-600">{selectedAssessment?.scores.axisD}%</p>
                                </div>
                            </div>
                        </div>

                        {/* ICRN e Insights */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className={`p-6 rounded-3xl border-2 flex flex-col sm:flex-row justify-between items-center gap-6 ${getClassificationColor(selectedAssessment?.classification || '')}`}>
                                <div className="text-center sm:text-left">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Índice ICRN</h4>
                                    <p className="text-4xl font-black leading-none">{selectedAssessment?.icrn}</p>
                                    <p className="text-xs font-bold mt-2 uppercase tracking-wide">{formatClassification(selectedAssessment?.classification || '')}</p>
                                </div>
                                <div className="bg-white/50 backdrop-blur p-4 rounded-2xl border border-white/20 min-w-[200px] text-center">
                                    <p className="text-[9px] font-black uppercase tracking-tighter mb-2">Segurança Clínica</p>
                                    <p className="text-[10px] italic font-medium leading-tight">Este instrumento identifica padrões comportamentais e não substitui avaliação médica ou psicológica.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Insights Automáticos MIPAN</h5>

                                {selectedAssessment?.insights.priorities.map((insight, i) => (
                                    <div key={i} className="flex gap-4 items-start bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0"></span>
                                        <p className="text-xs font-bold text-slate-700">{insight}</p>
                                    </div>
                                ))}

                                <div className="p-5 bg-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                                    <h6 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-2">
                                        <Icons.Zap className="w-3 h-3" /> Recomendação Estratégica
                                    </h6>
                                    <p className="text-xs font-medium leading-relaxed italic opacity-90">"{selectedAssessment?.insights.recommendation}"</p>
                                </div>

                                <div className="p-5 bg-rose-50 border border-rose-100 rounded-3xl">
                                    <h6 className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2 flex items-center gap-2">
                                        <Icons.AlertCircle className="w-3 h-3" /> Alerta Comportamental
                                    </h6>
                                    <p className="text-[11px] font-black text-rose-900 leading-tight">{selectedAssessment?.insights.alert}</p>
                                </div>
                            </div>

                            {/* Avaliações Anteriores */}
                            {assessments.length > 1 && (
                                <div className="pt-6">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Histórico de Avaliações</h5>
                                    <div className="flex gap-3 overflow-x-auto pb-2">
                                        {assessments.map(a => (
                                            <button
                                                key={a.id}
                                                onClick={() => setSelectedAssessmentId(a.id)}
                                                className={`flex-shrink-0 p-3 rounded-2xl border-2 transition-all ${selectedAssessmentId === a.id ? 'border-indigo-500 bg-white shadow-md' : 'border-slate-100 bg-slate-50'}`}
                                            >
                                                <p className="text-[9px] font-black text-slate-400 uppercase">{new Date(a.date).toLocaleDateString('pt-BR')}</p>
                                                <p className="text-sm font-black text-slate-700">ICRN: {a.icrn}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-20 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-6 text-3xl">🧩</div>
                    <h4 className="text-lg font-black text-slate-800">Módulo MIPAN Iniciado</h4>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2 font-medium">Inicie a primeira avaliação para identificar riscos comportamentais, emocionais e de adesão do paciente.</p>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="mt-8 bg-indigo-600 text-white px-10 py-4 rounded-2xl text-sm font-black shadow-2xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
                    >
                        Começar Screening Ativo
                    </button>
                </div>
            )}
        </div>
    );
};
