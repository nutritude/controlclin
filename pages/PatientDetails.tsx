
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Clinic, Patient, Exam, Role, AnthropometryRecord, TimelineEventType, PaymentMode, FinancialTransaction, PaymentMethod, FinancialStatus, Appointment, Professional, AppointmentStatus, Anthropometry, AnthroSnapshot, AnthroAnalysisResult } from '../types';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { db } from '../services/db';
import { AIAnthroAnalysisService } from '../services/aiAnthroAnalysis';
import { Icons } from '../constants';
import NutritionalPlanning from '../components/NutritionalPlanning'; // IMPORT NEW COMPONENT

interface PatientDetailsProps {
    user: User;
    clinic: Clinic;
    isManagerMode: boolean; // New prop
}

type Tab = 'HISTORY' | 'PRONTUARIO' | 'ANTHRO' | 'NUTRITION' | 'FINANCIAL' | 'EXAMS'; // ADDED NUTRITION TAB

// --- HELPERS ---

const safeFilename = (name: string): string =>
    name.trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // remove acentos
        .replace(/[^a-zA-Z0-9\s]/g, '')   // remove pontuação
        .trim()
        .replace(/\s+/g, '_');             // espaços → underscore

const waitForAssets = async (element: HTMLElement): Promise<void> => {
    const images = Array.from(element.querySelectorAll('img'));
    const fontPromise = (document as any).fonts ? (document as any).fonts.ready : Promise.resolve();

    const imagePromises = images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
        });
    });

    await Promise.all([...imagePromises, fontPromise]);
};


const TIMELINE_TYPES: Record<TimelineEventType, { label: string, color: string, icon: string }> = {
    'PRIMEIRA_CONSULTA': { label: 'Primeira Consulta', color: 'bg-blue-600', icon: '👋' },
    'CONSULTA_ROTINA': { label: 'Consulta de Rotina', color: 'bg-teal-600', icon: '📅' },
    'ATUALIZACAO_PLANO': { label: 'Atualização Alimentar', color: 'bg-emerald-600', icon: '🥗' },
    'SOLICITACAO_EXAMES': { label: 'Solicitação de Exames', color: 'bg-purple-600', icon: '🧪' },
    'AVALIACAO_FISICA': { label: 'Avaliação Física', color: 'bg-orange-600', icon: '📏' },
    'EDUCACAO_NUTRICIONAL': { label: 'Educação Nutricional', color: 'bg-yellow-500', icon: '🍎' },
    'OUTRO': { label: 'Outro', color: 'bg-slate-500', icon: '📝' },
};

type ProtocolDef = {
    label: string;
    folds: (gender: string) => Array<keyof Anthropometry>;
};

const SKINFOLD_PROTOCOLS: Record<NonNullable<Anthropometry['skinfoldProtocol']>, ProtocolDef> = {
    JacksonPollock7: {
        label: 'Pollock (7 Dobras)',
        folds: () => ['skinfoldChest', 'skinfoldAxillary', 'skinfoldTriceps', 'skinfoldSubscapular', 'skinfoldAbdominal', 'skinfoldSuprailiac', 'skinfoldThigh']
    },
    JacksonPollock3: {
        label: 'Pollock (3 Dobras)',
        folds: (gender) => gender === 'Masculino' ? ['skinfoldChest', 'skinfoldAbdominal', 'skinfoldThigh'] : ['skinfoldTriceps', 'skinfoldSuprailiac', 'skinfoldThigh']
    },
    DurninWomersley: {
        label: 'Durnin & Womersley (4)',
        folds: () => ['skinfoldBiceps', 'skinfoldTriceps', 'skinfoldSubscapular', 'skinfoldSuprailiac']
    },
    Faulkner: {
        label: 'Faulkner (Físico/Esporte)',
        folds: () => ['skinfoldTriceps', 'skinfoldSubscapular', 'skinfoldSuprailiac', 'skinfoldAbdominal']
    },
    Guedes: {
        label: 'Guedes (3 Dobras)',
        folds: (gender) => gender === 'Masculino' ? ['skinfoldTriceps', 'skinfoldSuprailiac', 'skinfoldAbdominal'] : ['skinfoldThigh', 'skinfoldSuprailiac', 'skinfoldSubscapular']
    },
    ISAK: {
        label: 'ISAK (Medidas Completas)',
        folds: () => ['skinfoldTriceps', 'skinfoldBiceps', 'skinfoldSubscapular', 'skinfoldSuprailiac', 'skinfoldAbdominal', 'skinfoldThigh', 'skinfoldCalf', 'skinfoldAxillary', 'skinfoldChest']
    }
};

const SKINFOLD_LABELS: Record<string, string> = {
    skinfoldChest: 'Peitoral',
    skinfoldAxillary: 'Axilar Média',
    skinfoldTriceps: 'Tríceps',
    skinfoldBiceps: 'Bíceps',
    skinfoldSubscapular: 'Subescapular',
    skinfoldAbdominal: 'Abdominal',
    skinfoldSuprailiac: 'Supra-ilíaca',
    skinfoldThigh: 'Coxa',
    skinfoldCalf: 'Panturrilha'
};

const PAYMENT_METHODS_LABELS: Record<PaymentMethod, string> = {
    'DINHEIRO': 'Dinheiro (Espécie)',
    'PIX': 'Pix',
    'CARTAO_CREDITO': 'Cartão de Crédito',
    'CARTAO_DEBITO': 'Cartão de Débito',
    'BOLETO': 'Boleto Bancário',
    'GUIA_CONVENIO': 'Guia TISS (Convênio)'
};

const STATUS_LABELS: Record<FinancialStatus, { label: string, color: string }> = {
    'PAGO': { label: 'Pago', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
    'PENDENTE': { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
    'AGUARDANDO_AUTORIZACAO': { label: 'Aguard. Autorização', color: 'bg-orange-100 text-orange-800 border border-orange-200' },
    'GLOSADO': { label: 'Glosado (Negado)', color: 'bg-red-100 text-red-800 border border-red-200' },
    'CANCELADO': { label: 'Cancelado', color: 'bg-slate-100 text-slate-600 border border-slate-200' }
};

// Simple SVG Line Chart Component
const SimpleLineChart = ({ data, dataKey, color, label, isManagerMode }: { data: any[], dataKey: string, color: string, label: string, isManagerMode: boolean }) => {
    // BUG FIX: Filter out invalid data points to prevent chart from crashing
    const validData = data.filter(d => d && typeof d[dataKey] === 'number' && isFinite(d[dataKey]));

    if (!validData || validData.length < 2) return <div className={`h-40 flex items-center justify-center text-sm ${isManagerMode ? 'text-gray-400 bg-gray-700 border-gray-600' : 'text-slate-400 bg-emerald-50 border-emerald-200'} rounded border`}>Dados insuficientes para gráfico</div>;

    const values = validData.map(d => d[dataKey]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    // SVG Dimensions
    const width = 600;
    const height = 200;
    const padding = 20;

    // Normalize points
    const points = validData.map((d, i) => {
        const x = padding + (i / (validData.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((d[dataKey] - min) / range) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                {/* Background Lines */}
                <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke={isManagerMode ? '#4b5563' : '#e2e8f0'} strokeWidth="1" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={isManagerMode ? '#4b5563' : '#cbd5e1'} strokeWidth="1" />

                {/* The Line */}
                <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                {/* Dots & Tooltips Logic would go here, simplified for MVP */}
                {validData.map((d, i) => {
                    const x = padding + (i / (validData.length - 1)) * (width - 2 * padding);
                    const y = height - padding - ((d[dataKey] - min) / range) * (height - 2 * padding);
                    return (
                        <g key={i}>
                            <circle cx={x} cy={y} r="4" fill={isManagerMode ? '#374151' : 'white'} stroke={color} strokeWidth="2" />
                            <text x={x} y={y - 12} textAnchor="middle" fontSize="11" fontWeight="bold" fill={isManagerMode ? '#9ca3af' : '#475569'}>{d[dataKey]}</text>
                            <text x={x} y={height + 5} textAnchor="middle" fontSize="10" fill={isManagerMode ? '#6b7280' : '#64748b'}>{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>
                        </g>
                    );
                })}
            </svg>
            <p className={`text-center text-xs mt-2 font-semibold uppercase tracking-wider ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>{label} ao longo do tempo</p>
        </div>
    );
};


const PatientDetails: React.FC<PatientDetailsProps> = ({ user, clinic, isManagerMode }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [patient, setPatient] = useState<Patient | null>(null);
    const [professionals, setProfessionals] = useState<Professional[]>([]); // New State
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('ANTHRO');

    // New State for Clinical Header
    const [clinicalAppointments, setClinicalAppointments] = useState<Appointment[]>([]);
    const [clinicalGoal, setClinicalGoal] = useState('');
    const [activeDiagnoses, setActiveDiagnoses] = useState<string[]>([]);
    const [newDiagnosis, setNewDiagnosis] = useState('');
    const [isEditingClinicalHeader, setIsEditingClinicalHeader] = useState(false);

    // Chart State
    const [chartMetric, setChartMetric] = useState<'weight' | 'bmi' | 'waistCircumference'>('weight');

    // Edit States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditingTab, setIsEditingTab] = useState(false);
    const [editingAnthroDate, setEditingAnthroDate] = useState<string | null>(null);

    const handleNewAnthro = () => {
        setFormData(prev => ({ ...prev, anthropometry: { procedureDate: new Date().toISOString().split('T')[0] } as any }));
        setEditingAnthroDate(null);
        setIsEditingTab(true);
    };

    const handleEditAnthroHistory = (record: AnthropometryRecord) => {
        setFormData(prev => ({ ...prev, anthropometry: { ...record, procedureDate: record.date } as any }));
        setEditingAnthroDate(record.date);
        setIsEditingTab(true);
    };


    // Temporary Form States
    const [formData, setFormData] = useState<Partial<Patient>>({});

    // Timeline State
    const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
    const [timelineType, setTimelineType] = useState<TimelineEventType>('CONSULTA_ROTINA');
    const [timelineDate, setTimelineDate] = useState(new Date().toISOString().split('T')[0]);
    const [timelineDesc, setTimelineDesc] = useState('');

    // --- FINANCIAL TRANSACTION STATE (ENHANCED) ---
    const [isTransModalOpen, setIsTransModalOpen] = useState(false);
    const [transDesc, setTransDesc] = useState('');

    // Core Values
    const [transOriginalAmount, setTransOriginalAmount] = useState<number>(0);
    const [transDiscountPercent, setTransDiscountPercent] = useState<number>(0);

    // Payment Config
    const [transPaymentForm, setTransPaymentForm] = useState<'VISTA' | 'PARCELADO'>('VISTA');
    const [transInstallments, setTransInstallments] = useState<number>(1);
    const [transInterestPercent, setTransInterestPercent] = useState<number>(0);

    // Calculated Values (Read-only mostly)
    const [transFinalAmount, setTransFinalAmount] = useState<number>(0);
    const [transParcelValue, setTransParcelValue] = useState<number>(0);

    const [transMethod, setTransMethod] = useState<PaymentMethod>('PIX');
    const [transStatus, setTransStatus] = useState<FinancialStatus>('PENDENTE');

    // --- APPOINTMENT MODAL STATE ---
    const [isApptModalOpen, setIsApptModalOpen] = useState(false);
    const [apptError, setApptError] = useState<string | null>(null);
    const [apptForm, setApptForm] = useState({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '09:30',
        professionalId: '',
        type: 'RETORNO',
        status: 'AGENDADO' as AppointmentStatus
    });
    // Financial State for Appointment Modal
    const [apptPrice, setApptPrice] = useState<string>('');
    const [apptFinancialStatus, setApptFinancialStatus] = useState<FinancialStatus>('PENDENTE');
    const [apptPaymentMethod, setApptPaymentMethod] = useState<PaymentMethod>('PIX');

    // --- EXAM CONTEXT MODAL STATE ---
    const [isExamUploadModalOpen, setIsExamUploadModalOpen] = useState(false);
    const [examUploadForm, setExamUploadForm] = useState({
        reason: '',
        hypothesis: '',
        appointmentId: ''
    });

    // Prontuário AI State
    const [noteContent, setNoteContent] = useState('');
    const [isImprovingText, setIsImprovingText] = useState(false);

    // ANTHROPOMETRY EXPANSION STATE
    const [anthroAnalysisResult, setAnthroAnalysisResult] = useState<AnthroAnalysisResult | null>(null);
    const [isAnalyzingAnthro, setIsAnalyzingAnthro] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const pdfReportRef = useRef<HTMLDivElement>(null);
    const [pdfSnapshot, setPdfSnapshot] = useState<AnthroSnapshot | null>(null); // Snapshot state for PDF consistency


    const isAdmin = user.role === Role.CLINIC_ADMIN || user.role === Role.SUPER_ADMIN;
    // Permissions for clinical header
    const canEditClinical = user.role === Role.PROFESSIONAL || isAdmin;
    const isProfessionalUser = user.role === Role.PROFESSIONAL;

    // Data for chart, including the current unsaved measurement for real-time visualization
    const chartData = useMemo(() => {
        const history = patient?.anthropometryHistory || [];
        const current = patient?.anthropometry ? [{
            date: new Date().toISOString(),
            weight: patient.anthropometry.weight,
            height: patient.anthropometry.height,
            bmi: patient.anthropometry.bmi,
            waistCircumference: patient.anthropometry.circWaist
        }] : [];
        return [...history, ...current];
    }, [patient]);


    useEffect(() => {
        if (id) {
            fetchData(id);
            fetchAppointments(id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, clinic.id, isProfessionalUser, user.professionalId]); // Added professionalUser and professionalId

    // --- FINANCIAL CALCULATION EFFECT ---
    useEffect(() => {
        if (!isTransModalOpen) return;

        // 1. Apply Discount
        const discountValue = transOriginalAmount * (transDiscountPercent / 100);
        let baseAfterDiscount = transOriginalAmount - discountValue;
        if (baseAfterDiscount < 0) baseAfterDiscount = 0;

        // 2. Apply Interest (if Installments) & Calculate Final
        let final = baseAfterDiscount;

        if (transPaymentForm === 'PARCELADO') {
            // Simple interest calculation added to total: Base * (1 + Interest%)
            const interestValue = baseAfterDiscount * (transInterestPercent / 100);
            final = baseAfterDiscount + interestValue;

            const count = Math.max(1, Math.min(12, transInstallments));
            setTransParcelValue(final / count);
        } else {
            setTransParcelValue(final); // 1x
        }

        setTransFinalAmount(final);

    }, [transOriginalAmount, transDiscountPercent, transPaymentForm, transInstallments, transInterestPercent, isTransModalOpen]);


    const fetchAppointments = async (patientId: string) => {
        // Filter appointments by professional if in professional mode
        const appts = await db.getPatientAppointmentsFullHistory(patientId, isProfessionalUser ? user.professionalId : undefined);
        setClinicalAppointments(appts);
    };

    const fetchData = async (patientId: string) => {
        const p = await db.getPatients(clinic.id, isProfessionalUser ? user.professionalId : undefined); // Filter patients here
        const found = p.find(pt => pt.id === patientId) || null;
        setPatient(found);
        if (found) {
            setFormData(found);
            // Safe field mapping for legacy data (backwards compatibility)
            if (found.anthropometry) {
                if (found.anthropometry.waistCircumference !== undefined && found.anthropometry.circWaist === undefined) {
                    found.anthropometry.circWaist = found.anthropometry.waistCircumference;
                }
                if (found.anthropometry.hipCircumference !== undefined && found.anthropometry.circHip === undefined) {
                    found.anthropometry.circHip = found.anthropometry.hipCircumference;
                }
            }
            setClinicalGoal(found.clinicalSummary?.clinicalGoal || '');
            setActiveDiagnoses(found.clinicalSummary?.activeDiagnoses || []);

            // Parse stored AI analysis if it exists
            if (found.anthropometry?.anthroAiAnalysis) {
                try {
                    const parsed = JSON.parse(found.anthropometry.anthroAiAnalysis);
                    setAnthroAnalysisResult(parsed);
                } catch (e) {
                    // Backward compatibility for old string format
                    setAnthroAnalysisResult({
                        summary: found.anthropometry.anthroAiAnalysis,
                        keyFindings: [],
                        risks: [],
                        recommendedActions: [],
                        isFallback: true
                    });
                }
            } else {
                setAnthroAnalysisResult(null);
            }
        }

        const e = await db.getExams(clinic.id, patientId);
        setExams(e);

        // Fetch professionals for the schedule dropdown
        const profs = await db.getProfessionals(clinic.id);
        setProfessionals(profs);

        // Set default professional if logged in user is professional
        if (user.professionalId) {
            setApptForm(prev => ({ ...prev, professionalId: user.professionalId! }));
        } else if (profs.length > 0) {
            setApptForm(prev => ({ ...prev, professionalId: profs[0].id }));
        }

        setLoading(false);
    };

    const calculateAge = (birthDate: string) => {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const getLastVisit = () => {
        const now = new Date();
        const past = clinicalAppointments
            .filter(a => a.status !== 'CANCELADO' && new Date(a.startTime) < now)
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()); // Descending
        return past.length > 0 ? new Date(past[0].startTime).toLocaleDateString() : 'Nenhuma';
    };

    const getNextVisit = () => {
        const now = new Date();
        const future = clinicalAppointments
            .filter(a => a.status !== 'CANCELADO' && new Date(a.startTime) >= now)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()); // Ascending
        return future.length > 0 ? new Date(future[0].startTime).toLocaleDateString() + ' ' + new Date(future[0].startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Não agendado';
    };

    const handleSaveClinicalHeader = async () => {
        if (!patient) return;
        try {
            const updatedSummary = {
                clinicalGoal: clinicalGoal,
                activeDiagnoses: activeDiagnoses,
                updatedAt: new Date().toISOString()
            };

            await db.updatePatient(user, patient.id, {
                ...patient,
                clinicalSummary: updatedSummary
            });

            setIsEditingClinicalHeader(false);
            fetchData(patient.id);
        } catch (err) {
            alert('Erro ao salvar resumo clínico');
        }
    };

    const handleAddDiagnosis = () => {
        if (newDiagnosis.trim()) {
            setActiveDiagnoses([...activeDiagnoses, newDiagnosis.trim()]);
            setNewDiagnosis('');
        }
    };

    const handleRemoveDiagnosis = (index: number) => {
        const newD = [...activeDiagnoses];
        newD.splice(index, 1);
        setActiveDiagnoses(newD);
    };

    // UPDATED UPLOAD HANDLER WITH METADATA
    const handleUploadExam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patient) return;
        if (!examUploadForm.reason.trim()) {
            alert("O motivo clínico é obrigatório.");
            return;
        }

        try {
            await db.uploadExam(user, patient.id, {
                fileName: 'Hemograma_Mock.pdf',
                reason: examUploadForm.reason,
                hypothesis: examUploadForm.hypothesis,
                appointmentId: examUploadForm.appointmentId
            });

            setIsExamUploadModalOpen(false);
            setExamUploadForm({ reason: '', hypothesis: '', appointmentId: '' }); // Reset
            fetchData(patient.id);
        } catch (err) {
            alert("Erro ao enviar exame: " + err);
        }
    };

    const handleRunAI = async (examId: string) => {
        setAnalyzingId(examId);
        try {
            await db.analyzeExamWithAI(user, examId);
            if (patient) fetchData(patient.id);
        } catch (e) {
            alert('Falha na análise de IA');
        } finally {
            setAnalyzingId(null);
        }
    };

    const handleDelete = async () => {
        if (!patient) return;
        if (confirm(`Tem certeza que deseja excluir o paciente ${patient.name}? Esta ação é irreversível.`)) {
            try {
                await db.deletePatient(user, patient.id);
                alert('Paciente excluído com sucesso.');
                navigate('/patients');
            } catch (error) {
                alert('Erro ao excluir: ' + error);
            }
        }
    };

    const handleSaveBasicInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patient) return;
        try {
            await db.updatePatient(user, patient.id, formData);
            setIsEditModalOpen(false);
            fetchData(patient.id);
        } catch (err) {
            alert('Erro ao salvar: ' + err);
        }
    };

    const handleSaveTab = async () => {
        if (!patient) return;
        try {
            // Use a deep copy to avoid direct state mutation issues.
            let updatedData = JSON.parse(JSON.stringify(formData));

            // Logic to update history and merge calculated results if saving Anthropometry
            if (activeTab === 'ANTHRO' && updatedData.anthropometry) {

                // Sanitize numerical fields: remove empty strings, fix NaNs
                Object.keys(updatedData.anthropometry).forEach(key => {
                    if ((key.startsWith('skinfold') || key.startsWith('circ') || key === 'weight' || key === 'height') && key !== 'skinfoldProtocol') {
                        const v = updatedData.anthropometry[key];
                        if (typeof v === 'string' && v.trim() === '') {
                            updatedData.anthropometry[key] = undefined;
                        } else if (typeof v === 'number' && isNaN(v)) {
                            updatedData.anthropometry[key] = undefined;
                        } else if (typeof v === 'string') {
                            const num = parseFloat(v);
                            updatedData.anthropometry[key] = isNaN(num) ? undefined : num;
                        }
                    }
                });

                // --- NEW: Protocol Validation and Data Sanitization ---
                const protocol = updatedData.anthropometry.skinfoldProtocol || 'JacksonPollock7';
                const requiredFolds = SKINFOLD_PROTOCOLS[protocol as keyof typeof SKINFOLD_PROTOCOLS]?.folds(patient.gender) || [];

                const missingFolds: string[] = [];
                for (const fold of requiredFolds) {
                    const val = updatedData.anthropometry[fold];
                    if (val === undefined || val === null || val === '') {
                        missingFolds.push(SKINFOLD_LABELS[fold as string] || fold as string);
                    }
                }

                if (missingFolds.length > 0) {
                    alert(`Cálculo não pode ser efetuado. Campos obrigatórios ausentes para o protocolo ${SKINFOLD_PROTOCOLS[protocol as keyof typeof SKINFOLD_PROTOCOLS]?.label}:\n- ${missingFolds.join('\n- ')}`);
                    return; // Abort save if missing required fields
                }

                // --------------------------------------------------------

                // Merge calculated results into the anthropometry object to be saved
                Object.assign(updatedData.anthropometry, anthropometryResults);

                const anthro = updatedData.anthropometry;
                const recordDate = anthro.procedureDate || new Date().toISOString().split('T')[0];

                const newRecord: AnthropometryRecord = {
                    date: recordDate,
                    weight: anthro.weight,
                    height: anthro.height,
                    bmi: anthro.bmi || 0,
                    waistCircumference: anthro.circWaist,
                    // Added for graphing
                    bodyFatPercentage: anthro.bodyFatPercentage,
                    fatMass: anthro.fatMass,
                    leanMass: anthro.leanMass
                };

                // Update history conditionally (edit vs new)
                const history = patient.anthropometryHistory || [];
                const idx = history.findIndex((r: AnthropometryRecord) => r.date === (editingAnthroDate || recordDate));
                if (idx !== -1) {
                    const newHistory = [...history];
                    newHistory[idx] = newRecord;
                    updatedData.anthropometryHistory = newHistory;
                } else {
                    updatedData.anthropometryHistory = [...history, newRecord];
                }

                // Preserve AI analysis if it exists
                updatedData.anthropometry.anthroAiAnalysis = anthroAnalysisResult ? JSON.stringify(anthroAnalysisResult) : undefined;
            }

            await db.updatePatient(user, patient.id, updatedData);
            setIsEditingTab(false);
            setEditingAnthroDate(null);
            fetchData(patient.id);
        } catch (err) {
            alert('Erro ao salvar: ' + err);
        }
    };

    const updateNestedData = (section: keyof Patient, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...(prev[section] as any),
                [field]: value
            }
        }));
    };

    const updateAnthroData = (field: keyof Anthropometry, value: any) => {
        let finalValue = value;
        if (['skinfoldProtocol', 'procedureDate', 'anthroAiAnalysis'].includes(field as string)) {
            finalValue = value;
        } else {
            finalValue = value === '' ? undefined : (typeof value === 'string' ? parseFloat(value) : value);
        }

        setFormData(prev => ({
            ...prev,
            anthropometry: {
                ...(prev.anthropometry as any),
                [field]: finalValue
            }
        }));
    };

    // --- ANTHROPOMETRY REAL-TIME CALCULATION (ENHANCED PROTOCOLS) ---
    const anthropometryResults = useMemo(() => {
        if (!patient || !formData.anthropometry) {
            return { bmi: 0, bodyFatPercentage: 0, fatMass: 0, leanMass: 0, waistToHipRatio: 0 };
        }

        const anthro = formData.anthropometry;
        const { weight, height, circWaist, circHip } = anthro;
        const age = calculateAge(patient.birthDate);
        const gender = patient.gender;
        const protocol = anthro.skinfoldProtocol || 'JacksonPollock7';

        // 1. BMI
        const bmi = (weight && height) ? parseFloat((weight / (height * height)).toFixed(1)) : 0;

        // 2. Waist-to-Hip Ratio
        const waistToHipRatio = (circWaist && circHip) ? parseFloat((circWaist / circHip).toFixed(2)) : 0;

        // 3. Body Fat % Calculation by Protocol
        let bodyFatPercentage = 0;
        let bodyDensity = 0;

        const {
            skinfoldChest, skinfoldAbdominal, skinfoldThigh, skinfoldTriceps,
            skinfoldSubscapular, skinfoldSuprailiac, skinfoldAxillary, skinfoldBiceps
        } = anthro;

        try {
            if (protocol === 'JacksonPollock7') {
                const skinfolds = [skinfoldChest, skinfoldAbdominal, skinfoldThigh, skinfoldTriceps, skinfoldSubscapular, skinfoldSuprailiac, skinfoldAxillary];
                if (skinfolds.every(sf => typeof sf === 'number' && sf > 0) && age > 0) {
                    const sum = skinfolds.reduce((s, v) => s! + v!, 0)!;
                    if (gender === 'Masculino') {
                        bodyDensity = 1.112 - (0.00043499 * sum) + (0.00000055 * Math.pow(sum, 2)) - (0.00028826 * age);
                    } else {
                        bodyDensity = 1.097 - (0.00046971 * sum) + (0.00000056 * Math.pow(sum, 2)) - (0.00012828 * age);
                    }
                    if (bodyDensity > 0) bodyFatPercentage = (495 / bodyDensity) - 450;
                }
            } else if (protocol === 'JacksonPollock3') {
                if (gender === 'Masculino') {
                    const sum = (skinfoldChest || 0) + (skinfoldAbdominal || 0) + (skinfoldThigh || 0);
                    if (sum > 0) {
                        bodyDensity = 1.10938 - (0.0008267 * sum) + (0.0000016 * Math.pow(sum, 2)) - (0.0002574 * age);
                        bodyFatPercentage = (495 / bodyDensity) - 450;
                    }
                } else {
                    const sum = (skinfoldTriceps || 0) + (skinfoldSuprailiac || 0) + (skinfoldThigh || 0);
                    if (sum > 0) {
                        bodyDensity = 1.0994921 - (0.0009929 * sum) + (0.0000023 * Math.pow(sum, 2)) - (0.0001392 * age);
                        bodyFatPercentage = (495 / bodyDensity) - 450;
                    }
                }
            } else if (protocol === 'Guedes') {
                if (gender === 'Masculino') {
                    const sum = (skinfoldTriceps || 0) + (skinfoldSuprailiac || 0) + (skinfoldAbdominal || 0);
                    if (sum > 0) {
                        bodyDensity = 1.17136 - (0.06706 * Math.log10(sum));
                        bodyFatPercentage = (495 / bodyDensity) - 450;
                    }
                } else {
                    const sum = (skinfoldThigh || 0) + (skinfoldSuprailiac || 0) + (skinfoldSubscapular || 0);
                    if (sum > 0) {
                        bodyDensity = 1.16650 - (0.07063 * Math.log10(sum));
                        bodyFatPercentage = (495 / bodyDensity) - 450;
                    }
                }
            } else if (protocol === 'DurninWomersley') {
                const sum = (skinfoldBiceps || 0) + (skinfoldTriceps || 0) + (skinfoldSubscapular || 0) + (skinfoldSuprailiac || 0);
                if (sum > 0) {
                    let c = 0, m = 0;
                    if (gender === 'Masculino') {
                        if (age < 20) { c = 1.1620; m = 0.0630; }
                        else if (age < 30) { c = 1.1631; m = 0.0632; }
                        else if (age < 40) { c = 1.1422; m = 0.0544; }
                        else if (age < 50) { c = 1.1333; m = 0.0612; }
                        else { c = 1.1715; m = 0.0779; }
                    } else {
                        if (age < 20) { c = 1.1549; m = 0.0678; }
                        else if (age < 30) { c = 1.1599; m = 0.0717; }
                        else if (age < 40) { c = 1.1423; m = 0.0632; }
                        else if (age < 50) { c = 1.1333; m = 0.0612; }
                        else { c = 1.1339; m = 0.0645; }
                    }
                    bodyDensity = c - (m * Math.log10(sum));
                    bodyFatPercentage = (495 / bodyDensity) - 450;
                }
            } else if (protocol === 'Faulkner') {
                const sum = (skinfoldTriceps || 0) + (skinfoldSubscapular || 0) + (skinfoldSuprailiac || 0) + (skinfoldAbdominal || 0);
                if (sum > 0) bodyFatPercentage = (sum * 0.153) + 5.783;
            }
        } catch (e) {
            console.error("Anthro calculation error", e);
            bodyFatPercentage = 0;
        }

        const bf = (typeof bodyFatPercentage === 'number' && !isNaN(bodyFatPercentage)) ? bodyFatPercentage : 0;
        const finalBf = Math.max(0, parseFloat(bf.toFixed(1)));

        // 4. Fat Mass & Lean Mass
        const fatMass = (weight && finalBf) ? parseFloat(((weight * finalBf) / 100).toFixed(1)) : 0;
        const leanMass = (weight && fatMass) ? parseFloat((weight - fatMass).toFixed(1)) : 0;

        return { bmi, bodyFatPercentage: finalBf, fatMass, leanMass, waistToHipRatio };

    }, [formData.anthropometry, patient, calculateAge]);

    // --- ANTHROPOMETRY DELAY ALERT ---
    const anthroDelayDays = useMemo(() => {
        if (!patient || !patient.anthropometryHistory || patient.anthropometryHistory.length === 0) return 0;

        // Find the latest date in history
        const historyDates = patient.anthropometryHistory.map(h => new Date(h.date).getTime());
        const lastDate = new Date(Math.max(...historyDates));
        const today = new Date();

        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }, [patient]);


    // --- TIMELINE ACTIONS ---
    const handleAddTimelineEvent = async () => {
        if (!patient) return;
        try {
            await db.addTimelineEvent(user, patient.id, {
                date: timelineDate,
                type: timelineType,
                title: TIMELINE_TYPES[timelineType].label,
                description: timelineDesc
            });
            setIsTimelineModalOpen(false);
            setTimelineDesc(''); // Reset only desc
            fetchData(patient.id);
        } catch (err) {
            alert('Erro: ' + err);
        }
    };

    const handleDeleteTimelineEvent = async (eventId: string) => {
        if (!patient) return;
        if (confirm('Tem certeza que deseja remover este evento da linha do tempo?')) {
            try {
                await db.deleteTimelineEvent(user, patient.id, eventId);
                fetchData(patient.id);
            } catch (err) {
                alert('Erro: ' + err);
            }
        }
    }

    // --- FINANCIAL ACTIONS ---
    const handleOpenTransactionModal = () => {
        // Reset State
        setTransDesc('');
        setTransOriginalAmount(0);
        setTransDiscountPercent(0);
        setTransPaymentForm('VISTA');
        setTransInstallments(1);
        setTransInterestPercent(0);
        setTransStatus('PENDENTE');
        setTransMethod('PIX');
        setIsTransModalOpen(true);
    };

    const handleAddTransaction = async () => {
        if (!patient) return;
        if (transOriginalAmount <= 0) {
            alert("O valor original deve ser maior que zero.");
            return;
        }

        try {
            const installString = transPaymentForm === 'PARCELADO' ? `${transInstallments}x` : undefined;

            await db.addTransaction(user, patient.id, {
                date: new Date().toISOString(),
                description: transDesc || 'Serviço Clínico',
                amount: transFinalAmount, // Store the FINAL calculated amount for revenue stats
                method: transMethod,
                status: transStatus,
                // Metadata for editing later (or display details)
                originalAmount: transOriginalAmount,
                discountPercent: transDiscountPercent,
                interestPercent: transInterestPercent,
                installmentCount: transPaymentForm === 'PARCELADO' ? transInstallments : 1,
                installments: installString, // Visual string
                // Simple check for auth code if insurance
                authorizationCode: transMethod === 'GUIA_CONVENIO' ? 'SOLICITADO' : undefined
            });
            setIsTransModalOpen(false);
            fetchData(patient.id);
        } catch (err) {
            alert('Erro: ' + err);
        }
    }

    // --- APPOINTMENT ACTIONS ---
    const checkDateAvailability = (dateStr: string) => {
        const config = clinic.scheduleConfig || { openTime: '08:00', closeTime: '18:00', daysOpen: [1, 2, 3, 4, 5] };
        const [y, m, d] = dateStr.split('-').map(Number);
        const dayOfWeek = new Date(y, m - 1, d).getDay();

        if (!config.daysOpen.includes(dayOfWeek)) {
            return false;
        }
        return true;
    };

    const handleDateBlur = () => {
        if (!checkDateAvailability(apptForm.date)) {
            setApptError('Data não disponível para agendamento (Clínica fechada).');
            alert('Data não disponível para agendamento');
        } else {
            setApptError(null);
        }
    };

    const handleSaveAppointment = async () => {
        if (!patient) return;
        setApptError(null);

        const config = clinic.scheduleConfig || { openTime: '08:00', closeTime: '18:00', daysOpen: [1, 2, 3, 4, 5] };

        if (!checkDateAvailability(apptForm.date)) {
            const msg = 'Data não disponível para agendamento (Clínica fechada).';
            setApptError(msg);
            alert(msg);
            return;
        }
        if (apptForm.startTime < config.openTime || apptForm.endTime > config.closeTime) {
            const msg = `Horário fora do expediente. Funcionamento: ${config.openTime} às ${config.closeTime}.`;
            setApptError(msg);
            alert(msg);
            return;
        }

        const startDateTime = new Date(`${apptForm.date}T${apptForm.startTime}`);
        const endDateTime = new Date(`${apptForm.date}T${apptForm.endTime}`);

        if (endDateTime <= startDateTime) {
            alert("Hora final deve ser maior que inicial.");
            return;
        }

        try {
            // 1. Create Appointment with Financial Data
            const newAppointment = await db.createAppointment(user, {
                clinicId: clinic.id,
                professionalId: apptForm.professionalId,
                patientId: patient.id,
                patientName: patient.name,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                type: apptForm.type as any,
                status: apptForm.status,
                // Financials
                price: apptPrice ? parseFloat(apptPrice) : 0,
                financialStatus: apptFinancialStatus,
                paymentMethod: apptPaymentMethod
            });

            // 2. Automatically create Financial Transaction if price > 0
            const amountVal = parseFloat(apptPrice);
            if (!isNaN(amountVal) && amountVal > 0) {
                await db.addTransaction(user, patient.id, {
                    date: startDateTime.toISOString(),
                    description: `Agendamento: ${apptForm.type} - ${patient.name}`,
                    amount: amountVal,
                    method: apptPaymentMethod,
                    status: apptFinancialStatus,
                    originalAmount: amountVal,
                    discountPercent: 0,
                    installmentCount: 1,
                    installments: '1x'
                });
            }

            setIsApptModalOpen(false);
            fetchAppointments(patient.id);
            fetchData(patient.id); // Refresh patient to update financials if tab is open
        } catch (err) {
            alert('Erro ao agendar: ' + err);
        }
    };

    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        setApptForm(prev => ({ ...prev, startTime: newStart }));
        if (newStart) {
            const [h, m] = newStart.split(':').map(Number);
            const d = new Date(); d.setHours(h, m + 30);
            setApptForm(prev => ({ ...prev, endTime: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
        }
    };

    // --- PRONTUARIO IA ACTIONS ---
    const handleImproveText = async () => {
        if (!noteContent.trim()) return;
        setIsImprovingText(true);
        try {
            const improved = await db.improveTextWithAI(noteContent);
            setNoteContent(improved);
        } catch (err) {
            alert('Erro na IA');
        } finally {
            setIsImprovingText(false);
        }
    };

    const handleSaveNote = async () => {
        if (!patient || !noteContent.trim()) return;
        try {
            await db.saveClinicalNote(user, patient.id, noteContent);
            setNoteContent('');
            fetchData(patient.id);
        } catch (err) {
            alert('Erro: ' + err);
        }
    };

    // --- NEW ANTHROPOMETRY ACTIONS (FIXED PDF & AI) ---
    const handleAnalyzeAnthro = async () => {
        if (!patient || !patient.id) return;
        setIsAnalyzingAnthro(true);
        try {
            // 1. Build Snapshot using CURRENT FORM DATA (supports unsaved changes)
            const { snapshot, source, warnings } = await db.getAnthroSnapshot(patient.id, formData as Patient);

            if (!snapshot || source === 'none') {
                alert(`Impossível analisar: ${warnings.join(' ')}`);
                setIsAnalyzingAnthro(false);
                return;
            }

            // Optional: User feedback if using unsaved data
            if (source === 'patient') {
                console.log("Aviso: Usando dados da tela (não salvos) para análise.");
            }

            // 2. Call New AI Service
            const analysis = await AIAnthroAnalysisService.analyze(snapshot);
            setAnthroAnalysisResult(analysis);

            // 3. Save result stringified (preserving compatibility)
            updateAnthroData('anthroAiAnalysis', JSON.stringify(analysis));

        } catch (err) {
            alert("Erro ao analisar com IA: " + err);
        } finally {
            setIsAnalyzingAnthro(false);
        }
    };

    const handleGeneratePdf = async () => {
        if (!pdfReportRef.current || !patient) {
            alert("Erro: Referência do relatório não encontrada.");
            return;
        }

        setIsGeneratingPdf(true);

        try {
            // 1. Get Fresh Snapshot for PDF
            const { snapshot, warnings } = await db.getAnthroSnapshot(patient.id, formData as Patient);
            if (!snapshot) {
                throw new Error(`Dados insuficientes para gerar PDF. ${warnings.join(' ')}`);
            }
            setPdfSnapshot(snapshot);

            // 2. Aguarda o React renderizar o estado no DOM (Double RAF)
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            // 3. Biblioteca via window (CDN estável no index.html)
            const html2pdf = (window as any).html2pdf;
            if (!html2pdf) {
                throw new Error("Biblioteca de PDF não carregada. Verifique sua conexão.");
            }

            // 4. Capturar o elemento original no DOM (escondido via fixed/opacity:0)
            const element = pdfReportRef.current;

            // 5. Aguardar Assets (Fontes e Imagens)
            await waitForAssets(element);

            const fileName = `Relatorio_Antropometria_${safeFilename(patient.name)}.pdf`;
            console.log("PDF: Iniciando geração do arquivo:", fileName);

            const opt = {
                margin: 0,
                filename: fileName,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: '#ffffff',
                    imageTimeout: 15000,
                    logging: false
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // 6. Geração direta
            await html2pdf().set(opt).from(element).save();
            console.log("PDF: Download disparado com sucesso -", fileName);

        } catch (err: any) {
            console.error("PDF Error:", err);
            alert("Erro ao gerar PDF: " + (err.message || err));
        } finally {
            setIsGeneratingPdf(false);
        }
    };


    if (loading || !patient) return <div>Carregando prontuário...</div>;

    // Calculos Financeiros
    const financialTransactions = patient.financial?.transactions || [];
    const totalPaid = financialTransactions.filter(t => t.status === 'PAGO').reduce((acc, t) => acc + t.amount, 0);
    const totalPending = financialTransactions.filter(t => t.status === 'PENDENTE' || t.status === 'AGUARDANDO_AUTORIZACAO').reduce((acc, t) => acc + t.amount, 0);

    // Logic for Next Visit Display
    const nextVisitString = getNextVisit();

    return (
        <div className={`space-y-6 ${isManagerMode ? 'text-gray-100' : 'text-slate-800'}`}>
            {/* Header Fixo do Paciente */}
            <div className={`${isManagerMode ? 'bg-gray-800 shadow-lg ring-gray-700 border-indigo-700' : 'bg-white shadow-sm ring-slate-200 border-emerald-500'} rounded-xl p-6 border-l-4 relative ring-1`}>
                {/* Header Actions */}
                <div className="absolute top-4 right-4 flex gap-2">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className={`p-2 rounded transition-colors ${isManagerMode ? 'text-gray-300 hover:text-indigo-400 hover:bg-gray-700' : 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'}`} title="Editar Pessoais"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                    </button>
                    {isAdmin && (
                        <button
                            onClick={handleDelete}
                            className={`p-2 rounded transition-colors ${isManagerMode ? 'text-gray-300 hover:text-red-400 hover:bg-red-900' : 'text-emerald-700 hover:text-red-600 hover:bg-red-50'}`} title="Excluir Paciente"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-4">
                        <div className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold border ${isManagerMode ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-emerald-100 text-emerald-500 border-emerald-200'}`}>
                            {patient.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className={`text-2xl font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>{patient.name}</h1>
                            <div className="flex gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${isManagerMode ? 'bg-gray-700 text-gray-300' : 'bg-emerald-100 text-emerald-600'}`}>{patient.gender}</span>
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${isManagerMode ? 'bg-indigo-900 text-indigo-300' : 'bg-emerald-100 text-emerald-800'}`}>Nasc: {patient.birthDate}</span>
                                {patient.cpf && <span className={`text-xs px-2 py-0.5 rounded border font-mono ${isManagerMode ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>CPF: {patient.cpf}</span>}
                            </div>
                        </div>
                    </div>
                    <div className={`text-sm md:text-right space-y-1 pr-12 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>
                        <p><strong>Email:</strong> {patient.email}</p>
                        <p><strong>Tel:</strong> {patient.phone}</p>
                        <p><strong>Endereço:</strong> {patient.address || 'Não informado'}</p>
                    </div>
                </div>
            </div>

            {/* --- NOVO MÓDULO: TOPO CLÍNICO DO PACIENTE --- */}
            <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-emerald-50 border-emerald-200'} rounded-xl p-5 shadow-sm relative`}>
                <div className="flex justify-between items-start mb-3">
                    <h3 className={`text-sm font-bold uppercase tracking-wide flex items-center gap-2 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>
                        <span className="text-lg">🩺</span> Resumo Clínico
                    </h3>
                    {canEditClinical && !isEditingClinicalHeader && (
                        <button onClick={() => setIsEditingClinicalHeader(true)} className={`text-xs hover:underline font-bold transition-colors ${isManagerMode ? 'text-indigo-400 hover:text-indigo-200' : 'text-emerald-600 hover:text-emerald-800'}`}>Editar Resumo</button>
                    )}
                </div>

                {isEditingClinicalHeader ? (
                    <div className="space-y-4 animate-fadeIn">
                        <div>
                            <label className={`block text-xs font-bold uppercase ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Objetivo Clínico Principal</label>
                            <input
                                type="text"
                                className={`w-full border rounded p-2 text-sm mt-1 focus:ring-emerald-500 focus:border-emerald-500 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`}
                                value={clinicalGoal}
                                onChange={(e) => setClinicalGoal(e.target.value)}
                                placeholder="Ex: Controle de Diabetes e Perda de Peso"
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold uppercase ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Diagnósticos Ativos (Tags)</label>
                            <div className="flex flex-wrap gap-2 mt-2 mb-2">
                                {activeDiagnoses.map((diag, idx) => (
                                    <span key={idx} className={`px-2 py-1 rounded text-xs flex items-center gap-1 border ${isManagerMode ? 'bg-red-900 text-red-300 border-red-700' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                        {diag}
                                        <button onClick={() => handleRemoveDiagnosis(idx)} className={`${isManagerMode ? 'hover:text-red-100' : 'hover:text-red-900'} font-bold ml-1`}>×</button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className={`flex-1 border rounded p-2 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`}
                                    placeholder="Adicionar diagnóstico..."
                                    value={newDiagnosis}
                                    onChange={(e) => setNewDiagnosis(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddDiagnosis()}
                                />
                                <button onClick={handleAddDiagnosis} className={`px-3 py-1 rounded text-xs font-bold ${isManagerMode ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-emerald-200 hover:bg-emerald-300 text-emerald-700'}`}>Add</button>
                            </div>
                        </div>
                        <div className={`flex justify-end gap-2 pt-2 border-t ${isManagerMode ? 'border-gray-700' : 'border-emerald-200'}`}>
                            <button onClick={() => setIsEditingClinicalHeader(false)} className={`text-xs px-3 py-1 rounded font-medium ${isManagerMode ? 'text-gray-300 hover:bg-gray-700' : 'text-emerald-700 hover:bg-emerald-200'}`}>Cancelar</button>
                            <button onClick={handleSaveClinicalHeader} className={`text-xs px-3 py-1 rounded hover:bg-emerald-700 font-bold shadow-sm ${isManagerMode ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>Salvar Resumo</button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div className={`md:col-span-1 pr-4 ${isManagerMode ? 'border-gray-700' : 'border-emerald-200'} md:border-r`}>
                            <p className={`text-xs uppercase font-bold mb-1 ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Idade</p>
                            <p className={`text-xl font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>{calculateAge(patient.birthDate)} anos</p>

                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <div>
                                    <p className={`text-[10px] uppercase font-bold ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Última Visita</p>
                                    <p className={`text-xs font-semibold ${isManagerMode ? 'text-gray-200' : 'text-emerald-900'}`}>{getLastVisit()}</p>
                                </div>
                                <div>
                                    <p className={`text-[10px] uppercase font-bold ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Próxima</p>
                                    {nextVisitString === 'Não agendado' ? (
                                        <button
                                            onClick={() => setIsApptModalOpen(true)}
                                            className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${isManagerMode ? 'text-indigo-300 hover:text-indigo-100 bg-indigo-900 border-indigo-700' : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 bg-emerald-100 border-emerald-100'}`}
                                        >
                                            AGENDAR?
                                        </button>
                                    ) : (
                                        <p className={`text-xs font-bold ${isManagerMode ? 'text-indigo-400' : 'text-emerald-600'}`}>{nextVisitString}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-3 pl-0 md:pl-4">
                            <div className="mb-4">
                                <p className={`text-xs uppercase font-bold mb-1 ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Objetivo Principal</p>
                                <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-200 text-emerald-900'} p-3 rounded border shadow-sm`}>
                                    <p className="font-medium italic">
                                        {patient.clinicalSummary?.clinicalGoal || <span className={`${isManagerMode ? 'text-gray-500' : 'text-emerald-600'} not-italic`}>Não definido.</span>}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className={`text-xs uppercase font-bold mb-1 ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Diagnósticos Ativos</p>
                                <div className="flex flex-wrap gap-2">
                                    {patient.clinicalSummary?.activeDiagnoses && patient.clinicalSummary.activeDiagnoses.length > 0 ? (
                                        patient.clinicalSummary.activeDiagnoses.map((d, i) => (
                                            <span key={i} className={`px-2 py-1 rounded text-xs font-bold shadow-sm border ${isManagerMode ? 'bg-red-900 text-red-300 border-red-700' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                {d}
                                            </span>
                                        ))
                                    ) : (
                                        <span className={`${isManagerMode ? 'text-gray-500' : 'text-emerald-600'} text-xs italic`}>Nenhum diagnóstico ativo registrado.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs Navigation */}
            <div className={`${isManagerMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'HISTORY', label: 'Histórico & Evolução' },
                        { id: 'PRONTUARIO', label: 'Prontuário (IA)' },
                        { id: 'ANTHRO', label: 'Antropometria' },
                        { id: 'NUTRITION', label: 'Planejamento Nutricional' },
                        { id: 'FINANCIAL', label: 'Financeiro' },
                        { id: 'EXAMS', label: 'Exames' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id as Tab); setIsEditingTab(false); }}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === tab.id
                                ? (isManagerMode ? 'border-indigo-500 text-indigo-400' : 'border-emerald-600 text-emerald-700')
                                : (isManagerMode ? 'border-transparent text-gray-400 hover:text-gray-100 hover:border-gray-600' : 'border-transparent text-emerald-500 hover:text-emerald-800 hover:border-emerald-300')
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px] relative pb-10">

                {/* Global Edit Button for Tab content */}
                {(activeTab === 'ANTHRO' || activeTab === 'HISTORY') && (
                    <div className="flex justify-end mb-4">
                        {isEditingTab ? (
                            <div className="flex gap-2">
                                <button onClick={() => { setIsEditingTab(false); setEditingAnthroDate(null); }} className={`px-3 py-1 font-bold rounded hover:bg-gray-50 text-sm shadow-sm ${isManagerMode ? 'bg-gray-700 border border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border border-gray-300 text-gray-700'}`}>Cancelar</button>
                                <button onClick={handleSaveTab} className={`text-sm px-4 py-1 rounded shadow-sm font-bold ${isManagerMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>Salvar Alterações</button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                {activeTab === 'ANTHRO' && (
                                    <button onClick={handleNewAnthro} className={`text-sm flex items-center gap-1 px-4 py-2 rounded font-bold shadow-sm ${isManagerMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                                        <Icons.Plus className="w-4 h-4" /> Nova Avaliação
                                    </button>
                                )}
                                <button onClick={() => setIsEditingTab(true)} className={`px-4 py-2 text-sm flex items-center rounded border gap-1 font-bold ${isManagerMode ? 'bg-gray-700 border-gray-600 text-indigo-300 hover:bg-gray-600' : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    Editar Atual
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ... (TABS CONTENT MAINTAINED) ... */}
                {/* TAB: HISTORICO & TIMELINE */}
                {activeTab === 'HISTORY' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Esquerda: Anamnese */}
                        <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-200'} shadow-sm rounded-xl p-6 border`}>
                            <h3 className={`text-lg font-bold mb-4 border-b pb-2 ${isManagerMode ? 'text-white border-gray-700' : 'text-emerald-900 border-emerald-100'}`}>Anamnese</h3>
                            <div className="space-y-5">
                                {isEditingTab ? (
                                    <>
                                        <div>
                                            <label className={`block text-xs font-bold uppercase ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Patologias (separar por vírgula)</label>
                                            <input
                                                type="text"
                                                className={`w-full border rounded p-2 text-sm mt-1 focus:ring-emerald-500 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`}
                                                defaultValue={(formData.clinicalHistory?.pathologies || []).join(', ')}
                                                onChange={(e) => updateNestedData('clinicalHistory', 'pathologies', e.target.value.split(',').map(s => s.trim()))}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-bold uppercase ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Alergias</label>
                                            <input
                                                type="text"
                                                className={`w-full border rounded p-2 text-sm mt-1 focus:ring-emerald-500 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`}
                                                defaultValue={(formData.clinicalHistory?.allergies || []).join(', ')}
                                                onChange={(e) => updateNestedData('clinicalHistory', 'allergies', e.target.value.split(',').map(s => s.trim()))}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-bold uppercase ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Medicamentos</label>
                                            <input
                                                type="text"
                                                className={`w-full border rounded p-2 text-sm mt-1 focus:ring-emerald-500 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`}
                                                defaultValue={(formData.clinicalHistory?.medications || []).join(', ')}
                                                onChange={(e) => updateNestedData('clinicalHistory', 'medications', e.target.value.split(',').map(s => s.trim()))}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-bold uppercase ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Hábitos</label>
                                            <textarea
                                                className={`w-full border rounded p-2 text-sm mt-1 focus:ring-emerald-500 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`}
                                                rows={2}
                                                defaultValue={formData.clinicalHistory?.habits || ''}
                                                onChange={(e) => updateNestedData('clinicalHistory', 'habits', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-bold uppercase ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Sintomas</label>
                                            <textarea
                                                className={`w-full border rounded p-2 text-sm mt-1 focus:ring-emerald-500 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`}
                                                rows={2}
                                                defaultValue={formData.clinicalHistory?.symptoms || ''}
                                                onChange={(e) => updateNestedData('clinicalHistory', 'symptoms', e.target.value)}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <span className={`text-xs font-bold uppercase tracking-wide ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Patologias</span>
                                            <div className="mt-1 flex flex-wrap gap-2">
                                                {(patient.clinicalHistory?.pathologies && patient.clinicalHistory.pathologies.length > 0) ? patient.clinicalHistory.pathologies.map(p => (
                                                    <span key={p} className={`px-2 py-1 rounded text-sm font-medium border ${isManagerMode ? 'bg-red-900 text-red-300 border-red-700' : 'bg-red-50 text-red-800 border-red-100'}`}>{p}</span>
                                                )) : <span className={`${isManagerMode ? 'text-gray-500' : 'text-emerald-600'} text-sm italic`}>Nenhuma registrada</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <span className={`text-xs font-bold uppercase tracking-wide ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Medicamentos em Uso</span>
                                            <ul className={`mt-1 list-disc list-inside text-sm font-medium ${isManagerMode ? 'text-gray-100' : 'text-emerald-900'}`}>
                                                {(patient.clinicalHistory?.medications && patient.clinicalHistory.medications.length > 0) ? patient.clinicalHistory.medications.map(m => <li key={m}>{m}</li>) : <li className={`list-none italic ${isManagerMode ? 'text-gray-500' : 'text-emerald-600'}`}>Nenhum</li>}
                                            </ul>
                                        </div>
                                        <div>
                                            <span className={`text-xs font-bold uppercase tracking-wide ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Hábitos & Sintomas</span>
                                            <p className={`text-sm mt-1 p-2 rounded border ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-emerald-50 border-emerald-100 text-emerald-900'}`}>{patient.clinicalHistory?.habits || '...'}</p>
                                            <p className={`text-sm mt-2 p-2 rounded border italic ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-emerald-50 border-emerald-100 text-emerald-900'}`}>"{patient.clinicalHistory?.symptoms || '...'}"</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Direita: Timeline Editável */}
                        <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-200'} shadow-sm rounded-xl p-6 border`}>
                            <div className={`flex justify-between items-center mb-4 border-b pb-2 ${isManagerMode ? 'border-gray-700' : 'border-emerald-100'}`}>
                                <h3 className={`text-lg font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>Timeline de Evolução</h3>
                                <button
                                    onClick={() => setIsTimelineModalOpen(true)}
                                    className={`text-xs px-3 py-1.5 rounded hover:bg-emerald-700 flex items-center gap-1 font-bold shadow-sm ${isManagerMode ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}
                                >
                                    <span className="text-lg font-bold">+</span> Evento
                                </button>
                            </div>

                            <div className="flow-root max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                <ul className="-mb-8">
                                    {!patient.timelineEvents || patient.timelineEvents.length === 0 ? (
                                        <li className={`text-center text-sm py-8 italic ${isManagerMode ? 'text-gray-400' : 'text-emerald-600'}`}>Nenhum evento registrado na linha do tempo.</li>
                                    ) : (
                                        patient.timelineEvents.map((event, idx) => {
                                            const style = TIMELINE_TYPES[event.type];
                                            return (
                                                <li key={event.id} className="relative pb-8 group">
                                                    {/* Line */}
                                                    {idx !== patient.timelineEvents!.length - 1 && (
                                                        <span className={`absolute top-4 left-4 -ml-px h-full w-0.5 ${isManagerMode ? 'bg-gray-700' : 'bg-emerald-200'}`} aria-hidden="true"></span>
                                                    )}
                                                    <div className="relative flex space-x-3">
                                                        <div>
                                                            <span className={`h-8 w-8 rounded-full ${style.color} flex items-center justify-center ring-8 ${isManagerMode ? 'ring-gray-800' : 'ring-white'} text-white text-xs shadow-sm`}>
                                                                {style.icon}
                                                            </span>
                                                        </div>
                                                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                                            <div>
                                                                <p className={`text-sm font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>{event.title}</p>
                                                                {event.description && <p className={`text-sm mt-1 p-2 rounded border ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>{event.description}</p>}
                                                            </div>
                                                            <div className={`text-right text-sm whitespace-nowrap flex flex-col items-end ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>
                                                                <time className={`font-semibold ${isManagerMode ? 'text-gray-300' : 'text-emerald-800'}`}>{new Date(event.date).toLocaleDateString()}</time>
                                                                <button
                                                                    onClick={() => handleDeleteTimelineEvent(event.id)}
                                                                    className="text-red-400 hover:text-red-600 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity font-bold"
                                                                >
                                                                    Excluir
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: PRONTUARIO (NOVO) */}
                {activeTab === 'PRONTUARIO' && (
                    <div className="space-y-6">
                        {/* Editor */}
                        <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow rounded-lg p-6 border`}>
                            <h3 className={`text-lg font-medium mb-2 flex items-center gap-2 ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>
                                <span className="text-2xl">📝</span> Nova Anotação Clínica
                            </h3>
                            <p className={`text-xs mb-4 ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>
                                Descreva o estado do paciente de forma simples e use a IA para converter em termos técnicos médicos.
                            </p>

                            <textarea
                                className={`w-full border rounded-md p-3 text-sm focus:ring-2 focus:border-transparent ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-indigo-500' : 'bg-white border-emerald-300 text-emerald-900 focus:ring-emerald-500'}`}
                                rows={4}
                                placeholder="Ex: Paciente chegou com muita dor de barriga e enjoo..."
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                            />

                            <div className="flex justify-between items-center mt-3">
                                <button
                                    onClick={handleImproveText}
                                    disabled={isImprovingText || !noteContent.trim()}
                                    className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors
                                  ${isImprovingText
                                            ? (isManagerMode ? 'bg-purple-900 text-purple-400 cursor-wait' : 'bg-emerald-100 text-emerald-400 cursor-wait')
                                            : (isManagerMode ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm')}
                              `}
                                >
                                    {isImprovingText ? (
                                        <>Processando...</>
                                    ) : (
                                        <>
                                            <span>🪄</span> Melhorar com IA (Termos Técnicos)
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={handleSaveNote}
                                    disabled={!noteContent.trim()}
                                    className={`px-6 py-2 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 shadow-sm disabled:opacity-50`}
                                >
                                    Salvar no Prontuário
                                </button>
                            </div>
                        </div>

                        {/* Lista de Notas Anteriores */}
                        <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow rounded-lg overflow-hidden border`}>
                            <div className={`px-6 py-4 border-b ${isManagerMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-emerald-50'}`}>
                                <h3 className={`text-sm font-bold uppercase tracking-wide ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Histórico de Anotações</h3>
                            </div>
                            <ul className={`divide-y ${isManagerMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                {(!patient.clinicalNotes || patient.clinicalNotes.length === 0) ? (
                                    <li className={`p-6 text-center text-sm ${isManagerMode ? 'text-gray-500' : 'text-gray-500'}`}>Nenhuma anotação registrada.</li>
                                ) : (
                                    patient.clinicalNotes.map(note => (
                                        <li key={note.id} className={`p-6 ${isManagerMode ? 'hover:bg-gray-700' : 'hover:bg-emerald-50'}`}>
                                            <div className="flex justify-between mb-2">
                                                <span className={`text-sm font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>{note.authorName}</span>
                                                <span className={`text-xs ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>{new Date(note.date).toLocaleString()}</span>
                                            </div>
                                            <p className={`text-sm whitespace-pre-wrap ${isManagerMode ? 'text-gray-200' : 'text-emerald-800'}`}>{note.content}</p>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>
                    </div>
                )}

                {/* TAB: ANTROPOMETRIA (REFORMULADO) */}
                {activeTab === 'ANTHRO' && (
                    <div className="space-y-6">
                        {/* Alerta de Atraso */}
                        {anthroDelayDays > 30 && (
                            <div className={`p-4 rounded-xl border flex items-center gap-3 animate-pulse ${isManagerMode ? 'bg-amber-900/30 border-amber-800 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                                <div className="text-2xl">⚠️</div>
                                <div>
                                    <div className="font-bold">Atenção: Avaliação Atrasada</div>
                                    <div className="text-sm opacity-90">Faz {anthroDelayDays} dias desde a última avaliação antropométrica registrada. O ideal é repetir a cada 30 dias.</div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            {/* Coluna de Inputs */}
                            <div className="xl:col-span-2 space-y-4">
                                {/* Medidas Básicas */}
                                <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-200'} shadow-sm rounded-xl p-4 border`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className={`text-sm font-bold uppercase tracking-wide ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Medidas Básicas</h3>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-medium whitespace-nowrap">Protocolo:</label>
                                                <select
                                                    disabled={!isEditingTab}
                                                    value={formData.anthropometry?.skinfoldProtocol || 'JacksonPollock7'}
                                                    onChange={e => updateAnthroData('skinfoldProtocol' as any, e.target.value)}
                                                    className={`p-1 border rounded text-xs font-bold ${isManagerMode ? 'bg-gray-700 border-gray-600 text-white font-bold' : 'bg-white border-emerald-300 text-emerald-900 font-bold'}`}
                                                >
                                                    <option value="JacksonPollock7">Pollock (7 Dobras)</option>
                                                    <option value="JacksonPollock3">Pollock (3 Dobras)</option>
                                                    <option value="DurninWomersley">Durnin & Womersley (4)</option>
                                                    <option value="Faulkner">Faulkner (Físico/Esporte)</option>
                                                    <option value="Guedes">Guedes (3 Dobras)</option>
                                                    <option value="ISAK">ISAK (Medidas Completas)</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-medium whitespace-nowrap">Data:</label>
                                                <input
                                                    type="date"
                                                    disabled={!isEditingTab}
                                                    value={formData.anthropometry?.procedureDate || new Date().toISOString().split('T')[0]}
                                                    onChange={e => setFormData(prev => ({
                                                        ...prev,
                                                        anthropometry: {
                                                            ...(prev.anthropometry as any),
                                                            procedureDate: e.target.value
                                                        }
                                                    }))}
                                                    className={`p-1 border rounded text-xs font-bold ${isManagerMode ? 'bg-gray-700 border-gray-600 text-white font-bold' : 'bg-white border-emerald-300 text-emerald-900 font-bold'}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium">Peso (kg)</label>
                                            <input type="number" step="0.1" disabled={!isEditingTab} value={formData.anthropometry?.weight || ''} onChange={e => updateAnthroData('weight', e.target.value)} className={`w-full mt-1 p-2 border rounded text-sm font-bold ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-emerald-300'} disabled:bg-gray-100`} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium">Altura (m)</label>
                                            <input type="number" step="0.01" disabled={!isEditingTab} value={formData.anthropometry?.height || ''} onChange={e => updateAnthroData('height', e.target.value)} className={`w-full mt-1 p-2 border rounded text-sm font-bold ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-emerald-300'} disabled:bg-gray-100`} />
                                        </div>
                                    </div>
                                </div>
                                {/* Circunferências */}
                                <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-200'} shadow-sm rounded-xl p-4 border`}>
                                    <h3 className={`text-sm font-bold uppercase tracking-wide mb-3 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Circunferências (cm)</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {[{ id: 'circNeck', label: 'Pescoço' }, { id: 'circChest', label: 'Tórax' }, { id: 'circWaist', label: 'Cintura' }, { id: 'circAbdomen', label: 'Abdômen' }, { id: 'circHip', label: 'Quadril' }, { id: 'circArmContracted', label: 'Braço Contraído' }, { id: 'circThigh', label: 'Coxa' }, { id: 'circCalf', label: 'Panturrilha' }].map(item => (
                                            <div key={item.id}>
                                                <label className="text-xs font-medium">{item.label}</label>
                                                <input type="number" step="0.1" disabled={!isEditingTab} value={formData.anthropometry?.[item.id as keyof Anthropometry] || ''} onChange={e => updateAnthroData(item.id as keyof Anthropometry, e.target.value)} className={`w-full mt-1 p-2 border rounded text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-emerald-300'} disabled:bg-gray-100`} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Dobras Cutâneas */}
                                <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-200'} shadow-sm rounded-xl p-4 border`}>
                                    <h3 className={`text-sm font-bold uppercase tracking-wide mb-3 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>
                                        Dobras Cutâneas (mm) - {SKINFOLD_PROTOCOLS[formData.anthropometry?.skinfoldProtocol || 'JacksonPollock7']?.label || 'Protocolo 7 Dobras'}
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {(SKINFOLD_PROTOCOLS[formData.anthropometry?.skinfoldProtocol || 'JacksonPollock7']?.folds(patient?.gender || 'Masculino') || []).map(field => (
                                            <div key={field as string}>
                                                <label className="text-xs font-medium">{SKINFOLD_LABELS[field as string] || field}</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    disabled={!isEditingTab}
                                                    value={formData.anthropometry?.[field] || ''}
                                                    onChange={e => updateAnthroData(field, e.target.value)}
                                                    className={`w-full mt-1 p-2 border rounded text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 font-bold' : 'bg-white border-emerald-300 font-bold'} disabled:bg-gray-100`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-2 text-[10px] text-emerald-600/70 font-medium italic">
                                        * Campos não exibidos ficam salvos em background e não interferem nos cálculos deste protocolo.
                                    </div>
                                </div>
                            </div>
                            {/* Coluna de Resultados e Ações */}
                            <div className="space-y-4">
                                <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-200'} shadow-sm rounded-xl p-4 border`}>
                                    <h3 className={`text-sm font-bold uppercase tracking-wide mb-3 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Resultados da Composição Corporal</h3>
                                    <div className="space-y-3">
                                        <div className={`p-3 rounded-lg border text-center ${isManagerMode ? 'bg-indigo-900 border-indigo-700' : 'bg-emerald-100 border-emerald-200'}`}>
                                            <div className="text-xs font-bold">IMC</div>
                                            <div className={`text-2xl font-bold ${isManagerMode ? 'text-indigo-300' : 'text-emerald-700'}`}>{anthropometryResults.bmi || '--'}</div>
                                        </div>
                                        <div className={`p-3 rounded-lg border text-center ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-emerald-50 border-emerald-200'}`}>
                                            <div className="text-xs font-bold">% Gordura Corporal</div>
                                            <div className={`text-2xl font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>{anthropometryResults.bodyFatPercentage > 0 ? `${anthropometryResults.bodyFatPercentage}%` : '--'}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className={`p-2 rounded-lg border text-center ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-emerald-50 border-emerald-200'}`}><div className="text-xs font-bold">Massa Gorda</div><div className={`text-xl font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>{anthropometryResults.fatMass > 0 ? `${anthropometryResults.fatMass} kg` : '--'}</div></div>
                                            <div className={`p-2 rounded-lg border text-center ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-emerald-50 border-emerald-200'}`}><div className="text-xs font-bold">Massa Magra</div><div className={`text-xl font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>{anthropometryResults.leanMass > 0 ? `${anthropometryResults.leanMass} kg` : '--'}</div></div>
                                        </div>
                                        <div className={`p-3 rounded-lg border text-center ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-emerald-50 border-emerald-200'}`}>
                                            <div className="text-xs font-bold">Relação Cintura/Quadril (RCQ)</div>
                                            <div className={`text-2xl font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>{anthropometryResults.waistToHipRatio > 0 ? anthropometryResults.waistToHipRatio : '--'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-200'} shadow-sm rounded-xl p-4 border`}>
                                    <h3 className={`text-sm font-bold uppercase tracking-wide mb-3 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Análise Inteligente e Ações</h3>
                                    <div className="space-y-3">
                                        <button onClick={handleAnalyzeAnthro} disabled={isAnalyzingAnthro} className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-bold transition-colors shadow-sm ${isAnalyzingAnthro ? 'bg-gray-500 text-white' : (isManagerMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white')}`}>
                                            {isAnalyzingAnthro ? 'Analisando...' : <><Icons.Brain /> Analisar com IA</>}
                                        </button>
                                        <button onClick={handleGeneratePdf} disabled={isGeneratingPdf} className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-bold transition-colors border ${isManagerMode ? 'bg-red-900 text-red-300 border-red-700' : 'bg-red-100 text-red-700 border-red-200'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                            {isGeneratingPdf ? 'Gerando...' : <>📄 Gerar Relatório PDF</>}
                                        </button>
                                    </div>

                                    {anthroAnalysisResult && (
                                        <div className={`mt-4 pt-4 border-t ${isManagerMode ? 'border-gray-700' : 'border-emerald-200'}`}>
                                            <h4 className="text-xs font-bold uppercase mb-2">Resumo da IA {anthroAnalysisResult.isFallback && '(Offline)'}</h4>
                                            <p className="text-xs italic mb-2">"{anthroAnalysisResult.summary}"</p>

                                            {anthroAnalysisResult.risks.length > 0 && (
                                                <div className="mb-2">
                                                    <span className="text-[10px] font-bold text-red-500 uppercase">Riscos:</span>
                                                    <ul className="list-disc list-inside text-[10px]">
                                                        {anthroAnalysisResult.risks.map((r, i) => <li key={i}>{r}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {anthroAnalysisResult.recommendedActions.length > 0 && (
                                                <div>
                                                    <span className="text-[10px] font-bold text-blue-500 uppercase">Ações:</span>
                                                    <ul className="list-disc list-inside text-[10px]">
                                                        {anthroAnalysisResult.recommendedActions.map((r, i) => <li key={i}>{r}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* --- NOVO: TIMELINE DE AVALIAÇÕES ANTROPOMÉTRICAS --- */}
                        <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-200'} shadow-sm rounded-xl p-6 border`}>
                            <h3 className={`text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>
                                <Icons.History /> Histórico de Avaliações (Timeline de Evolução)
                            </h3>
                            <div className="relative border-l-2 ml-4 space-y-8 pb-4">
                                {(patient.anthropometryHistory || []).length === 0 ? (
                                    <div className="pl-6 text-sm italic text-gray-400">Nenhuma avaliação anterior disponível.</div>
                                ) : (
                                    [...patient.anthropometryHistory]
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map((record, idx) => (
                                            <div key={idx} onClick={() => handleEditAnthroHistory(record)} className={`relative pl-8 p-3 -ml-3 rounded-lg cursor-pointer transition-colors ${isManagerMode ? 'hover:bg-gray-700/50' : 'hover:bg-slate-50'}`}>
                                                <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 ${isManagerMode ? 'bg-indigo-500 border-gray-900' : 'bg-emerald-500 border-white'} shadow-sm`}></div>
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div>
                                                        <div className={`text-sm font-bold ${isManagerMode ? 'text-indigo-300' : 'text-emerald-700'}`}>
                                                            {new Date(record.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight ${isManagerMode ? 'bg-gray-700 text-gray-300' : 'bg-slate-100 text-slate-700'}`}>Peso: {record.weight}kg</div>
                                                            <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight ${isManagerMode ? 'bg-indigo-900/50 text-indigo-200' : 'bg-emerald-100 text-emerald-800'}`}>IMC: {record.bmi}</div>
                                                            {record.bodyFatPercentage && <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight ${isManagerMode ? 'bg-red-900/30 text-red-300' : 'bg-orange-100 text-orange-800'}`}>Gordura: {record.bodyFatPercentage}%</div>}
                                                            {record.leanMass && <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight ${isManagerMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'}`}>Massa Magra: {record.leanMass}kg</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: PLANEJAMENTO NUTRICIONAL (NEW) */}
                {activeTab === 'NUTRITION' && (
                    <ErrorBoundary name="NutritionalPlanning">
                        <NutritionalPlanning
                            patient={patient}
                            user={user}
                            isManagerMode={isManagerMode}
                        />
                    </ErrorBoundary>
                )}

                {/* TAB: FINANCEIRO (REFACTORED) */}
                {activeTab === 'FINANCIAL' && (
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-200'} p-6 rounded-xl shadow-sm border`}>
                                <p className={`text-xs font-bold uppercase tracking-wide ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Valor Total Pago (LTV)</p>
                                <p className={`text-3xl font-bold mt-2 ${isManagerMode ? 'text-emerald-400' : 'text-emerald-600'}`}>R$ {totalPaid.toFixed(2)}</p>
                            </div>
                            <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-200'} p-6 rounded-xl shadow-sm border`}>
                                <p className={`text-xs font-bold uppercase tracking-wide ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Pendente / A Receber</p>
                                <p className={`text-3xl font-bold mt-2 ${totalPending > 0 ? 'text-red-500' : (isManagerMode ? 'text-gray-400' : 'text-emerald-600')}`}>
                                    R$ {totalPending.toFixed(2)}
                                </p>
                            </div>
                            <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-200'} p-6 rounded-xl shadow-sm border`}>
                                <p className={`text-xs font-bold uppercase tracking-wide ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Modelo de Contratação</p>
                                <div className="flex justify-between items-center mt-3">
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${patient.financial?.mode === 'CONVENIO' ? (isManagerMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-800') : (isManagerMode ? 'bg-blue-900 text-blue-300' : 'bg-emerald-100 text-emerald-800')}`}>
                                        {patient.financial?.mode === 'CONVENIO' ? 'Convênio (TISS)' : 'Particular'}
                                    </span>
                                    {/* Only Admins can change financial mode */}
                                    {isAdmin && (
                                        <button onClick={() => setIsEditingTab(!isEditingTab)} className={`text-xs hover:underline font-bold ${isManagerMode ? 'text-indigo-400 hover:text-indigo-200' : 'text-emerald-600 hover:text-emerald-800'}`}>Alterar</button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Settings Area (Hidden unless editing) */}
                        {isEditingTab && (
                            <div className={`${isManagerMode ? 'bg-yellow-900 border-yellow-700 text-gray-100' : 'bg-emerald-50 border-emerald-200 text-emerald-900'} rounded-lg p-6`}>
                                <h4 className={`text-sm font-bold mb-4 ${isManagerMode ? 'text-yellow-400' : 'text-emerald-800'}`}>Configuração Financeira</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Modo de Atendimento</label>
                                        <select
                                            className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`}
                                            value={formData.financial?.mode}
                                            onChange={e => updateNestedData('financial', 'mode', e.target.value)}
                                        >
                                            <option value="PARTICULAR">Particular</option>
                                            <option value="CONVENIO">Convênio Médico</option>
                                        </select>
                                    </div>

                                    {(formData.financial?.mode === 'CONVENIO') && (
                                        <>
                                            <div>
                                                <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Operadora</label>
                                                <input type="text" className={`mt-1 block w-full border rounded p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} defaultValue={formData.financial?.insuranceName} onChange={e => updateNestedData('financial', 'insuranceName', e.target.value)} placeholder="Ex: Unimed" />
                                            </div>
                                            <div>
                                                <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Plano</label>
                                                <input type="text" className={`mt-1 block w-full border rounded p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} defaultValue={formData.financial?.insurancePlan} onChange={e => updateNestedData('financial', 'insurancePlan', e.target.value)} placeholder="Ex: Top Nacional" />
                                            </div>
                                            <div>
                                                <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Carteirinha</label>
                                                <input type="text" className={`mt-1 block w-full border rounded p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} defaultValue={formData.financial?.insuranceCardNumber} onChange={e => updateNestedData('financial', 'insuranceCardNumber', e.target.value)} />
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className={`mt-4 flex justify-end gap-2 pt-2 border-t ${isManagerMode ? 'border-gray-700' : 'border-emerald-200'}`}>
                                    <button onClick={() => setIsEditingTab(false)} className={`px-3 py-1 rounded text-sm font-bold shadow-sm ${isManagerMode ? 'bg-gray-700 border border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border rounded text-sm text-gray-700 font-bold hover:bg-gray-50'}`}>Cancelar</button>
                                    <button onClick={handleSaveTab} className={`px-3 py-1 rounded text-sm ${isManagerMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>Salvar Configuração</button>
                                </div>
                            </div>
                        )}

                        {/* Transaction Ledger */}
                        <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-200'} shadow-sm rounded-xl overflow-hidden border`}>
                            <div className={`px-6 py-4 border-b flex justify-between items-center ${isManagerMode ? 'bg-gray-700 bg-gray-700' : 'border-emerald-200 bg-emerald-50'}`}>
                                <h3 className={`text-lg font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>Extrato de Lançamentos</h3>
                                <button onClick={handleOpenTransactionModal} className={`text-sm px-4 py-2 rounded-lg shadow-sm font-bold ${isManagerMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                                    + Nova Transação
                                </button>
                            </div>

                            <table className={`min-w-full divide-y text-sm ${isManagerMode ? 'divide-gray-700' : 'divide-emerald-200'}`}>
                                <thead>
                                    <tr className={`${isManagerMode ? 'bg-gray-700' : 'bg-emerald-50'}`}>
                                        <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Data</th>
                                        <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Descrição</th>
                                        <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Método / Condição</th>
                                        <th className={`px-6 py-3 text-right text-xs font-bold uppercase tracking-wider ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Valor Líquido</th>
                                        <th className={`px-6 py-3 text-center text-xs font-bold uppercase tracking-wider ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Status</th>
                                    </tr>
                                </thead>
                                <tbody className={`${isManagerMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-emerald-200'}`}>
                                    {financialTransactions.length === 0 ? (
                                        <tr><td colSpan={5} className={`px-6 py-10 text-center italic ${isManagerMode ? 'text-gray-400' : 'text-emerald-600'}`}>Nenhuma movimentação registrada.</td></tr>
                                    ) : (
                                        financialTransactions.map(t => (
                                            <tr key={t.id} className={`${isManagerMode ? 'hover:bg-gray-700' : 'hover:bg-emerald-50'} transition-colors`}>
                                                <td className={`px-6 py-4 whitespace-nowrap font-medium ${isManagerMode ? 'text-gray-200' : 'text-emerald-800'}`}>{new Date(t.date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <div className={`font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>{t.description}</div>
                                                    {t.authorizationCode && <div className={`text-xs ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Auth: {t.authorizationCode}</div>}
                                                    {t.discountPercent && t.discountPercent > 0 ? (
                                                        <div className={`${isManagerMode ? 'text-emerald-400' : 'text-emerald-600'} text-[10px] font-bold`}>Desconto: {t.discountPercent}%</div>
                                                    ) : null}
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap ${isManagerMode ? 'text-gray-200' : 'text-emerald-800'}`}>
                                                    <div className="font-medium">{PAYMENT_METHODS_LABELS[t.method]}</div>
                                                    {t.installments ? (
                                                        <span className={`px-2 py-0.5 rounded font-bold text-xs ${isManagerMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>{t.installments}</span>
                                                    ) : (
                                                        <span className={`px-2 py-0.5 rounded text-xs ${isManagerMode ? 'bg-gray-700 text-gray-300' : 'bg-emerald-100 text-emerald-600'}`}>À Vista</span>
                                                    )}
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-right font-bold text-base ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>
                                                    R$ {t.amount.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${STATUS_LABELS[t.status].color}`}>
                                                        {STATUS_LABELS[t.status].label}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB: EXAMES & IA */}
                {activeTab === 'EXAMS' && (
                    <div className="space-y-6">
                        <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-200'} shadow-sm rounded-xl p-6 border`}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className={`text-lg font-bold flex items-center gap-2 ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>
                                    <Icons.Brain />
                                    Análise Inteligente de Exames
                                </h3>
                                <button
                                    onClick={() => setIsExamUploadModalOpen(true)}
                                    className={`text-sm px-4 py-2 rounded-lg shadow-sm font-bold flex items-center gap-2 ${isManagerMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                >
                                    <span>+</span> Upload PDF
                                </button>
                            </div>

                            {exams.length === 0 ? (
                                <p className={`text-sm text-center py-12 rounded-lg border-2 border-dashed ${isManagerMode ? 'text-gray-400 bg-gray-700 border-gray-600' : 'text-emerald-700 bg-emerald-50 border-emerald-300'}`}>
                                    Nenhum exame enviado para análise.
                                </p>
                            ) : (
                                <div className="space-y-8">
                                    {exams.map(exam => (
                                        <div key={exam.id} className={`${isManagerMode ? 'border-gray-700 bg-gray-800' : 'border-emerald-200 bg-white'} border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
                                            {/* Exam Header */}
                                            <div className={`${isManagerMode ? 'bg-gray-700 border-gray-700' : 'bg-emerald-50 border-emerald-200'} px-6 py-4 border-b flex justify-between items-center`}>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-3xl">📄</span>
                                                    <div>
                                                        <p className={`font-bold text-lg ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>{exam.name}</p>
                                                        <p className={`text-xs font-medium uppercase tracking-wide ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>{new Date(exam.date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                {exam.status === 'PENDENTE' ? (
                                                    <button
                                                        onClick={() => handleRunAI(exam.id)}
                                                        disabled={!!analyzingId}
                                                        className={`text-xs px-4 py-2 rounded-lg shadow-sm font-bold flex items-center gap-2 ${isManagerMode ? 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50' : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'}`}
                                                    >
                                                        {analyzingId === exam.id ? 'Processando...' : '✨ Analisar com IA'}
                                                    </button>
                                                ) : (
                                                    <span className={`text-xs px-3 py-1 rounded-full font-bold border ${isManagerMode ? 'bg-emerald-900 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>Analisado</span>
                                                )}
                                            </div>

                                            {/* Clinical Context Section (New) */}
                                            <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-100'} px-6 py-5 border-b`}>
                                                <div className="flex flex-col md:flex-row gap-6 text-sm">
                                                    <div className={`flex-1 p-4 rounded-lg border ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-emerald-50 border-emerald-100'}`}>
                                                        <p className={`text-xs uppercase font-bold mb-1 tracking-wide ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Motivo Clínico</p>
                                                        <p className={`font-bold text-base ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>{exam.clinicalReason || 'Não informado'}</p>
                                                    </div>
                                                    <div className="flex-1 pt-2">
                                                        <p className={`text-xs uppercase font-bold mb-1 tracking-wide ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Hipótese Diagnóstica</p>
                                                        <p className={`${isManagerMode ? 'text-gray-200' : 'text-emerald-800'} font-medium`}>{exam.clinicalHypothesis || '-'}</p>
                                                    </div>
                                                </div>
                                                {exam.appointmentId && (
                                                    <p className={`text-xs mt-3 flex items-center gap-1 ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>
                                                        <span className={`w-2 h-2 rounded-full ${isManagerMode ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span>
                                                        Vinculado à consulta: <span className="font-mono">{exam.appointmentId}</span>
                                                    </p>
                                                )}
                                            </div>

                                            {/* AI Results */}
                                            {exam.status === 'ANALISADO' && (
                                                <div className="p-6 space-y-8">

                                                    {/* Markers Table */}
                                                    {exam.markers && (
                                                        <div>
                                                            <h4 className={`text-sm font-bold mb-3 uppercase tracking-wide ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Marcadores Identificados</h4>
                                                            <div className={`${isManagerMode ? 'rounded-lg border border-gray-700' : 'rounded-lg border border-emerald-200'} overflow-x-auto`}>
                                                                <table className="min-w-full text-sm">
                                                                    <thead className={`${isManagerMode ? 'bg-gray-700' : 'bg-emerald-100'}`}>
                                                                        <tr>
                                                                            <th className={`px-4 py-2 text-left font-bold ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Marcador</th>
                                                                            <th className={`px-4 py-2 text-left font-bold ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Resultado</th>
                                                                            <th className={`px-4 py-2 text-left font-bold ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Referência</th>
                                                                            <th className={`px-4 py-2 text-left font-bold ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Interpretação</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className={`divide-y ${isManagerMode ? 'divide-gray-700' : 'divide-emerald-100'}`}>
                                                                        {exam.markers.map((m, idx) => (
                                                                            <tr key={idx} className={m.interpretation === 'ALTERADO' ? 'bg-red-900/20' : m.interpretation === 'LIMITROFE' ? 'bg-yellow-900/20' : ''}>
                                                                                <td className={`px-4 py-3 font-medium ${isManagerMode ? 'text-gray-100' : 'text-emerald-900'}`}>{m.name}</td>
                                                                                <td className={`px-4 py-3 font-bold ${isManagerMode ? 'text-gray-200' : 'text-emerald-800'}`}>{m.value}</td>
                                                                                <td className={`px-4 py-3 ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>{m.reference}</td>
                                                                                <td className="px-4 py-3">
                                                                                    <span className={`text-xs px-2 py-1 rounded font-bold border
                                                                        ${m.interpretation === 'NORMAL' ? (isManagerMode ? 'text-emerald-300 bg-emerald-900 border-emerald-700' : 'text-emerald-700 bg-emerald-100 border-emerald-200') :
                                                                                            m.interpretation === 'ALTERADO' ? (isManagerMode ? 'text-red-300 bg-red-900 border-red-700' : 'text-red-700 bg-red-100 border-red-200') : (isManagerMode ? 'text-yellow-300 bg-yellow-900 border-yellow-700' : 'text-yellow-700 bg-yellow-100 border-yellow-200')}
                                                                    `}>
                                                                                        {m.interpretation}
                                                                                    </span>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* AI Text Analysis */}
                                                    <div className="bg-white border-gray-300 p-5 rounded-xl border">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Icons.Brain />
                                                            <h4 className="font-bold uppercase text-sm tracking-wide text-gray-800">Análise Clínica Assistida</h4>
                                                        </div>
                                                        <div className="prose prose-sm max-w-none whitespace-pre-line leading-relaxed font-medium text-black">
                                                            {exam.aiAnalysis}
                                                        </div>
                                                        <div className="mt-4 pt-4 border-t text-xs italic font-medium border-gray-200 text-gray-600">
                                                            ⚠️ Importante: Esta análise é gerada por Inteligência Artificial para suporte à decisão clínica e não substitui o diagnóstico médico.
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden PDF Report Structure (REVISED with Snapshot) */}
            <div style={{ position: 'fixed', left: 0, top: 0, width: '210mm', opacity: 0, pointerEvents: 'none', zIndex: -1000 }}>
                <div ref={pdfReportRef} className="bg-white text-black font-sans text-[10px] p-[15mm]">
                    <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">{patient.name}</h1>
                            <p className="text-gray-600">Relatório de Avaliação Antropométrica</p>
                            <p className="text-xs text-gray-500 mt-1">Data: {new Date().toLocaleDateString()} | Avaliador: {user.name}</p>
                        </div>
                        <div className="text-right">
                            {clinic.logoUrl && <img src={clinic.logoUrl} alt="Logo" crossOrigin="anonymous" className="max-h-16 w-auto ml-auto mb-2" />}
                            <p className="font-bold text-gray-700">{clinic.name}</p>
                        </div>
                    </header>

                    <main className="mt-6">
                        <section>
                            <h2 className="text-base font-bold text-emerald-700 border-b border-emerald-200 pb-1 mb-3">Resultados da Composição Corporal</h2>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-emerald-50 p-3 rounded-lg text-center">
                                    <div className="text-xs font-bold text-emerald-800">IMC</div>
                                    <div className="text-3xl font-bold text-emerald-700">{pdfSnapshot?.anthro.bodyComp.bmi || '--'}</div>
                                </div>
                                <div className="bg-emerald-50 p-3 rounded-lg text-center">
                                    <div className="text-xs font-bold text-emerald-800">% Gordura Corporal</div>
                                    <div className="text-3xl font-bold text-emerald-700">{pdfSnapshot?.anthro.bodyComp.bodyFatPct ? `${pdfSnapshot.anthro.bodyComp.bodyFatPct}%` : '--'}</div>
                                </div>
                                <div className="bg-emerald-50 p-3 rounded-lg text-center">
                                    <div className="text-xs font-bold text-emerald-800">Relação Cintura/Quadril</div>
                                    <div className="text-3xl font-bold">{pdfSnapshot?.anthro.bodyComp.whr || '--'}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="bg-gray-50 p-3 rounded-lg text-center">
                                    <div className="text-xs">Massa Gorda (kg)</div>
                                    <div className="text-2xl font-bold">{pdfSnapshot?.anthro.bodyComp.fatMassKg || '--'}</div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg text-center">
                                    <div className="text-xs">Massa Magra (kg)</div>
                                    <div className="text-2xl font-bold">{pdfSnapshot?.anthro.bodyComp.leanMassKg || '--'}</div>
                                </div>
                            </div>
                        </section>

                        <section className="mt-6">
                            <h2 className="text-base font-bold text-emerald-700 border-b border-emerald-200 pb-1 mb-3">Análise Clínica (IA)</h2>
                            {anthroAnalysisResult ? (
                                <div>
                                    <p className="text-xs italic mb-2 font-medium">"{anthroAnalysisResult.summary}"</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="font-bold text-xs uppercase text-red-600 mb-1">Pontos de Atenção</h4>
                                            <ul className="list-disc list-inside text-[10px]">
                                                {anthroAnalysisResult.risks.length > 0
                                                    ? anthroAnalysisResult.risks.map((r, i) => <li key={i}>{r}</li>)
                                                    : <li>Nenhum risco crítico identificado.</li>}
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-xs uppercase text-blue-600 mb-1">Recomendações</h4>
                                            <ul className="list-disc list-inside text-[10px]">
                                                {anthroAnalysisResult.recommendedActions.length > 0
                                                    ? anthroAnalysisResult.recommendedActions.map((r, i) => <li key={i}>{r}</li>)
                                                    : <li>Seguir conduta padrão.</li>}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 italic">Nenhuma análise gerada.</p>
                            )}
                        </section>

                        <section className="mt-6">
                            <h2 className="text-base font-bold text-emerald-700 border-b border-emerald-200 pb-1 mb-3">Detalhamento das Medidas</h2>
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-bold text-sm mb-2">Circunferências (cm)</h3>
                                    <table className="w-full text-xs">
                                        <tbody>
                                            <tr className="border-b"><td className="py-1.5 pr-2">Pescoço</td><td className="py-1.5 font-bold text-right">{pdfSnapshot?.anthro.circumferencesCm.neck || '--'}</td></tr>
                                            <tr className="border-b"><td className="py-1.5 pr-2">Tórax</td><td className="py-1.5 font-bold text-right">{pdfSnapshot?.anthro.circumferencesCm.chest || '--'}</td></tr>
                                            <tr className="border-b"><td className="py-1.5 pr-2">Cintura</td><td className="py-1.5 font-bold text-right">{pdfSnapshot?.anthro.circumferencesCm.waist || '--'}</td></tr>
                                            <tr className="border-b"><td className="py-1.5 pr-2">Abdômen</td><td className="py-1.5 font-bold text-right">{pdfSnapshot?.anthro.circumferencesCm.abdomen || '--'}</td></tr>
                                            <tr className="border-b"><td className="py-1.5 pr-2">Quadril</td><td className="py-1.5 font-bold text-right">{pdfSnapshot?.anthro.circumferencesCm.hip || '--'}</td></tr>
                                            <tr className="border-b"><td className="py-1.5 pr-2">Braço</td><td className="py-1.5 font-bold text-right">{pdfSnapshot?.anthro.circumferencesCm.arm || '--'}</td></tr>
                                            <tr className="border-b"><td className="py-1.5 pr-2">Coxa</td><td className="py-1.5 font-bold text-right">{pdfSnapshot?.anthro.circumferencesCm.thigh || '--'}</td></tr>
                                            <tr className="border-b"><td className="py-1.5 pr-2">Panturrilha</td><td className="py-1.5 font-bold text-right">{pdfSnapshot?.anthro.circumferencesCm.calf || '--'}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm mb-2">Dobras Cutâneas (mm)</h3>
                                    <table className="w-full text-xs">
                                        <tbody>
                                            <tr className="border-b"><td className="py-1.5 pr-2">Peitoral</td><td className="py-1.5 font-bold text-right">{pdfSnapshot?.anthro.skinfoldsMm.chest || '--'}</td></tr>
                                            <tr className="border-b"><td className="py-1.5 pr-2">Axilar Média</td><td className="py-1.5 font-bold text-right">{pdfSnapshot?.anthro.skinfoldsMm.midaxillary || '--'}</td></tr>
                                            <tr className="border-b"><td className="py-1.5 pr-2">Tríceps</td><td className="py-1.5 font-bold text-right">{pdfSnapshot?.anthro.skinfoldsMm.triceps || '--'}</td></tr>
                                            <tr className="border-b"><td className="py-1.5 pr-2">Subescapular</td><td className="py-1.5 font-bold text-right">{pdfSnapshot?.anthro.skinfoldsMm.subscapular || '--'}</td></tr>
                                            <tr className="border-b"><td className="py-1.5 pr-2">Abdominal</td><td className="py-1.5 font-bold text-right">{pdfSnapshot?.anthro.skinfoldsMm.abdominal || '--'}</td></tr>
                                            <tr className="border-b"><td className="py-1.5 pr-2">Supra-ilíaca</td><td className="py-1.5 font-bold text-right">{pdfSnapshot?.anthro.skinfoldsMm.suprailiac || '--'}</td></tr>
                                            <tr className="border-b"><td className="py-1.5 pr-2">Coxa</td><td className="py-1.5 font-bold text-right">{pdfSnapshot?.anthro.skinfoldsMm.thigh || '--'}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    </main>

                    <footer className="mt-8 pt-4 border-t border-gray-200 text-center text-[8px] text-gray-500">
                        <p>Este é um relatório gerado pelo sistema ControlClin. As análises de IA são para suporte clínico e não substituem o julgamento profissional.</p>
                        <p>{clinic.name} - {clinic.address}</p>
                        <p className="mt-1">Fonte: Antropometria em {new Date(pdfSnapshot?.anthro.date || Date.now()).toLocaleDateString()}</p>
                    </footer>
                </div>
            </div>


            {/* Appointment Modal (UPDATED TO MATCH AGENDA) */}
            {
                isApptModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                        <div className={`${isManagerMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-xl shadow-xl w-full max-w-md p-6 relative`}>
                            <h2 className={`text-xl font-bold mb-4 ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>Novo Agendamento para {patient.name}</h2>
                            {apptError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {apptError}
                                </div>
                            )}

                            <form onSubmit={(e) => { e.preventDefault(); handleSaveAppointment(); }} className="space-y-4">

                                {/* Date & Time */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`${isManagerMode ? 'bg-gray-700' : 'bg-emerald-50'} rounded p-1`}>
                                        <input
                                            type="date"
                                            required
                                            className={`w-full border-0 focus:ring-0 rounded p-1 text-sm text-center font-bold ${isManagerMode ? 'bg-gray-700 text-gray-100' : 'bg-white text-emerald-900'}`}
                                            value={apptForm.date}
                                            onChange={e => { setApptForm({ ...apptForm, date: e.target.value }); setApptError(null); }}
                                            onBlur={handleDateBlur}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className={`${isManagerMode ? 'bg-gray-700' : 'bg-emerald-50'} rounded p-1 flex-1`}>
                                            <input type="time" required
                                                className={`w-full border-0 focus:ring-0 rounded p-1 text-sm text-center font-bold ${isManagerMode ? 'bg-gray-700 text-gray-100' : 'bg-white text-emerald-900'}`}
                                                value={apptForm.startTime} onChange={handleStartTimeChange} />
                                        </div>
                                        <div className={`${isManagerMode ? 'bg-gray-700' : 'bg-emerald-50'} rounded p-1 flex-1`}>
                                            <input type="time" required
                                                className={`w-full border-0 focus:ring-0 rounded p-1 text-sm text-center font-bold ${isManagerMode ? 'bg-gray-700 text-gray-100' : 'bg-white text-emerald-900'}`}
                                                value={apptForm.endTime} onChange={e => setApptForm({ ...apptForm, endTime: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                {/* Professional */}
                                <div>
                                    <select
                                        className={`w-full border-0 rounded p-2 text-sm font-medium ${isManagerMode ? 'bg-gray-700 text-gray-100' : 'bg-emerald-50 text-emerald-900'}`}
                                        value={apptForm.professionalId} onChange={e => setApptForm({ ...apptForm, professionalId: e.target.value })}>
                                        {professionals.map(p => <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>)}
                                    </select>
                                </div>

                                {/* Type & Status */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <select
                                            className={`w-full border-0 rounded p-2 text-sm ${isManagerMode ? 'bg-gray-700 text-gray-100' : 'bg-emerald-50 text-emerald-900'}`}
                                            value={apptForm.type} onChange={e => setApptForm({ ...apptForm, type: e.target.value })}>
                                            <option value="ROTINA">Rotina</option>
                                            <option value="AVALIACAO">Avaliação</option>
                                            <option value="RETORNO">Retorno</option>
                                        </select>
                                    </div>
                                    <div>
                                        <select
                                            className={`w-full border-0 rounded p-2 text-sm ${isManagerMode ? 'bg-gray-700 text-gray-100' : 'bg-emerald-50 text-emerald-900'}`}
                                            value={apptForm.status} onChange={e => setApptForm({ ...apptForm, status: e.target.value as AppointmentStatus })}>
                                            <option value="AGENDADO">Agendado</option>
                                            <option value="CONFIRMADO">Confirmado</option>
                                            <option value="CANCELADO">Cancelado</option>
                                        </select>
                                    </div>
                                </div>

                                {/* --- FINANCIAL SECTION (ADDED TO MATCH AGENDA) --- */}
                                <div className={`${isManagerMode ? 'bg-emerald-900 border-emerald-700 text-gray-100' : 'bg-emerald-50 border-emerald-100'} p-4 rounded-lg border mt-2`}>
                                    <h4 className={`text-xs font-bold uppercase mb-3 flex items-center gap-1 ${isManagerMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
                                        <span className="text-sm">💰</span> Previsão Financeira
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className={`block text-xs font-bold mb-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Valor da Consulta (R$)</label>
                                            <input
                                                type="number"
                                                min="0" step="0.01"
                                                className={`w-full border rounded p-1.5 text-sm font-bold ${isManagerMode ? 'bg-gray-700 border-emerald-700 text-white' : 'bg-white border-emerald-300 text-emerald-900'}`}
                                                placeholder="0,00"
                                                value={apptPrice}
                                                onChange={e => setApptPrice(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className={`block text-xs font-bold mb-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Status Pagamento</label>
                                            <select
                                                className={`w-full border rounded p-1.5 text-sm font-medium ${isManagerMode ? 'bg-gray-700 border-emerald-700 text-white' : 'bg-white border-emerald-300 text-emerald-900'}`}
                                                value={apptFinancialStatus}
                                                onChange={e => setApptFinancialStatus(e.target.value as FinancialStatus)}
                                            >
                                                <option value="PENDENTE">Pendente</option>
                                                <option value="PAGO">Pago</option>
                                                <option value="AGUARDANDO_AUTORIZACAO">Aguardando Aut.</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className={`block text-xs font-bold mb-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Método Previsto</label>
                                            <select
                                                className={`w-full border rounded p-1.5 text-sm ${isManagerMode ? 'bg-gray-700 border-emerald-700 text-white' : 'bg-white border-emerald-300 text-emerald-900'}`}
                                                value={apptPaymentMethod}
                                                onChange={e => setApptPaymentMethod(e.target.value as PaymentMethod)}
                                            >
                                                <option value="PIX">Pix</option>
                                                <option value="DINHEIRO">Dinheiro</option>
                                                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                                                <option value="CARTAO_DEBITO">Cartão de Débito</option>
                                                <option value="GUIA_CONVENIO">Guia Convênio</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className={`flex justify-end gap-2 pt-4 mt-4 ${isManagerMode ? 'border-t border-gray-700' : 'border-gray-100'}`}>
                                    <button type="button" onClick={() => setIsApptModalOpen(false)}
                                        className={`px-4 py-2 border rounded-md font-bold shadow-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancelar</button>
                                    <button type="submit"
                                        className={`px-4 py-2 text-white rounded font-bold text-sm shadow-md ${isManagerMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Salvar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* --- EXAM UPLOAD CONTEXT MODAL (NEW) --- */}
            {
                isExamUploadModalOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                        <div className={`${isManagerMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-emerald-900'} rounded-xl shadow-xl w-full max-w-lg p-6 relative`}>
                            <h2 className={`text-xl font-bold mb-4 ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>Nova Solicitação de Exame</h2>

                            <form onSubmit={handleUploadExam} className="space-y-4">

                                {/* Reason (Required) */}
                                <div>
                                    <label className={`block text-sm font-bold mb-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>
                                        Motivo Clínico da Solicitação *
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        className={`w-full border rounded p-2 text-sm focus:ring-2 focus:border-transparent font-medium ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-indigo-500' : 'bg-white border-emerald-300 text-emerald-900 focus:ring-emerald-500'}`}
                                        placeholder="Descreva a razão principal para o exame (ex: suspeita de anemia, check-up anual...)"
                                        value={examUploadForm.reason}
                                        onChange={e => setExamUploadForm({ ...examUploadForm, reason: e.target.value })}
                                    />
                                </div>

                                {/* Hypothesis (Optional) */}
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>
                                        Hipótese Diagnóstica (Opcional)
                                    </label>
                                    <input
                                        type="text"
                                        className={`w-full border rounded p-2 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`}
                                        placeholder="Ex: CID R53 - Mal-estar e fadiga"
                                        value={examUploadForm.hypothesis}
                                        onChange={e => setExamUploadForm({ ...examUploadForm, hypothesis: e.target.value })}
                                    />
                                </div>

                                {/* Appointment Link (Optional) */}
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>
                                        Vincular à Consulta (Opcional)
                                    </label>
                                    <select
                                        className={`w-full border rounded p-2 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`}
                                        value={examUploadForm.appointmentId}
                                        onChange={e => setExamUploadForm({ ...examUploadForm, appointmentId: e.target.value })}
                                    >
                                        <option value="">-- Não vincular --</option>
                                        {clinicalAppointments.map(appt => (
                                            <option key={appt.id} value={appt.id}>
                                                {new Date(appt.startTime).toLocaleDateString()} - {appt.type} ({appt.status})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={`${isManagerMode ? 'bg-blue-900 border-blue-700 text-blue-300' : 'bg-emerald-50 border-emerald-100 text-emerald-800'} p-4 rounded-lg border text-xs mt-4 font-medium`}>
                                    <p>ℹ️ O arquivo PDF será simulado ("Hemograma_Mock.pdf") para fins de demonstração.</p>
                                </div>

                                <div className={`flex justify-end gap-2 pt-4 mt-2 border-t ${isManagerMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                    <button
                                        type="button"
                                        onClick={() => setIsExamUploadModalOpen(false)}
                                        className={`px-4 py-2 border rounded-md font-bold shadow-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className={`px-6 py-2 text-white rounded font-bold shadow-md ${isManagerMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                    >
                                        Confirmar e Enviar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* --- OTHER MODALS --- */}
            {
                isEditModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                        <div className={`${isManagerMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto`}>
                            <h2 className={`text-lg font-bold mb-4 ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>Editar Dados Pessoais</h2>
                            <form onSubmit={handleSaveBasicInfo} className="space-y-4">
                                <div><label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Nome Completo</label><input type="text" required className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>CPF</label><input type="text" className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} value={formData.cpf || ''} onChange={e => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" /></div>
                                    <div><label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Telefone</label><input type="text" className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>E-mail</label><input type="email" className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
                                    <div><label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Status</label><select className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} value={formData.status || 'ATIVO'} onChange={e => setFormData({ ...formData, status: e.target.value as any })}><option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option></select></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Data de Nascimento</label><input type="date" className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} value={formData.birthDate || ''} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} /></div>
                                    <div><label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Sexo</label><select className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} value={formData.gender || ''} onChange={e => setFormData({ ...formData, gender: e.target.value })}><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option></select></div>
                                </div>
                                <div><label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Endereço</label><input type="text" className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} /></div>
                                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className={`px-4 py-2 border rounded-md font-bold shadow-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>Cancelar</button>
                                    <button type="submit" className={`px-6 py-2 text-white rounded-md font-medium shadow-sm ${isManagerMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Salvar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* --- TIMELINE MODAL --- */}
            {
                isTimelineModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                        <div className={`${isManagerMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg shadow-xl w-full max-w-md p-6`}>
                            <h2 className={`text-lg font-bold mb-4 ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>Adicionar Evento na Linha do Tempo</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Data</label>
                                    <input type="date" className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} value={timelineDate} onChange={(e) => setTimelineDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Tipo de Evento</label>
                                    <select className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} value={timelineType} onChange={(e) => setTimelineType(e.target.value as TimelineEventType)}>
                                        {Object.entries(TIMELINE_TYPES).map(([key, val]) => (
                                            <option key={key} value={key}>{val.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Descrição (Opcional)</label>
                                    <textarea className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} rows={3} value={timelineDesc} onChange={(e) => setTimelineDesc(e.target.value)}></textarea>
                                </div>
                                <div className="flex justify-end gap-3 mt-4">
                                    <button onClick={() => setIsTimelineModalOpen(false)} className={`px-4 py-2 border rounded-md font-bold shadow-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>Cancelar</button>
                                    <button onClick={handleAddTimelineEvent} className={`px-4 py-2 text-white rounded-md font-bold shadow-sm ${isManagerMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Adicionar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- FINANCIAL TRANSACTION MODAL --- */}
            {
                isTransModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                        <div className={`${isManagerMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-xl shadow-xl w-full max-w-lg p-6 relative flex flex-col max-h-[90vh]`}>
                            <div className={`flex justify-between items-center mb-4 border-b pb-2 ${isManagerMode ? 'border-gray-700' : 'border-emerald-100'}`}>
                                <h2 className={`text-xl font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>Nova Transação Financeira</h2>
                                <button onClick={() => setIsTransModalOpen(false)} className={`${isManagerMode ? 'text-gray-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>✕</button>
                            </div>

                            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                {/* Description */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-1 ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Descrição</label>
                                    <input type="text" className={`w-full border rounded p-2 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} placeholder="Ex: Consulta Psiquiatria" value={transDesc} onChange={e => setTransDesc(e.target.value)} />
                                </div>

                                {/* Values Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-xs font-bold uppercase mb-1 ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Valor Original (R$)</label>
                                        <input type="number" min="0" step="0.01" className={`w-full border rounded p-2 text-sm font-bold ${isManagerMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-emerald-300 text-emerald-900'}`} value={transOriginalAmount} onChange={e => setTransOriginalAmount(parseFloat(e.target.value))} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold uppercase mb-1 ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Desconto (%)</label>
                                        <input type="number" min="0" max="100" className={`w-full border rounded p-2 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} value={transDiscountPercent} onChange={e => setTransDiscountPercent(parseFloat(e.target.value))} />
                                    </div>
                                </div>

                                {/* Payment Config */}
                                <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-emerald-50 border-emerald-100'} p-4 rounded-lg border`}>
                                    <label className={`block text-xs font-bold uppercase mb-2 ${isManagerMode ? 'text-gray-300' : 'text-emerald-800'}`}>Condição de Pagamento</label>
                                    <div className="flex gap-4 mb-3">
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="payForm" checked={transPaymentForm === 'VISTA'} onChange={() => setTransPaymentForm('VISTA')} className={`text-emerald-600 focus:ring-emerald-500 ${isManagerMode ? 'bg-gray-600 border-gray-500' : ''}`} />
                                            <span className={`ml-2 text-sm font-medium ${isManagerMode ? 'text-gray-200' : 'text-slate-700'}`}>À Vista</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="payForm" checked={transPaymentForm === 'PARCELADO'} onChange={() => setTransPaymentForm('PARCELADO')} className={`text-emerald-600 focus:ring-emerald-500 ${isManagerMode ? 'bg-gray-600 border-gray-500' : ''}`} />
                                            <span className={`ml-2 text-sm font-medium ${isManagerMode ? 'text-gray-200' : 'text-slate-700'}`}>Parcelado</span>
                                        </label>
                                    </div>

                                    {transPaymentForm === 'PARCELADO' && (
                                        <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                                            <div>
                                                <label className={`block text-xs font-medium mb-1 ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Nº Parcelas</label>
                                                <select className={`w-full border rounded p-1.5 text-sm ${isManagerMode ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-emerald-300'}`} value={transInstallments} onChange={e => setTransInstallments(parseInt(e.target.value))}>
                                                    {[2, 3, 4, 5, 6, 10, 12].map(n => <option key={n} value={n}>{n}x</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={`block text-xs font-medium mb-1 ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Juros Totais (%)</label>
                                                <input type="number" min="0" className={`w-full border rounded p-1.5 text-sm ${isManagerMode ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-emerald-300'}`} value={transInterestPercent} onChange={e => setTransInterestPercent(parseFloat(e.target.value))} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Method & Status */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-xs font-bold uppercase mb-1 ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Método</label>
                                        <select className={`w-full border rounded p-2 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} value={transMethod} onChange={e => setTransMethod(e.target.value as PaymentMethod)}>
                                            {Object.entries(PAYMENT_METHODS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold uppercase mb-1 ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Status</label>
                                        <select className={`w-full border rounded p-2 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`} value={transStatus} onChange={e => setTransStatus(e.target.value as FinancialStatus)}>
                                            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Summary Box */}
                                <div className={`${isManagerMode ? 'bg-indigo-900 border-indigo-700' : 'bg-emerald-100 border-emerald-200'} p-4 rounded-lg border text-center mt-2`}>
                                    <p className={`text-xs font-bold uppercase mb-1 ${isManagerMode ? 'text-indigo-300' : 'text-emerald-700'}`}>Valor Final (Líquido)</p>
                                    <p className={`text-3xl font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>R$ {transFinalAmount.toFixed(2)}</p>
                                    {transPaymentForm === 'PARCELADO' && (
                                        <p className={`text-xs mt-1 font-medium ${isManagerMode ? 'text-indigo-200' : 'text-emerald-800'}`}>
                                            {transInstallments}x de R$ {transParcelValue.toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className={`flex justify-end gap-3 pt-4 border-t mt-4 ${isManagerMode ? 'border-gray-700' : 'border-emerald-100'}`}>
                                <button onClick={() => setIsTransModalOpen(false)} className={`px-4 py-2 border rounded-md font-bold shadow-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>Cancelar</button>
                                <button onClick={handleAddTransaction} className={`px-6 py-2 text-white rounded-md font-bold shadow-md ${isManagerMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Confirmar Lançamento</button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export { PatientDetails };
