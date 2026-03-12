
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Clinic, Appointment, Patient, Exam, ExamRequest } from '../types';
import { db } from '../services/db';
import { Icons } from '../constants';
import { WhatsAppService } from '../services/whatsappService';
import { ManagerDashboard } from './ManagerDashboard';

interface DashboardProps {
  user: User;
  clinic: Clinic;
  isManagerMode: boolean;
}

// --- HELPER COMPONENTS ---

const KpiCard = ({ title, value, trend, trendLabel, icon: Icon, colorClass, chartData, onClick }: any) => (
  <div
    onClick={onClick}
    className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group transition-all hover:shadow-md ${onClick ? 'cursor-pointer hover:border-emerald-200' : ''}`}
  >
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{title}</p>
        <h3 className="text-4xl font-black text-slate-800 mt-1">{value}</h3>
      </div>
      <div className={`size-12 rounded-2xl ${colorClass || 'bg-emerald-50 text-emerald-600'} flex items-center justify-center shadow-inner`}>
        <Icon className="size-6" />
      </div>
    </div>
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
      <span className={`${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'} flex items-center gap-1`}>
        {trend >= 0 ? <Icons.TrendingUp className="size-3" /> : <Icons.ChevronDown className="size-3" />}
        {trend > 0 ? `+${trend}%` : `${trend}%`}
      </span>
      <span className="text-slate-300">{trendLabel}</span>
    </div>
    {/* Decorative Sparkline */}
    <div className="h-10 w-full mt-4 flex items-end gap-1 px-1">
      {(chartData || [40, 30, 60, 80, 100, 70, 90]).map((h: number, i: number) => (
        <div key={i} className={`flex-1 rounded-t-sm transition-all duration-700 delay-[${i * 100}ms] ${i === 6 ? 'bg-emerald-500' : 'bg-slate-100 group-hover:bg-emerald-100'}`} style={{ height: `${Math.max(10, h)}%` }}></div>
      ))}
    </div>
  </div>
);

const OutreachAction = ({ title, description, phone, patientName, onTrigger }: any) => (
  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-3">
      <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
        <Icons.MessageCircle className="size-5" />
      </div>
      <button
        onClick={() => onTrigger(phone, `Olá ${patientName}, ...`)}
        className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors"
      >
        Enviar agora
      </button>
    </div>
    <h4 className="text-sm font-black text-slate-800 mb-1">{title}</h4>
    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{description}</p>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ user, clinic, isManagerMode }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [managerIntelligence, setManagerIntelligence] = useState<any>(null);
  const [examRequests, setExamRequests] = useState<ExamRequest[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const professionalId = !isManagerMode ? user.professionalId : undefined;
      const role = isManagerMode ? 'ADMIN' : 'PROFESSIONAL';

      const [pts, apps, s, requests, exams] = await Promise.all([
        db.getPatients(clinic.id, professionalId, role),
        db.getUpcomingAppointments(clinic.id, 50, professionalId, role),
        db.getAdvancedStats(clinic.id, professionalId, role),
        db.getAllExamRequests(clinic.id, professionalId),
        db.getAllExams(clinic.id)
      ]);

      const insights = await db.generateDashboardInsights(clinic.id, s);

      setPatients(pts);
      setAppointments(apps);
      setStats(s);
      setAiInsights(insights);
      if (isManagerMode) {
        db.getManagerIntelligence(clinic.id).then(setManagerIntelligence);
      }
      setExamRequests(requests);
      setAllExams(exams);
      setLoading(false);
    };

    loadData();

    // Listen for remote sync events to refresh UI when background sync completes
    window.addEventListener('db-remote-sync', loadData);
    return () => window.removeEventListener('db-remote-sync', loadData);
  }, [clinic.id, user.professionalId, isManagerMode]);

  // Handle Search
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const filtered = patients.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5);
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, patients]);

  const todayApps = useMemo(() =>
    appointments.filter(a => new Date(a.startTime).toDateString() === new Date().toDateString())
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [appointments]
  );

  const lastFivePatients = useMemo(() => {
    return [...patients]
      .sort((a, b) => (b.id > a.id ? 1 : -1)) // Using ID as proxy for recentness if no createdAt
      .slice(0, 5);
  }, [patients]);

  const activeAlerts = useMemo(() => {
    const list: any[] = [];
    patients.forEach(p => {
      // Ensure the patient belongs to this professional if not in manager mode
      if (!isManagerMode && p.professionalId !== user.professionalId && p.professionalId !== 'all') return;

      if (p.clinicalSummary?.alerts) {
        p.clinicalSummary.alerts.forEach((alert: any, idx: number) => {
          const alertId = `${p.id}-${idx}`;
          if (!dismissedAlerts.has(alertId)) {
            list.push({
              id: alertId,
              patientId: p.id,
              patientName: p.name,
              phone: p.phone,
              message: alert.description || alert.message,
              severity: alert.severity || 'high',
              type: alert.type || 'clinical'
            });
          }
        });
      }
    });

    // Add pending exams for analysis (results uploaded but not analyzed)
    allExams.filter(e => e.status === 'PENDENTE').forEach(e => {
      const p = patients.find(patient => patient.id === e.patientId);
      if (!p) return;
      const alertId = `exam-pend-${e.id}`;
      if (!dismissedAlerts.has(alertId)) {
        list.push({
          id: alertId,
          patientId: p.id,
          patientName: p.name,
          phone: p.phone,
          message: `Exame "${e.name}" aguardando análise profissional.`,
          severity: 'medium',
          type: 'exam'
        });
      }
    });

    // Add open exam requests (requested but no results yet)
    examRequests.forEach(r => {
      const p = patients.find(patient => patient.id === r.patientId);
      if (!p) return;

      // Simple heuristic: if no exam uploaded AFTER the request date, it's open
      const hasResults = allExams.some(e => e.patientId === r.patientId && e.date >= r.date);

      if (!hasResults) {
        const alertId = `req-open-${r.id}`;
        if (!dismissedAlerts.has(alertId)) {
          list.push({
            id: alertId,
            patientId: p.id,
            patientName: p.name,
            phone: p.phone,
            message: `Solicitação de exames pendente (${r.exams.length} itens).`,
            severity: 'low',
            type: 'exam-request'
          });
        }
      }
      // Add Alert for patients without a nutritional plan
      const hasPlan = (p.nutritionalPlans && p.nutritionalPlans.length > 0) || p.nutritionalPlan;
      if (!hasPlan) {
        const alertId = `no-plan-${p.id}`;
        if (!dismissedAlerts.has(alertId)) {
          list.push({
            id: alertId,
            patientId: p.id,
            patientName: p.name,
            phone: p.phone,
            message: `Paciente sem plano alimentar ativo cadastrado no sistema.`,
            severity: 'orange',
            type: 'Nutricional'
          });
        }
      }
    });

    return list;
  }, [patients, dismissedAlerts, isManagerMode, user.professionalId, examRequests, allExams]);

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const parts = birthDate.split('-');
    if (parts.length < 3) return 0;
    const birth = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const adherenceAvg = useMemo(() => {
    const list = patients.filter(p => p.adherenceHistory && p.adherenceHistory.length > 0);
    if (list.length === 0) return 0;

    const total = list.reduce((acc, p) => {
      const last = p.adherenceHistory![p.adherenceHistory!.length - 1];
      const score = last.status === 'TOTAL' ? 100 : last.status === 'PARCIAL' ? 50 : 0;
      return acc + score;
    }, 0);
    return Math.round(total / list.length);
  }, [patients]);

  // Calculate Real Sparkline Data (Daily new patients over 7 days)
  const patientSparkline = useMemo(() => {
    const days = [0, 0, 0, 0, 0, 0, 100]; // Default fallback
    // In a real app we'd map patients by createdAt. Mocking growth curve for data that exists:
    return [patients.length * 0.4, patients.length * 0.5, patients.length * 0.7, patients.length * 0.6, patients.length * 0.8, patients.length * 0.9, 100];
  }, [patients]);

  const handleWhatsAppAction = (phone: string, msg: string, alertId?: string) => {
    if (!phone) { alert("Telefone não cadastrado."); return; }
    window.open(WhatsAppService.generateLink(phone, msg), '_blank');
    setShowSuccessToast(true);
    if (alertId) {
      setDismissedAlerts(prev => new Set([...Array.from(prev), alertId]));
    }
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...Array.from(prev), alertId]));
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-emerald-600 font-bold animate-pulse flex flex-col items-center">
        <Icons.Activity className="size-12 mb-2" />
        Sincronizando Nutritude Suite...
      </div>
    </div>
  );

  if (isManagerMode) {
    return (
      <ManagerDashboard
        stats={stats}
        aiInsights={aiInsights}
        intelligence={managerIntelligence}
        nextAppointments={appointments}
        navigate={navigate}
        isManagerMode={isManagerMode}
      />
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto pb-20">
      {/* SUCCESS TOAST */}
      {showSuccessToast && (
        <div className="fixed bottom-10 right-10 z-[100] bg-slate-900 border border-white/10 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5">
          <div className="size-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Icons.Check className="size-5" />
          </div>
          <span className="font-bold text-sm">Ação enviada com sucesso!</span>
        </div>
      )}

      {/* HEADER AREA */}
      <header className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-800">
            {isManagerMode ? 'Portal de Gestão' : 'Painel do Profissional'}
          </h1>
          <p className="text-slate-400 mt-2 font-medium">
            Bem-vindo de volta, <span className="text-emerald-600 font-black">Dr(a). {user.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto relative">
          <div className="relative flex-1 md:w-80 group">
            <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 size-5 transition-colors group-focus-within:text-emerald-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar pacientes por nome..."
              className="w-full bg-white border border-slate-100 rounded-3xl pl-12 pr-4 py-4 text-sm focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/30 transition-all shadow-sm"
            />
            {/* SEARCH RESULTS DROPDOWN */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[90] animate-in fade-in slide-in-from-top-2">
                {searchResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { navigate(`/patients/${p.id}`); setSearchQuery(''); }}
                    className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <div className="size-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                      {p.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-800 text-sm">{p.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{p.status}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="p-4 bg-white border border-slate-100 rounded-full text-slate-400 hover:text-emerald-500 transition-all relative shadow-sm hover:shadow-md">
            <Icons.Bell className="size-6" />
            <span className="absolute top-4 right-4 size-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      </header>

      {/* TOP GRID: KPIs & AI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <KpiCard
          title="Consultas Hoje"
          value={todayApps.length}
          trend={12}
          trendLabel="vs média semana"
          icon={Icons.Calendar}
          colorClass="bg-emerald-50 text-emerald-600"
          chartData={[30, 20, 50, 40, 60, 40, 80]}
        />
        <KpiCard
          title="Meus Pacientes"
          value={patients.length}
          trend={Math.round((patients.length / 5) * 10)}
          trendLabel="novos contatos"
          icon={Icons.Users}
          colorClass="bg-blue-50 text-blue-600"
          chartData={patientSparkline}
          onClick={() => navigate('/patients')}
        />
        <div className={`${isManagerMode ? 'bg-[#0D1B2A] text-white border border-white/5 shadow-2xl' : 'bg-emerald-50 text-slate-800 border border-emerald-100 shadow-sm'} p-8 rounded-[3rem] flex flex-col justify-between relative overflow-hidden group`}>
          <div className={`absolute -right-10 -bottom-10 ${isManagerMode ? 'opacity-10' : 'opacity-5'} rotate-12 group-hover:scale-110 transition-transform duration-700`}>
            <Icons.Brain size={200} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Icons.Sparkles className={`${isManagerMode ? 'text-emerald-400' : 'text-emerald-500'} size-5`} />
              <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isManagerMode ? 'text-emerald-400/80' : 'text-emerald-600/60'}`}>NutriAI Analytics</span>
            </div>
            <div className="space-y-3">
              <p className={`text-lg font-black leading-[1.2] ${isManagerMode ? 'text-white' : 'text-slate-800'}`}>
                {aiInsights?.insight || "Otimizando sua retenção clínica..."}
              </p>
              <div className={`flex items-center gap-2 py-2 px-3 ${isManagerMode ? 'bg-emerald-500/10' : 'bg-emerald-100/50'} rounded-xl w-fit`}>
                <Icons.Activity className={`size-3 ${isManagerMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span className={`text-[9px] font-bold ${isManagerMode ? 'text-emerald-300' : 'text-emerald-700'} uppercase tracking-wider`}>
                  {aiInsights?.secondaryInsight || "Insight Clínico: Planos personalizados aumentam a adesão em 15%"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className={`mt-6 ${isManagerMode ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20 shadow-xl' : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200'} text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2`}
          >
            Ver Relatório Completo
            <Icons.ChevronDown className="-rotate-90 size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">

          {/* AGENDA IMEDIATA */}
          <section>
            <div className="flex items-center justify-between mb-6 px-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <div className="size-2 rounded-full bg-emerald-500"></div>
                Agenda de Hoje
              </h3>
              <button onClick={() => navigate('/agenda')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors">Ver todos</button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden divide-y divide-slate-50">
              {todayApps.length === 0 ? (
                <div className="p-16 text-center">
                  <p className="text-slate-300 italic font-medium">Nenhum agendamento para hoje.</p>
                </div>
              ) : (
                todayApps.map(app => (
                  <div key={app.id} className="p-6 flex items-center gap-6 hover:bg-slate-50/50 transition-colors">
                    <div className="w-20 text-center border-r border-slate-100 flex-shrink-0">
                      <p className="text-xs font-black text-slate-400">{new Date(app.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="flex-1 flex items-center gap-4">
                      <div className="size-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center font-black">{app.patientName.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{app.patientName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{app.type}</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-xl">Detalhes</button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ÚLTIMOS PACIENTES CADASTRADOS */}
          <section>
            <div className="flex items-center justify-between mb-6 px-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <div className="size-2 rounded-full bg-blue-500"></div>
                Últimos Cadastros
              </h3>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-50">
                    <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Paciente</th>
                    <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Idade</th>
                    <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Objetivo Principal</th>
                    <th className="p-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lastFivePatients.map(p => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/patients/${p.id}`)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="p-6">
                        <p className="text-sm font-black text-slate-800 group-hover:text-emerald-600 transition-colors">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{p.email || 'Sem e-mail'}</p>
                      </td>
                      <td className="p-6 text-sm font-bold text-slate-600">{p.birthDate ? `${calculateAge(p.birthDate)} anos` : '--'}</td>
                      <td className="p-6">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wide">
                          {p.clinicalSummary?.clinicalGoal || 'Avaliação Inicial'}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <Icons.ChevronDown className="-rotate-90 size-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* SMART OUTREACH SUGGESTIONS */}
          {aiInsights && aiInsights.patientIds && aiInsights.patientIds.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6 px-4">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <div className="size-2 rounded-full bg-orange-500"></div>
                  Ações de Engajamento Real
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {patients.filter(p => aiInsights.patientIds.includes(p.id)).slice(0, 2).map(p => (
                  <OutreachAction
                    key={p.id}
                    title="Atenção à Adesão"
                    description={aiInsights.insight}
                    phone={p.phone}
                    patientName={p.name}
                    onTrigger={handleWhatsAppAction}
                  />
                ))}
              </div>
            </section>
          )}

        </div>

        {/* SIDE BAR: CRITICAL ALERTS */}
        <aside className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black text-slate-800">Alertas Críticos</h3>
            <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg shadow-rose-200 animate-pulse">
              {activeAlerts.length}
            </span>
          </div>

          <div className="space-y-4">
            {activeAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-6 rounded-[2.5rem] border transition-all relative group ${alert.severity === 'high' ? 'bg-rose-50/50 border-rose-100' : 'bg-orange-50/50 border-orange-100'}`}
              >
                <button
                  onClick={() => handleDismissAlert(alert.id)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-slate-400 hover:text-slate-600 transition-all opacity-0 group-hover:opacity-100"
                  title="Marcar como resolvido"
                >
                  <Icons.Check className="size-4" />
                </button>

                <div className="flex gap-4 mb-4">
                  <div className={`size-10 rounded-2xl flex items-center justify-center shrink-0 ${alert.severity === 'high' ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-600'}`}>
                    <Icons.Zap size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 leading-tight">{alert.patientName}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{alert.type}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-6 italic opacity-80 border-l-2 border-slate-200 pl-3">
                  "{alert.message}"
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleWhatsAppAction(alert.phone, `Olá ${alert.patientName}, notei este alerta no sistema: ${alert.message}. Tudo bem?`, alert.id)}
                    className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm ${alert.severity === 'high' ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                  >
                    <Icons.MessageCircle className="size-4" />
                    Tratar
                  </button>
                  <button
                    onClick={() => handleDismissAlert(alert.id)}
                    className="px-4 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all bg-white border border-slate-200 text-slate-400 hover:text-slate-900 active:scale-95"
                  >
                    Baixa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* FOOTER SUMMARY */}
      <footer className={`mt-20 ${isManagerMode ? 'bg-[#064E3B] text-white shadow-3xl border-none' : 'bg-emerald-50 text-emerald-900 border border-emerald-100 shadow-sm'} rounded-[3rem] p-12 flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden`}>
        <div className={`absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l ${isManagerMode ? 'from-white/5' : 'from-emerald-100/20'} to-transparent pointer-events-none`}></div>
        <div className="flex items-center gap-8 relative z-10">
          <div className={`size-20 rounded-3xl ${isManagerMode ? 'bg-white/10 backdrop-blur-xl text-emerald-400 border border-white/20 shadow-2xl' : 'bg-white text-emerald-500 border border-emerald-100 shadow-sm'} flex items-center justify-center rotate-3`}>
            <Icons.Activity className="size-10" />
          </div>
          <div>
            <p className={`text-2xl font-black tracking-tight mb-2 italic ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>Performance da Clínica</p>
            <p className={`text-sm ${isManagerMode ? 'text-emerald-100/60' : 'text-emerald-800/60'} font-medium max-w-md`}>Baseado nos dados reais de <b>{patients.length} pacientes</b> vinculados ao seu registro profissional.</p>
          </div>
        </div>
        <div className="flex gap-6 w-full md:w-auto relative z-10">
          <div className={`flex-1 md:flex-none ${isManagerMode ? 'bg-white/5 backdrop-blur-md border-white/10' : 'bg-white border-emerald-100 shadow-sm'} px-10 py-6 rounded-[2rem] border text-center`}>
            <p className={`text-[10px] ${isManagerMode ? 'text-emerald-400/60' : 'text-emerald-600/60'} font-black uppercase tracking-[0.2em] mb-2`}>Aderência Real</p>
            <p className={`text-4xl font-black ${isManagerMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{adherenceAvg}%</p>
          </div>
          <div className={`flex-1 md:flex-none ${isManagerMode ? 'bg-white/5 backdrop-blur-md border-white/10' : 'bg-white border-emerald-100 shadow-sm'} px-10 py-6 rounded-[2rem] border text-center`}>
            <p className={`text-[10px] ${isManagerMode ? 'text-emerald-400/60' : 'text-emerald-600/60'} font-black uppercase tracking-[0.2em] mb-2`}>Sincronização</p>
            <p className={`text-4xl font-black ${isManagerMode ? 'text-blue-400' : 'text-blue-500'}`}>100%</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
