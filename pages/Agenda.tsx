
import React, { useState, useEffect, useRef } from 'react';
import { User, Clinic, Professional, Appointment, AppointmentStatus, Patient, Role, FinancialStatus, PaymentMethod } from '../types';
import { db } from '../services/db';
import { Icons } from '../constants';
import { WhatsAppService } from '../services/whatsappService';
import { HolidaysService, Holiday } from '../services/holidaysService';

interface AgendaProps {
    user: User;
    clinic: Clinic;
    isManagerMode: boolean; // New prop
}

type ViewMode = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'TEAM';

const Agenda: React.FC<AgendaProps> = ({ user, clinic, isManagerMode }) => {
    const isAdmin = user.role === Role.CLINIC_ADMIN || user.role === Role.SUPER_ADMIN;
    // In manager mode, see ALL data; in professional mode, filter by professionalId
    const isProfessionalUser = !isManagerMode;

    // --- STATE ---
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);

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
            const profIdForPatients = isProfessionalUser ? user.professionalId : undefined;
            if (isProfessionalUser && !profIdForPatients) {
                console.warn('[Agenda] Prof session missing professionalId. Restricting patient list.');
                setPatients([]);
            } else {
                const pats = await db.getPatients(clinic.id, profIdForPatients, isManagerMode ? 'ADMIN' : 'PROFESSIONAL');
                setPatients(pats);
            }

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

    // --- EFFECT: HOLIDAYS FETCHING ---
    useEffect(() => {
        const loadHolidays = async () => {
            const year = currentDate.getFullYear();
            const hs = await HolidaysService.getHolidays(year);
            setHolidays(hs);
        };
        loadHolidays();
    }, [currentDate.getFullYear()]);

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
        const appts = await db.getAppointments(clinic.id, start, end, isProfessionalUser ? user.professionalId : undefined, isManagerMode ? 'ADMIN' : 'PROFESSIONAL');
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
                            <div className="flex flex-col gap-0.5">
                                <div className={`flex items-center gap-1 ${isCanceled ? 'text-gray-400' : ''}`}>
                                    {appt.type === 'AVALIACAO' ? <span className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm" title="Primeira Consulta">1ª CONS</span> : null}
                                    {appt.type === 'RETORNO' ? <span className="text-emerald-700 font-bold" title="Retorno">🔄</span> : null}
                                </div>
                                {!isCanceled && appt.financialStatus === 'PENDENTE' && <span className="text-[9px] text-rose-600 font-black px-1 bg-white border border-rose-200 rounded max-w-fit mt-0.5 shadow-sm">⚠️ $ PENDENTE</span>}
                                {!isCanceled && appt.financialStatus === 'PAGO' && <span className="text-[9px] text-emerald-600 font-black px-1 bg-white border border-emerald-200 rounded max-w-fit mt-0.5 shadow-sm">✅ $ PAGO</span>}
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

        const holyForDate = HolidaysService.getHolidayForDate(holidays, dateStr);
        if (holyForDate) {
            if (!window.confirm(`Atenção: A data ${dateStr.split('-').reverse().join('/')} é feriado (${holyForDate.name}). Tem certeza que deseja agendar?`)) {
                return;
            }
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
                    const newP = await db.createPatient(user, {
                        clinicId: clinic.id,
                        name: formNewPatientName,
                        email: '',
                        phone: '',
                        birthDate: '',
                        gender: '',
                        status: 'ATIVO',
                        professionalId: formProfessionalId // CRITICAL: Link patient to the professional
                    });
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
            <div className={`${isManagerMode ? 'bg-white border-blue-100' : 'bg-white border-slate-200'} p-4 rounded-xl shadow-sm border flex flex-col lg:flex-row justify-between items-center gap-4 z-50 relative`}>
                <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-start">
                    <div className={`flex ${isManagerMode ? 'bg-blue-50/50' : 'bg-emerald-50'} rounded-lg p-1 border border-blue-100/50`}>
                        <button onClick={() => handleNav('prev')} className={`p-1 rounded-md shadow-sm transition-all ${isManagerMode ? 'hover:bg-blue-100' : 'hover:bg-emerald-100'}`}>
                            <svg className={`w-5 h-5 ${isManagerMode ? 'text-blue-700' : 'text-emerald-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={() => handleNav('next')} className={`p-1 rounded-md shadow-sm transition-all ${isManagerMode ? 'hover:bg-blue-100' : 'hover:bg-emerald-100'}`}>
                            <svg className={`w-5 h-5 ${isManagerMode ? 'text-blue-700' : 'text-emerald-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                    <div className="relative group">
                        <div className="flex items-center gap-2 cursor-pointer">
                            <h2 className={`text-xl font-black uppercase tracking-tight min-w-[150px] text-center ${isManagerMode ? 'text-blue-900' : 'text-slate-800'} flex flex-col items-center`}>
                                <span>{getNavLabel()}</span>
                                {(() => {
                                    if (viewMode === 'DAY' || viewMode === 'TEAM') {
                                        const dateStr = currentDate.toISOString().split('T')[0];
                                        const hInfo = HolidaysService.getHolidayForDate(holidays, dateStr);
                                        if (hInfo) return <div className="text-[10px] bg-amber-100 text-amber-800 rounded-full px-3 py-0.5 mt-1 shadow-sm font-bold truncate max-w-xs leading-tight">🎉 Feriado: {hInfo.name}</div>;
                                    }
                                    return null;
                                })()}
                            </h2>
                            <Icons.Calendar />
                        </div>
                        <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleDateChange} />
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto z-50">
                    <div className={`flex ${isManagerMode ? 'bg-blue-50/50' : 'bg-emerald-50'} p-1 rounded-lg border border-blue-100/50`}>
                        {(['DAY', 'WEEK', 'MONTH', 'YEAR', 'TEAM'] as ViewMode[])
                            .filter(mode => mode !== 'TEAM' || !isProfessionalUser || isManagerMode)
                            .map(mode => (
                                <button key={mode} onClick={() => setViewMode(mode)}
                                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all
                        ${viewMode === mode
                                            ? (isManagerMode ? 'bg-blue-600 shadow-lg text-white' : 'bg-white shadow text-emerald-600')
                                            : (isManagerMode ? 'text-blue-400 hover:text-blue-600 hover:bg-blue-50' : 'text-emerald-700 hover:text-emerald-900')}
                        `}
                                >
                                    {mode === 'DAY' ? 'Dia' : mode === 'WEEK' ? 'Semana' : mode === 'MONTH' ? 'Mês' : mode === 'YEAR' ? 'Ano' : 'Equipe'}
                                </button>
                            ))}
                    </div>
                    {(!isProfessionalUser || isManagerMode) && (
                        <div className="relative" ref={filterRef}>
                            <button onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`flex items-center justify-between w-full sm:w-48 border px-3 py-2 rounded-lg shadow-sm text-xs font-black uppercase tracking-widest transition-colors
                    ${isManagerMode ? 'bg-white border-blue-200 text-blue-900 hover:bg-blue-50 focus:ring-blue-500' : 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50 focus:ring-emerald-500'}`}
                            >
                                <span className="truncate">{selectedProfIds.includes('all') ? 'Todos Profissionais' : `${selectedProfIds.length} selecionado(s)`}</span>
                                <svg className={`w-4 h-4 ml-2 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {isFilterOpen && (
                                <div className={`absolute right-0 mt-2 w-64 rounded-xl shadow-2xl border z-[60] overflow-hidden animate-fadeIn ${isManagerMode ? 'bg-white border-blue-100' : 'bg-white border-emerald-200'}`}>
                                    <div className={`p-2 border-b ${isManagerMode ? 'border-blue-50' : 'border-emerald-100'}`}>
                                        <label className={`flex items-center p-2 rounded cursor-pointer ${isManagerMode ? 'hover:bg-blue-50' : 'hover:bg-emerald-50'}`}>
                                            <input type="checkbox" checked={selectedProfIds.includes('all')} onChange={() => handleToggleProf('all')}
                                                className={`rounded h-4 w-4 border-gray-300 ${isManagerMode ? 'text-blue-600 focus:ring-blue-500 shadow-sm' : 'text-emerald-600 focus:ring-emerald-500'}`} />
                                            <span className={`ml-2 text-[10px] font-black uppercase tracking-widest ${isManagerMode ? 'text-blue-900' : 'text-emerald-700'}`}>Todos Profissionais</span>
                                        </label>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
                                        {professionals.map(p => (
                                            <label key={p.id} className={`flex items-center p-2 rounded cursor-pointer ${isManagerMode ? 'hover:bg-blue-50' : 'hover:bg-emerald-50'}`}>
                                                <input type="checkbox" checked={selectedProfIds.includes(p.id) && !selectedProfIds.includes('all')} onChange={() => handleToggleProf(p.id)}
                                                    className={`rounded h-4 w-4 border-gray-300 ${isManagerMode ? 'text-blue-600 focus:ring-blue-500 shadow-sm' : 'text-emerald-600 focus:ring-emerald-500'}`} />
                                                <div className={`w-2 h-2 rounded-full mx-2 ${p.color}`}></div>
                                                <span className={`text-[10px] font-black uppercase tracking-tight truncate ${isManagerMode ? 'text-slate-600' : 'text-slate-700'}`}>{p.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <button onClick={() => handleOpenCreate()}
                        className={`w-full sm:w-auto px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2
                ${isManagerMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                    >
                        <span>+</span> Novo Agendamento
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className={`${isManagerMode ? 'bg-white border-blue-100' : 'bg-white border-slate-200'} flex-1 shadow-sm rounded-xl overflow-hidden flex flex-col relative z-0`}>
                {(viewMode === 'DAY' || viewMode === 'TEAM') && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative">
                        <div className={`flex border-b ${isManagerMode ? 'border-blue-50' : 'border-slate-200'} sticky top-0 ${isManagerMode ? 'bg-white' : 'bg-white'} z-30 shadow-sm`}>
                            <div className={`w-16 flex-shrink-0 ${isManagerMode ? 'bg-blue-50/50 border-blue-100' : 'bg-emerald-50 border-emerald-200'} border-r`}></div>
                            {viewMode === 'TEAM' || visibleProfessionals.length > 1 ? (
                                visibleProfessionals.map(prof => (
                                    <div key={prof.id} className={`flex-1 min-w-[160px] p-3 text-center border-r ${isManagerMode ? 'border-blue-50' : 'border-emerald-100'} flex flex-col items-center`}>
                                        <div className={`w-8 h-8 rounded-full ${prof.color} flex items-center justify-center text-xs font-bold mb-1 shadow-md text-slate-800 border border-black/10`}>{prof.name.charAt(0)}</div>
                                        <span className={`text-[10px] font-black uppercase tracking-tight truncate w-full ${isManagerMode ? 'text-blue-900' : 'text-emerald-800'}`}>{prof.name}</span>
                                    </div>
                                ))
                            ) : (
                                <div className={`flex-1 p-3 text-center ${isManagerMode ? 'bg-blue-50/30' : 'bg-emerald-50/50'}`}>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className={`font-black uppercase tracking-wider text-xs ${isManagerMode ? 'text-blue-900' : 'text-emerald-800'}`}>Agenda do Dia</span>
                                        <span className={`text-xs ${isManagerMode ? 'text-blue-200' : 'text-emerald-600'}`}>|</span>
                                        <span className={`text-xs font-bold uppercase ${isManagerMode ? 'text-slate-600' : 'text-slate-700'}`}>{selectedProfIds.includes('all') ? 'Todos Profissionais' : visibleProfessionals[0]?.name}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            {currentTimePercentage !== null && (
                                <div className="absolute left-0 right-0 z-40 flex items-center pointer-events-none" style={{ top: `${currentTimePercentage}%` }}>
                                    <div className={`w-16 text-right pr-2 text-[10px] font-black tracking-widest text-rose-600 bg-white shadow-sm rounded-r relative z-50 ${isManagerMode ? 'text-rose-500' : ''}`}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    <div className="w-full h-[2px] bg-rose-500/50 shadow-sm relative"><div className="absolute left-0 -mt-1 w-2.5 h-2.5 rounded-full bg-rose-600 shadow-md"></div></div>
                                </div>
                            )}
                            {hours.map(hour => (
                                <div key={hour} className={`flex min-h-[100px] border-b ${isManagerMode ? 'border-blue-50' : 'border-slate-100'} group relative`}>
                                    <div className={`w-16 flex-shrink-0 py-2 pr-2 text-right text-[10px] font-black tracking-widest text-slate-400 border-r ${isManagerMode ? 'border-blue-100 bg-blue-50/50' : 'border-emerald-200 bg-emerald-50'} sticky left-0 z-20`}>{hour}:00</div>
                                    <div className="absolute inset-0 border-b border-blue-100/30 border-dashed pointer-events-none z-0" style={{ top: '50%' }}></div>
                                    {viewMode === 'TEAM' || visibleProfessionals.length > 1 ? (
                                        visibleProfessionals.map(prof => {
                                            const slotAppts = filteredAppointments.filter(a => a.professionalId === prof.id && new Date(a.startTime).getHours() === hour);
                                            return (
                                                <div key={prof.id} className={`flex-1 min-w-[160px] border-r ${isManagerMode ? 'border-blue-50 hover:bg-blue-50/20' : 'border-emerald-100 hover:bg-emerald-50/50'} relative transition-colors`}>
                                                    <div onClick={() => handleOpenCreate(currentDate, hour, prof.id)} className="absolute inset-0 z-10 cursor-pointer opacity-0 hover:opacity-100 flex items-center justify-center">
                                                        <span className={`${isManagerMode ? 'bg-blue-600' : 'bg-emerald-600'} text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg`}>+ Agendar</span>
                                                    </div>
                                                    {slotAppts.map(appt => <AppointmentCard key={appt.id} appt={appt} viewType="full" />)}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className={`flex-1 relative ${isManagerMode ? 'hover:bg-blue-50/20' : 'hover:bg-emerald-50/50'} transition-colors`}>
                                            <div onClick={() => handleOpenCreate(currentDate, hour)} className="absolute inset-0 z-10 cursor-pointer opacity-0 hover:opacity-100 flex items-center justify-center">
                                                <span className={`${isManagerMode ? 'bg-blue-600' : 'bg-emerald-600'} text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg`}>+ Agendar</span>
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
                        <div className={`flex border-b ${isManagerMode ? 'border-blue-50' : 'border-slate-200'} sticky top-0 ${isManagerMode ? 'bg-white' : 'bg-white'} z-30`}>
                            <div className={`w-16 flex-shrink-0 border-r ${isManagerMode ? 'bg-blue-50/50 border-blue-100' : 'bg-emerald-50 border-emerald-200'}`}></div>
                            {Array.from({ length: 7 }).map((_, i) => {
                                const d = new Date(getDateRange().start);
                                d.setDate(d.getDate() + i);
                                const isToday = d.toDateString() === new Date().toDateString();
                                const isOpen = daysOpen.includes(d.getDay());
                                return (
                                    <div key={i} className={`flex-1 min-w-[140px] p-2 text-center border-r ${isManagerMode ? 'border-blue-50' : 'border-emerald-100'} ${isToday ? (isManagerMode ? 'bg-blue-600/10' : 'bg-emerald-100') : (isManagerMode ? 'bg-white' : 'bg-white')} ${!isOpen ? 'bg-slate-50 opacity-50' : ''}`}>
                                        <div className={`text-[10px] uppercase font-black tracking-widest ${isToday ? (isManagerMode ? 'text-blue-700' : 'text-emerald-700') : (isManagerMode ? 'text-blue-400' : 'text-emerald-600')}`}>{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                                        <div className={`text-xl font-black ${isToday ? (isManagerMode ? 'text-blue-900' : 'text-emerald-800') : (isManagerMode ? 'text-slate-800' : 'text-slate-900')}`}>{d.getDate()}</div>
                                        {(() => {
                                            const hInfo = HolidaysService.getHolidayForDate(holidays, d.toISOString().split('T')[0]);
                                            return hInfo ? <div className="text-[8px] bg-amber-100/80 text-amber-800 uppercase px-1 rounded truncate mt-0.5 font-bold shadow-sm" title={hInfo.name}>🎉 {hInfo.name}</div> : null;
                                        })()}
                                    </div>
                                );
                            })}
                        </div>
                        {hours.map(hour => (
                            <div key={hour} className={`flex min-h-[80px] border-b ${isManagerMode ? 'border-blue-50' : 'border-slate-100'}`}>
                                <div className={`w-16 flex-shrink-0 py-2 pr-2 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-r ${isManagerMode ? 'bg-blue-50/50 border-blue-100' : 'bg-emerald-50 border-emerald-200'} sticky left-0 z-20`}>{hour}:00</div>
                                {Array.from({ length: 7 }).map((_, i) => {
                                    const d = new Date(getDateRange().start);
                                    d.setDate(d.getDate() + i);
                                    const slotAppts = filteredAppointments.filter(a => {
                                        const aDate = new Date(a.startTime);
                                        return aDate.getDate() === d.getDate() && aDate.getMonth() === d.getMonth() && aDate.getHours() === hour;
                                    });
                                    return (
                                        <div key={i} className={`flex-1 min-w-[140px] border-r ${isManagerMode ? 'border-blue-50 hover:bg-blue-50/10' : 'border-emerald-100 hover:bg-emerald-50'} relative`}>
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
                        <div className={`grid grid-cols-7 border-b ${isManagerMode ? 'border-blue-50 bg-blue-50/50' : 'border-emerald-200 bg-emerald-50'}`}>
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                <div key={day} className={`py-2 text-center text-[10px] font-black uppercase tracking-widest ${isManagerMode ? 'text-blue-800' : 'text-emerald-700'}`}>{day}</div>
                            ))}
                        </div>
                        <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-6">
                            {(() => {
                                const days = [];
                                const startMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                                const startDayOfWeek = startMonth.getDay();
                                const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
                                for (let i = 0; i < startDayOfWeek; i++) {
                                    days.push(<div key={`pad-${i}`} className={`${isManagerMode ? 'bg-blue-50/30 border-blue-50' : 'bg-slate-50 border-slate-100'} border-r border-b`}></div>);
                                }
                                for (let i = 1; i <= daysInMonth; i++) {
                                    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
                                    const isToday = dayDate.toDateString() === new Date().toDateString();
                                    const dayAppts = filteredAppointments.filter(a => new Date(a.startTime).getDate() === i);
                                    days.push(
                                        <div key={i}
                                            className={`border-r border-b ${isManagerMode ? 'border-blue-50' : 'border-slate-100'} p-1 relative transition-colors flex flex-col group
                                    ${isToday ? (isManagerMode ? 'bg-blue-50/50' : 'bg-emerald-50/30') : (isManagerMode ? 'bg-white' : 'bg-white')}
                                    ${isManagerMode ? 'hover:bg-blue-50/70' : 'hover:bg-emerald-50'}`}
                                            onClick={() => { setCurrentDate(dayDate); setViewMode('DAY'); }}
                                        >
                                            <div className="flex justify-between items-start w-full">
                                                {(() => {
                                                    const hInfo = HolidaysService.getHolidayForDate(holidays, dayDate.toISOString().split('T')[0]);
                                                    return hInfo ? <div className="text-[8px] max-w-[70%] bg-amber-100/80 text-amber-800 uppercase px-1 rounded truncate font-bold shadow-sm" title={hInfo.name}>🎉 {hInfo.name.split(' ')[0]}...</div> : <div></div>;
                                                })()}
                                                <div className={`text-sm font-black text-right ${isToday ? (isManagerMode ? 'text-blue-600' : 'text-emerald-600') : (isManagerMode ? 'text-slate-400' : 'text-slate-700')}`}>{i}</div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto mt-1 space-y-0.5 custom-scrollbar h-0 group">
                                                {dayAppts.map(appt => <AppointmentCard key={appt.id} appt={appt} viewType="mini" />)}
                                            </div>
                                            {dayAppts.length > 4 && (<div className={`text-[10px] text-center font-bold pb-1 ${isManagerMode ? 'text-blue-400' : 'text-emerald-600'}`}>+ {dayAppts.length - 4} mais</div>)}
                                        </div>
                                    );
                                }
                                return days;
                            })()}
                        </div>
                    </div>
                )}
                {viewMode === 'YEAR' && (
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {Array.from({ length: 12 }).map((_, monthIdx) => {
                                const mDate = new Date(currentDate.getFullYear(), monthIdx, 1);
                                const daysInM = new Date(currentDate.getFullYear(), monthIdx + 1, 0).getDate();
                                const firstD = mDate.getDay();
                                const mAppts = appointments.filter(a => new Date(a.startTime).getMonth() === monthIdx);

                                return (
                                    <div key={monthIdx} className={`${isManagerMode ? 'bg-white border-blue-50 shadow-sm' : 'bg-white border-slate-200'} rounded-lg border p-3 flex flex-col h-fit transition-transform hover:scale-[1.02]`}>
                                        <h4 className={`text-center font-black uppercase tracking-widest mb-3 ${isManagerMode ? 'text-blue-900' : 'text-emerald-800'}`}>{mDate.toLocaleDateString('pt-BR', { month: 'long' })}</h4>
                                        <div className="grid grid-cols-7 gap-1 flex-1">
                                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                                                <div key={d} className={`text-[9px] font-black text-center ${isManagerMode ? 'text-blue-300' : 'text-slate-400'}`}>{d}</div>
                                            ))}
                                            {Array.from({ length: firstD }).map((_, i) => <div key={`p-${i}`} className="h-6"></div>)}
                                            {Array.from({ length: daysInM }).map((_, i) => {
                                                const hasAppts = mAppts.some(a => new Date(a.startTime).getDate() === i + 1);
                                                return (
                                                    <div key={i} className={`h-6 flex items-center justify-center text-[10px] rounded transition-colors ${hasAppts ? (isManagerMode ? 'bg-blue-600 text-white font-bold shadow-sm' : 'bg-emerald-500 text-white font-bold shadow-sm') : (isManagerMode ? 'text-slate-600 hover:bg-blue-50' : 'text-slate-600 hover:bg-emerald-50')}`}>
                                                        {i + 1}
                                                    </div>
                                                );
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-900/20 backdrop-blur-md p-4 animate-fadeIn">
                    <div className={`flex flex-col rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] ${isManagerMode ? 'bg-white border border-blue-100 text-slate-800' : 'bg-white text-slate-900'}`}>
                        {/* Modal Header */}
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${isManagerMode ? 'bg-blue-50/50 border-blue-100' : 'border-slate-200'}`}>
                            <h2 className={`text-xl font-black uppercase tracking-tight ${isManagerMode ? 'text-blue-900' : 'text-emerald-900'}`}>{modalMode === 'create' ? 'Novo Agendamento' : 'Editar Agendamento'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className={`text-slate-400 hover:text-slate-600 transition-colors`}>✕</button>
                        </div>

                        {/* Modal Body */}
                        <form id="agendaForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-bold flex items-center gap-2">
                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {formError}
                                </div>
                            )}

                            {/* Patient Selection Row */}
                            <div className={`p-4 rounded-lg border ${isManagerMode ? 'bg-blue-50/30 border-blue-100' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${isManagerMode ? 'text-blue-700' : 'text-emerald-800'}`}>Paciente *</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormPatientMode(formPatientMode === 'search' ? 'new' : 'search')}
                                        className={`text-[10px] font-black uppercase tracking-widest underline ${isManagerMode ? 'text-blue-600' : 'text-emerald-600'}`}
                                    >
                                        {formPatientMode === 'search' ? '+ Novo Paciente' : 'Voltar para busca'}
                                    </button>
                                </div>

                                {formPatientMode === 'search' ? (
                                    <select
                                        required
                                        className={`w-full border rounded-lg p-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-slate-300'}`}
                                        value={formPatientId}
                                        onChange={(e) => setFormPatientId(e.target.value)}
                                        disabled={modalMode === 'edit'}
                                    >
                                        <option value="">Selecione um paciente...</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        required
                                        placeholder="Nome completo do novo paciente"
                                        className={`w-full border rounded-lg p-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-slate-300'}`}
                                        value={formNewPatientName}
                                        onChange={(e) => setFormNewPatientName(e.target.value)}
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isManagerMode ? 'text-blue-700' : 'text-emerald-800'}`}>Profissional Responsável *</label>
                                    <select
                                        required
                                        className={`w-full border rounded-lg p-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 ${isManagerMode ? 'bg-white border-blue-200 text-blue-900' : 'bg-white border-slate-300'}`}
                                        value={formProfessionalId}
                                        onChange={(e) => setFormProfessionalId(e.target.value)}
                                    >
                                        {professionals.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isManagerMode ? 'text-blue-700' : 'text-emerald-800'}`}>Data *</label>
                                    <input
                                        type="date"
                                        required
                                        className={`w-full border rounded-lg p-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-slate-300'}`}
                                        value={formDate}
                                        onChange={(e) => setFormDate(e.target.value)}
                                        onBlur={handleDateBlur}
                                    />
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isManagerMode ? 'text-blue-700' : 'text-emerald-800'}`}>Tipo de Consulta</label>
                                    <select
                                        className={`w-full border rounded-lg p-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 ${isManagerMode ? 'bg-white border-blue-200 text-blue-900' : 'bg-white border-slate-300'}`}
                                        value={formType}
                                        onChange={(e) => setFormType(e.target.value)}
                                    >
                                        <option value="ROTINA">Rotina / Primeira Vez</option>
                                        <option value="RETORNO">Retorno</option>
                                        <option value="PROCEDIMENTO">Procedimento</option>
                                        <option value="ONLINE">Online</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isManagerMode ? 'text-blue-700' : 'text-emerald-800'}`}>Início *</label>
                                    <input
                                        type="time"
                                        required
                                        className={`w-full border rounded-lg p-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-slate-300'}`}
                                        value={formStartTime}
                                        onChange={handleStartTimeChange}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isManagerMode ? 'text-blue-700' : 'text-emerald-800'}`}>Término *</label>
                                    <input
                                        type="time"
                                        required
                                        className={`w-full border rounded-lg p-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-slate-300'}`}
                                        value={formEndTime}
                                        onChange={(e) => setFormEndTime(e.target.value)}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isManagerMode ? 'text-blue-700' : 'text-emerald-800'}`}>Status do Agendamento</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                                        {[
                                            { id: AppointmentStatus.SCHEDULED, label: 'Agendado', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
                                            { id: AppointmentStatus.CONFIRMED, label: 'Confirmado', color: 'bg-green-100 text-green-800 border-green-200' },
                                            { id: AppointmentStatus.MISSED, label: 'Faltou', color: 'bg-red-100 text-red-800 border-red-200' },
                                            { id: AppointmentStatus.CANCELED, label: 'Cancelado', color: 'bg-gray-100 text-gray-800 border-gray-200' }
                                        ].map(status => (
                                            <button
                                                key={status.id}
                                                type="button"
                                                onClick={() => setFormStatus(status.id)}
                                                className={`py-2 px-1 text-[10px] font-black uppercase tracking-tighter rounded-md border transition-all ${formStatus === status.id ? `${status.color} shadow-md scale-105` : `${isManagerMode ? 'bg-white border-blue-100 text-blue-300 hover:bg-blue-50' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}`}
                                            >
                                                {status.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Financial Integration Section */}
                            <div className={`p-4 rounded-lg border ${isManagerMode ? 'bg-rose-50/20 border-rose-100' : 'bg-blue-50 border-blue-100'}`}>
                                <h3 className={`text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isManagerMode ? 'text-rose-600' : 'text-blue-700'}`}>
                                    <span className="text-sm">💰</span> Gestão Financeira Local
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isManagerMode ? 'text-rose-400' : 'text-blue-600'}`}>Valor (R$)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">R$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="0,00"
                                                className={`w-full border rounded-lg p-3 pl-10 text-sm font-bold shadow-sm focus:ring-2 focus:ring-rose-500 ${isManagerMode ? 'bg-white border-rose-100 text-slate-800' : 'bg-white border-blue-200'}`}
                                                value={formPrice}
                                                onChange={(e) => setFormPrice(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isManagerMode ? 'text-rose-400' : 'text-blue-600'}`}>Status</label>
                                        <select
                                            className={`w-full border rounded-lg p-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-rose-500 ${isManagerMode ? 'bg-white border-rose-100 text-rose-800' : 'bg-white border-blue-200'}`}
                                            value={formFinancialStatus}
                                            onChange={(e) => setFormFinancialStatus(e.target.value as FinancialStatus)}
                                        >
                                            <option value="PENDENTE">Pendente</option>
                                            <option value="PAGO">Pago</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Modal Footer */}
                        <div className={`px-6 py-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4 ${isManagerMode ? 'bg-blue-50/30 border-blue-100' : 'bg-slate-50 border-slate-200'}`}>
                            {modalMode === 'edit' ? (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="w-full sm:w-auto text-[10px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-800 underline transition-colors"
                                >
                                    Excluir Agendamento
                                </button>
                            ) : <div></div>}

                            <div className="flex gap-3 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest border transition-all ${isManagerMode ? 'bg-white border-blue-200 text-blue-900 hover:bg-blue-50' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    type="submit"
                                    className={`flex-1 sm:flex-none px-8 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 ${isManagerMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                >
                                    {modalMode === 'create' ? 'Agendar' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

// Fix: Change to named export to resolve 'Module has no default export' in App.tsx
export { Agenda };
