
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Clinic, Appointment, Patient } from '../types';
import { db } from '../services/db';
import { Icons } from '../constants';
import { WhatsAppService } from '../services/whatsappService';

interface DashboardProps {
  user: User;
  clinic: Clinic;
  isManagerMode: boolean;
}

// --- HELPER COMPONENTS ---

const KpiCard = ({ title, value, trend, trendLabel, icon: Icon, colorClass, chartData }: any) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group transition-all hover:shadow-md">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <h3 className="text-4xl font-black text-slate-800 dark:text-white mt-1">{value}</h3>
      </div>
      <div className={`size-12 rounded-2xl ${colorClass || 'bg-emerald-50 text-emerald-600'} flex items-center justify-center`}>
        <Icon className="size-6" />
      </div>
    </div>
    <div className="flex items-center gap-2 text-sm">
      <span className={`${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'} font-bold flex items-center`}>
        {trend >= 0 ? <Icons.TrendingUp className="size-4 mr-1" /> : <Icons.ChevronDown className="size-4 mr-1" />}
        {trend > 0 ? `+${trend}%` : `${trend}%`}
      </span>
      <span className="text-slate-400">{trendLabel}</span>
    </div>
    {/* Decorative Sparkline */}
    <div className="h-12 w-full mt-4 flex items-end gap-1 px-1">
      {(chartData || [40, 30, 60, 80, 100, 70, 90]).map((h: number, i: number) => (
        <div
          key={i}
          className={`flex-1 rounded-t-sm transition-all duration-500 ${i === 6 ? 'bg-emerald-500' : 'bg-emerald-100 group-hover:bg-emerald-200'}`}
          style={{ height: `${h}%` }}
        ></div>
      ))}
    </div>
  </div>
);

const AiInsightCard = ({ insight, action, onAction }: any) => (
  <div className="bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-800 dark:to-emerald-900/20 p-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
    <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
      <Icons.Brain size={120} />
    </div>
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icons.Sparkles className="text-emerald-500 size-5" />
        <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">NutriAI Insights</span>
      </div>
      <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
        <span className="font-bold">Dica estratégica:</span> {insight || "Analisando padrões de adesão dos seus pacientes..."}
      </p>
    </div>
    <button
      onClick={onAction}
      className="mt-6 w-full flex items-center justify-center gap-2 bg-emerald-600/10 text-emerald-700 py-3 rounded-xl font-bold text-xs hover:bg-emerald-600/20 transition-all border border-emerald-600/20 active:scale-95"
    >
      <Icons.MessageCircle className="size-4" />
      {action || "Efetuar Ação"}
    </button>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ user, clinic, isManagerMode }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const professionalId = !isManagerMode ? user.professionalId : undefined;
      const role = isManagerMode ? 'ADMIN' : 'PROFESSIONAL';

      const [pts, apps, s] = await Promise.all([
        db.getPatients(clinic.id, professionalId, role),
        db.getUpcomingAppointments(clinic.id, 10, professionalId, role),
        db.getAdvancedStats(clinic.id, professionalId, role)
      ]);

      const insights = await db.generateDashboardInsights(clinic.id, s);

      setPatients(pts);
      setAppointments(apps);
      setStats(s);
      setAiInsights(insights);
      setLoading(false);
    };
    loadData();
  }, [clinic.id, user.professionalId, isManagerMode]);

  const todayApps = useMemo(() =>
    appointments.filter(a => new Date(a.startTime).toDateString() === new Date().toDateString()),
    [appointments]
  );

  const activeAlerts = useMemo(() => {
    const list: any[] = [];
    patients.forEach(p => {
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

    // Mock specific design alerts if database is clean (just for demo/preview as requested by stitch)
    if (list.length === 0 && !isManagerMode) {
      if (!dismissedAlerts.has('mock-1')) {
        list.push({
          id: 'mock-1',
          patientName: 'Ricardo S.',
          message: 'Análise Bioquímica: Glicemia de jejum atingiu 142 mg/dL. Requer ajuste imediato.',
          severity: 'high',
          type: 'bioquimica',
          phone: '5511999999999'
        });
      }
      if (!dismissedAlerts.has('mock-2')) {
        list.push({
          id: 'mock-2',
          patientName: 'Julia Lima',
          message: 'Adesão Crítica: Não logou refeições nos últimos 5 dias. 72% de queda.',
          severity: 'medium',
          type: 'adesao',
          phone: '5511888888888'
        });
      }
    }

    return list;
  }, [patients, dismissedAlerts, isManagerMode]);

  const handleWhatsAppAction = async (alert: any) => {
    const msg = `Olá ${alert.patientName}, aqui é o Dr. Rangel da Nutritude. Notei algo importante em seu acompanhamento: ${alert.message}. Podemos conversar sobre isso?`;
    window.open(WhatsAppService.generateLink(alert.phone, msg), '_blank');

    // Log event
    await db.addTimelineEvent(user, alert.patientId || 'system', {
      date: new Date().toISOString(),
      type: 'OUTRO',
      title: 'Alerta de Dashboard Tratado',
      description: `Mensagem enviada sobre: ${alert.message}`
    });

    // Dismiss alert and show toast
    setDismissedAlerts(prev => new Set(prev).add(alert.id));
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleAiAction = () => {
    if (aiInsights?.patientIds?.length > 0) {
      const pId = aiInsights.patientIds[0];
      const p = patients.find(pt => pt.id === pId);
      if (p && p.phone) {
        const msg = `Olá ${p.name}, notei que você não registra sua alimentação há alguns dias. Tudo bem por aí?`;
        window.open(WhatsAppService.generateLink(p.phone, msg), '_blank');
        return;
      }
    }
    navigate('/patients');
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-emerald-600 font-bold animate-pulse flex flex-col items-center">
        <Icons.Activity className="size-12 mb-2" />
        Sincronizando Nutritude Suite...
      </div>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto pb-10">

      {/* SUCCESS TOAST */}
      {showSuccessToast && (
        <div className="fixed top-8 right-8 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Icons.CheckCircle className="size-5" />
          <span className="font-bold text-sm">Mensagem enviada e alerta resolvido!</span>
        </div>
      )}

      {/* HEADER AREA */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">
            {isManagerMode ? 'Visão Estratégica' : 'Painel do Profissional'}
          </h1>
          <p className="text-slate-500 mt-1">
            Bem-vindo de volta, <span className="font-bold text-emerald-600">Dr(a). {user.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input
              type="text"
              placeholder="Buscar pacientes..."
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
              onFocus={() => navigate('/patients')}
            />
          </div>
          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4 h-10">
            <button className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-emerald-600 transition-colors relative">
              <Icons.Bell className="size-5" />
              <span className="absolute top-2 right-2 size-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN KPIs GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <KpiCard
          title="Consultas Hoje"
          value={todayApps.length}
          trend={15}
          trendLabel="em relação a ontem"
          icon={Icons.Calendar}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          title="Pacientes Ativos"
          value={stats?.activePatients || 0}
          trend={4}
          trendLabel="este mês"
          icon={Icons.Users}
          colorClass="bg-blue-50 text-blue-600"
          chartData={[20, 40, 30, 50, 60, 55, 80]}
        />
        <AiInsightCard
          insight={aiInsights?.insight}
          action={aiInsights?.action}
          onAction={handleAiAction}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* AGENDA SECTION */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Icons.Calendar className="text-emerald-500 size-5" />
              Agenda Imediata
            </h3>
            <button
              onClick={() => navigate('/agenda')}
              className="text-emerald-600 text-xs font-black uppercase tracking-wider hover:underline"
            >
              Ver agenda completa
            </button>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {todayApps.length === 0 ? (
                <div className="p-10 text-center text-slate-400 italic">
                  Agenda livre para o dia de hoje.
                </div>
              ) : (
                todayApps.map((app) => (
                  <div key={app.id} className="p-6 flex items-center gap-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                    <div className="text-center w-16">
                      <p className="text-xs font-bold text-slate-400">{new Date(app.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="text-sm font-black text-emerald-600">HOJE</p>
                    </div>
                    <div className="flex-1 flex items-center gap-4">
                      <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                        {app.patientName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{app.patientName}</p>
                        <p className="text-xs text-slate-500">{app.type}</p>
                      </div>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border border-emerald-100 dark:border-emerald-800">
                      Confirmado
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ALERTS SECTION */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Icons.AlertTriangle className="text-rose-500 size-5" />
              Alertas Críticos
            </h3>
            <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">
              {activeAlerts.length} pendentes
            </span>
          </div>

          <div className="space-y-4">
            {activeAlerts.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-center space-y-3 shadow-sm">
                <div className="size-14 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                  <Icons.Check className="size-6 text-emerald-500" />
                </div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">Nenhum alerta crítico detectado pela IA nas últimas 24 horas.</p>
              </div>
            ) : (
              activeAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`${alert.severity === 'high' ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/40' : 'bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-900/40'} p-5 rounded-[2rem] border shadow-sm relative group animate-in slide-in-from-right duration-300`}
                >
                  <div className="flex gap-4 items-start">
                    <div className={`size-10 rounded-xl ${alert.severity === 'high' ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-600'} flex items-center justify-center shrink-0`}>
                      {alert.type === 'bioquimica' ? <Icons.Activity className="size-5" /> : <Icons.Zap className="size-5" />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${alert.severity === 'high' ? 'text-rose-900 dark:text-rose-100' : 'text-orange-900 dark:text-orange-100'}`}>
                        {alert.patientName}
                      </p>
                      <p className={`text-xs mt-1 leading-relaxed ${alert.severity === 'high' ? 'text-rose-700/80 dark:text-rose-300/60' : 'text-orange-700/80 dark:text-orange-300/60'}`}>
                        {alert.message}
                      </p>
                      <button
                        onClick={() => handleWhatsAppAction(alert)}
                        className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 ${alert.severity === 'high' ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                      >
                        <Icons.MessageCircle className="size-3.5" />
                        Tratar via WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FOOTER SUMMARY */}
      <footer className="mt-12 bg-slate-900 dark:bg-black rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <Icons.TrendingUp className="absolute -bottom-10 -right-10 size-64 rotate-12" />
        </div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="size-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-400 border border-white/10">
            <Icons.Activity className="size-8" />
          </div>
          <div>
            <p className="text-lg font-black tracking-tight">Estatísticas Semanais</p>
            <p className="text-sm text-slate-400 font-medium">Sua produtividade clínica cresceu <span className="text-emerald-400 font-bold">8.4%</span> esta semana.</p>
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto relative z-10">
          <div className="flex-1 md:flex-none bg-white/5 backdrop-blur-md px-8 py-4 rounded-3xl border border-white/10 text-center min-w-[140px]">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Aderência</p>
            <p className="text-2xl font-black text-emerald-400">94%</p>
          </div>
          <div className="flex-1 md:flex-none bg-white/5 backdrop-blur-md px-8 py-4 rounded-3xl border border-white/10 text-center min-w-[140px]">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Impacto</p>
            <p className="text-2xl font-black text-blue-400">Alto</p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Dashboard;
