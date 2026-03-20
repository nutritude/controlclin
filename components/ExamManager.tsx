
import React, { useState, useMemo } from 'react';
import { Exam, ExamMarker, Patient, User, ExamAnalysisResult, ExamRequest } from '../types';
import { Icons } from '../constants';
import PDFHeader from './PDFHeader';
import { LaboratService } from '../services/laboratService';
import { AIExamService } from '../services/ai/aiExamService';
import { BIOMEDICAL_MARKERS, QUALITATIVE_FINDINGS } from '../constants/biomedicalMarkers';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, AreaChart, Area
} from 'recharts';

interface ExamManagerProps {
    patient: Patient;
    exams: Exam[];
    onUpdate: () => void;
    isManagerMode?: boolean;
    db: any;
    user: User;
}

const EXAM_OPTIONS = [
    "Hemograma Completo", "Glicose em Jejum", "Hemoglobina Glicada (HbA1c)", "Insulina",
    "Perfil Lipídico (Colesterol Total, LDL, HDL, Triglicérides)", "Ureia e Creatinina",
    "TGO e TGP (Transaminases)", "Gama-GT", "Ácido Úrico", "Proteína C-Reativa (PCR) Ultra",
    "TSH (Hormônio Tireoestimulante)", "T4 Livre", "T3 Livre", "T4 Total", "T3 Total", "Anti-TPO", "Anti-Tireoglobulina",
    "Testosterona Total", "Testosterona Livre", "Estradiol", "Progesterona", "Prolactina", "LH", "FSH", "SHBG", "DHT",
    "Vitamina D (25-OH)", "Vitamina B12", "Ácido Fólico", "Ferritina", "Ferro Sérico", "Zinco", "Selênio",
    "Homocisteína", "VHS (Velocidade de Hemossedimentação)", "Fibrinogênio", "Albúmina",
    "Urina Tipo 1 (EAS)", "Exame Parasitológico de Fezes"
];

export const ExamManager: React.FC<ExamManagerProps> = ({ patient, exams, onUpdate, isManagerMode, db, user }) => {
    const [viewMode, setViewMode] = useState<'LIST' | 'EVOLUTION' | 'REQUESTS'>('LIST');
    const [isAddingManual, setIsAddingManual] = useState(false);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [editingExamId, setEditingExamId] = useState<string | null>(null);
    const [selectedMarkerForEvo, setSelectedMarkerForEvo] = useState<string>('Glicose em Jejum');

    // File Upload State
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [formStep, setFormStep] = useState(1);

    // Request states
    const [isCreatingRequest, setIsCreatingRequest] = useState(false);
    const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
    const [requestExams, setRequestExams] = useState<string[]>([]);
    const [requestIndication, setRequestIndication] = useState('');
    const [requestComplementary, setRequestComplementary] = useState('');
    const [requestFasting, setRequestFasting] = useState(false);
    const [requestFastingHours, setRequestFastingHours] = useState(8);
    const [requestMedications, setRequestMedications] = useState('');
    const [examRequests, setExamRequests] = useState<any[]>([]);
    const [searchExamQuery, setSearchExamQuery] = useState('');
    const [printingRequest, setPrintingRequest] = useState<any>(null);
    const pdfRef = React.useRef<HTMLDivElement>(null);
    const [clinic, setClinic] = useState<any>(null);

    const loadRequests = React.useCallback(async () => {
        if (db && patient.id) {
            const reqs = await db.getExamRequests(patient.id);
            setExamRequests(reqs);

            if (user.clinicId) {
                const clinics = await db.getClinics();
                const myClinic = clinics.find((c: any) => c.id === user.clinicId);
                setClinic(myClinic);
            }
        }
    }, [db, patient.id, user.clinicId]);

    React.useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    // Form states
    const [manualExamName, setManualExamName] = useState('Painel Bioquímico');
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
    const [manualReason, setManualReason] = useState('Acompanhamento Nutricional');
    const [manualMarkers, setManualMarkers] = useState<Array<{ name: string; value: number | string; unit: string }>>([]);
    const [manualQualitative, setManualQualitative] = useState<string[]>([]);
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

    const QUICK_PANELS = {
        'HEMOGRAMA': ['Hemoglobina', 'Leucócitos', 'Plaquetas', 'Hematócrito', 'VCM', 'HCM', 'CHCM', 'RDW', 'Neutrófilos Segmentados', 'Linfócitos', 'Monócitos', 'Eosinófilos', 'Basófilos'],
        'LIBIDICO': ['Colesterol Total', 'HDL (Bom Colesterol)', 'LDL (Mau Colesterol)', 'Triglicerídeos'],
        'HEPATICO': ['AST (TGO)', 'ALT (TGP)', 'Gama-GT (GGT)', 'Bilirrubina Total'],
        'RENAL': ['Creatinina', 'Ureia', 'Ácido Úrico', 'Fósforo', 'Potássio'],
        'GLICEMIA': ['Glicose em Jejum', 'Hemoglobina Glicada (HbA1c)', 'Insulina em Jejum'],
        'TIREOIDE': ['TSH', 'T4 Livre', 'T3 Livre', 'T4 Total', 'T3 Total', 'Anti-TPO', 'Anti-Tireoglobulina'],
        'HORMONAL': ['Testosterona Total', 'Testosterona Livre', 'Estradiol (E2)', 'Progesterona', 'Prolactina', 'LH', 'FSH', 'SHBG', 'Di-hidrotestosterona (DHT)'],
        'VITAMINAS/MIN': ['Vitamina D (25-OH)', 'Vitamina B12', 'Ácido Fólico (B9)', 'Ferritina', 'Ferro Sérico', 'Zinco', 'Selênio'],
        'INFLAMAÇÃO': ['PCR Ultra-sensível', 'Homocisteína', 'VHS (1ª hora)', 'Fibrinogênio'],
        'ELETRÓLITOS': ['Sódio', 'Potássio', 'Cálcio Total', 'Magnésio', 'Cloretos']
    };

    const applyQuickPanel = (panelKey: keyof typeof QUICK_PANELS) => {
        const markersToAdd = QUICK_PANELS[panelKey].map(name => {
            const meta = Object.values(BIOMEDICAL_MARKERS).find(m => m.name === name);
            return {
                name: name,
                value: '',
                unit: meta?.unit || 'un'
            };
        });

        // Evitar duplicados
        const filteredNew = markersToAdd.filter(m => !manualMarkers.some(existing => existing.name === m.name));
        setManualMarkers([...manualMarkers, ...filteredNew]);
    };

    const handleAddMarker = () => {
        if (!currMarkerName || currMarkerVal === '') return;
        const meta = Object.values(BIOMEDICAL_MARKERS).find(m =>
            m.name.toLowerCase() === currMarkerName.toLowerCase() ||
            m.aliases.some(a => a.toLowerCase() === currMarkerName.toLowerCase())
        );
        setManualMarkers([...manualMarkers, {
            name: meta?.name || currMarkerName,
            value: currMarkerVal,
            unit: meta?.unit || 'un'
        }]);
        setCurrMarkerName('');
        setCurrMarkerVal('');
    };

    const toggleQualitative = (achado: string) => {
        setManualQualitative(prev =>
            prev.includes(achado) ? prev.filter(a => a !== achado) : [...prev, achado]
        );
    };

    const handleSaveManualExam = async () => {
        if (manualMarkers.length === 0 && manualQualitative.length === 0) {
            alert("Adicione pelo menos um marcador ou achado qualitativo.");
            return;
        }

        const processedMarkers = LaboratService.processMarkers(manualMarkers.filter(m => m.value !== ''));
        const score = LaboratService.calculateExamScore(processedMarkers);

        const examData: Partial<Exam> = {
            name: manualExamName,
            date: manualDate,
            clinicalReason: manualReason,
            status: 'PENDENTE',
            markers: processedMarkers,
            qualitativeFindings: manualQualitative,
            healthScore: score,
            patientId: patient.id,
            clinicId: patient.clinicId,
            requestedByUserId: user.id
        };

        try {
            if (editingExamId) {
                await db.updateExam(editingExamId, examData);
                alert("Registro clínico atualizado com sucesso!");
            } else {
                await db.saveExam(user, patient.id, examData);
                alert("Registro clínico efetivado!");
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
        setFormStep(1);
        setManualExamName('Painel Bioquímico');
        setManualDate(new Date().toISOString().split('T')[0]);
        setManualReason('Acompanhamento Nutricional');
        setManualMarkers([]);
        setManualQualitative([]);
        setCurrMarkerName('');
        setCurrMarkerVal('');
    };

    const handleEditExam = (exam: Exam) => {
        setEditingExamId(exam.id);
        setManualExamName(exam.name);
        setManualDate(exam.date);
        setManualReason(exam.clinicalReason || '');
        setManualMarkers((exam.markers || []).map(m => ({ name: m.name, value: m.value, unit: m.unit })));
        setManualQualitative(exam.qualitativeFindings || []);
        setIsAddingManual(true);
        setFormStep(1);
    };

    const handleDeleteExam = async (examId: string) => {
        if (confirm("Deseja realmente excluir este registro?")) {
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
            } catch (aiErr: any) {
                console.warn("IA falhou na extração:", aiErr);
                alert("Falha na extração automática: " + (aiErr.message || "Serviço ocupado.") + "\n\nO arquivo será salvo para preenchimento manual.");
            }

            const score = extracted.length > 0 ? LaboratService.calculateExamScore(extracted) : 0;

            const newExam: Partial<Exam> = {
                name: file.name.replace('.pdf', '').replace('.png', '').replace('.jpg', ''),
                date: new Date().toISOString().split('T')[0],
                status: extracted.length > 0 ? 'PENDENTE' : 'PENDENTE',
                markers: extracted,
                healthScore: score,
                patientId: patient.id,
                clinicId: patient.clinicId,
                requestedByUserId: user.id,
                fileUrl: file.name,
                clinicalReason: extracted.length > 0 ? "Extração IA Concluída" : "Upload pendente de análise manual"
            };

            await db.saveExam(user, patient.id, newExam);
            onUpdate();
            
            if (extracted.length > 0) {
                alert(`Sucesso! ${extracted.length} marcadores identificados e prontos para conferência.`);
            }
        } catch (err: any) {
            alert("Erro crítico no upload: " + (err.message || err));
        } finally {
            setIsExtracting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSaveRequest = async () => {
        if (requestExams.length === 0) {
            alert("Selecione pelo menos um exame.");
            return;
        }

        try {
            const requestData = {
                exams: requestExams,
                clinicalIndication: requestIndication,
                complementaryInfo: requestComplementary,
                fastingRequired: requestFasting,
                fastingHours: requestFastingHours,
                medications: requestMedications,
                date: new Date().toISOString().split('T')[0]
            };

            if (editingRequestId) {
                await db.updateExamRequest(editingRequestId, requestData);
            } else {
                await db.saveExamRequest(user, patient.id, requestData);
            }

            setIsCreatingRequest(false);
            setEditingRequestId(null);
            setRequestExams([]);
            setRequestIndication('');
            setRequestComplementary('');
            setRequestFasting(false);
            setRequestMedications('');
            loadRequests();
            onUpdate(); // Atualizar timeline
        } catch (err) {
            console.error("Error saving request:", err);
        }
    };

    const handleEditRequest = (req: ExamRequest) => {
        setEditingRequestId(req.id);
        setRequestExams(req.exams);
        setRequestIndication(req.clinicalIndication || '');
        setRequestComplementary(req.complementaryInfo || '');
        setRequestFasting(req.fastingRequired || false);
        setRequestFastingHours(req.fastingHours || 8);
        setRequestMedications(req.medications || '');
        setIsCreatingRequest(true);
    };

    const handlePrintRequest = async (request: any) => {
        setPrintingRequest(request);

        setTimeout(async () => {
            if (!pdfRef.current) {
                console.error("PDF ref not found");
                return;
            }

            try {
                // @ts-ignore
                const html2pdf = window.html2pdf;

                const opt = {
                    margin: 0,
                    filename: `Solicitacao_Exames_${patient.name.replace(/ /g, '_')}_${request.date}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 3, useCORS: true, letterRendering: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                await html2pdf().from(pdfRef.current).set(opt).save();
                setPrintingRequest(null);
            } catch (err) {
                console.error("Error generating PDF:", err);
                alert("Erro ao gerar PDF. Tentando impressão do navegador...");
                window.print();
                setPrintingRequest(null);
            }
        }, 800);
    };

    const handleDeleteRequest = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir esta solicitação?")) {
            await db.deleteExamRequest(id);
            loadRequests();
        }
    };

    const renderInterpretationBadge = (interpretation: string) => {
        switch (interpretation) {
            case 'CRITICO':
                return <span className="bg-rose-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-rose-200 shadow-md">CRÍTICO</span>;
            case 'ALTO':
                return <span className="bg-orange-100 text-orange-700 text-[8px] font-black px-2 py-0.5 rounded-full">ALTO</span>;
            case 'BAIXO':
                return <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-full">BAIXO</span>;
            default:
                return <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded-full">NORMAL</span>;
        }
    };

    const renderComparisonChart = (marker: ExamMarker) => {
        const data = [
            { name: 'Mínimo', valor: marker.reference.min, fill: '#94a3b8' },
            { name: 'Resultado', valor: marker.value, fill: marker.interpretation === 'NORMAL' ? '#10b981' : (marker.interpretation === 'CRITICO' ? '#e11d48' : '#f59e0b') },
            { name: 'Máximo', valor: marker.reference.max, fill: '#94a3b8' }
        ];

        return (
            <div className="h-40 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={70} style={{ fontSize: '10px', fontWeight: 'bold' }} />
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
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes pulse-red { 0%, 100% { border-color: #f43f5e; box-shadow: 0 0 0 0px rgba(244, 63, 94, 0.4); } 50% { border-color: #be123c; box-shadow: 0 0 0 8px rgba(244, 63, 94, 0); } }
                .border-critical { animation: pulse-red 2s infinite; border-width: 2px; }
                .form-step-active { color: #4f46e5; border-bottom: 2px solid #4f46e5; }
            `}} />

            <div className={`${isManagerMode ? 'bg-white' : 'bg-white'} border ${isManagerMode ? 'border-blue-100 shadow-sm' : 'border-slate-200'} rounded-2xl overflow-hidden`}>
                {/* Header Section */}
                <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                    <div>
                        <h3 className={`text-xl font-black flex items-center gap-2 ${isManagerMode ? 'text-slate-800' : 'text-emerald-900'}`}>
                            <Icons.Activity className={`w-6 h-6 ${isManagerMode ? 'text-blue-500' : 'text-emerald-500'}`} />
                            Prontuário Labororial Inteligente
                        </h3>
                        <p className="text-xs text-slate-500 font-medium italic">Base de conhecimento clínico v2.5 - Bioquímica & Onco</p>
                    </div>

                    <div className="flex gap-2">
                        <div className={`p-1 rounded-lg flex mr-4 ${isManagerMode ? 'bg-blue-50' : 'bg-slate-200/50'}`}>
                            <button onClick={() => setViewMode('LIST')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${viewMode === 'LIST' ? (isManagerMode ? 'bg-white shadow text-blue-700' : 'bg-white shadow text-emerald-700') : (isManagerMode ? 'text-blue-400' : 'text-slate-500')}`}>Lista</button>
                            <button onClick={() => setViewMode('EVOLUTION')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${viewMode === 'EVOLUTION' ? (isManagerMode ? 'bg-white shadow text-blue-700' : 'bg-white shadow text-emerald-700') : (isManagerMode ? 'text-blue-400' : 'text-slate-500')}`}>Evolução</button>
                            <button onClick={() => setViewMode('REQUESTS')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${viewMode === 'REQUESTS' ? (isManagerMode ? 'bg-white shadow text-blue-700' : 'bg-white shadow text-emerald-700') : (isManagerMode ? 'text-blue-400' : 'text-slate-500')}`}>Solicitações</button>
                        </div>
                        <button onClick={() => setIsAddingManual(true)} className={`${isManagerMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-900'} text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2`}>
                            <span>+</span> Nutri-Lançamento
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.png,.jpg" onChange={handleFileUpload} />
                        <button onClick={() => fileInputRef.current?.click()} disabled={isExtracting} className={`${isManagerMode ? 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'} px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2`}>
                            <span>📂</span> {isExtracting ? 'Processando...' : 'Anexar PDF'}
                        </button>
                    </div>
                </div>

                {/* Form Section (Multi-step) */}
                {isAddingManual && (
                    <div className="p-0 bg-slate-50 border-b animate-fadeIn">
                        {/* Step Indicator */}
                        <div className="flex border-b bg-white">
                            {[
                                { step: 1, label: 'Geral', icon: '📝' },
                                { step: 2, label: 'Painéis Quantitativos', icon: '📊' },
                                { step: 3, label: 'Achados Críticos', icon: '⚠️' }
                            ].map(s => (
                                <button
                                    key={s.step}
                                    onClick={() => setFormStep(s.step)}
                                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${formStep === s.step ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400'}`}
                                >
                                    <span>{s.icon}</span> {s.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-8">
                            {formStep === 1 && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400">Título do Prontuário</label>
                                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 ring-indigo-200 outline-none font-bold" value={manualExamName} onChange={e => setManualExamName(e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400">Data de Coleta/Registro</label>
                                            <input type="date" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 ring-indigo-200 outline-none font-bold" value={manualDate} onChange={e => setManualDate(e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400">Hipótese ou Motivo</label>
                                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 ring-indigo-200 outline-none font-bold" value={manualReason} onChange={e => setManualReason(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                                        <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                                            <b>Dica:</b> Utilize nomes descritivos como "Rotina Pós-Operatória" ou "Check-up Trimestral" para facilitar a visualização histórica do paciente.
                                        </p>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <button onClick={() => setFormStep(2)} className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-black shadow-lg shadow-indigo-100 flex items-center gap-2">
                                            Próxima Etapa: Marcadores <span>➔</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {formStep === 2 && (
                                <div className="space-y-8 animate-fadeIn">
                                    {/* Quick Panels */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Atalhos Sugestivos (Painéis Rápidos)</label>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.keys(QUICK_PANELS).map(key => (
                                                <button
                                                    key={key}
                                                    onClick={() => applyQuickPanel(key as any)}
                                                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm"
                                                >
                                                    + {key}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Manual Marker Input */}
                                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex flex-col md:flex-row gap-3">
                                            <input
                                                list="markers"
                                                className="flex-1 border-slate-200 border rounded-xl p-3 text-sm outline-none focus:border-indigo-500 font-bold"
                                                placeholder="Pesquisar Marcador (ex: Glicose)..."
                                                value={currMarkerName}
                                                onChange={e => setCurrMarkerName(e.target.value)}
                                            />
                                            <datalist id="markers">
                                                {Object.values(BIOMEDICAL_MARKERS).map(m => <option key={m.name} value={m.name} />)}
                                            </datalist>
                                            <input
                                                type="text"
                                                className="w-full md:w-40 border-slate-200 border rounded-xl p-3 text-sm text-center font-black placeholder:text-slate-300"
                                                placeholder={currMarkerName ? getReferencePlaceholder(currMarkerName) : 'Valor'}
                                                value={currMarkerVal}
                                                onChange={e => setCurrMarkerVal(e.target.value)}
                                                onKeyPress={e => e.key === 'Enter' && handleAddMarker()}
                                            />
                                            <button onClick={handleAddMarker} className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-black hover:shadow-lg transition-all">Add</button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
                                            {manualMarkers.map((m, i) => (
                                                <div key={i} className={`flex flex-col p-4 rounded-2xl border transition-all group ${m.name && getReferencePlaceholder(m.name).includes('-') ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <input 
                                                            type="text"
                                                            value={m.name}
                                                            onChange={(e) => {
                                                                const newMarkers = [...manualMarkers];
                                                                newMarkers[i].name = e.target.value;
                                                                setManualMarkers(newMarkers);
                                                            }}
                                                            className="text-[10px] font-black uppercase text-slate-500 bg-transparent border-none focus:ring-0 w-full outline-none"
                                                            placeholder="Nome do Marcador"
                                                        />
                                                        <button onClick={() => setManualMarkers(manualMarkers.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-rose-500 transition-colors ml-2">✕</button>
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
                                                            className="flex-1 text-lg font-black text-indigo-600 bg-transparent border-b-2 border-transparent focus:border-indigo-400 outline-none py-1"
                                                            placeholder="0.00"
                                                        />
                                                        <span className="text-[10px] font-black text-slate-400 uppercase">{m.unit}</span>
                                                    </div>
                                                    <p className="text-[8px] text-slate-300 font-bold mt-2 uppercase tracking-tighter">
                                                        Ref: {m.name ? getReferencePlaceholder(m.name) : '---'}
                                                    </p>
                                                </div>
                                            ))}
                                            {manualMarkers.length === 0 && (
                                                <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-200 rounded-3xl opacity-40">
                                                    <p className="text-xs font-bold text-slate-500 uppercase">Aguardando inserção de marcadores...</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-between pt-4">
                                        <button onClick={() => setFormStep(1)} className="text-slate-500 text-sm font-bold uppercase tracking-widest">« Voltar</button>
                                        <button onClick={() => setFormStep(3)} className="bg-indigo-600 text-white px-10 py-3 rounded-xl text-sm font-black shadow-lg flex items-center gap-2">
                                            Próxima Etapa: Alertas Críticos <span>➔</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {formStep === 3 && (
                                <div className="space-y-8 animate-fadeIn">
                                    <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 mb-6">
                                        <h5 className="text-[11px] font-black uppercase text-rose-600 mb-2 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                                            Protocolo de Segurança Clínica
                                        </h5>
                                        <p className="text-[10px] text-rose-700 font-medium leading-relaxed">
                                            Selecione quaisquer observações qualitativas de urgência detectadas no laudo. Estes achados geram alertas visuais imediatos e priorizam a análise de risco.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {QUALITATIVE_FINDINGS.map((f, i) => (
                                            <button
                                                key={i}
                                                onClick={() => toggleQualitative(f.achado)}
                                                className={`text-left p-5 rounded-3xl border-2 transition-all ${manualQualitative.includes(f.achado) ? 'bg-white border-rose-500 shadow-xl shadow-rose-100' : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'}`}
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className={`text-xs font-black ${manualQualitative.includes(f.achado) ? 'text-rose-600' : 'text-slate-800'}`}>{f.achado}</span>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${manualQualitative.includes(f.achado) ? 'bg-rose-500 border-rose-500' : 'border-slate-200'}`}>
                                                        {manualQualitative.includes(f.achado) && <span className="text-white text-[10px]">✔</span>}
                                                    </div>
                                                </div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase italic tracking-tighter">{f.nota}</p>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex justify-between pt-8 border-t">
                                        <button onClick={() => setFormStep(2)} className="text-slate-500 text-sm font-bold uppercase tracking-widest">« Voltar</button>
                                        <div className="flex gap-4">
                                            <button onClick={handleCancelForm} className="text-slate-400 text-sm font-bold px-6 py-2">Descartar</button>
                                            <button onClick={handleSaveManualExam} className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-12 py-4 rounded-2xl font-black shadow-2xl shadow-emerald-200 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest">
                                                {editingExamId ? 'Confirmar Edição' : 'Efetivar no Prontuário'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* List/Evolution View */}
                <div className="p-6">
                    {viewMode === 'EVOLUTION' ? (
                        <div className="space-y-8 animate-fadeIn">
                            {/* ... (rest of evolution content) ... */}
                            {exams.length >= 2 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    {(() => {
                                        const sorted = [...exams].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                        const latest = sorted[0];
                                        const previous = sorted[1];

                                        const commonMarkers = latest.markers?.filter(m => previous.markers?.some(pm => pm.name === m.name)).slice(0, 3) || [];

                                        return commonMarkers.map(m => {
                                            const pm = previous.markers?.find(x => x.name === m.name);
                                            const diff = Number(m.value) - Number(pm?.value || 0);
                                            const percent = pm ? (diff / Number(pm.value)) * 100 : 0;

                                            return (
                                                <div key={m.name} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{m.name}</p>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-xl font-black text-slate-800">{m.value}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold">{m.unit}</span>
                                                        </div>
                                                        <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${diff > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                            {diff > 0 ? '↑' : '↓'} {Math.abs(percent).toFixed(1)}%
                                                        </div>
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 mt-2 font-medium">Anterior: {pm?.value} {pm?.unit}</p>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            )}

                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                                    Mapa de Tendências Clínicas
                                </h4>
                                <div className="flex items-center gap-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Selecione o Marcador:</label>
                                    <select className="text-xs font-bold border rounded-xl p-2.5 bg-white shadow-sm outline-none focus:ring-2 ring-indigo-100 min-w-[200px]" value={selectedMarkerForEvo} onChange={e => setSelectedMarkerForEvo(e.target.value)}>
                                        {evolutionData.markers.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
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
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                                            <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                            <Area type="monotone" dataKey={selectedMarkerForEvo} stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    ) : viewMode === 'REQUESTS' ? (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                                        <span className="text-2xl">📑</span>
                                        {isCreatingRequest ? (editingRequestId ? 'Editar Solicitação' : 'Nova Solicitação') : 'Solicitações de Exames'}
                                    </h3>
                                    {!isCreatingRequest && (
                                        <button
                                            onClick={() => {
                                                setEditingRequestId(null);
                                                setRequestExams([]);
                                                setRequestIndication('');
                                                setRequestComplementary('');
                                                setRequestFasting(false);
                                                setRequestMedications('');
                                                setIsCreatingRequest(true);
                                            }}
                                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <span>+</span> Gerar Nova
                                        </button>
                                    )}
                                </div>
                            </div>

                            {isCreatingRequest ? (
                                <div className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Seleção de Exames */}
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Adicionar Exames</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Buscar exame (ex: Colesterol, TSH...)"
                                                    className="w-full text-xs font-bold p-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 ring-indigo-100 outline-none pr-10"
                                                    value={searchExamQuery}
                                                    onChange={e => setSearchExamQuery(e.target.value)}
                                                />
                                                <div className="absolute right-4 top-4 text-slate-400">🔍</div>
                                            </div>

                                            {searchExamQuery.length >= 2 && (
                                                <div className="bg-white border border-slate-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-2 space-y-1">
                                                    {Object.values(BIOMEDICAL_MARKERS)
                                                        .filter(m =>
                                                            m.name.toLowerCase().includes(searchExamQuery.toLowerCase()) ||
                                                            m.aliases.some(a => a.toLowerCase().includes(searchExamQuery.toLowerCase()))
                                                        )
                                                        .slice(0, 10)
                                                        .map(m => (
                                                            <button
                                                                key={m.name}
                                                                onClick={() => {
                                                                    if (!requestExams.includes(m.name)) {
                                                                        setRequestExams([...requestExams, m.name]);
                                                                    }
                                                                    setSearchExamQuery('');
                                                                }}
                                                                className="w-full text-left p-3 hover:bg-indigo-50 rounded-xl transition-colors flex justify-between items-center group"
                                                            >
                                                                <span className="text-[11px] font-bold text-slate-700">{m.name}</span>
                                                                <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 font-black">+ ADD</span>
                                                            </button>
                                                        ))
                                                    }
                                                </div>
                                            )}

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {requestExams.map(name => (
                                                    <div key={name} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-[10px] font-black border border-indigo-100">
                                                        {name}
                                                        <button onClick={() => setRequestExams(requestExams.filter(n => n !== name))} className="text-indigo-400 hover:text-indigo-600">×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Dados Clínicos */}
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Indicação Clínica / Motivo</label>
                                                <textarea
                                                    placeholder="Descreva brevemente o motivo da solicitação..."
                                                    className="w-full text-xs font-bold p-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 ring-indigo-100 outline-none h-24"
                                                    value={requestIndication}
                                                    onChange={e => setRequestIndication(e.target.value)}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={requestFasting}
                                                            onChange={e => setRequestFasting(e.target.checked)}
                                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <span className="text-[10px] font-black text-slate-600 uppercase">Exige Jejum?</span>
                                                    </label>
                                                    {requestFasting && (
                                                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm">
                                                            <input
                                                                type="number"
                                                                value={requestFastingHours}
                                                                onChange={e => setRequestFastingHours(parseInt(e.target.value))}
                                                                className="w-12 text-xs font-black text-center outline-none"
                                                            />
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Horas</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Medicações em Uso</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ex: Metformina, Puran T4..."
                                                        className="w-full text-xs font-bold p-3 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 ring-indigo-100 outline-none"
                                                        value={requestMedications}
                                                        onChange={e => setRequestMedications(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
                                        <button onClick={() => setIsCreatingRequest(false)} className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 tracking-widest transition-colors">Cancelar</button>
                                        <button onClick={handleSaveRequest} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-102 transition-transform active:scale-95">Gerar Solicitação ✨</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {examRequests.length === 0 ? (
                                        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100">
                                            <div className="text-4xl mb-4">📑</div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma solicitação gerada ainda</p>
                                        </div>
                                    ) : (
                                        examRequests.map(req => (
                                            <div key={req.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-colors">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 text-xl font-bold">
                                                        {req.exams.length}
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">
                                                            {req.exams.slice(0, 3).join(', ')}{req.exams.length > 3 ? '...' : ''}
                                                        </h5>
                                                        <div className="flex gap-4 mt-1">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 italic">
                                                                📅 {new Date(req.date).toLocaleDateString('pt-BR')}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 italic">
                                                                👤 {req.authorName}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEditRequest(req)}
                                                        className="px-4 py-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handlePrintRequest(req)}
                                                        className="px-5 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors flex items-center gap-2"
                                                    >
                                                        <span>🖨️</span> PDF
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('Deseja excluir esta solicitação?')) {
                                                                await db.deleteExamRequest(req.id);
                                                                loadRequests();
                                                            }
                                                        }}
                                                        className="p-2.5 text-rose-500 hover:text-rose-700 transition-colors text-[10px] font-black uppercase tracking-widest"
                                                    >
                                                        Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
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
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">REGISTRO EM {new Date(exam.date).toLocaleDateString('pt-BR')}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button onClick={() => handleEditExam(exam)} className="px-3 py-1.5 hover:bg-white rounded-xl transition-colors text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-100" title="Editar">Editar</button>
                                                <button onClick={() => handleDeleteExam(exam.id)} className="px-3 py-1.5 hover:bg-red-50 rounded-xl transition-colors text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-100" title="Excluir">Excluir</button>
                                                <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                                                <button onClick={() => handleRunAnalysis(exam)} disabled={analyzingId === exam.id} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm ${exam.analysisResult ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-600 text-white hover:scale-105 active:scale-95'}`}>
                                                    {analyzingId === exam.id ? 'Refinando...' : exam.analysisResult ? '✨ Recalcular' : '✨ Analisar IA'}
                                                </button>
                                                <button onClick={() => setSelectedExamId(selectedExamId === exam.id ? null : exam.id)} className={`p-3 rounded-xl transition-all ${selectedExamId === exam.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>
                                                    {selectedExamId === exam.id ? '▲' : '▼'}
                                                </button>
                                            </div>
                                        </div>

                                        {(selectedExamId === exam.id || exams.length === 1) && (
                                            <div className="p-6 bg-white animate-fadeIn">
                                                {/* Achados Críticos Qualitativos no topo do card */}
                                                {(exam.qualitativeFindings && exam.qualitativeFindings.length > 0) && (
                                                    <div className="mb-10 bg-rose-50 border border-rose-200 rounded-3xl p-6 relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-100/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                                        <h5 className="text-[10px] font-black uppercase text-rose-600 tracking-widest mb-4 flex items-center gap-2">
                                                            <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                                                            Achados de Urgência Clinica
                                                        </h5>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {exam.qualitativeFindings.map((q, idx) => (
                                                                <div key={idx} className="flex gap-3 items-start bg-white/60 p-3 rounded-2xl border border-rose-100 shadow-sm">
                                                                    <Icons.AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                                                                    <div>
                                                                        <p className="text-[11px] font-black text-rose-900 leading-tight">{q}</p>
                                                                        <p className="text-[9px] text-rose-400 font-bold mt-1 uppercase italic">{QUALITATIVE_FINDINGS.find(f => f.achado === q)?.nota || 'Alerta Crítico'}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                                    {/* Painel de Marcadores Agrupados */}
                                                    <div className="lg:col-span-7 space-y-8">
                                                        {(() => {
                                                            const groups: Record<string, ExamMarker[]> = {};
                                                            exam.markers?.forEach(m => {
                                                                // Obter o tipo do marcador do dicionário global se não estiver no marcador
                                                                const meta = Object.values(BIOMEDICAL_MARKERS).find(x => x.name === m.name);
                                                                const category = meta?.tipo || 'BIOQUIMICO';
                                                                if (!groups[category]) groups[category] = [];
                                                                groups[category].push(m);
                                                            });

                                                            const categoryLabels: Record<string, string> = {
                                                                'HEMATOLOGICO': 'Série Hematológica (Hemograma)',
                                                                'BIOQUIMICO': 'Bioquímica Clínica',
                                                                'HORMONAL': 'Perfil Hormonal',
                                                                'MARCADOR_TUMORAL': 'Oncologia / Marcadores Tumoriais',
                                                                'COAGULACAO': 'Coagulação',
                                                                'GASOMETRIA': 'Gasometria',
                                                                'TOXICOLOGICO': 'Toxicologia'
                                                            };

                                                            return Object.entries(groups).map(([cat, markers]) => (
                                                                <div key={cat} className={`${cat === 'HEMATOLOGICO' ? 'bg-indigo-50/30 p-4 rounded-3xl border border-indigo-100' : ''}`}>
                                                                    <h5 className={`text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${cat === 'HEMATOLOGICO' ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                                        {cat === 'HEMATOLOGICO' && <span className="text-sm">🩸</span>}
                                                                        {categoryLabels[cat] || cat}
                                                                        <span className="h-[1px] flex-1 bg-current opacity-10"></span>
                                                                    </h5>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                        {markers.map(m => (
                                                                            <div key={m.id} className={`p-4 rounded-2xl border transition-all ${m.interpretation === 'CRITICO' ? 'bg-rose-50 border-critical' : (m.interpretation !== 'NORMAL' ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100 shadow-sm hover:shadow-md')}`}>
                                                                                <div className="flex justify-between items-start mb-1">
                                                                                    <p className="text-[11px] font-black text-slate-800 truncate w-32">{m.name}</p>
                                                                                    {renderInterpretationBadge(m.interpretation)}
                                                                                </div>
                                                                                <div className="flex items-baseline gap-1">
                                                                                    <span className={`text-2xl font-black ${m.interpretation === 'CRITICO' ? 'text-rose-600' : (m.interpretation !== 'NORMAL' ? 'text-amber-600' : 'text-slate-900')}`}>{m.value}</span>
                                                                                    <span className="text-[9px] text-slate-400 font-bold uppercase">{m.unit}</span>
                                                                                </div>
                                                                                <div className="mt-2 text-[9px]">
                                                                                    <p className="text-slate-400 font-medium">Ref: {m.reference.label}</p>
                                                                                    {m.biomedicalData && (
                                                                                        <p className={`mt-1 font-bold ${m.interpretation === 'CRITICO' ? 'text-rose-500' : 'text-slate-500'}`}>{m.biomedicalData.risco}</p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>

                                                    {/* Painel Lateral (Graficos e IA) */}
                                                    <div className="lg:col-span-5 space-y-8">
                                                        <div>
                                                            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 border-b pb-2">Posicionamento na Faixa</h5>
                                                            <div className="space-y-4">
                                                                {exam.markers?.slice(0, 2).map(m => (
                                                                    <div key={m.id} className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                                                                        <p className="text-[10px] font-black text-slate-700 mb-1 uppercase tracking-tighter">{m.name}</p>
                                                                        {renderComparisonChart(m)}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {exam.analysisResult && (
                                                            <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-2xl relative overflow-hidden group border border-slate-800">
                                                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                                                                <div className="relative z-10 space-y-6">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-10 h-10 bg-indigo-600 flex items-center justify-center rounded-xl shadow-lg border border-indigo-400 rotate-3 group-hover:rotate-0 transition-transform">✨</div>
                                                                            <div>
                                                                                <h6 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Insight Biomédico Avançado</h6>
                                                                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Powered by ClinIQ AI v2.5</p>
                                                                            </div>
                                                                        </div>
                                                                        {exam.analysisResult.isFallback && (
                                                                            <span className="bg-rose-500/20 text-rose-400 text-[8px] font-bold px-2 py-0.5 rounded-full border border-rose-500/30">MODO OFFLINE</span>
                                                                        )}
                                                                    </div>

                                                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 italic">
                                                                        <p className="text-xs font-medium leading-relaxed opacity-95">"{exam.analysisResult.summary}"</p>
                                                                    </div>

                                                                    <div className="space-y-6 pt-2">
                                                                        {/* Cruzamento de Dados */}
                                                                        <div className="space-y-3">
                                                                            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                                                                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                                                                Padrões e Fisiopatologia
                                                                            </p>
                                                                            <div className="space-y-4 ml-2">
                                                                                {exam.analysisResult.findings.map((f, i) => (
                                                                                    <div key={i} className="flex gap-4 items-start group/finding">
                                                                                        <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${f.impact === 'NEGATIVO' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : (f.impact === 'POSITIVO' ? 'bg-emerald-500' : 'bg-slate-500')}`}></div>
                                                                                        <p className="text-[11px] font-medium leading-normal text-slate-300">
                                                                                            <b className="text-white block mb-0.5">{f.marker}</b>
                                                                                            {f.correlation}
                                                                                        </p>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        {/* Fisiopatologia e Causas */}
                                                                        {exam.analysisResult.possibleCauses && exam.analysisResult.possibleCauses.length > 0 && (
                                                                            <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                                                                <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Hipóteses e Causas Fundamentais</p>
                                                                                <ul className="space-y-2">
                                                                                    {exam.analysisResult.possibleCauses.map((c, i) => (
                                                                                        <li key={i} className="text-[10px] text-slate-400 leading-tight flex gap-2">
                                                                                            <span className="text-amber-500">•</span> {c}
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        )}

                                                                        {/* Intervenção Dietoterápica */}
                                                                        {exam.analysisResult.suggestedTreatments && exam.analysisResult.suggestedTreatments.length > 0 && (
                                                                            <div className="space-y-3 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                                                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Nutrição Funcional e Condutas</p>
                                                                                <ul className="space-y-2">
                                                                                    {exam.analysisResult.suggestedTreatments.map((t, i) => (
                                                                                        <li key={i} className="text-[10px] text-emerald-100/80 leading-tight flex gap-2">
                                                                                            <span className="text-emerald-500 font-black">✓</span> {t}
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        )}

                                                                        {/* Próximos Passos e Riscos */}
                                                                        {exam.analysisResult.nextSteps && exam.analysisResult.nextSteps.length > 0 && (
                                                                            <div className="space-y-3 p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                                                                                <p className="text-[9px] font-black uppercase tracking-widest text-rose-400">Investigação e Riscos Associados</p>
                                                                                <ul className="space-y-2">
                                                                                    {exam.analysisResult.nextSteps.map((s, i) => (
                                                                                        <li key={i} className="text-[10px] text-rose-100/80 leading-tight flex gap-2">
                                                                                            <span className="text-rose-500 font-bold">!</span> {s}
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="pt-4 flex justify-between items-baseline">
                                                                        <p className="text-[7px] text-slate-600 font-black uppercase tracking-widest">Relatório Confidencial • Uso Profissional</p>
                                                                        <button 
                                                                            onClick={() => handleRunAnalysis(exam)}
                                                                            className="text-[8px] font-black text-indigo-400 uppercase hover:text-white transition-colors"
                                                                        >
                                                                            Recalcular com Novos Dados ➔
                                                                        </button>
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

            {/* VISTA DE IMPRESSÃO (Oculta mas capturada pelo html2pdf) */}
            {printingRequest && (
                <div className="fixed top-0 left-0 w-full opacity-0 pointer-events-none -z-50">
                    <div ref={pdfRef}>
                        <ExamRequestPrintView
                            patient={patient}
                            request={printingRequest}
                            user={user}
                            clinic={clinic}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const ExamRequestPrintView = ({ patient, request, user, clinic }: { patient: Patient, request: any, user: User, clinic: any }) => {
    return (
        <div className="bg-white text-black p-[20mm] font-sans w-[210mm] min-h-[297mm]">
            <PDFHeader
                clinic={clinic}
                patient={patient}
                user={user}
                title="Solicitação de Exames"
            />

            <div className="mb-12 bg-slate-50 p-6 rounded-xl border border-slate-100 flex justify-between items-center">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Paciente</label>
                    <p className="text-xl font-black text-slate-800 tracking-tight">{patient.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">D.N: {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR') : 'N/A'}</p>
                </div>
                <div className="text-right">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Data da Solicitação</label>
                    <p className="text-lg font-bold text-slate-700">{new Date(request.date).toLocaleDateString('pt-BR')}</p>
                </div>
            </div>

            <div className="mb-12">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-slate-900 pl-4 mb-8">Exames Solicitados</h2>
                <div className="grid grid-cols-1 gap-y-4">
                    {request.exams.map((exam: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-4 text-sm font-medium text-slate-800 border-b border-slate-100 pb-2">
                            <span className="w-6 h-6 flex items-center justify-center bg-slate-900 text-white rounded text-[10px] font-bold shrink-0">{idx + 1}</span>
                            <span className="flex-1">{exam}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-20">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Indicação Clínica</h3>
                        <p className="text-xs font-medium text-slate-600 leading-relaxed italic">"{request.clinicalIndication || 'Acompanhamento nutricional de rotina.'}"</p>
                    </div>
                    {request.medications && (
                        <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Medicações em Uso</h3>
                            <p className="text-xs font-medium text-slate-600 leading-relaxed">{request.medications}</p>
                        </div>
                    )}
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span>📋</span> Instruções de Coleta
                    </h3>
                    <ul className="space-y-3 text-[11px] font-medium text-slate-600">
                        <li className="flex gap-2">
                            <span className="text-slate-900">•</span>
                            <span>{request.fastingRequired ? `Jejum obrigatório de ${request.fastingHours} horas.` : 'Jejum não obrigatório para estes exames.'}</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-slate-900">•</span>
                            <span>Manter dieta habitual nos 3 dias anteriores à coleta.</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-slate-900">•</span>
                            <span>Evitar esforço físico intenso nas 24h que antecedem o exame.</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="mt-auto border-t-2 border-slate-100 pt-12 text-center">
                <div className="w-64 h-[1px] bg-slate-200 mx-auto mb-4"></div>
                <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">{user.name}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{user.role}</p>
            </div>

            <div className="mt-8 text-center text-[8px] text-slate-300 font-bold uppercase tracking-widest">
                Gerado via ControlClin Cloud • Documento Digital • {new Date().toLocaleTimeString()}
            </div>
        </div>
    );
};
