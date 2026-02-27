import React, { useState, useMemo, useRef } from 'react';
import {
    Patient, User, Clinic, Prescription, PrescriptionItem,
    PrescriptionItemType, PrescriptionForm, PrescriptionFrequency,
    PrescriptionTimingType, PrescriptionTiming, Role
} from '../types';
import { PrescriptionService } from '../services/prescriptionService';
import { db } from '../services/db';
import { Icons } from '../constants';

// --- LABEL MAPS ---
const TYPE_LABELS: Record<PrescriptionItemType, string> = {
    MEDICAMENTO: 'Medicamento',
    SUPLEMENTO: 'Suplemento',
    VITAMINA: 'Vitamina',
    MINERAL: 'Mineral',
    FITOTERAPICO: 'Fitoterápico',
    FORMULA_MAGISTRAL: 'Fórmula Magistral',
};

const FORM_LABELS: Record<PrescriptionForm, string> = {
    CAPSULA: 'Cápsula',
    COMPRIMIDO: 'Comprimido',
    SACHE: 'Sachê',
    GOTAS: 'Gotas',
    PO: 'Pó',
    LIQUIDO: 'Líquido',
    SPRAY: 'Spray',
    OUTRO: 'Outro',
};

const FREQ_LABELS: Record<PrescriptionFrequency, string> = {
    '1_VEZ_AO_DIA': '1x ao dia',
    '2_VEZES_AO_DIA': '2x ao dia',
    '3_VEZES_AO_DIA': '3x ao dia',
    '4_VEZES_AO_DIA': '4x ao dia',
    'CADA_X_HORAS': 'A cada X horas',
    'X_VEZES_POR_SEMANA': 'X vezes por semana',
    'SOS': 'SOS (se necessário)',
};

const TIMING_LABELS: Record<PrescriptionTimingType, string> = {
    ANTES_DA_REFEICAO: 'Antes da refeição',
    APOS_DA_REFEICAO: 'Após a refeição',
    AO_ACORDAR: 'Ao acordar',
    AO_DEITAR: 'Ao deitar',
    EM_JEJUM: 'Em jejum',
    HORARIO_FIXO: 'Horário fixo',
};

const MEAL_OPTIONS = [
    { value: 'CAFE', label: 'Café da manhã' },
    { value: 'ALMOCO', label: 'Almoço' },
    { value: 'LANCHE', label: 'Lanche' },
    { value: 'JANTAR', label: 'Jantar' },
    { value: 'CEIA', label: 'Ceia' },
];

interface PrescriptionModuleProps {
    patient: Patient;
    user: User;
    clinic: Clinic;
    isManagerMode: boolean;
    onUpdate: () => void;
}

// --- EMPTY ITEM TEMPLATE ---
const emptyItem = (): PrescriptionItem => ({
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    type: 'SUPLEMENTO',
    name: '',
    form: 'CAPSULA',
    dose: '',
    frequency: '1_VEZ_AO_DIA',
    frequencyValue: undefined,
    timings: [],
    durationDays: 30,
    instructions: '',
});

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────
export const PrescriptionModule: React.FC<PrescriptionModuleProps> = ({ patient, user, clinic, isManagerMode, onUpdate }) => {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [activePrescription, setActivePrescription] = useState<Prescription | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    // Load prescriptions on mount
    React.useEffect(() => {
        loadPrescriptions();
    }, [patient.id]);

    const loadPrescriptions = async () => {
        setLoading(true);
        const data = await db.getPrescriptions(patient.id);
        setPrescriptions(data);
        setLoading(false);
    };

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    // --- CRUD ACTIONS ---
    const handleNewPrescription = async () => {
        const prof = (await db.getProfessionals(patient.clinicId)).find(p => p.userId === user.id);
        const newPrescription: Prescription = {
            id: `rx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            patientId: patient.id,
            clinicId: patient.clinicId,
            professionalId: user.professionalId || prof?.id || '',
            authorName: user.name,
            date: new Date().toISOString(),
            status: 'RASCUNHO',
            items: [emptyItem()],
            observations: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setActivePrescription(newPrescription);
        setShowPreview(false);
    };

    const handleSave = async (finalize = false) => {
        if (!activePrescription) return;

        // Validation
        const invalidItems = activePrescription.items.filter(i => !i.name.trim() || !i.dose.trim());
        if (invalidItems.length > 0) {
            showToast('⚠️ Preencha Nome e Dose de todos os itens.');
            return;
        }
        if (activePrescription.items.length === 0) {
            showToast('⚠️ Adicione ao menos um item à prescrição.');
            return;
        }

        const status = finalize ? 'FINALIZADA' : 'RASCUNHO';
        const snapshotText = PrescriptionService.generateFullPrescriptionText(activePrescription, patient.name);

        const toSave: Prescription = {
            ...activePrescription,
            status: status as 'RASCUNHO' | 'FINALIZADA',
            updatedAt: new Date().toISOString(),
            snapshotText: status === 'FINALIZADA' ? snapshotText : undefined,
        };

        await db.savePrescription(user, toSave);
        showToast(finalize ? 'Prescrição finalizada e salva!' : 'Rascunho salvo.');

        if (finalize) {
            setActivePrescription(null);
            setShowPreview(false);
        } else {
            setActivePrescription(toSave);
        }
        loadPrescriptions();
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await db.deletePrescription(id);
        showToast('Prescrição excluída.');
        if (activePrescription?.id === id) {
            setActivePrescription(null);
        }
        loadPrescriptions();
    };

    const handleOpenExisting = (rx: Prescription) => {
        setActivePrescription({ ...rx, items: rx.items.map(i => ({ ...i })) });
        setShowPreview(false);
    };

    // --- ITEM MANAGEMENT ---
    const updateItem = (itemId: string, updates: Partial<PrescriptionItem>) => {
        if (!activePrescription) return;
        setActivePrescription(prev => prev ? {
            ...prev,
            items: prev.items.map(i => i.id === itemId ? { ...i, ...updates } : i)
        } : null);
    };

    const addItem = () => {
        if (!activePrescription) return;
        setActivePrescription(prev => prev ? {
            ...prev,
            items: [...prev.items, emptyItem()]
        } : null);
    };

    const removeItem = (itemId: string) => {
        if (!activePrescription) return;
        setActivePrescription(prev => prev ? {
            ...prev,
            items: prev.items.filter(i => i.id !== itemId)
        } : null);
    };

    const duplicateItem = (itemId: string) => {
        if (!activePrescription) return;
        const original = activePrescription.items.find(i => i.id === itemId);
        if (!original) return;
        const dup: PrescriptionItem = {
            ...original,
            id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
        };
        setActivePrescription(prev => prev ? {
            ...prev,
            items: [...prev.items, dup]
        } : null);
    };

    // --- TIMING MANAGEMENT ---
    const addTiming = (itemId: string) => {
        updateItem(itemId, {
            timings: [...(activePrescription?.items.find(i => i.id === itemId)?.timings || []),
            { type: 'AO_ACORDAR' as PrescriptionTimingType }]
        });
    };

    const updateTiming = (itemId: string, timingIdx: number, updates: Partial<PrescriptionTiming>) => {
        const item = activePrescription?.items.find(i => i.id === itemId);
        if (!item) return;
        const newTimings = [...item.timings];
        newTimings[timingIdx] = { ...newTimings[timingIdx], ...updates };
        updateItem(itemId, { timings: newTimings });
    };

    const removeTiming = (itemId: string, timingIdx: number) => {
        const item = activePrescription?.items.find(i => i.id === itemId);
        if (!item) return;
        const newTimings = item.timings.filter((_, i) => i !== timingIdx);
        updateItem(itemId, { timings: newTimings });
    };

    // --- PREVIEW TEXT AND PDF ---
    const previewText = useMemo(() => {
        if (!activePrescription || activePrescription.items.length === 0) return '';
        return PrescriptionService.generateFullPrescriptionText(activePrescription, patient.name);
    }, [activePrescription, patient.name]);

    const handleCopy = async (text: string, id?: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        await navigator.clipboard.writeText(text);
        setCopiedId(id || 'preview');
        setTimeout(() => setCopiedId(null), 2000);
        showToast('Copiado para a área de transferência!');
    };

    const handleGeneratePDF = async () => {
        if (!activePrescription || isGeneratingPdf) return;
        setIsGeneratingPdf(true);
        try {
            const element = printRef.current;
            if (!element) throw new Error("Elemento PDF não encontrado.");

            const opt = {
                margin: 0,
                filename: `Receituario_${patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true, windowWidth: 794 },
                jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
            };

            const html2pdfModule = await import('html2pdf.js');
            const html2pdf = html2pdfModule.default || html2pdfModule;

            if (typeof html2pdf !== 'function') {
                throw new Error("Erro ao carregar módulo PDF.");
            }

            // Exibir o elemento temporariamente para o html2pdf capturar
            element.style.display = 'block';
            await html2pdf().set(opt).from(element).save();
            element.style.display = 'none';

            showToast('PDF gerado com sucesso!');
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            showToast('Erro ao gerar PDF.');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // --- STYLE HELPERS ---
    const cardBg = isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
    const inputCls = `w-full p-2 border rounded text-sm focus:ring-2 focus:outline-none ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-indigo-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-emerald-400'}`;
    const labelCls = `block text-xs font-bold uppercase tracking-wider mb-1 ${isManagerMode ? 'text-gray-400' : 'text-gray-600'}`;
    const btnPrimary = isManagerMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700';
    const btnSecondary = isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50';
    const accentText = isManagerMode ? 'text-indigo-400' : 'text-emerald-600';

    // ─── RENDER: LIST MODE ──────────────────────────────────────────────
    if (!activePrescription) {
        return (
            <div className="space-y-4">
                {/* Toast */}
                {toast && <div className="fixed top-4 right-4 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-xl z-50 text-sm font-bold animate-bounce">{toast}</div>}

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className={`text-lg font-bold ${isManagerMode ? 'text-white' : 'text-gray-900'}`}>Prescrição Clínica</h2>
                        <p className={`text-xs ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>Prescrições de suplementos, vitaminas e fórmulas.</p>
                    </div>
                    <button onClick={handleNewPrescription} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm ${btnPrimary}`}>
                        <Icons.Plus className="w-5 h-5" /> Nova Prescrição
                    </button>
                </div>

                {/* List */}
                {loading ? (
                    <div className={`p-8 text-center text-sm ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>Carregando...</div>
                ) : prescriptions.length === 0 ? (
                    <div className={`${cardBg} border rounded-xl p-12 text-center`}>
                        <Icons.FileText className={`w-12 h-12 mx-auto mb-3 opacity-20 ${isManagerMode ? 'text-white' : 'text-black'}`} />
                        <h3 className={`font-bold text-sm ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Nenhuma prescrição</h3>
                        <p className={`text-xs mt-1 ${isManagerMode ? 'text-gray-500' : 'text-gray-400'}`}>Clique em "Nova Prescrição" para começar.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {prescriptions.map(rx => (
                            <div key={rx.id} className={`${cardBg} border rounded-xl p-4 flex items-center justify-between group hover:shadow-md transition-shadow`}>
                                <div className="flex-1 cursor-pointer" onClick={() => handleOpenExisting(rx)}>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-bold px-2 py-1 flex items-center gap-1 rounded-full ${rx.status === 'FINALIZADA' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                                            {rx.status === 'FINALIZADA' ? 'Finalizada' : 'Rascunho'}
                                        </span>
                                        <span className={`text-sm font-bold ${isManagerMode ? 'text-white' : 'text-gray-800'}`}>
                                            {new Date(rx.date).toLocaleDateString('pt-BR')}
                                        </span>
                                        <span className={`text-xs ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {rx.items.length} {rx.items.length === 1 ? 'item' : 'itens'} • {rx.authorName}
                                        </span>
                                    </div>
                                    <div className={`mt-1 text-xs ${isManagerMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {rx.items.slice(0, 3).map(i => `${i.name} (${FORM_LABELS[i.form]})`).join(', ')}
                                        {rx.items.length > 3 && ` +${rx.items.length - 3} mais`}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {rx.snapshotText && (
                                        <button onClick={(e) => handleCopy(rx.snapshotText!, rx.id, e)} className={`px-2 py-1 rounded-lg text-xs font-bold border ${btnSecondary}`} title="Copiar texto">
                                            {copiedId === rx.id ? 'Copiado!' : 'Copiar'}
                                        </button>
                                    )}
                                    <button onClick={() => handleOpenExisting(rx)} className={`px-2 py-1 rounded-lg text-xs font-bold border ${btnSecondary}`} title="Editar">
                                        Editar
                                    </button>
                                    <button onClick={(e) => handleDelete(rx.id, e)} className="px-2 py-1 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors" title="Excluir">
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ─── RENDER: EDITOR MODE ────────────────────────────────────────────
    return (
        <div className="space-y-4 relative">
            {/* Toast */}
            {toast && <div className="fixed top-4 right-4 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-xl z-50 text-sm font-bold animate-bounce">{toast}</div>}

            {/* Header Bar */}
            <div className={`${cardBg} border rounded-xl p-4`}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={() => { setActivePrescription(null); setShowPreview(false); }} className={`px-3 py-1.5 rounded-lg border text-sm flex items-center gap-2 ${btnSecondary}`} title="Voltar">
                            ← Voltar
                        </button>
                        <div>
                            <h2 className={`text-sm flex items-center gap-1 font-bold ${isManagerMode ? 'text-white' : 'text-gray-900'}`}>
                                {activePrescription.status === 'RASCUNHO' ? 'Rascunho' : 'Finalizada'}
                            </h2>
                            <p className={`text-xs ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {new Date(activePrescription.date).toLocaleDateString('pt-BR')} • {activePrescription.authorName}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {showPreview && (
                            <button onClick={handleGeneratePDF} disabled={isGeneratingPdf} className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 ${btnSecondary}`}>
                                <Icons.FileText className="w-4 h-4" /> {isGeneratingPdf ? 'Gerando...' : 'Gerar PDF'}
                            </button>
                        )}
                        <button onClick={() => setShowPreview(!showPreview)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 ${showPreview ? btnPrimary : btnSecondary}`}>
                            {showPreview ? 'Editor' : 'Preview'}
                        </button>
                        <button onClick={() => handleSave(false)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 ${btnSecondary}`}>
                            Salvar
                        </button>
                        <button onClick={() => handleSave(true)} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 ${btnPrimary}`}>
                            Finalizar
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Mode */}
            {showPreview ? (
                <div className={`${cardBg} border rounded-xl overflow-hidden`}>
                    <div className={`p-4 border-b flex justify-between items-center ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                        <h3 className={`text-sm font-bold ${isManagerMode ? 'text-white' : 'text-gray-800'}`}>Preview de Texto Copiável</h3>
                        <button onClick={(e) => handleCopy(previewText, 'previewText', e)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 ${btnSecondary}`}>
                            {copiedId === 'previewText' ? 'Copiado!' : 'Copiar Texto'}
                        </button>
                    </div>
                    <div className={`p-6 ${isManagerMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <pre className={`whitespace-pre-wrap font-sans text-sm leading-relaxed ${isManagerMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {previewText || 'Nenhum item para exibir.'}
                        </pre>
                    </div>
                </div>
            ) : (
                /* Editor Mode */
                <div className="space-y-4">
                    {/* Items */}
                    {activePrescription.items.map((item, idx) => (
                        <div key={item.id} className={`${cardBg} border rounded-xl overflow-hidden`}>
                            {/* Item Header */}
                            <div className={`px-4 py-3 border-b flex justify-between items-center ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isManagerMode ? 'bg-indigo-900 text-indigo-300' : 'bg-emerald-100 text-emerald-700'}`}>
                                        #{idx + 1}
                                    </span>
                                    <span className={`text-sm font-bold ${isManagerMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                        {item.name || 'Novo Item'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => duplicateItem(item.id)} className={`px-2 py-1 rounded text-xs border bg-white ${isManagerMode ? 'text-gray-800 border-gray-600' : 'text-gray-700 border-gray-300'}`} title="Duplicar">
                                        Duplicar
                                    </button>
                                    {activePrescription.items.length > 1 && (
                                        <button onClick={() => removeItem(item.id)} className="px-2 py-1 rounded text-xs text-white bg-red-400 hover:bg-red-500" title="Remover">
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Item Form */}
                            <div className="p-4 space-y-4">
                                {/* Row 1: Type + Name */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className={labelCls}>Tipo *</label>
                                        <select value={item.type} onChange={e => updateItem(item.id, { type: e.target.value as PrescriptionItemType })} className={inputCls}>
                                            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelCls}>Nome do Produto *</label>
                                        <input type="text" value={item.name} onChange={e => updateItem(item.id, { name: e.target.value })} placeholder="Ex: Vitamina D3, Magnésio quelato..." className={inputCls} />
                                    </div>
                                </div>

                                {/* Row 2: Form + Dose + Frequency */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className={labelCls}>Forma Farmacêutica</label>
                                        <select value={item.form} onChange={e => updateItem(item.id, { form: e.target.value as PrescriptionForm })} className={inputCls}>
                                            {Object.entries(FORM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Dose *</label>
                                        <input type="text" value={item.dose} onChange={e => updateItem(item.id, { dose: e.target.value })} placeholder="Ex: 2.000 UI, 500 mg..." className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Frequência</label>
                                        <select value={item.frequency} onChange={e => updateItem(item.id, { frequency: e.target.value as PrescriptionFrequency })} className={inputCls}>
                                            {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Frequency Value (conditional) */}
                                {(item.frequency === 'CADA_X_HORAS' || item.frequency === 'X_VEZES_POR_SEMANA') && (
                                    <div className="w-40">
                                        <label className={labelCls}>{item.frequency === 'CADA_X_HORAS' ? 'Intervalo (horas)' : 'Vezes por semana'}</label>
                                        <input type="number" min={1} value={item.frequencyValue || ''} onChange={e => updateItem(item.id, { frequencyValue: parseInt(e.target.value) || undefined })} className={inputCls} />
                                    </div>
                                )}

                                {/* Row 3: Duration + Instructions */}
                                <div className="grid grid-cols-4 gap-3">
                                    <div>
                                        <label className={labelCls}>Duração (dias)</label>
                                        <input type="number" min={1} value={item.durationDays || ''} onChange={e => updateItem(item.id, { durationDays: parseInt(e.target.value) || undefined })} placeholder="30" className={inputCls} />
                                    </div>
                                    <div className="col-span-3">
                                        <label className={labelCls}>Instruções Adicionais</label>
                                        <input type="text" value={item.instructions || ''} onChange={e => updateItem(item.id, { instructions: e.target.value })} placeholder="Ex: Tomar com água, evitar café concomitante..." className={inputCls} />
                                    </div>
                                </div>

                                {/* Timings */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className={labelCls}>Horário Inteligente</label>
                                        <button onClick={() => addTiming(item.id)} className={`text-xs font-bold flex items-center gap-1 ${accentText} hover:underline`}>
                                            <Icons.Plus className="w-3 h-3" /> Adicionar horário
                                        </button>
                                    </div>
                                    {item.timings.length === 0 ? (
                                        <p className={`text-xs italic ${isManagerMode ? 'text-gray-500' : 'text-gray-400'}`}>Nenhum horário definido (opcional).</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {item.timings.map((timing, tIdx) => (
                                                <div key={tIdx} className={`flex items-center gap-2 p-2 rounded-lg border ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                                    <select value={timing.type} onChange={e => updateTiming(item.id, tIdx, { type: e.target.value as PrescriptionTimingType })} className={`${inputCls} flex-1`}>
                                                        {Object.entries(TIMING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                    </select>

                                                    {(timing.type === 'ANTES_DA_REFEICAO' || timing.type === 'APOS_DA_REFEICAO') && (
                                                        <>
                                                            <select value={timing.meal || 'ALMOCO'} onChange={e => updateTiming(item.id, tIdx, { meal: e.target.value })} className={`${inputCls} w-36`}>
                                                                {MEAL_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                                            </select>
                                                            <input type="number" min={0} placeholder="min" value={timing.minutes ?? 30} onChange={e => updateTiming(item.id, tIdx, { minutes: parseInt(e.target.value) || 0 })} className={`${inputCls} w-20`} />
                                                            <span className={`text-xs ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>min</span>
                                                        </>
                                                    )}

                                                    {timing.type === 'HORARIO_FIXO' && (
                                                        <input type="time" value={timing.time || '08:00'} onChange={e => updateTiming(item.id, tIdx, { time: e.target.value })} className={`${inputCls} w-32`} />
                                                    )}

                                                    <button onClick={() => removeTiming(item.id, tIdx)} className="p-1 px-2 text-red-500 hover:bg-red-100 rounded text-xs font-bold" title="Remover">✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Live Preview of this item */}
                                {item.name && item.dose && (
                                    <div className={`p-3 rounded-lg border-l-4 ${isManagerMode ? 'bg-gray-700 border-indigo-500' : 'bg-emerald-50 border-emerald-500'}`}>
                                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isManagerMode ? 'text-indigo-400' : 'text-emerald-700'}`}>Preview do Item</p>
                                        <p className={`text-sm whitespace-pre-wrap ${isManagerMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            {PrescriptionService.generateItemText(item)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Add Item Button */}
                    <button onClick={addItem} className={`w-full py-3 rounded-xl border-2 border-dashed text-sm font-bold flex items-center justify-center gap-2 transition-colors ${isManagerMode ? 'border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-400' : 'border-gray-300 text-gray-500 hover:border-emerald-400 hover:text-emerald-600'}`}>
                        <Icons.Plus className="w-4 h-4" /> Adicionar Item
                    </button>

                    {/* Observations */}
                    <div className={`${cardBg} border rounded-xl p-4`}>
                        <label className={labelCls}>Observações Gerais</label>
                        <textarea
                            value={activePrescription.observations || ''}
                            onChange={e => setActivePrescription(prev => prev ? { ...prev, observations: e.target.value } : null)}
                            placeholder="Observações adicionais sobre a prescrição..."
                            rows={3}
                            className={inputCls}
                        />
                    </div>
                </div>
            )}

            {/* VISTA DE IMPRESSÃO - PDF TEMPLATE (Hidden from normal view) */}
            <div style={{ display: 'none' }}>
                <div ref={printRef} className="bg-white text-black p-12 font-sans" style={{ width: '794px', minHeight: '1123px', boxSizing: 'border-box' }}>
                    {/* Header: Clinic Info */}
                    <div className="flex justify-between items-center border-b-[3px] border-emerald-700 pb-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-emerald-800 uppercase tracking-widest leading-tight">{clinic.name}</h1>
                            <p className="text-sm text-gray-600 mt-2">{clinic.address || 'Endereço não informado'}</p>
                            <div className="flex gap-4 mt-1 text-sm text-gray-600">
                                {clinic.phone && <span>Tel: {clinic.phone}</span>}
                                {clinic.website && <span>{clinic.website}</span>}
                            </div>
                        </div>
                        {clinic.logoUrl && (
                            <img src={clinic.logoUrl} alt="Logo da Clínica" className="h-24 object-contain" />
                        )}
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-center uppercase tracking-[0.2em] text-emerald-700 mb-8 border-y border-emerald-100 py-3 bg-emerald-50">
                        Receituário Clínico
                    </h2>

                    {/* Patient Context */}
                    <div className="grid grid-cols-2 gap-6 text-sm mb-10 bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
                        <div className="space-y-2">
                            <p className="border-b border-gray-200 pb-1">
                                <span className="font-bold text-gray-600 uppercase text-xs tracking-wider block mb-1">Paciente</span>
                                <span className="text-base text-gray-900 font-medium">{patient.name}</span>
                            </p>
                            <p>
                                <span className="font-bold text-gray-600 uppercase text-xs tracking-wider block mb-1">Idade</span>
                                <span className="text-base text-gray-900">{patient.birthDate ? `${new Date().getFullYear() - new Date(patient.birthDate).getFullYear()} anos` : 'Não informada'}</span>
                            </p>
                        </div>
                        <div className="space-y-2">
                            <p className="border-b border-gray-200 pb-1">
                                <span className="font-bold text-gray-600 uppercase text-xs tracking-wider block mb-1">Data de Emissão</span>
                                <span className="text-base text-gray-900 font-medium">{new Date(activePrescription?.date || new Date()).toLocaleDateString('pt-BR')}</span>
                            </p>
                            <p>
                                <span className="font-bold text-gray-600 uppercase text-xs tracking-wider block mb-1">Profissional Responsável</span>
                                <span className="text-base text-gray-900">{activePrescription?.authorName || user.name}</span>
                            </p>
                        </div>
                    </div>

                    {/* Prescription Items (Magistral Format) */}
                    <div className="space-y-8 min-h-[400px]">
                        <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-widest border-b border-emerald-200 mb-6 pb-2">Itens Prescritos</h3>

                        {activePrescription?.items.map((item, idx) => {
                            const lines = PrescriptionService.generateItemText(item).split('\n');
                            const nameLine = lines[0];
                            const instructionLines = lines.slice(1);

                            return (
                                <div key={item.id} className="pl-5 border-l-[3px] border-emerald-500 py-1 mb-6">
                                    <p className="font-bold text-gray-900 text-lg mb-2 leading-snug">
                                        <span className="text-emerald-700 mr-2">{idx + 1}.</span> {nameLine}
                                    </p>
                                    <div className="text-gray-700 font-medium text-[15px] space-y-1">
                                        {instructionLines.map((line, lidx) => (
                                            <p key={lidx}>{line}</p>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {activePrescription?.observations && (
                            <div className="mt-12 pt-6 border-t border-gray-200">
                                <p className="text-sm font-bold text-emerald-800 uppercase tracking-widest mb-3">Observações Adicionais</p>
                                <p className="whitespace-pre-wrap text-[15px] text-gray-700 bg-yellow-50/50 p-4 border-l-4 border-yellow-400 rounded-r-lg">
                                    {activePrescription.observations}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Signature Space */}
                    <div className="mt-32 w-full flex justify-center">
                        <div className="text-center w-80">
                            <div className="border-t border-gray-400 mb-2"></div>
                            <p className="font-bold text-lg text-gray-900">{activePrescription?.authorName || user.name}</p>
                            <p className="text-sm text-gray-500 uppercase tracking-wider">{user.role === Role.CLINIC_ADMIN ? 'Responsável Técnico' : 'Profissional'}</p>
                        </div>
                    </div>

                    {/* Footer Warning */}
                    <div className="mt-auto pt-16 text-center">
                        <p className="text-xs text-slate-400 font-mono">
                            Documento emitido via ControlClin Excellence • {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
            </div>
            {/* FIM VISTA DE IMPRESSÃO */}
        </div>
    );
};
