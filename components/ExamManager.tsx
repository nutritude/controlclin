
import React, { useState, useMemo } from 'react';
import { Exam, ExamMarker, Patient, User, ExamAnalysisResult } from '../types';
import { Icons } from '../constants';
import { LaboratService } from '../services/laboratService';
import { AIExamService } from '../services/ai/aiExamService';
import { BIOMEDICAL_MARKERS } from '../constants/biomedicalMarkers';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ReferenceLine, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';

interface ExamManagerProps {
    patient: Patient;
    exams: Exam[];
    onUpdate: () => void;
    isManagerMode?: boolean;
    db: any;
    user: User;
}

export const ExamManager: React.FC<ExamManagerProps> = ({ patient, exams, onUpdate, isManagerMode, db, user }) => {
    const [viewMode, setViewMode] = useState<'LIST' | 'EVOLUTION'>('LIST');
    const [isAddingManual, setIsAddingManual] = useState(false);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [editingExamId, setEditingExamId] = useState<string | null>(null);
    const [selectedMarkerForEvo, setSelectedMarkerForEvo] = useState<string>('Glicose em Jejum');

    // File Upload State
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Form states
    const [manualExamName, setManualExamName] = useState('Painel Bioquímico');
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
    const [manualReason, setManualReason] = useState('Acompanhamento Nutricional');
    const [manualMarkers, setManualMarkers] = useState<Array<{ name: string; value: number | string; unit: string }>>([]);
    const [currMarkerName, setCurrMarkerName] = useState('');
    const [currMarkerVal, setCurrMarkerVal] = useState('');

    const getReferencePlaceholder = (name: string) => {
        const meta = Object.values(BIOMEDICAL_MARKERS).find(m =>
            m.name.toLowerCase() === name.toLowerCase() ||
            m.aliases.some(a => a.toLowerCase() === name.toLowerCase())
        );
        return meta ? `${meta.minDesejavel}-${meta.maxDesejavel} ${meta.unit}` : 'Valor';
    };

    // --- EVOLUTION DATA COMPUTATION ---
    const evolutionData = useMemo(() => {
        const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Obter todos os nomes de marcadores únicos presentes em todos os exames
        const allMarkerNames = Array.from(new Set(exams.flatMap(e => e.markers?.map(m => m.name) || [])));

        const dataPoints = sortedExams.map(exam => {
            const point: any = { date: new Date(exam.date).toLocaleDateString('pt-BR') };
            exam.markers?.forEach(m => {
                point[m.name] = m.value;
            });
            return point;
        });

        return { dataPoints, markers: allMarkerNames };
    }, [exams]);

    const handleAddMarker = () => {
        if (!currMarkerName || currMarkerVal === '') return;
        const meta = Object.values(BIOMEDICAL_MARKERS).find(m => m.name === currMarkerName || m.aliases.includes(currMarkerName));
        setManualMarkers([...manualMarkers, {
            name: meta?.name || currMarkerName,
            value: currMarkerVal,
            unit: meta?.unit || 'un'
        }]);
        setCurrMarkerName('');
        setCurrMarkerVal('');
    };

    const handleSaveManualExam = async () => {
        if (manualMarkers.length === 0) {
            alert("Adicione pelo menos um marcador.");
            return;
        }

        const processedMarkers = LaboratService.processMarkers(manualMarkers);
        const score = LaboratService.calculateExamScore(processedMarkers);

        const examData: Partial<Exam> = {
            name: manualExamName,
            date: manualDate,
            clinicalReason: manualReason,
            status: 'PENDENTE',
            markers: processedMarkers,
            healthScore: score,
            patientId: patient.id,
            clinicId: patient.clinicId,
            requestedByUserId: user.id
        };

        try {
            if (editingExamId) {
                await db.updateExam(editingExamId, examData);
                alert("Exame atualizado com sucesso!");
            } else {
                await db.saveExam(user, patient.id, examData);
                alert("Exame salvo com sucesso!");
            }
            onUpdate();
            handleCancelForm();
        } catch (err) {
            alert("Erro ao salvar: " + err);
        }
    };

    const handleCancelForm = () => {
        setIsAddingManual(false);
        setEditingExamId(null);
        setManualExamName('Painel Bioquímico');
        setManualDate(new Date().toISOString().split('T')[0]);
        setManualReason('Acompanhamento Nutricional');
        setManualMarkers([]);
        setCurrMarkerName('');
        setCurrMarkerVal('');
    };

    const handleEditExam = (exam: Exam) => {
        setEditingExamId(exam.id);
        setManualExamName(exam.name);
        setManualDate(exam.date);
        setManualReason(exam.clinicalReason || '');
        setManualMarkers((exam.markers || []).map(m => ({ name: m.name, value: m.value, unit: m.unit })));
        setIsAddingManual(true);
    };

    const handleDeleteExam = async (examId: string) => {
        if (confirm("Deseja realmente excluir este exame?")) {
            try {
                await db.deleteExam(examId);
                onUpdate();
            } catch (err) {
                alert("Erro ao excluir: " + err);
            }
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
            const reader = new FileReader();
            const fileData: { base64: string, mimeType: string } = await new Promise((resolve, reject) => {
                reader.onload = () => resolve({ base64: reader.result as string, mimeType: file.type || 'application/pdf' });
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            let extracted: ExamMarker[] = [];
            try {
                extracted = await AIExamService.extractMarkers(fileData);
            } catch (aiErr) {
                console.warn("IA falhou na extração:", aiErr);
            }

            const score = extracted.length > 0 ? LaboratService.calculateExamScore(extracted) : 0;

            const newExam: Partial<Exam> = {
                name: file.name.replace('.pdf', '').replace('.png', '').replace('.jpg', ''),
                date: new Date().toISOString().split('T')[0],
                status: 'PENDENTE',
                markers: extracted,
                healthScore: score,
                patientId: patient.id,
                clinicId: patient.clinicId,
                requestedByUserId: user.id,
                fileUrl: file.name,
                clinicalReason: "Upload via arquivo"
            };

            await db.saveExam(user, patient.id, newExam);
            onUpdate();
            alert(extracted.length > 0 ? `Sucesso! ${extracted.length} marcadores extraídos.` : "Exame salvo (extração automática falhou).");
        } catch (err) {
            alert("Erro no upload: " + err);
        } finally {
            setIsExtracting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const renderComparisonChart = (marker: ExamMarker) => {
        const data = [
            { name: 'Mínimo', valor: marker.reference.min, fill: '#94a3b8' },
            { name: 'Resultado', valor: marker.value, fill: marker.interpretation === 'NORMAL' ? '#10b981' : '#f43f5e' },
            { name: 'Máximo', valor: marker.reference.max, fill: '#94a3b8' }
        ];

        return (
            <div className="h-40 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={70} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                        <Tooltip cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="valor" barSize={15} radius={[0, 4, 4, 0]}>
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
            <div className={`${isManagerMode ? 'bg-gray-800' : 'bg-white'} border border-slate-200 shadow-sm rounded-2xl overflow-hidden`}>
                {/* Custom Header (RESTORING ORIGINAL STYLE) */}
                <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                    <div>
                        <h3 className={`text-xl font-black flex items-center gap-2 ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>
                            <Icons.Activity className="w-6 h-6 text-emerald-500" />
                            Prontuário Laboratorial
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Gestão de marcadores e evolução clínica</p>
                    </div>

                    <div className="flex gap-2">
                        <div className="bg-slate-200/50 p-1 rounded-lg flex mr-4">
                            <button
                                onClick={() => setViewMode('LIST')}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}
                            >
                                Lista
                            </button>
                            <button
                                onClick={() => setViewMode('EVOLUTION')}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${viewMode === 'EVOLUTION' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}
                            >
                                Evolução
                            </button>
                        </div>
                        <button
                            onClick={() => setIsAddingManual(true)}
                            className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors flex items-center gap-2"
                        >
                            <span>+</span> Lançamento Manual
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.png,.jpg" onChange={handleFileUpload} />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isExtracting}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <span>📂</span> {isExtracting ? 'Processando...' : 'Anexar PDF'}
                        </button>
                    </div>
                </div>

                {isAddingManual && (
                    <div className="p-6 bg-indigo-50/30 border-b animate-fadeIn">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-sm font-black text-indigo-900 uppercase tracking-tighter">
                                {editingExamId ? '📝 Editando Registro' : '✨ Novo Lançamento Clínico'}
                            </h4>
                            <button onClick={handleCancelForm} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400">Nome do Exame</label>
                                <input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 ring-indigo-200 outline-none" value={manualExamName} onChange={e => setManualExamName(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400">Data</label>
                                <input type="date" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 ring-indigo-200 outline-none" value={manualDate} onChange={e => setManualDate(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400">Motivo</label>
                                <input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 ring-indigo-200 outline-none" value={manualReason} onChange={e => setManualReason(e.target.value)} />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-sm">
                            <h5 className="text-[10px] font-black uppercase text-indigo-500 mb-4 tracking-widest">Adicionar Marcadores Bioquímicos</h5>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    list="markers"
                                    className="flex-1 border-slate-200 border rounded-xl p-3 text-sm outline-none focus:border-indigo-500"
                                    placeholder="Nome do marcador (ex: Glicose)"
                                    value={currMarkerName}
                                    onChange={e => setCurrMarkerName(e.target.value)}
                                />
                                <datalist id="markers">
                                    {Object.values(BIOMEDICAL_MARKERS).map(m => <option key={m.name} value={m.name} />)}
                                </datalist>
                                <input
                                    type="text"
                                    className="w-full sm:w-32 border-slate-200 border rounded-xl p-3 text-sm text-center font-black placeholder:text-slate-300"
                                    placeholder={currMarkerName ? getReferencePlaceholder(currMarkerName) : 'Valor'}
                                    value={currMarkerVal}
                                    onChange={e => setCurrMarkerVal(e.target.value)}
                                />
                                <button onClick={handleAddMarker} className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-black hover:shadow-lg transition-all">Add</button>
                            </div>

                            <div className="mt-6 space-y-2">
                                {manualMarkers.map((m, i) => (
                                    <div key={i} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-100 shadow-sm animate-fadeIn">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">{m.name}</p>
                                            <p className="text-[9px] text-slate-300 font-bold italic">Sugestão Ref: {getReferencePlaceholder(m.name)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={m.value}
                                                onChange={(e) => {
                                                    const newMarkers = [...manualMarkers];
                                                    newMarkers[i].value = e.target.value;
                                                    setManualMarkers(newMarkers);
                                                }}
                                                placeholder={getReferencePlaceholder(m.name).split(' ')[0]}
                                                className="w-24 text-center border-b border-indigo-100 focus:border-indigo-500 outline-none text-sm font-black text-indigo-600 bg-indigo-50/20 rounded py-1 placeholder:text-slate-300"
                                            />
                                            <span className="text-[10px] text-slate-400 font-black w-10">{m.unit}</span>
                                        </div>
                                        <button
                                            onClick={() => setManualMarkers(manualMarkers.filter((_, idx) => idx !== i))}
                                            className="text-rose-300 hover:text-rose-500 font-bold p-1 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={handleCancelForm} className="text-slate-500 text-sm font-bold px-6 py-2">Cancelar</button>
                            <button onClick={handleSaveManualExam} className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-10 py-3 rounded-xl font-black shadow-md hover:scale-[1.02] transition-all">
                                {editingExamId ? 'Atualizar Registro' : 'Salvar no Prontuário'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="p-6">
                    {viewMode === 'EVOLUTION' ? (
                        <div className="space-y-8 animate-fadeIn">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                    Evolução Temporal de Biomarcadores
                                </h4>
                                <select
                                    className="text-xs font-bold border rounded-lg p-2 bg-slate-50"
                                    value={selectedMarkerForEvo}
                                    onChange={e => setSelectedMarkerForEvo(e.target.value)}
                                >
                                    {evolutionData.markers.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            {evolutionData.dataPoints.length < 2 ? (
                                <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                    <p className="text-slate-400 font-medium">São necessários pelo menos 2 registros para gerar a linha de evolução.</p>
                                </div>
                            ) : (
                                <div className="h-80 w-full bg-white rounded-3xl border border-slate-100 p-4 shadow-sm">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={evolutionData.dataPoints}>
                                            <defs>
                                                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                                            <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', shadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                            <Area type="monotone" dataKey={selectedMarkerForEvo} stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {evolutionData.markers.slice(0, 4).map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setSelectedMarkerForEvo(m)}
                                        className={`p-4 rounded-2xl border transition-all text-left ${selectedMarkerForEvo === m ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                                    >
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m}</p>
                                        <p className="text-lg font-black text-slate-800">Visualizar</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {exams.length === 0 ? (
                                <div className="text-center py-20 grayscale opacity-50">
                                    <Icons.Activity className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                                    <p className="text-slate-500 font-bold">Nenhum exame registrado para este paciente.</p>
                                </div>
                            ) : (
                                [...exams].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exam => (
                                    <div key={exam.id} className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                        <div className="p-5 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-500">
                                                    <Icons.Activity className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-900 leading-tight">{exam.name}</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">REALIZADO EM {new Date(exam.date).toLocaleDateString('pt-BR')}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleEditExam(exam)} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400" title="Editar">✏️</button>
                                                <button onClick={() => handleDeleteExam(exam.id)} className="p-2 hover:bg-red-50 rounded-xl transition-colors text-red-300" title="Excluir">🗑️</button>

                                                <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>

                                                <button
                                                    onClick={() => handleRunAnalysis(exam)}
                                                    disabled={analyzingId === exam.id}
                                                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm ${exam.analysisResult
                                                        ? 'bg-indigo-100 text-indigo-700'
                                                        : 'bg-gradient-to-r from-indigo-600 to-blue-500 text-white hover:scale-105 active:scale-95'
                                                        }`}
                                                >
                                                    {analyzingId === exam.id ? 'Analisando...' : exam.analysisResult ? '✨ Recalcular IA' : '✨ Analisar IA'}
                                                </button>
                                                <button
                                                    onClick={() => setSelectedExamId(selectedExamId === exam.id ? null : exam.id)}
                                                    className={`p-3 rounded-xl transition-all ${selectedExamId === exam.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}
                                                >
                                                    {selectedExamId === exam.id ? '▲' : '▼'}
                                                </button>
                                            </div>
                                        </div>

                                        {(selectedExamId === exam.id || exams.length === 1) && (
                                            <div className="p-6 bg-white animate-fadeIn">
                                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                                    {/* Marcadores */}
                                                    <div className="lg:col-span-7">
                                                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 border-b pb-2">Resultados Laboratoriais</h5>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {exam.markers?.map(m => (
                                                                <div key={m.id} className={`p-4 rounded-2xl border transition-all ${m.interpretation !== 'NORMAL' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-transparent hover:bg-white hover:border-emerald-100'}`}>
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <p className="text-xs font-black text-slate-800">{m.name}</p>
                                                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${m.interpretation === 'NORMAL' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{m.interpretation}</span>
                                                                    </div>
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className={`text-xl font-black ${m.interpretation !== 'NORMAL' ? 'text-rose-600' : 'text-emerald-600'}`}>{m.value}</span>
                                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">{m.unit}</span>
                                                                    </div>
                                                                    <p className="text-[9px] text-slate-400 font-medium mt-1">Ref: {m.reference.label}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Gráficos / Análise */}
                                                    <div className="lg:col-span-5 space-y-8">
                                                        <div>
                                                            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 border-b pb-2">Visualização de Referência</h5>
                                                            <div className="space-y-4">
                                                                {exam.markers?.slice(0, 2).map(m => (
                                                                    <div key={m.id} className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                                                                        <p className="text-xs font-black text-slate-700 mb-1">{m.name}</p>
                                                                        {renderComparisonChart(m)}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {exam.analysisResult && (
                                                            <div className="p-6 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-100 space-y-4">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <span className="text-xl">✨</span>
                                                                    <h6 className="text-xs font-black uppercase tracking-widest">Insight ControlClin</h6>
                                                                </div>
                                                                <p className="text-xs font-medium leading-relaxed opacity-90 leading-normal">"{exam.analysisResult.summary}"</p>
                                                                <div className="pt-4 border-t border-white/20">
                                                                    <p className="text-[10px] font-black uppercase opacity-60 mb-2">Principais Fatos</p>
                                                                    <div className="space-y-2">
                                                                        {exam.analysisResult.findings.slice(0, 2).map((f, i) => (
                                                                            <div key={i} className="flex gap-2 items-start">
                                                                                <span className="text-emerald-300">✔</span>
                                                                                <p className="text-[10px] font-bold">{f.correlation.slice(0, 60)}...</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
