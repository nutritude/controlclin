
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Clinic, ClinicalAlert, AlertType, AlertSeverity, Role } from '../types'; // Import Role
import { db } from '../services/db';
import { Icons } from '../constants';

interface ClinicalAlertsProps {
    user: User;
    clinic: Clinic;
    isManagerMode: boolean;
}

const ClinicalAlerts: React.FC<ClinicalAlertsProps> = ({ user, clinic, isManagerMode }) => {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);

    // Filters
    const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'ALL'>('ALL');
    const [filterType, setFilterType] = useState<AlertType | 'ALL'>('ALL');

    // Modal State
    const [resolveModalOpen, setResolveModalOpen] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState<ClinicalAlert | null>(null);
    const [resolveNotes, setResolveNotes] = useState('');

    const ALERT_TYPES_LABELS: Record<AlertType, string> = {
        'RETURN_OVERDUE': 'Retorno Pendente',
        'EXAM_ATTENTION': 'Exame Crítico Sem Retorno',
        'RECURRING_ABSENCE': 'Absenteísmo Recorrente',
        'GOAL_EXPIRED': 'Meta Clínica Vencida',
        'MISSED_CRITICAL': 'Falta em Consulta Crítica',
        'ANTHROMETRY_OVERDUE': 'Avaliação Antropométrica Atrasada'
    };

    const SEVERITY_STYLES: Record<AlertSeverity, string> = {
        'HIGH': 'bg-red-600 text-white shadow-md border-red-700', // Sólido para High
        'MEDIUM': 'bg-orange-100 text-orange-800 border-orange-200',
        'LOW': 'bg-slate-100 text-slate-700 border-slate-200'
    };

    useEffect(() => {
        fetchAlerts();
    }, [clinic.id, user.professionalId, isManagerMode]); // Add professionalId and isManagerMode to dependencies

    const fetchAlerts = async () => {
        setLoading(true);
        // Filter alerts by professional ID if in professional mode
        const professionalIdFilter = user.role === Role.PROFESSIONAL ? user.professionalId : undefined;
        const data = await db.getClinicalAlerts(clinic.id, professionalIdFilter);
        setAlerts(data);
        setLoading(false);
    };

    const handleRunAnalysis = async () => {
        setAnalyzing(true);
        try {
            const count = await db.generateClinicalAlerts(clinic.id);
            if (count > 0) alert(`${count} novos alertas gerados.`);
            else alert("Análise concluída. Nenhum novo alerta encontrado.");
            fetchAlerts();
        } catch (err) {
            alert("Erro na análise: " + err);
        } finally {
            setAnalyzing(false);
        }
    };

    const openResolveModal = (alert: ClinicalAlert) => {
        setSelectedAlert(alert);
        setResolveNotes('');
        setResolveModalOpen(true);
    };

    const handleResolve = async () => {
        if (!selectedAlert) return;
        await db.resolveAlert(user, selectedAlert.id, resolveNotes);
        setResolveModalOpen(false);
        setSelectedAlert(null);
        fetchAlerts();
    };

    const handleWhatsAppAction = async (alertItem: ClinicalAlert) => {
        const patient = await db.getPatientById(alertItem.patientId);
        if (!patient || !patient.phone) {
            alert("Paciente não encontrado ou sem telefone cadastrado.");
            return;
        }

        let message = "";
        const firstName = patient.name.split(' ')[0];

        switch (alertItem.type) {
            case 'RETURN_OVERDUE':
                message =
                    `Oi ${firstName}! Tudo bem? 😊\n\n` +
                    `Percebi que faz um tempo desde a sua última consulta e queria saber como você está se sentindo com o plano alimentar.\n\n` +
                    `Acompanhar de perto faz toda a diferença nos resultados — e estou aqui para isso! 💚\n\n` +
                    `Vamos marcar um retorno? Me passa algumas datas que ficam boas para você e a gente encontra o melhor horário.`;
                break;
            case 'EXAM_ATTENTION':
                message =
                    `Oi ${firstName}! 🔬\n\n` +
                    `Os resultados dos seus exames ficaram disponíveis e tenho algumas informações importantes para compartilhar com você.\n\n` +
                    `Gostaria de agendar uma consulta rápida (pode ser online!) para revisarmos os resultados juntos e ajustarmos seu plano conforme necessário.\n\n` +
                    `Qual horário ficaria melhor para você esta semana?`;
                break;
            case 'ANTHROMETRY_OVERDUE':
                message =
                    `Oi ${firstName}! 📏\n\n` +
                    `Está na hora de fazermos sua nova avaliação antropométrica! Ela é fundamental para vermos os avanços do seu tratamento e fazer os ajustes certos no seu plano.\n\n` +
                    `Sem medir, fica difícil comemorar as conquistas! 🏆\n\n` +
                    `Quando você teria disponibilidade para dar um pulo aqui na clínica?`;
                break;
            case 'RECURRING_ABSENCE':
                message =
                    `Oi ${firstName}, tudo bem? 💙\n\n` +
                    `Notei algumas ausências nas últimas consultas e quero entender se está tudo bem com você ou se posso adaptar algo para facilitar sua rotina de acompanhamento.\n\n` +
                    `Às vezes um ajuste no horário ou na frequência já resolve! Me conta o que está acontecendo — estou aqui para ajudar. 😊`;
                break;
            case 'GOAL_EXPIRED':
                message =
                    `Oi ${firstName}! 🎯\n\n` +
                    `Vi que a meta que traçamos na sua última consulta está chegando ao prazo. Que tal fazermos uma avaliação rápida dos progressos?\n\n` +
                    `Independente do resultado, é hora de renovar os objetivos e dar o próximo passo da sua jornada!\n\n` +
                    `Quando você tem disponibilidade para conversarmos?`;
                break;
            case 'MISSED_CRITICAL':
                message =
                    `Oi ${firstName}, ficamos com saudade! 💙\n\n` +
                    `Notei que você não pôde comparecer à sua consulta. Espero que esteja tudo bem!\n\n` +
                    `Seria importante reagendarmos o quanto antes, pois essa consulta é uma etapa importante do seu tratamento.\n\n` +
                    `Me fala qual o melhor horário para você e encaixamos na agenda! 😊`;
                break;
            default:
                message =
                    `Oi ${firstName}, tudo bem? 😊\n\n` +
                    `Passando para saber como você está e como tem sido a adesão ao plano alimentar.\n\n` +
                    `Qualquer dúvida ou dificuldade, pode me chamar aqui — estou sempre disponível para te apoiar! 💪`;
        }

        const phone = patient.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');

        // Log the recovery attempt in patient history
        await db.addTimelineEvent(user, patient.id, {
            date: new Date().toISOString(),
            type: 'OUTRO',
            title: 'Contato de Recuperação (WhatsApp)',
            description: `Mensagem enviada via Alertas Clínicos: "${alertItem.description}"`
        });
    };


    const getDaysAgo = (dateStr: string) => {
        const diff = new Date().getTime() - new Date(dateStr).getTime();
        const days = Math.floor(diff / (1000 * 3600 * 24));
        if (days === 0) return 'Hoje';
        if (days === 1) return 'Ontem';
        return `há ${days} dias`;
    };

    // Filter Logic
    const filteredAlerts = alerts.filter(a => {
        if (filterSeverity !== 'ALL' && a.severity !== filterSeverity) return false;
        if (filterType !== 'ALL' && a.type !== filterType) return false;
        return true;
    });

    const stats = {
        high: alerts.filter(a => a.severity === 'HIGH').length,
        medium: alerts.filter(a => a.severity === 'MEDIUM').length,
        low: alerts.filter(a => a.severity === 'LOW').length
    };

    if (loading) return <div>Carregando alertas...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className={`text-2xl font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'} flex items-center gap-2`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        Monitoramento de Alertas Clínicos
                    </h1>
                    <p className={`mt-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Acompanhamento ativo de pendências e riscos dos pacientes.</p>
                </div>
                <button
                    onClick={handleRunAnalysis}
                    disabled={analyzing}
                    className={`px-4 py-2 rounded-md shadow font-bold text-white flex items-center gap-2 transition-colors ${analyzing ? 'bg-gray-400 cursor-not-allowed' : (isManagerMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700')}`}
                >
                    {analyzing ? (
                        <>Processando...</>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Executar Análise
                        </>
                    )}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-emerald-50 border-emerald-200'} p-6 rounded-xl shadow-sm border`}>
                    <p className={`text-xs font-bold uppercase tracking-wide ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Alertas de Alta Prioridade</p>
                    <p className={`text-3xl font-bold mt-2 ${isManagerMode ? 'text-red-400' : 'text-red-600'}`}>{stats.high}</p>
                </div>
                <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-emerald-50 border-emerald-200'} p-6 rounded-xl shadow-sm border`}>
                    <p className={`text-xs font-bold uppercase tracking-wide ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Média Prioridade</p>
                    <p className={`text-3xl font-bold mt-2 ${isManagerMode ? 'text-orange-400' : 'text-orange-600'}`}>{stats.medium}</p>
                </div>
                <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-emerald-50 border-emerald-200'} p-6 rounded-xl shadow-sm border`}>
                    <p className={`text-xs font-bold uppercase tracking-wide ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Baixa Prioridade</p>
                    <p className={`text-3xl font-bold mt-2 ${isManagerMode ? 'text-slate-400' : 'text-slate-600'}`}>{stats.low}</p>
                </div>
            </div>

            {/* Filter and List */}
            <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow overflow-hidden rounded-lg border`}>
                <div className={`px-6 py-4 border-b flex justify-between items-center ${isManagerMode ? 'bg-gray-700 border-gray-700' : 'bg-emerald-50 border-gray-200'}`}>
                    <h2 className={`text-lg font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>Alertas Ativos ({filteredAlerts.length})</h2>
                    <div className="flex gap-4">
                        <div>
                            <label htmlFor="filterSeverity" className={`block text-xs font-medium uppercase ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Prioridade</label>
                            <select
                                id="filterSeverity"
                                value={filterSeverity}
                                onChange={(e) => setFilterSeverity(e.target.value as AlertSeverity | 'ALL')}
                                className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md ${isManagerMode ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-emerald-900'}`}
                            >
                                <option value="ALL">Todas</option>
                                <option value="HIGH">Alta</option>
                                <option value="MEDIUM">Média</option>
                                <option value="LOW">Baixa</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="filterType" className={`block text-xs font-medium uppercase ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Tipo de Alerta</label>
                            <select
                                id="filterType"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as AlertType | 'ALL')}
                                className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md ${isManagerMode ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-emerald-900'}`}
                            >
                                <option value="ALL">Todos</option>
                                {Object.entries(ALERT_TYPES_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <ul className={`divide-y ${isManagerMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {filteredAlerts.length === 0 ? (
                        <li className={`p-6 text-center italic ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>Nenhum alerta ativo com os filtros selecionados.</li>
                    ) : (
                        filteredAlerts.map(alert => (
                            <li key={alert.id} className={`${isManagerMode ? 'hover:bg-gray-700' : 'hover:bg-emerald-50'} flex items-start justify-between p-6 transition-colors`}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${SEVERITY_STYLES[alert.severity]}`}>
                                            {alert.severity === 'HIGH' ? 'ALTA' : alert.severity === 'MEDIUM' ? 'MÉDIA' : 'BAIXA'}
                                        </span>
                                        <span className={`text-sm font-medium ${isManagerMode ? 'text-gray-200' : 'text-emerald-800'}`}>{ALERT_TYPES_LABELS[alert.type]}</span>
                                    </div>
                                    <p className={`text-base font-bold mb-1 ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>{alert.patientName}</p>
                                    <p className={`text-sm ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>{alert.description}</p>
                                    <p className={`text-xs mt-2 ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>Gerado: {getDaysAgo(alert.createdAt)} ({new Date(alert.createdAt).toLocaleDateString()})</p>
                                </div>
                                <div className="flex-shrink-0 ml-4 flex items-center gap-3">
                                    <Link
                                        to={`/patients/${alert.patientId}`}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${isManagerMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        Ver Paciente
                                    </Link>
                                    <button
                                        onClick={() => handleWhatsAppAction(alert)}
                                        className="px-3 py-1.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors flex items-center gap-1"
                                        title="Enviar WhatsApp"
                                    >
                                        <span className="text-lg">💬</span> WhatsApp
                                    </button>
                                    <button
                                        onClick={() => openResolveModal(alert)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${isManagerMode ? 'text-gray-300 hover:text-white hover:bg-gray-600 border-gray-600' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 border-gray-300'}`}
                                    >
                                        Resolver
                                    </button>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            {/* Resolve Alert Modal */}
            {resolveModalOpen && selectedAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                    <div className={`${isManagerMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg shadow-xl w-full max-w-md p-6 relative`}>
                        <h2 className={`text-xl font-bold mb-4 ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>Resolver Alerta Clínico</h2>

                        <div className={`p-4 rounded-md border mb-4 ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-emerald-50 border-emerald-200'}`}>
                            <p className={`text-sm font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>{selectedAlert.patientName}</p>
                            <p className={`text-sm ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>{selectedAlert.description}</p>
                        </div>

                        <div>
                            <label htmlFor="resolveNotes" className={`block text-sm font-medium mb-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Notas de Resolução (Opcional)</label>
                            <textarea
                                id="resolveNotes"
                                rows={3}
                                className={`w-full border rounded p-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-emerald-300 text-emerald-900'}`}
                                placeholder="Detalhes sobre como o alerta foi resolvido..."
                                value={resolveNotes}
                                onChange={e => setResolveNotes(e.target.value)}
                            />
                        </div>

                        <div className={`flex justify-end gap-2 pt-4 mt-4 border-t ${isManagerMode ? 'border-gray-700' : 'border-gray-100'}`}>
                            <button
                                type="button"
                                onClick={() => { setResolveModalOpen(false); setSelectedAlert(null); }}
                                className={`px-4 py-2 border rounded-md font-bold shadow-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleResolve}
                                className={`px-6 py-2 text-white rounded font-bold shadow-md ${isManagerMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            >
                                Confirmar Resolução
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Fix: Change to named export to resolve 'Module has no default export' in App.tsx
export { ClinicalAlerts };
