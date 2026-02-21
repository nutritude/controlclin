
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
                    <p className="font-bold text-white">{app.patientName}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(app.startTime).toLocaleDateString()} às {new Date(app.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <span className="text-blue-300 bg-blue-900/50 px-1.5 rounded mt-1 inline-block text-xs font-medium">{app.type}</span>
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


// --- SUB-COMPONENT: PROFESSIONAL DASHBOARD ---

const ProfessionalDashboard = ({ user, nextAppointments, navigate, isManagerMode, patients }: any) => {
  const todayAppointments = nextAppointments.filter((a: Appointment) => new Date(a.startTime).toDateString() === new Date().toDateString());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* Main column */}
      <div className="lg:col-span-2 space-y-8">
        {/* KPI Cards */}
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

        {/* Quick Actions */}
        <div className="bg-white border-slate-200 shadow-sm rounded-xl border p-6">
          <h3 className="text-lg font-bold mb-4 text-emerald-900">Ações Rápidas</h3>
          <div className="flex gap-4">
            <button onClick={() => navigate('/agenda')} className="flex-1 text-center py-4 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors duration-200 active:scale-95">
              Ver Agenda
            </button>
            <button onClick={() => navigate('/patients')} className="flex-1 text-center py-4 rounded-lg bg-emerald-100 text-emerald-800 font-bold hover:bg-emerald-200 transition-colors duration-200 active:scale-95">
              Buscar Paciente
            </button>
          </div>
        </div>
      </div>

      {/* Side column: Agenda Imediata */}
      <div className="bg-white border-emerald-200 shadow-sm rounded-xl border p-6 flex flex-col h-full">
        <h3 className="text-lg font-bold mb-4 text-emerald-900">Agenda Imediata</h3>
        <div className="space-y-4 flex-1">
          {nextAppointments.length === 0 ? (
            <p className="text-center py-4 text-emerald-600">Sua agenda está livre.</p>
          ) : (
            nextAppointments.map((app: Appointment) => (
              <div key={app.id} className="flex items-start gap-3 pb-3 border-b border-emerald-100 last:border-0 last:pb-0">
                <div className={`w-2 h-12 rounded-full ${app.status === 'CONFIRMADO' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                <div>
                  <p className="font-bold text-emerald-900">{app.patientName}</p>
                  <p className="text-xs text-emerald-700">
                    {new Date(app.startTime).toLocaleDateString()} às {new Date(app.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <span className="text-emerald-700 bg-emerald-100 px-1.5 rounded mt-1 inline-block text-xs font-medium">{app.type}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <button
          onClick={() => navigate('/agenda')}
          className="w-full mt-4 text-sm text-center py-2 rounded-lg font-medium transition-colors duration-200 bg-emerald-700 text-white hover:bg-emerald-800 active:scale-95"
        >
          Ver agenda completa
        </button>
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
        />
      )}
    </div>
  );
};

export default Dashboard;
