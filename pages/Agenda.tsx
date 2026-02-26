
import React, { useState, useEffect, useRef } from 'react';
import { User, Clinic, Professional, Appointment, AppointmentStatus, Patient, Role, FinancialStatus, PaymentMethod } from '../types';
import { db } from '../services/db';
import { Icons } from '../constants';
import { WhatsAppService } from '../services/whatsappService';

interface AgendaProps {
    user: User;
    clinic: Clinic;
    isManagerMode: boolean; // New prop
}

type ViewMode = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'TEAM';

const Agenda: React.FC<AgendaProps> = ({ user, clinic, isManagerMode }) => {
    const isAdmin = user.role === Role.CLINIC_ADMIN || user.role === Role.SUPER_ADMIN;
    const isProfessionalUser = user.role === Role.PROFESSIONAL;

    // --- STATE ---
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);

    // FILTER STATE (Multi-Select)
    const [selectedProfIds, setSelectedProfIds] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    const [viewMode, setViewMode] = useState<ViewMode>('DAY');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [currentTimePercentage, setCurrentTimePercentage] = useState<number | null>(null);

    // Modal & Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
    const [formPatientMode, setFormPatientMode] = useState<'search' | 'new'>('search');
    const [formPatientId, setFormPatientId] = useState('');
    const [formNewPatientName, setFormNewPatientName] = useState('');
    const [formDate, setFormDate] = useState('');
    const [formStartTime, setFormStartTime] = useState('');
    const [formEndTime, setFormEndTime] = useState('');
    const [formType, setFormType] = useState('ROTINA');
    const [formStatus, setFormStatus] = useState<AppointmentStatus>(AppointmentStatus.SCHEDULED);
    const [formProfessionalId, setFormProfessionalId] = useState('');

    // New Financial Fields (Synced with Financial Module)
    const [formPrice, setFormPrice] = useState<string>('');
    const [formFinancialStatus, setFormFinancialStatus] = useState<FinancialStatus>('PENDENTE');
    const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('PIX');

    const [formError, setFormError] = useState<string | null>(null);

    // Config Constants
    const openTimeStr = clinic.scheduleConfig?.openTime || '08:00';
    const closeTimeStr = clinic.scheduleConfig?.closeTime || '18:00';
    const startHour = parseInt(openTimeStr.split(':')[0]);
    const endHour = parseInt(closeTimeStr.split(':')[0]);
    const hours = Array.from({ length: (endHour - startHour) }, (_, i) => i + startHour);
    const daysOpen = clinic.scheduleConfig?.daysOpen || [1, 2, 3, 4, 5];

    // --- EFFECT: INITIAL LOAD ---
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const profs = await db.getProfessionals(clinic.id);
            setProfessionals(profs);
            // Patients filter depends on mode
            const pats = await db.getPatients(clinic.id, isProfessionalUser ? user.professionalId : undefined);
            setPatients(pats);

            // Define filtro inicial apenas uma vez
            if (selectedProfIds.length === 0) {
                if (isProfessionalUser && user.professionalId) {
                    setSelectedProfIds([user.professionalId]);
                } else {
                    setSelectedProfIds(['all']);
                }
            }
            setLoading(false);
        };
        init();
    }, [clinic.id, user, isAdmin, isProfessionalUser]); // Added isProfessionalUser to dependency array

    // --- EFFECT: DATA FETCHING & TIME LINE ---
    useEffect(() => {
        if (!loading) fetchData();
        const interval = setInterval(updateCurrentTimeIndicator, 60000);
        updateCurrentTimeIndicator();

        // Close filter on click outside
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            clearInterval(interval);
            document.removeEventListener("mousedown", handleClickOutside);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDate, viewMode, selectedProfIds, loading, isProfessionalUser, user.professionalId]); // Added isProfessionalUser and user.professionalId

    const updateCurrentTimeIndicator = () => {
        const now = new Date();
        // Show indicator only if viewing today
        const isToday = now.toDateString() === currentDate.toDateString();
        if (!isToday && viewMode === 'DAY') {
            setCurrentTimePercentage(null);
            return;
        }

        const currentH = now.getHours();
        const currentM = now.getMinutes();

        if (currentH < startHour || currentH >= endHour) {
            setCurrentTimePercentage(null);
            return;
        }
        const totalViewMinutes = (endHour - startHour) * 60;
        const minutesPassed = ((currentH - startHour) * 60) + currentM;
        setCurrentTimePercentage((minutesPassed / totalViewMinutes) * 100);
    };

    const getDateRange = () => {
        const start = new Date(currentDate);
        const end = new Date(currentDate);

        switch (viewMode) {
            case 'DAY':
            case 'TEAM':
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'WEEK':
                const day = start.getDay();
                const diff = start.getDate() - day + (day === 0 ? -6 : 1);
                start.setDate(diff);
                start.setHours(0, 0, 0, 0);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                break;
            case 'MONTH':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end.setMonth(start.getMonth() + 1);
                end.setDate(0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'YEAR':
                start.setMonth(0, 1);
                start.setHours(0, 0, 0, 0);
                end.setMonth(11, 31);
                end.setHours(23, 59, 59, 999);
                break;
        }
        return { start, end };
    };

    const fetchData = async () => {
        const { start, end } = getDateRange();
        const appts = await db.getAppointments(clinic.id, start, end, isProfessionalUser ? user.professionalId : undefined);
        setAppointments(appts);
    };

    // --- FILTER LOGIC ---
    const handleToggleProf = (id: string) => {
        if (isProfessionalUser && user.professionalId && id !== user.professionalId) {
            alert("No modo Profissional, você só pode filtrar por sua própria agenda.");
            return;
        }

        if (id === 'all') {
            if (selectedProfIds.includes('all')) {
                setSelectedProfIds([]); // Deselect all (empty)
            } else {
                setSelectedProfIds(['all']); // Select all
            }
        } else {
            let newIds = [...selectedProfIds];
            if (newIds.includes('all')) {
                newIds = []; // Clear 'all' if toggling specific
            }

            if (newIds.includes(id)) {
                newIds = newIds.filter(i => i !== id);
            } else {
                newIds.push(id);
            }

            setSelectedProfIds(newIds);
        }
    };

    const getVisibleProfessionals = () => {
        if (isProfessionalUser && user.professionalId) {
            return professionals.filter(p => p.id === user.professionalId);
        }
        if (selectedProfIds.includes('all') || selectedProfIds.length === 0) return professionals;
        return professionals.filter(p => selectedProfIds.includes(p.id));
    };

    // --- NAVIGATION HELPERS ---
    const handleNav = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        const val = direction === 'next' ? 1 : -1;

        switch (viewMode) {
            case 'DAY':
            case 'TEAM':
                newDate.setDate(currentDate.getDate() + val);
                break;
            case 'WEEK':
                newDate.setDate(currentDate.getDate() + (val * 7));
                break;
            case 'MONTH':
                newDate.setMonth(currentDate.getMonth() + val);
                break;
            case 'YEAR':
                newDate.setFullYear(currentDate.getFullYear() + val);
                break;
        }
        setCurrentDate(newDate);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            const parts = e.target.value.split('-');
            setCurrentDate(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
        }
    };

    const getNavLabel = () => {
        const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
        if (viewMode === 'DAY' || viewMode === 'TEAM') opts.day = 'numeric';
        if (viewMode === 'WEEK') return `Semana de ${getDateRange().start.toLocaleDateString()}`;
        if (viewMode === 'YEAR') return currentDate.getFullYear().toString();
        return currentDate.toLocaleDateString('pt-BR', opts);
    };

    // --- VISUAL HELPERS ---
    const getAppointmentStyles = (appt: Appointment, prof?: Professional) => {
        let baseClass = prof?.color || 'bg-blue-200';
        let borderClass = 'border-l-4 border-l-blue-600';
        let icon = null;
        let opacityClass = 'bg-opacity-90';
        // STRATEGY: Active appointments are z-20. "Create Slot" overlay is z-10. Canceled appointments are z-0.
        let zIndex = 'z-20';

        switch (appt.status) {
            case AppointmentStatus.CONFIRMED:
                borderClass = 'border-l-4 border-l-green-600';
                icon = '✔️';
                break;
            case AppointmentStatus.CANCELED:
                // STATUS CANCELADO: Visual de "fundo", liberando a agenda
                baseClass = 'bg-gray-100';
                borderClass = 'border-l-4 border-l-gray-300 border-dashed';
                opacityClass = 'bg-opacity-50 grayscale';
                icon = '❌';
                zIndex = 'z-0'; // Atrás do overlay de criação
                break;
            case AppointmentStatus.COMPLETED:
                borderClass = 'border-l-4 border-l-blue-800';
                icon = '🏁';
                break;
            case AppointmentStatus.MISSED:
                borderClass = 'border-l-4 border-l-gray-600 bg-gray-200';
                icon = '❓';
                break;
            default: // Scheduled
                borderClass = 'border-l-4 border-l-yellow-400';
                opacityClass = 'bg-opacity-100';
        }

        return { baseClass, borderClass, icon, opacityClass, zIndex };
    };

    const AppointmentCard: React.FC<{ appt: Appointment, viewType: 'mini' | 'full' }> = ({ appt, viewType }) => {
        const prof = professionals.find(p => p.id === appt.professionalId);
        const { baseClass, borderClass, icon, opacityClass, zIndex } = getAppointmentStyles(appt, prof);

        const startMinutes = new Date(appt.startTime).getMinutes();
        const durationMinutes = (new Date(appt.endTime).getTime() - new Date(appt.startTime).getTime()) / 60000;
        const topPos = (startMinutes / 60) * 100;
        const heightPx = Math.max((durationMinutes / 60) * 100, viewType === 'mini' ? 100 : 35);

        const styleObj = viewType === 'full' ? {
            top: `${topPos}%`,
            height: `${heightPx}%`
        } : {};

        const isCanceled = appt.status === AppointmentStatus.CANCELED;

        const handleWhatsAppReminder = (e: React.MouseEvent) => {
            e.stopPropagation();
            const p = patients.find(pat => pat.id === appt.patientId);
            if (!p || !p.phone) {
                alert("Paciente sem telefone cadastrado.");
                return;
            }
            const dateStr = new Date(appt.startTime).toLocaleDateString();
            const timeStr = new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const message = WhatsAppService.getAppointmentReminder(appt.patientName, dateStr, timeStr, clinic.name);
            window.open(WhatsAppService.generateLink(p.phone, message), '_blank');
        };

        return (
            <div
                onClick={(e) => { if (!isCanceled) { e.stopPropagation(); handleOpenEdit(appt); } }}
                className={`
                ${viewType === 'full' ? `absolute left-1 right-1 ${zIndex}` : 'relative w-full mb-1'}
                rounded-md shadow-sm transition-all text-gray-800 overflow-hidden
                ${baseClass} ${borderClass} ${opacityClass}
                ${isCanceled ? 'pointer-events-none' : 'cursor-pointer hover:shadow-lg hover:scale-[1.02]'}
                group/card
            `}
                style={styleObj}
                title={`${appt.patientName} - ${appt.status} ${appt.financialStatus === 'PAGO' ? '(PAGO)' : ''}`}
            >
                <div className={`px-2 ${viewType === 'full' ? 'py-1 h-full flex flex-col justify-center' : 'py-1'}`}>
                    <div className="flex justify-between items-center w-full">
                        <span className={`font-bold text-xs truncate flex-1 ${isCanceled ? 'line-through text-gray-500' : ''}`}>{appt.patientName}</span>
                        <div className="flex items-center gap-1">
                            {!isCanceled && (
                                <button
                                    onClick={handleWhatsAppReminder}
                                    className="opacity-0 group-hover/card:opacity-100 transition-opacity bg-white/50 hover:bg-white p-0.5 rounded text-emerald-700 font-bold"
                                    title="Enviar Lembrete WhatsApp"
                                >
                                    💬
                                </button>
                            )}
                            <span className="text-[10px] ml-1">{icon}</span>
                        </div>
                    </div>
                    {viewType === 'full' && heightPx > 45 && (
                        <div className="flex items-center justify-between text-[10px] mt-0.5 opacity-80">
                            <div className="flex flex-col">
                                <span className={isCanceled ? 'text-gray-400' : ''}>{appt.type.substring(0, 3)}</span>
                                {!isCanceled && appt.financialStatus === 'PENDENTE' && <span className="text-[9px] text-red-600 font-bold">$ Pend.</span>}
                            </div>
                            <span className="font-mono">{new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    )}
                </div>

                {isCanceled && (
                    <div className="absolute top-0 right-0 p-1 pointer-events-auto z-50">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(appt); }}
                            className="bg-white rounded-full p-1 shadow hover:bg-gray-100 text-gray-500"
                            title="Ver/Editar Agendamento Cancelado"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        );
    };

    // --- MODAL HANDLERS ---

    const checkDateAvailability = (dateStr: string) => {
        if (!dateStr) return true;
        const [y, m, d] = dateStr.split('-').map(Number);
        const selectedDay = new Date(y, m - 1, d).getDay();

        if (!daysOpen.includes(selectedDay)) {
            return false;
        }
        return true;
    };

    const handleOpenCreate = (dateOverride?: Date, hour?: number, preSelectedProfId?: string) => {
        const d = dateOverride || currentDate;
        const dateStr = d.toISOString().split('T')[0];

        // Check validation on open
        if (!checkDateAvailability(dateStr)) {
            alert("Data não disponível para agendamento (Clínica fechada).");
            return;
        }

        setModalMode('create');
        setEditingAppointmentId(null);
        setFormPatientMode('search');
        setFormPatientId('');
        setFormNewPatientName('');
        setFormStatus(AppointmentStatus.SCHEDULED);
        setFormDate(dateStr);
        setFormPrice('');
        setFormFinancialStatus('PENDENTE');
        setFormPaymentMethod('PIX');
        setFormError(null);

        // Time Defaults
        let startH = hour !== undefined ? hour : new Date().getHours();
        if (startH < startHour) startH = startHour;
        if (startH >= endHour) startH = endHour - 1;

        setFormStartTime(`${startH.toString().padStart(2, '0')}:00`);
        setFormEndTime(`${(startH + 1).toString().padStart(2, '0')}:00`);

        const targetProf = preSelectedProfId || (selectedProfIds.length === 1 && selectedProfIds[0] !== 'all' ? selectedProfIds[0] : (user.professionalId || professionals[0]?.id || ''));
        setFormProfessionalId(targetProf);

        setIsModalOpen(true);
    };

    const handleOpenEdit = (appt: Appointment) => {
        setModalMode('edit');
        setEditingAppointmentId(appt.id);
        setFormPatientMode('search');
        setFormPatientId(appt.patientId);
        setFormNewPatientName(appt.patientName);
        setFormType(appt.type);
        setFormStatus(appt.status);
        setFormProfessionalId(appt.professionalId);
        const startObj = new Date(appt.startTime);
        setFormDate(startObj.toISOString().split('T')[0]);
        setFormStartTime(startObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setFormEndTime(new Date(appt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

        // Financial Fields Load
        setFormPrice(appt.price ? appt.price.toString() : '');
        setFormFinancialStatus(appt.financialStatus || 'PENDENTE');
        setFormPaymentMethod(appt.paymentMethod || 'PIX');

        setFormError(null);
        setIsModalOpen(true);
    };

    const handleDateBlur = () => {
        if (!checkDateAvailability(formDate)) {
            setFormError("Data indisponível: Clínica fechada neste dia da semana.");
            alert('Data não disponível para agendamento');
        } else {
            setFormError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        // --- VALIDATION LOGIC ---
        if (!checkDateAvailability(formDate) || formStartTime < openTimeStr || formEndTime > closeTimeStr) {
            const msg = !checkDateAvailability(formDate)
                ? 'Data não disponível para agendamento (Clínica fechada).'
                : `Horário inválido. O funcionamento é das ${openTimeStr} às ${closeTimeStr}.`;
            setFormError(msg);
            alert(msg);
            return;
        }

        const startDateTime = new Date(`${formDate}T${formStartTime}`);
        const endDateTime = new Date(`${formDate}T${formEndTime}`);
        if (endDateTime <= startDateTime) {
            alert("A hora final deve ser maior que a inicial.");
            return;
        }

        let finalPatientId = formPatientId;
        let finalPatientName = '';
        let newAppointment: Appointment | null = null;

        try {
            const commonData = {
                professionalId: formProfessionalId,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                type: formType as any,
                status: formStatus,
                price: formPrice ? parseFloat(formPrice) : 0,
                financialStatus: formFinancialStatus,
                paymentMethod: formPaymentMethod,
            };

            // --- DB OPERATIONS ---
            if (modalMode === 'create') {
                if (formPatientMode === 'new') {
                    const newP = await db.createPatient(user, { clinicId: clinic.id, name: formNewPatientName, email: '', phone: '', birthDate: '', gender: '', status: 'ATIVO' });
                    finalPatientId = newP.id;
                    finalPatientName = newP.name;
                } else {
                    const p = patients.find(p => p.id === formPatientId);
                    if (p) {
                        finalPatientId = p.id;
                        finalPatientName = p.name;
                    }
                }

                newAppointment = await db.createAppointment(user, {
                    ...commonData,
                    clinicId: clinic.id,
                    patientId: finalPatientId,
                    patientName: finalPatientName,
                });
            } else if (modalMode === 'edit' && editingAppointmentId) {
                newAppointment = await db.updateAppointment(user, editingAppointmentId, commonData);
                finalPatientId = newAppointment.patientId;
                finalPatientName = newAppointment.patientName;
            }

            // --- "TRANSACTIONAL" FINANCIAL INTEGRATION ---
            const amountVal = parseFloat(formPrice);
            if (!isNaN(amountVal) && amountVal > 0 && finalPatientId && newAppointment) {
                try {
                    await db.addTransaction(user, finalPatientId, {
                        date: startDateTime.toISOString(),
                        description: `Agendamento: ${formType} - ${finalPatientName}`,
                        amount: amountVal,
                        method: formPaymentMethod,
                        status: formFinancialStatus,
                        originalAmount: amountVal,
                        discountPercent: 0,
                        installmentCount: 1,
                        installments: '1x',
                    });
                } catch (financialError) {
                    // *** ROLLBACK LOGIC ***
                    console.error("Financial transaction failed, rolling back appointment creation...", financialError);
                    // Only attempt rollback for newly created appointments
                    if (modalMode === 'create' && newAppointment) {
                        await db.deleteAppointment(user, newAppointment.id);
                    }
                    throw new Error("Falha ao registrar a transação financeira. O agendamento foi revertido.");
                }
            }

            setIsModalOpen(false);
            setTimeout(() => fetchData(), 50);

        } catch (err) {
            alert("Erro ao salvar: " + err);
        }
    };

    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        setFormStartTime(newStart);
        if (newStart) {
            const [h, m] = newStart.split(':').map(Number);
            const d = new Date(); d.setHours(h, m + 30);
            setFormEndTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
    };

    // FIX: Robust Delete Handler - ISOLATED from Form
    const handleDelete = async () => {
        if (!editingAppointmentId) return;

        if (confirm('Tem certeza que deseja excluir este agendamento?')) {
            const idToDelete = editingAppointmentId;
            try {
                // 1. Otimista
                setAppointments(prev => prev.filter(a => a.id !== idToDelete));
                setIsModalOpen(false);
                setEditingAppointmentId(null);

                // 2. Persiste
                await db.deleteAppointment(user, idToDelete);

                // 3. Sincronia
                setTimeout(() => fetchData(), 100);
            } catch (err) {
                alert("Erro ao excluir: " + err);
                fetchData();
            }
        }
    };

    const visibleProfessionals = getVisibleProfessionals();
    const filteredAppointments = appointments.filter(a => {
        if (selectedProfIds.includes('all')) return true;
        return selectedProfIds.includes(a.professionalId);
    });

    if (loading && !appointments) return <div className="p-8 text-center text-slate-500">Carregando...</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] space-y-4">
            {/* HEADER */}
            <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} p-4 rounded-xl shadow-sm border flex flex-col lg:flex-row justify-between items-center gap-4 z-50 relative`}>
                <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-start">
                    <div className={`flex ${isManagerMode ? 'bg-gray-700' : 'bg-emerald-50'} rounded-lg p-1`}>
                        <button onClick={() => handleNav('prev')} className={`p-1 rounded-md shadow-sm transition-all ${isManagerMode ? 'hover:bg-gray-600' : 'hover:bg-emerald-100'}`}>
                            <svg className={`w-5 h-5 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={() => handleNav('next')} className={`p-1 rounded-md shadow-sm transition-all ${isManagerMode ? 'hover:bg-gray-600' : 'hover:bg-emerald-100'}`}>
                            <svg className={`w-5 h-5 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                    <div className="relative group">
                        <div className="flex items-center gap-2 cursor-pointer">
                            <h2 className={`text-xl font-bold capitalize min-w-[150px] text-center ${isManagerMode ? 'text-white' : 'text-slate-800'}`}>{getNavLabel()}</h2>
                            <Icons.Calendar />
                        </div>
                        <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleDateChange} />
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto z-50">
                    <div className={`flex ${isManagerMode ? 'bg-gray-700' : 'bg-emerald-50'} p-1 rounded-lg`}>
                        {(['DAY', 'WEEK', 'MONTH', 'YEAR', 'TEAM'] as ViewMode[])
                            .filter(mode => mode !== 'TEAM' || !isProfessionalUser || isManagerMode)
                            .map(mode => (
                                <button key={mode} onClick={() => setViewMode(mode)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all 
                        ${viewMode === mode
                                            ? (isManagerMode ? 'bg-indigo-700 shadow text-white' : 'bg-white shadow text-emerald-600')
                                            : (isManagerMode ? 'text-gray-300 hover:text-white hover:bg-gray-600' : 'text-emerald-700 hover:text-emerald-900')}
                        `}
                                >
                                    {mode === 'DAY' ? 'Dia' : mode === 'WEEK' ? 'Semana' : mode === 'MONTH' ? 'Mês' : mode === 'YEAR' ? 'Ano' : 'Equipe'}
                                </button>
                            ))}
                    </div>
                    {(!isProfessionalUser || isManagerMode) && (
                        <div className="relative" ref={filterRef}>
                            <button onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`flex items-center justify-between w-full sm:w-48 border px-3 py-2 rounded-lg shadow-sm text-sm transition-colors 
                    ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 focus:ring-indigo-500' : 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50 focus:ring-emerald-500'}`}
                            >
                                <span className="truncate">{selectedProfIds.includes('all') ? 'Todos Profissionais' : `${selectedProfIds.length} selecionado(s)`}</span>
                                <svg className={`w-4 h-4 ml-2 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {isFilterOpen && (
                                <div className={`absolute right-0 mt-2 w-64 rounded-xl shadow-xl border z-[60] overflow-hidden animate-fadeIn ${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-200'}`}>
                                    <div className={`p-2 border-b ${isManagerMode ? 'border-gray-700' : 'border-emerald-100'}`}>
                                        <label className={`flex items-center p-2 rounded cursor-pointer ${isManagerMode ? 'hover:bg-gray-700' : 'hover:bg-emerald-50'}`}>
                                            <input type="checkbox" checked={selectedProfIds.includes('all')} onChange={() => handleToggleProf('all')}
                                                className={`rounded h-4 w-4 border-gray-300 ${isManagerMode ? 'text-indigo-600 focus:ring-indigo-500 bg-gray-600' : 'text-emerald-600 focus:ring-emerald-500'}`} />
                                            <span className={`ml-2 text-sm font-bold ${isManagerMode ? 'text-white' : 'text-emerald-700'}`}>Todos Profissionais</span>
                                        </label>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
                                        {professionals.map(p => (
                                            <label key={p.id} className={`flex items-center p-2 rounded cursor-pointer ${isManagerMode ? 'hover:bg-gray-700' : 'hover:bg-emerald-50'}`}>
                                                <input type="checkbox" checked={selectedProfIds.includes(p.id) && !selectedProfIds.includes('all')} onChange={() => handleToggleProf(p.id)}
                                                    className={`rounded h-4 w-4 border-gray-300 ${isManagerMode ? 'text-indigo-600 focus:ring-indigo-500 bg-gray-600' : 'text-emerald-600 focus:ring-emerald-500'}`} />
                                                <div className={`w-2 h-2 rounded-full mx-2 ${p.color}`}></div>
                                                <span className={`text-sm truncate ${isManagerMode ? 'text-gray-300' : 'text-slate-700'}`}>{p.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <button onClick={() => handleOpenCreate()}
                        className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-bold shadow transition-transform duration-200 active:scale-95 flex items-center justify-center gap-2 
                ${isManagerMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                    >
                        <span>+</span> Novo
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} flex-1 shadow-sm rounded-xl overflow-hidden flex flex-col relative z-0`}>
                {(viewMode === 'DAY' || viewMode === 'TEAM') && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative">
                        <div className={`flex border-b ${isManagerMode ? 'border-gray-700' : 'border-slate-200'} sticky top-0 ${isManagerMode ? 'bg-gray-800' : 'bg-white'} z-30 shadow-sm`}>
                            <div className={`w-16 flex-shrink-0 ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-emerald-50 border-emerald-200'} border-r`}></div>
                            {viewMode === 'TEAM' || visibleProfessionals.length > 1 ? (
                                visibleProfessionals.map(prof => (
                                    <div key={prof.id} className={`flex-1 min-w-[160px] p-3 text-center border-r ${isManagerMode ? 'border-gray-700' : 'border-emerald-100'} flex flex-col items-center`}>
                                        <div className={`w-8 h-8 rounded-full ${prof.color} flex items-center justify-center text-xs font-bold mb-1 shadow text-gray-700 border border-black/5`}>{prof.name.charAt(0)}</div>
                                        <span className={`text-sm font-bold truncate w-full ${isManagerMode ? 'text-white' : 'text-emerald-800'}`}>{prof.name}</span>
                                    </div>
                                ))
                            ) : (
                                <div className={`flex-1 p-3 text-center ${isManagerMode ? 'bg-gray-700' : 'bg-emerald-50/50'}`}>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className={`font-bold uppercase tracking-wider text-sm ${isManagerMode ? 'text-white' : 'text-emerald-800'}`}>Agenda do Dia</span>
                                        <span className={`text-xs ${isManagerMode ? 'text-gray-500' : 'text-emerald-600'}`}>|</span>
                                        <span className={`text-sm ${isManagerMode ? 'text-gray-300' : 'text-slate-700'}`}>{selectedProfIds.includes('all') ? 'Todos' : visibleProfessionals[0]?.name}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            {currentTimePercentage !== null && (
                                <div className="absolute left-0 right-0 z-40 flex items-center pointer-events-none" style={{ top: `${currentTimePercentage}%` }}>
                                    <div className={`w-16 text-right pr-2 text-xs font-bold text-red-600 bg-white bg-opacity-80 relative z-50 ${isManagerMode ? 'bg-gray-800 text-red-400' : ''}`}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    <div className="w-full h-[2px] bg-red-500 shadow-sm relative"><div className="absolute left-0 -mt-1 w-2 h-2 rounded-full bg-red-600"></div></div>
                                </div>
                            )}
                            {hours.map(hour => (
                                <div key={hour} className={`flex min-h-[100px] border-b ${isManagerMode ? 'border-gray-700' : 'border-slate-100'} group relative`}>
                                    <div className={`w-16 flex-shrink-0 py-2 pr-2 text-right text-xs font-bold text-slate-400 border-r ${isManagerMode ? 'border-gray-700 bg-gray-700' : 'border-emerald-200 bg-emerald-50'} sticky left-0 z-20`}>{hour}:00</div>
                                    <div className="absolute inset-0 border-b border-slate-50 border-dashed pointer-events-none z-0" style={{ top: '50%' }}></div>
                                    {viewMode === 'TEAM' || visibleProfessionals.length > 1 ? (
                                        visibleProfessionals.map(prof => {
                                            const slotAppts = filteredAppointments.filter(a => a.professionalId === prof.id && new Date(a.startTime).getHours() === hour);
                                            return (
                                                <div key={prof.id} className={`flex-1 min-w-[160px] border-r ${isManagerMode ? 'border-gray-700 hover:bg-gray-700' : 'border-emerald-100 hover:bg-emerald-50/50'} relative transition-colors`}>
                                                    <div onClick={() => handleOpenCreate(currentDate, hour, prof.id)} className="absolute inset-0 z-10 cursor-pointer opacity-0 hover:opacity-100 flex items-center justify-center">
                                                        <span className={`${isManagerMode ? 'bg-indigo-600' : 'bg-emerald-600'} text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm`}>+ Agendar</span>
                                                    </div>
                                                    {slotAppts.map(appt => <AppointmentCard key={appt.id} appt={appt} viewType="full" />)}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className={`flex-1 relative ${isManagerMode ? 'hover:bg-gray-700' : 'hover:bg-emerald-50/50'} transition-colors`}>
                                            <div onClick={() => handleOpenCreate(currentDate, hour)} className="absolute inset-0 z-10 cursor-pointer opacity-0 hover:opacity-100 flex items-center justify-center">
                                                <span className={`${isManagerMode ? 'bg-indigo-600' : 'bg-emerald-600'} text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm`}>+ Agendar</span>
                                            </div>
                                            {filteredAppointments.filter(a => new Date(a.startTime).getHours() === hour).map(appt => (<AppointmentCard key={appt.id} appt={appt} viewType="full" />))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {viewMode === 'WEEK' && (
                    <div className="flex-1 overflow-auto custom-scrollbar flex flex-col">
                        <div className={`flex border-b ${isManagerMode ? 'border-gray-700' : 'border-slate-200'} sticky top-0 ${isManagerMode ? 'bg-gray-800' : 'bg-white'} z-30`}>
                            <div className={`w-16 flex-shrink-0 border-r ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-emerald-50 border-emerald-200'}`}></div>
                            {Array.from({ length: 7 }).map((_, i) => {
                                const d = new Date(getDateRange().start);
                                d.setDate(d.getDate() + i);
                                const isToday = d.toDateString() === new Date().toDateString();
                                const isOpen = daysOpen.includes(d.getDay());
                                return (
                                    <div key={i} className={`flex-1 min-w-[140px] p-2 text-center border-r ${isManagerMode ? 'border-gray-700' : 'border-emerald-100'} ${isToday ? (isManagerMode ? 'bg-indigo-900' : 'bg-emerald-100') : (isManagerMode ? 'bg-gray-800' : 'bg-white')} ${!isOpen ? 'bg-gray-50 opacity-50' : ''}`}>
                                        <div className={`text-xs uppercase font-bold ${isToday ? (isManagerMode ? 'text-indigo-400' : 'text-emerald-700') : (isManagerMode ? 'text-gray-300' : 'text-emerald-600')}`}>{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                                        <div className={`text-xl font-bold ${isToday ? (isManagerMode ? 'text-white' : 'text-emerald-800') : (isManagerMode ? 'text-gray-100' : 'text-slate-900')}`}>{d.getDate()}</div>
                                    </div>
                                );
                            })}
                        </div>
                        {hours.map(hour => (
                            <div key={hour} className={`flex min-h-[80px] border-b ${isManagerMode ? 'border-gray-700' : 'border-slate-100'}`}>
                                <div className={`w-16 flex-shrink-0 py-2 pr-2 text-right text-xs font-bold text-slate-400 border-r ${isManagerMode ? 'bg-gray-700' : 'bg-emerald-50 border-emerald-200'} sticky left-0 z-20`}>{hour}:00</div>
                                {Array.from({ length: 7 }).map((_, i) => {
                                    const d = new Date(getDateRange().start);
                                    d.setDate(d.getDate() + i);
                                    const slotAppts = filteredAppointments.filter(a => {
                                        const aDate = new Date(a.startTime);
                                        return aDate.getDate() === d.getDate() && aDate.getMonth() === d.getMonth() && aDate.getHours() === hour;
                                    });
                                    return (
                                        <div key={i} className={`flex-1 min-w-[140px] border-r ${isManagerMode ? 'border-gray-700 hover:bg-gray-700' : 'border-emerald-100 hover:bg-emerald-50'} relative`}>
                                            <div onClick={() => handleOpenCreate(d, hour)} className="absolute inset-0 cursor-pointer z-10"></div>
                                            {slotAppts.map(appt => <AppointmentCard key={appt.id} appt={appt} viewType="full" />)}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
                {viewMode === 'MONTH' && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <div className={`grid grid-cols-7 border-b ${isManagerMode ? 'border-gray-700 bg-gray-800' : 'border-emerald-200 bg-emerald-50'}`}>
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                <div key={day} className={`py-2 text-center text-xs font-bold uppercase ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>{day}</div>
                            ))}
                        </div>
                        <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-6">
                            {(() => {
                                const days = [];
                                const startMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                                const startDayOfWeek = startMonth.getDay();
                                const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
                                for (let i = 0; i < startDayOfWeek; i++) {
                                    days.push(<div key={`pad-${i}`} className={`${isManagerMode ? 'bg-gray-700 border-gray-700' : 'bg-slate-50 border-slate-100'} border-r border-b`}></div>);
                                }
                                for (let i = 1; i <= daysInMonth; i++) {
                                    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
                                    const isToday = dayDate.toDateString() === new Date().toDateString();
                                    const dayAppts = filteredAppointments.filter(a => new Date(a.startTime).getDate() === i);
                                    days.push(
                                        <div key={i}
                                            className={`border-r border-b ${isManagerMode ? 'border-gray-700' : 'border-slate-100'} p-1 relative transition-colors flex flex-col group 
                                    ${isToday ? (isManagerMode ? 'bg-indigo-900/50' : 'bg-emerald-50/30') : (isManagerMode ? 'bg-gray-800' : 'bg-white')} 
                                    ${isManagerMode ? 'hover:bg-indigo-900' : 'hover:bg-emerald-50'}`}
                                            onClick={() => { setCurrentDate(dayDate); setViewMode('DAY'); }}
                                        >
                                            <span className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? (isManagerMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-emerald-600 text-white shadow-md') : (isManagerMode ? 'text-gray-200' : 'text-slate-700')}`}>{i}</span>
                                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                                                {dayAppts.slice(0, 4).map(appt => (<AppointmentCard key={appt.id} appt={appt} viewType="mini" />))}
                                                {dayAppts.length > 4 && (<div className={`text-[10px] text-center font-medium ${isManagerMode ? 'text-gray-400' : 'text-emerald-600'}`}>+ {dayAppts.length - 4} mais</div>)}
                                            </div>
                                        </div>
                                    );
                                }
                                return days;
                            })()}
                        </div>
                    </div>
                )}
                {viewMode === 'YEAR' && (
                    <div className={`flex-1 overflow-y-auto p-6 ${isManagerMode ? 'bg-gray-900' : 'bg-slate-50'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({ length: 12 }).map((_, mIdx) => {
                                const monthDate = new Date(currentDate.getFullYear(), mIdx, 1);
                                const daysInMonth = new Date(currentDate.getFullYear(), mIdx + 1, 0).getDate();
                                const monthAppts = filteredAppointments.filter(a => new Date(a.startTime).getMonth() === mIdx);
                                return (
                                    <div key={mIdx}
                                        className={`${isManagerMode ? 'bg-gray-800 border-gray-700 hover:shadow-lg' : 'bg-white border-slate-200 hover:shadow-md'} rounded-xl shadow-sm border p-4 transition-shadow cursor-pointer`}
                                        onClick={() => { setCurrentDate(monthDate); setViewMode('MONTH'); }}
                                    >
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className={`font-bold capitalize ${isManagerMode ? 'text-white' : 'text-slate-800'}`}>{monthDate.toLocaleDateString('pt-BR', { month: 'long' })}</h3>
                                            <span className={`text-xs px-2 py-1 rounded ${isManagerMode ? 'bg-gray-700 text-gray-300' : 'bg-emerald-100 text-emerald-700'}`}>{monthAppts.length} agend.</span>
                                        </div>
                                        <div className="grid grid-cols-7 gap-1">
                                            {Array.from({ length: daysInMonth }).map((_, dIdx) => {
                                                const count = monthAppts.filter(a => new Date(a.startTime).getDate() === dIdx + 1).length;
                                                let bgClass = isManagerMode ? 'bg-gray-700' : 'bg-gray-100';
                                                if (count > 0) bgClass = isManagerMode ? 'bg-indigo-700' : 'bg-emerald-200';
                                                if (count > 2) bgClass = isManagerMode ? 'bg-indigo-500' : 'bg-emerald-400';
                                                if (count > 5) bgClass = isManagerMode ? 'bg-indigo-300' : 'bg-emerald-600';
                                                return (<div key={dIdx} className={`h-2 w-2 rounded-full mx-auto ${bgClass}`} title={`${dIdx + 1}: ${count} agendamentos`}></div>)
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODAL (REVISED STYLE) --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className={`flex flex-col rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] ${isManagerMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-slate-900'}`}>
                        {/* Modal Header */}
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${isManagerMode ? 'border-gray-700' : 'border-slate-200'}`}>
                            <h2 className={`text-xl font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>{modalMode === 'create' ? 'Novo Agendamento' : 'Editar'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className={`${isManagerMode ? 'text-gray-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>✕</button>
                        </div>

                        {/* Modal Body */}
                        <form id="agendaForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {formError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Data</label>
                                    <input type="date" required
                                        className={`w-full border rounded p-2 text-sm focus:ring-2 focus:border-transparent ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-indigo-500' : 'bg-white border-slate-300 text-emerald-900 focus:ring-emerald-500'}`}
                                        value={formDate} onChange={e => { setFormDate(e.target.value); setFormError(null); }} onBlur={handleDateBlur} />
                                </div>
                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Horário</label>
                                    <div className="flex gap-2">
                                        <input type="time" required
                                            className={`w-full border rounded p-2 text-sm focus:ring-2 focus:border-transparent ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-indigo-500' : 'bg-white border-slate-300 text-emerald-900 focus:ring-emerald-500'}`}
                                            value={formStartTime} onChange={handleStartTimeChange} />
                                        <input type="time" required
                                            className={`w-full border rounded p-2 text-sm focus:ring-2 focus:border-transparent ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-indigo-500' : 'bg-white border-slate-300 text-emerald-900 focus:ring-emerald-500'}`}
                                            value={formEndTime} onChange={e => setFormEndTime(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className={`block text-xs font-bold uppercase mb-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Paciente</label>
                                {modalMode === 'create' && formPatientMode === 'search' && (
                                    <select required
                                        className={`w-full border rounded p-2 text-sm focus:ring-2 focus:border-transparent ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-indigo-500' : 'bg-white border-slate-300 text-emerald-900 focus:ring-emerald-500'}`}
                                        value={formPatientId} onChange={e => setFormPatientId(e.target.value)}>
                                        <option value="">Selecione um paciente existente</option>
                                        {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                )}
                                {modalMode === 'create' && formPatientMode === 'new' && (
                                    <input type="text" placeholder="Nome do Novo Paciente"
                                        className={`w-full border rounded p-2 text-sm focus:ring-2 focus:border-transparent ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-indigo-500' : 'bg-white border-slate-300 text-emerald-900 focus:ring-emerald-500'}`}
                                        value={formNewPatientName} onChange={e => setFormNewPatientName(e.target.value)} />
                                )}
                                {modalMode === 'create' && (
                                    <div className={`flex gap-4 text-xs mt-2 ${isManagerMode ? 'text-gray-400' : 'text-emerald-600'}`}>
                                        <button type="button" onClick={() => setFormPatientMode('search')} className={`hover:underline ${formPatientMode === 'search' ? 'font-bold' : ''}`}>Buscar Existente</button>
                                        <button type="button" onClick={() => setFormPatientMode('new')} className={`hover:underline ${formPatientMode === 'new' ? 'font-bold' : ''}`}>Novo Paciente</button>
                                    </div>
                                )}
                                {modalMode === 'edit' && (
                                    <p className={`p-2 rounded font-bold text-sm ${isManagerMode ? 'bg-gray-700 text-gray-200' : 'bg-emerald-50 text-emerald-800'}`}>{formNewPatientName}</p>
                                )}
                            </div>

                            <div>
                                <label className={`block text-xs font-bold uppercase mb-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Profissional</label>
                                <select
                                    className={`w-full border rounded p-2 text-sm focus:ring-2 focus:border-transparent ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-indigo-500' : 'bg-white border-slate-300 text-emerald-900 focus:ring-emerald-500'}`}
                                    value={formProfessionalId} onChange={e => setFormProfessionalId(e.target.value)}>
                                    {professionals.map(p => <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Tipo de Consulta</label>
                                    <select
                                        className={`w-full border rounded p-2 text-sm focus:ring-2 focus:border-transparent ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-indigo-500' : 'bg-white border-slate-300 text-emerald-900 focus:ring-emerald-500'}`}
                                        value={formType} onChange={e => setFormType(e.target.value)}>
                                        <option value="ROTINA">Rotina</option>
                                        <option value="AVALIACAO">Avaliação</option>
                                        <option value="RETORNO">Retorno</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Status</label>
                                    <select
                                        className={`w-full border rounded p-2 text-sm focus:ring-2 focus:border-transparent ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-indigo-500' : 'bg-white border-slate-300 text-emerald-900 focus:ring-emerald-500'}`}
                                        value={formStatus} onChange={e => setFormStatus(e.target.value as AppointmentStatus)}>
                                        <option value={AppointmentStatus.SCHEDULED}>Agendado</option>
                                        <option value={AppointmentStatus.CONFIRMED}>Confirmado</option>
                                        <option value={AppointmentStatus.CANCELED}>Cancelado</option>
                                        <option value={AppointmentStatus.COMPLETED}>Realizado</option>
                                        <option value={AppointmentStatus.MISSED}>Faltou</option>
                                    </select>
                                </div>
                            </div>

                            <div className={`${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-emerald-50 border-emerald-200'} p-4 rounded-lg border`}>
                                <h4 className={`text-xs font-bold uppercase mb-3 flex items-center gap-2 ${isManagerMode ? 'text-gray-300' : 'text-emerald-800'}`}>
                                    💰 Dados Financeiros
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-xs font-bold mb-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Valor (R$)</label>
                                        <input
                                            type="number" min="0" step="0.01"
                                            className={`w-full border rounded p-1.5 text-sm font-bold focus:ring-2 focus:border-transparent ${isManagerMode ? 'bg-gray-600 border-gray-500 text-white focus:ring-indigo-500' : 'bg-white border-emerald-300 text-emerald-900 focus:ring-emerald-500'}`}
                                            placeholder="0,00" value={formPrice} onChange={e => setFormPrice(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold mb-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Status Pag.</label>
                                        <select
                                            className={`w-full border rounded p-1.5 text-sm font-medium focus:ring-2 focus:border-transparent ${isManagerMode ? 'bg-gray-600 border-gray-500 text-white focus:ring-indigo-500' : 'bg-white border-emerald-300 text-emerald-900 focus:ring-emerald-500'}`}
                                            value={formFinancialStatus} onChange={e => setFormFinancialStatus(e.target.value as FinancialStatus)}
                                        >
                                            <option value="PENDENTE">Pendente</option>
                                            <option value="PAGO">Pago</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className={`block text-xs font-bold mb-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Método Pag.</label>
                                        <select
                                            className={`w-full border rounded p-1.5 text-sm focus:ring-2 focus:border-transparent ${isManagerMode ? 'bg-gray-600 border-gray-500 text-white focus:ring-indigo-500' : 'bg-white border-emerald-300 text-emerald-900 focus:ring-emerald-500'}`}
                                            value={formPaymentMethod} onChange={e => setFormPaymentMethod(e.target.value as PaymentMethod)}
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
                        </form>

                        {/* Modal Footer */}
                        <div className={`flex justify-between items-center px-6 py-4 border-t ${isManagerMode ? 'border-gray-700' : 'border-slate-100'}`}>
                            {modalMode === 'edit' && editingAppointmentId && (
                                <button type="button" onClick={handleDelete}
                                    className={`text-sm font-bold flex items-center gap-1 px-3 py-1.5 rounded transition-colors ${isManagerMode ? 'text-red-400 hover:text-red-200 hover:bg-red-900/50' : 'text-red-600 hover:text-red-800 hover:bg-red-50'}`}
                                >
                                    Excluir
                                </button>
                            )}
                            <div className="flex-1"></div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className={`px-5 py-2.5 border rounded-lg text-sm font-bold shadow-sm transition-colors ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>Cancelar</button>
                                <button type="submit" form="agendaForm"
                                    className={`px-6 py-2.5 text-white rounded-lg text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 ${isManagerMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Salvar Agendamento</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Fix: Change to named export to resolve 'Module has no default export' in App.tsx
export { Agenda };
