
import React, { useState } from 'react';
import { Exam, ExamMarker, Patient, User, ExamAnalysisResult } from '../types';
import { Icons } from '../constants';
import { LaboratService } from '../services/laboratService';
import { AIExamService } from '../services/ai/aiExamService';
import { BIOMEDICAL_MARKERS } from '../constants/biomedicalMarkers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

interface ExamManagerProps {
    patient: Patient;
    exams: Exam[];
    onUpdate: () => void;
    isManagerMode?: boolean;
    db: any;
    user: User;
}

export const ExamManager: React.FC<ExamManagerProps> = ({ patient, exams, onUpdate, isManagerMode, db, user }) => {
    const [isAddingManual, setIsAddingManual] = useState(false);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);

    // File Upload State
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Form states for manual entry
    const [manualExamName, setManualExamName] = useState('Painel Bioquímico');
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
    const [manualReason, setManualReason] = useState('Acompanhamento Nutricional');
    const [manualMarkers, setManualMarkers] = useState<Array<{ name: string; value: number; unit: string }>>([]);
    const [currMarkerName, setCurrMarkerName] = useState('');
    const [currMarkerVal, setCurrMarkerVal] = useState('');

    const handleAddMarker = () => {
        if (!currMarkerName || !currMarkerVal) return;
        const meta = Object.values(BIOMEDICAL_MARKERS).find(m => m.name === currMarkerName || m.aliases.includes(currMarkerName));
        setManualMarkers([...manualMarkers, {
            name: currMarkerName,
            value: parseFloat(currMarkerVal),
            unit: meta?.unit || 'un'
        }]);
        setCurrMarkerName('');
        setCurrMarkerVal('');
    };

    const handleSaveManualExam = async () => {
        if (manualMarkers.length === 0) return;

        const processedMarkers = LaboratService.processMarkers(manualMarkers);
        const score = LaboratService.calculateExamScore(processedMarkers);

        const newExam: Partial<Exam> = {
            name: manualExamName,
            date: manualDate,
            clinicalReason: manualReason,
            status: 'PENDENTE',
            markers: processedMarkers,
            healthScore: score,
            patientId: patient.id,
            clinicId: patient.clinicId,
            requestedByUserId: user.id,
            createdAt: new Date().toISOString()
        };

        try {
            await db.saveExam(user, patient.id, newExam);
            setIsAddingManual(false);
            setManualMarkers([]);
            onUpdate();
        } catch (err) {
            alert("Erro ao salvar exame: " + err);
        }
    };

    const handleRunAnalysis = async (exam: Exam) => {
        setAnalyzingId(exam.id);
        try {
            const result = await AIExamService.analyzeResults(patient, [exam]);
            await db.updateExamAnalysis(exam.id, result);
            onUpdate();
        } catch (err) {
            alert("Erro na análise: " + err);
        } finally {
            setAnalyzingId(null);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsExtracting(true);
        try {
            const simulatedText = `Laboratório Excellence - Data: 2026-02-20
      Paciente: ${patient.name}
      GLICOSE: 105 mg/dL (Ref: 70 a 99)
      COLESTEROL TOTAL: 210 mg/dL (Ref: < 190)
      HDL: 45 mg/dL (Ref: > 40)
      CREATININA: 0.9 mg/dL (Ref: 0.7 a 1.2)`;

            const extracted = await AIExamService.extractMarkers(simulatedText);
            const score = LaboratService.calculateExamScore(extracted);

            const newExam: Partial<Exam> = {
                name: file.name.replace('.pdf', ''),
                date: new Date().toISOString().split('T')[0],
                status: 'PENDENTE',
                markers: extracted,
                healthScore: score,
                patientId: patient.id,
                clinicId: patient.clinicId,
                requestedByUserId: user.id
            };

            await db.saveExam(user, patient.id, newExam);
            onUpdate();
            alert("Exame processado e salvo via IA!");
        } catch (err) {
            alert("Erro no upload/IA: " + err);
        } finally {
            setIsExtracting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const renderComparisonChart = (marker: ExamMarker) => {
        const data = [
            { name: 'Mínimo', valor: marker.reference.min, fill: '#94a3b8' },
            { name: 'Resultado', valor: marker.value, fill: marker.interpretation === 'NORMAL' ? '#10b981' : '#ef4444' },
            { name: 'Máximo', valor: marker.reference.max, fill: '#94a3b8' }
        ];

        return (
            <div className="h-48 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                        <Tooltip />
                        <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-200'} shadow-sm rounded-xl p-6 border`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>
                        <Icons.Activity className="w-6 h-6" />
                        Gestão de Exames Laboratoriais
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsAddingManual(true)}
                            className={`text-xs px-4 py-2 rounded-lg shadow-sm font-bold flex items-center gap-2 ${isManagerMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                        >
                            <span>+</span> Lançamento Manual
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".pdf,.png,.jpg"
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isExtracting}
                            className={`text-xs px-4 py-2 rounded-lg shadow-sm font-bold flex items-center gap-2 border ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50'} ${isExtracting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <span>📂</span> {isExtracting ? 'Extraindo...' : 'Upload PDF (IA)'}
                        </button>
                    </div>
                </div>

                {isAddingManual && (
                    <div className="mb-8 p-6 border rounded-xl bg-gray-50/50 space-y-4 animate-fadeIn">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-slate-800">Novo Lançamento Manual</h4>
                            <button onClick={() => setIsAddingManual(false)} className="text-gray-400">✕</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500">Nome do Exame</label>
                                <input type="text" className="w-full mt-1 border rounded p-2 text-sm" value={manualExamName} onChange={e => setManualExamName(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500">Data de Realização</label>
                                <input type="date" className="w-full mt-1 border rounded p-2 text-sm" value={manualDate} onChange={e => setManualDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500">Motivo Clínico</label>
                                <input type="text" className="w-full mt-1 border rounded p-2 text-sm" value={manualReason} onChange={e => setManualReason(e.target.value)} />
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Adicionar Marcadores</label>
                            <div className="flex gap-2">
                                <input
                                    list="marker-suggestions"
                                    className="flex-1 border rounded p-2 text-sm"
                                    placeholder="Nome do marcador (ex: Glicose)"
                                    value={currMarkerName}
                                    onChange={e => setCurrMarkerName(e.target.value)}
                                />
                                <datalist id="marker-suggestions">
                                    {Object.values(BIOMEDICAL_MARKERS).map(m => (
                                        <option key={m.name} value={m.name} />
                                    ))}
                                </datalist>
                                <input
                                    type="number"
                                    className="w-32 border rounded p-2 text-sm font-bold"
                                    placeholder="Valor"
                                    value={currMarkerVal}
                                    onChange={e => setCurrMarkerVal(e.target.value)}
                                />
                                <button onClick={handleAddMarker} className="px-4 py-2 bg-slate-800 text-white rounded text-sm font-bold">Add</button>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {manualMarkers.map((m, i) => (
                                    <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-medium flex items-center gap-2">
                                        <b>{m.name}:</b> {m.value} {m.unit}
                                        <button onClick={() => setManualMarkers(manualMarkers.filter((_, idx) => idx !== i))} className="text-red-500 font-bold ml-1">×</button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setIsAddingManual(false)} className="px-4 py-2 text-sm font-bold text-gray-500">Cancelar</button>
                            <button onClick={handleSaveManualExam} className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md">Salvar Exame</button>
                        </div>
                    </div>
                )}

                {exams.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-xl">
                        <span className="text-4xl block mb-2">🔬</span>
                        <p className="text-gray-400 font-medium">Nenhum registro laboratorial encontrado.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {exams.map(exam => (
                            <div key={exam.id} className={`border rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md ${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                                {/* Exam Card Header */}
                                <div className={`p-4 border-b flex justify-between items-center ${isManagerMode ? 'bg-gray-700/50' : 'bg-slate-50/50'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                            <Icons.Activity className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className={`font-bold ${isManagerMode ? 'text-white' : 'text-slate-900'}`}>{exam.name}</h4>
                                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{new Date(exam.date).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {exam.healthScore !== undefined && (
                                            <div className="text-right">
                                                <p className="text-[8px] font-bold uppercase text-gray-400">Score de Saúde</p>
                                                <p className={`text-lg font-black ${exam.healthScore > 80 ? 'text-emerald-500' : exam.healthScore > 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                                    {Math.round(exam.healthScore)}%
                                                </p>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => handleRunAnalysis(exam)}
                                            disabled={analyzingId === exam.id}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${exam.analysisResult
                                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                : 'bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow-sm'
                                                }`}
                                        >
                                            {analyzingId === exam.id ? 'Analisando...' : exam.analysisResult ? '✨ Recalcular IA' : '✨ Analisar IA'}
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {/* Markers Accordion/Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Tabela de Marcadores */}
                                        <div>
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Indicadores Bioquímicos</h5>
                                            <div className="space-y-3">
                                                {exam.markers?.map(m => (
                                                    <div
                                                        key={m.id}
                                                        onClick={() => setSelectedExam(exam)}
                                                        className={`p-3 rounded-lg border flex justify-between items-center cursor-pointer transition-colors ${m.interpretation !== 'NORMAL' ? 'bg-red-50 border-red-100' : 'hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-800">{m.name}</p>
                                                            <p className="text-[10px] text-slate-400">{m.reference.label}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`font-black ${m.interpretation !== 'NORMAL' ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                {m.value} <span className="text-[10px] font-medium">{m.unit}</span>
                                                            </p>
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${m.interpretation === 'NORMAL' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {m.interpretation}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Gráficos Comparativos (Top 2 Alterados ou primeiros 2) */}
                                        <div>
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Visualização de Referência</h5>
                                            <div className="space-y-6">
                                                {exam.markers?.slice(0, 2).map(m => (
                                                    <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <p className="text-[11px] font-bold text-slate-700">{m.name}</p>
                                                            <span className="text-[10px] text-slate-500">{m.interpretation}</span>
                                                        </div>
                                                        {renderComparisonChart(m)}
                                                    </div>
                                                ))}
                                                {exam.markers && exam.markers.length > 2 && (
                                                    <p className="text-[10px] text-center text-slate-400 italic">Mais {exam.markers.length - 2} indicadores monitorados</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI INSIGHTS BLOCK */}
                                    {exam.analysisResult && (
                                        <div className="mt-8 pt-8 border-t space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl">✨</div>
                                                <div>
                                                    <h5 className="font-black text-slate-800 tracking-tight">Relatório de Análise Clínica</h5>
                                                    <p className="text-xs text-indigo-500 font-bold uppercase">ControlClin Intelligence v2.5</p>
                                                </div>
                                            </div>

                                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6">
                                                <p className="text-sm text-slate-700 leading-relaxed font-medium italic">"{exam.analysisResult.summary}"</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Findings & Correlation */}
                                                <div className="space-y-4">
                                                    <h6 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Cruzamentos e Correlações</h6>
                                                    <div className="space-y-3">
                                                        {exam.analysisResult.findings.map((f, i) => (
                                                            <div key={i} className={`p-4 rounded-xl border bg-white ${f.impact === 'NEGATIVO' ? 'border-red-100' : 'border-emerald-100'}`}>
                                                                <p className="text-xs font-black text-slate-900 mb-1">{f.marker}</p>
                                                                <p className="text-[11px] text-slate-600 leading-normal">{f.correlation}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Suggestions */}
                                                <div className="space-y-4">
                                                    <h6 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Intervenção Sugerida</h6>
                                                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5">
                                                        <ul className="space-y-3">
                                                            {exam.analysisResult.suggestedTreatments.map((t, i) => (
                                                                <li key={i} className="flex gap-3 text-xs text-emerald-900 font-medium">
                                                                    <span className="text-emerald-400">▶</span> {t}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <h6 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mt-4">Próximos Passos</h6>
                                                    <div className="flex flex-wrap gap-2">
                                                        {exam.analysisResult.nextSteps.map((s, i) => (
                                                            <span key={i} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100">
                                                                {s}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
