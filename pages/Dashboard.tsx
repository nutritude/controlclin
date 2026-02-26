
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Clinic, Appointment, Role, Patient } from '../types';
import { db } from '../services/db';
import { Icons } from '../constants';

interface DashboardProps {
  user: User;
  clinic: Clinic;
  isManagerMode: boolean;
}
import { WhatsAppService } from '../services/whatsappService';

// --- SUB-COMPONENT: MANAGER DASHBOARD ---

const ManagerDashboard = ({ stats, aiInsights, nextAppointments, navigate, isManagerMode }: any) => {

  interface ProgressBarProps {
    value: number;
    label: string;
    color: string;
    isManagerMode: boolean;
  }

  const ProgressBar: React.FC<ProgressBarProps> = ({ value, label, color, isManagerMode }) => (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className={`font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-800'}`}>{label}</span>
        <span className={`${isManagerMode ? 'text-gray-400' : 'text-emerald-600'}`}>{value} pac.</span>
      </div>
      <div className={`w-full rounded-full h-2.5 ${isManagerMode ? 'bg-gray-700/50' : 'bg-emerald-100/50'} border border-gray-200/10`}>
        <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${color.includes('bg-') ? color : `bg-${color}-500`}`} style={{ width: `${Math.min(value * 10, 100)}%` }}></div>
      </div>
    </div>
  );

  return (
    <>
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Financeiro */}
        <div className="bg-gray-800 border-gray-700 rounded-xl shadow-sm border p-6 flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-gray-400">Receita Total (LTV)</p>
            <h3 className="text-3xl font-bold mt-2 text-white">R$ {stats.revenue.toLocaleString('pt-BR')}</h3>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-300 bg-green-900/50 border border-green-700 px-2 py-0.5 rounded-md font-medium">Ticket Médio: R$ {stats.ticketMedio.toFixed(0)}</span>
          </div>
        </div>

        {/* Pacientes */}
        <div className="bg-gray-800 border-gray-700 rounded-xl shadow-sm border p-6 flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-gray-400">Base de Pacientes</p>
            <h3 className="text-3xl font-bold mt-2 text-white">{stats.activePatients} <span className="text-base font-normal text-gray-400">ativos</span></h3>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Total de agendamentos: {stats.appointmentsCount}
          </div>
        </div>

        {/* Operacional */}
        <div className="bg-gray-800 border-gray-700 rounded-xl shadow-sm border p-6 flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-gray-400">Taxa de Faltas</p>
            <h3 className={`text-3xl font-bold mt-2 ${stats.noShowRate > 15 ? 'text-red-500' : 'text-green-400'}`}>
              {stats.noShowRate}%
            </h3>
          </div>
          <div className="mt-4 text-xs text-gray-400">
            Índice de absenteísmo global
          </div>
        </div>

        {/* Demográfico Rápido */}
        <div className="bg-gray-800 border-gray-700 rounded-xl shadow-sm border p-6">
          <p className="text-sm font-medium uppercase tracking-wider mb-3 text-gray-400">Perfil de Gênero</p>
          <div className="flex items-center gap-4">
            <div className="flex-1 text-center p-2 rounded bg-gray-700">
              <span className="block text-xl font-bold text-blue-400">{stats.genderDistribution.Masculino}</span>
              <span className="text-xs text-gray-400">Homens</span>
            </div>
            <div className="flex-1 text-center p-2 rounded bg-gray-700">
              <span className="block text-xl font-bold text-pink-400">{stats.genderDistribution.Feminino}</span>
              <span className="text-xs text-gray-400">Mulheres</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS & LISTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Pathologies (Epidemiologia) */}
        <div className="bg-gray-800 border-gray-700 shadow-sm rounded-xl border p-6 lg:col-span-2">
          <h3 className="text-lg font-bold mb-6 text-white">Top Patologias (Perfil Epidemiológico)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              {stats.topPathologies.map((p: any, idx: number) => (
                <ProgressBar
                  key={idx}
                  label={p.name}
                  value={p.count}
                  color={['bg-red-500', 'bg-orange-500', 'bg-blue-500'][idx % 3]}
                  isManagerMode={isManagerMode}
                />
              ))}
              {stats.topPathologies.length === 0 && <p className="text-sm text-gray-400">Dados insuficientes.</p>}
            </div>

            {/* AI INSIGHTS BOX */}
            <div className="bg-indigo-900/80 border-indigo-700 text-gray-100 rounded-lg p-5 text-sm flex flex-col justify-between border">
              <div>
                <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-wide text-xs text-purple-400">
                  <Icons.Brain /> IA Manager
                </div>
                <h4 className="font-bold mb-2 text-white">Insight Clínico:</h4>
                <p className="italic">"{aiInsights?.insight || 'Analisando dados...'}"</p>
              </div>
              <div className="mt-4 pt-4 border-t border-indigo-700">
                <span className="block font-bold mb-1 text-white">Ação Sugerida:</span>
                <p className="text-purple-300 font-medium">{aiInsights?.action || 'Aguarde...'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Appointments (Operational View) */}
        <div className="bg-gray-800 border-gray-700 shadow-sm rounded-xl border p-6 flex flex-col h-full">
          <h3 className="text-lg font-bold mb-4 text-white">Agenda Imediata</h3>
          <div className="space-y-4 flex-1">
            {nextAppointments.length === 0 ? (
              <p className="text-center py-4 text-gray-400">Agenda livre nos próximos dias.</p>
            ) : (
              nextAppointments.map((app: Appointment) => (
                <div key={app.id} className="flex items-start gap-3 pb-3 border-b border-gray-700 last:border-0 last:pb-0">
                  <div className={`w-2 h-12 rounded-full ${app.status === 'CONFIRMADO' ? 'bg-emerald-500' : 'bg-gray-600'}`}></div>
                  <div>
                    <p className="font-bold text-white text-sm">{app.patientName}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(app.startTime).toLocaleDateString()} às {new Date(app.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <span className="text-blue-300 bg-blue-900/50 px-1.5 rounded mt-1 inline-block text-xs font-medium uppercase tracking-tight">{app.type}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => navigate('/agenda')}
            className="w-full mt-4 text-sm text-center py-2 rounded-lg font-medium transition-colors duration-200 bg-gray-700 text-gray-300 hover:bg-gray-600 active:scale-95"
          >
            Ver agenda completa
          </button>
        </div>
      </div>
    </>
  );
};

// --- SUB-COMPONENT: SMART OUTREACH (WHATSAPP) ---
const SmartOutreach = ({ patients, nextAppointments, clinic, user, navigate }: any) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    const list: any[] = [];
    const today = new Date();

    // 1. Appointments for Tomorrow to Confirm
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const toConfirm = nextAppointments.filter((a: Appointment) =>
      new Date(a.startTime).toDateString() === tomorrow.toDateString() && a.status === 'AGENDADO'
    );

    toConfirm.forEach((a: Appointment) => {
      const p = patients.find((pt: any) => pt.id === a.patientId);
      if (p && p.phone) {
        list.push({
          id: `confirm-${a.id}`,
          patientName: a.patientName,
          patientId: a.patientId,
          phone: p.phone,
          type: 'AGENDA',
          icon: '📅',
          title: 'Confirmar Consulta (Amanhã)',
          message: WhatsAppService.getAppointmentReminder(
            a.patientName,
            new Date(a.startTime).toLocaleDateString(),
            new Date(a.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            clinic.name
          )
        });
      }
    });

    // 2. Review Exams (New Insight)
    const examNeeds = patients.filter((p: any) =>
      p.clinicalSummary?.alerts?.some((al: any) => al.message.toLowerCase().includes('exame'))
    );

    examNeeds.forEach((p: any) => {
      list.push({
        id: `exam-${p.id}`,
        patientName: p.name,
        patientId: p.id,
        phone: p.phone,
        type: 'EXAM',
        icon: '🧪',
        title: 'Lembrete de Exames',
        message: WhatsAppService.getExamReminder(p.name, clinic.name)
      });
    });

    // 3. Patients with recent Anthro but no outreach recorded recently
    const recentAnthro = patients.filter((p: any) => {
      if (!p.anthropometryHistory || p.anthropometryHistory.length < 2) return false;
      const last = p.anthropometryHistory[p.anthropometryHistory.length - 1];
      const lastDate = new Date(last.date);
      const diffDays = Math.ceil((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      return diffDays <= 7;
    });

    recentAnthro.forEach((p: any) => {
      const last = p.anthropometryHistory[p.anthropometryHistory.length - 1];
      const prev = p.anthropometryHistory[p.anthropometryHistory.length - 2];
      const weightDiff = last.weight - prev.weight;
      const leanDiff = (last.leanMass || 0) - (prev.leanMass || 0);

      list.push({
        id: `insight-${p.id}`,
        patientName: p.name,
        patientId: p.id,
        phone: p.phone,
        type: 'INSIGHT',
        icon: '📈',
        title: 'Parabenizar/Ajustar Evolução',
        message: WhatsAppService.getPostAnthroInsight(p.name, weightDiff, leanDiff)
      });
    });

    // 4. Patients without return for > 30 days
    const inactive = patients.filter((p: any) => {
      const lastVisit = p.anthropometryHistory?.length ? new Date(p.anthropometryHistory[p.anthropometryHistory.length - 1].date) : new Date(today);
      const diffDays = Math.ceil((today.getTime() - lastVisit.getTime()) / (1000 * 3600 * 24));
      return diffDays > 30 && p.status === 'ATIVO';
    });

    inactive.slice(0, 3).forEach((p: any) => {
      const lastVisit = p.anthropometryHistory?.length ? new Date(p.anthropometryHistory[p.anthropometryHistory.length - 1].date) : new Date(today);
      const diffDays = Math.ceil((today.getTime() - lastVisit.getTime()) / (1000 * 3600 * 24));
      list.push({
        id: `recovery-${p.id}`,
        patientName: p.name,
        patientId: p.id,
        phone: p.phone,
        type: 'RECOVERY',
        icon: '♻️',
        title: 'Reativar Paciente Inativo',
        message: WhatsAppService.getRecoveryMessage(p.name, diffDays)
      });
    });

    setSuggestions(list.slice(0, 5));
  }, [patients, nextAppointments, clinic.name]);

  const handleOutreach = async (s: any) => {
    try {
      window.open(WhatsAppService.generateLink(s.phone, s.message), '_blank');

      // Log event in timeline
      await db.addTimelineEvent(user, s.patientId, {
        date: new Date().toISOString(),
        type: 'OUTRO',
        title: `Outreach: ${s.title}`,
        description: `Mensagem enviada via Smart Outreach Dashboard. Tipo: ${s.type}`
      });

      // Optionally remove from list after send
      setSuggestions(prev => prev.filter(item => item.id !== s.id));
    } catch (error) {
      console.error("Error logging outreach:", error);
    }
  };

  if (suggestions.length === 0) return null;

  const typeConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
    AGENDA: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Consulta Amanhã' },
    EXAM: { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Exames Pendentes' },
    INSIGHT: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Insight de Evolução' },
    RECOVERY: { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Reconectar Paciente' },
  };

  return (
    <div className="bg-white border-blue-100 shadow-sm rounded-xl border p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
          <span className="text-xl">💡</span> Smart Outreach
        </h3>
        <span className="bg-blue-600 text-white text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider shadow-sm">
          {suggestions.length} ações
        </span>
      </div>

      <div className="space-y-3 flex-1">
        {suggestions.map((s) => {
          const cfg = typeConfig[s.type] || typeConfig.AGENDA;
          // Preview da mensagem (primeiras 80 chars)
          const preview = s.message.length > 90 ? s.message.replace(/\n/g, ' ').substring(0, 90) + '...' : s.message.replace(/\n/g, ' ');
          return (
            <div key={s.id} className={`p-3.5 border rounded-xl group transition-all hover:shadow-md ${cfg.bg} ${cfg.border}`}>
              {/* Header da sugestão */}
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                  {s.icon} {cfg.label}
                </span>
              </div>
              {/* Nome do paciente */}
              <p className="font-black text-sm text-slate-800 mb-1">{s.patientName}</p>
              {/* Preview da mensagem */}
              <p className={`text-[11px] leading-relaxed mb-3 ${cfg.color} opacity-80 italic`}>
                "{preview}"
              </p>
              {/* Botão de ação */}
              <button
                onClick={() => handleOutreach(s)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all active:scale-95 shadow-sm"
              >
                <span>💬</span> Enviar via WhatsApp
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-blue-50">
        <p className="text-[10px] text-slate-400 text-center uppercase font-bold tracking-widest">
          ✨ Insights gerados por ControlClin AI
        </p>
      </div>
    </div>
  );
};


// --- SUB-COMPONENT: PROFESSIONAL DASHBOARD ---

const ProfessionalDashboard = ({ user, nextAppointments, navigate, isManagerMode, patients, clinic }: any) => {
  const todayAppointments = nextAppointments.filter((a: Appointment) => new Date(a.startTime).toDateString() === new Date().toDateString());

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Column 1: KPIs & Outreach */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border-emerald-200 rounded-xl shadow-sm border p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Consultas Hoje</p>
              <h3 className="text-4xl font-bold mt-2 text-emerald-900">{todayAppointments.length}</h3>
            </div>
            <div className="bg-white border-emerald-200 rounded-xl shadow-sm border p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Total de Pacientes</p>
              <h3 className="text-4xl font-bold mt-2 text-emerald-900">{patients.length}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Clinical Monitoring & Alerts */}
            <div className="bg-white border-red-100 shadow-sm rounded-xl border p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-red-900 flex items-center gap-2">
                  <span className="text-xl">🚨</span> Alertas Críticos
                </h3>
              </div>
              <div className="space-y-3">
                {patients.filter((p: any) => p.clinicalSummary?.alerts && p.clinicalSummary.alerts.length > 0).length === 0 ? (
                  <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200 text-sm text-gray-500 italic">
                    Zero alertas pendentes.
                  </div>
                ) : (
                  patients.filter((p: any) => p.clinicalSummary?.alerts && p.clinicalSummary.alerts.length > 0).slice(0, 3).map((p: any) => (
                    <div key={p.id} onClick={() => navigate(`/patient/${p.id}`)} className="cursor-pointer p-3 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100/50 transition-all">
                      <span className="font-black text-red-900 text-xs block">{p.name}</span>
                      <p className="text-[11px] text-red-800 leading-tight mt-1">{p.clinicalSummary.alerts[0].message}</p>
                    </div>
                  ))
                )}
              </div>
              <button onClick={() => navigate('/alerts')} className="w-full mt-4 text-[10px] font-black uppercase text-red-700 hover:text-red-900">Ver todos os alertas →</button>
            </div>

            {/* Quick Actions (Compact) */}
            <div className="bg-white border-slate-200 shadow-sm rounded-xl border p-6">
              <h3 className="text-lg font-bold mb-4 text-emerald-900">Ações Rápidas</h3>
              <div className="space-y-4">
                <button onClick={() => navigate('/agenda')} className="w-full text-center py-3 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-95">
                  Ver Agenda
                </button>
                <button onClick={() => navigate('/patients')} className="w-full text-center py-3 rounded-lg bg-white border-2 border-emerald-100 text-emerald-800 font-bold hover:bg-emerald-50 active:scale-95">
                  Buscar Paciente
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Smart Outreach & Agenda */}
        <div className="space-y-8">
          <SmartOutreach patients={patients} nextAppointments={nextAppointments} clinic={clinic} user={user} navigate={navigate} />

          <div className="bg-white border-emerald-200 shadow-sm rounded-xl border p-6 flex flex-col">
            <h3 className="text-lg font-bold mb-4 text-emerald-900">Agenda Imediata</h3>
            <div className="space-y-4 flex-1">
              {nextAppointments.length === 0 ? (
                <p className="text-center py-4 text-emerald-600 italic text-sm">Sua agenda está livre.</p>
              ) : (
                nextAppointments.map((app: Appointment) => (
                  <div key={app.id} className="flex items-start gap-3 pb-3 border-b border-emerald-100 last:border-0 last:pb-0">
                    <div className={`w-2 h-12 rounded-full ${app.status === 'CONFIRMADO' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <div>
                      <p className="font-bold text-emerald-900 text-sm">{app.patientName}</p>
                      <p className="text-[10px] text-emerald-700">
                        {new Date(app.startTime).toLocaleDateString()} às {new Date(app.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 rounded mt-1 inline-block uppercase">{app.type}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};


// --- MAIN DASHBOARD COMPONENT ---

const Dashboard: React.FC<DashboardProps> = ({ user, clinic, isManagerMode }) => {
  const navigate = useNavigate();

  // States for data
  const [nextAppointments, setNextAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]); // For professional dashboard
  const [stats, setStats] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<{ insight: string, action: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const professionalId = user.role === Role.PROFESSIONAL ? user.professionalId : undefined;

      // Fetch data common to both or needed for specific roles
      const appts = await db.getUpcomingAppointments(clinic.id, 5, professionalId);
      setNextAppointments(appts);

      if (isManagerMode) {
        const s = await db.getAdvancedStats(clinic.id);
        setStats(s);
        const insights = await db.generateDashboardInsights(clinic.id, s);
        setAiInsights(insights);
      } else {
        const patientData = await db.getPatients(clinic.id, professionalId);
        setPatients(patientData);
      }

      setLoading(false);
    };
    fetchData();
  }, [clinic.id, user.professionalId, isManagerMode]);

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando painel...</div>;

  const title = isManagerMode ? "Visão Estratégica" : "Painel do Profissional";
  const subtitle = isManagerMode ? `${clinic.name} • Gestão Inteligente de Consultório` : `Bem-vindo(a), ${user.name}!`;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className={`text-3xl font-bold ${isManagerMode ? 'text-white' : 'text-slate-800'}`}>{title}</h1>
          <p className={`mt-1 ${isManagerMode ? 'text-gray-300' : 'text-slate-600'}`}>{subtitle}</p>
        </div>
        <div className="text-right">
          <span className="block text-xs text-gray-400 uppercase tracking-wider">Última atualização</span>
          <span className={`text-sm font-medium ${isManagerMode ? 'text-gray-200' : 'text-slate-700'}`}>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {isManagerMode ? (
        <ManagerDashboard
          stats={stats}
          aiInsights={aiInsights}
          nextAppointments={nextAppointments}
          navigate={navigate}
          isManagerMode={isManagerMode}
        />
      ) : (
        <ProfessionalDashboard
          user={user}
          nextAppointments={nextAppointments}
          navigate={navigate}
          isManagerMode={isManagerMode}
          patients={patients}
          clinic={clinic}
        />
      )}
    </div>
  );
};

export default Dashboard;
