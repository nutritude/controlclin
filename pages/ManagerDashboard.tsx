import React, { useEffect, useState, useMemo } from 'react';
import { Appointment, Professional, Patient } from '../types';
import { Icons } from '../constants';
import { HolidaysService, Holiday } from '../services/holidaysService';
import { WhatsAppService } from '../services/whatsappService';

interface ProgressBarProps {
  value: number;
  label: string;
  color: string;
  isManagerMode: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, label, color, isManagerMode }) => (
  <div className="mb-3">
    <div className="flex justify-between text-xs mb-1">
      <span className={`font-medium ${isManagerMode ? 'text-indigo-600' : 'text-emerald-800'}`}>{label}</span>
      <span className={`${isManagerMode ? 'text-indigo-400' : 'text-emerald-600'}`}>{value} pac.</span>
    </div>
    <div className={`w-full rounded-full h-2.5 ${isManagerMode ? 'bg-indigo-50' : 'bg-emerald-100/50'} border ${isManagerMode ? 'border-indigo-100' : 'border-white/5'}`}>
      <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${color.includes('bg-') ? color : (isManagerMode ? `bg-indigo-500` : `bg-emerald-500`)}`} style={{ width: `${Math.min(value * 10, 100)}%` }}></div>
    </div>
  </div>
);

export const ManagerDashboard = ({ stats, aiInsights, intelligence, nextAppointments, professionals = [], patients = [], activeAlerts = [], navigate, isManagerMode }: any) => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadHolidays = async () => {
      const year = new Date().getFullYear();
      const hs = await HolidaysService.getHolidays(year);
      setHolidays(hs);
    };
    loadHolidays();
  }, []);

  const todayHoliday = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return HolidaysService.getHolidayForDate(holidays, todayStr);
  }, [holidays]);

  const handleWhatsAppAction = (phone: string, msg: string, alertId?: string) => {
    if (!phone) return;
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

  const visibleAlerts = useMemo(() => {
    return activeAlerts.filter((a: any) => !dismissedAlerts.has(a.id));
  }, [activeAlerts, dismissedAlerts]);

  if (!stats) return null;

  const financial = intelligence?.financial;
  const opportunities = intelligence?.opportunities || [];
  const marketGaps = intelligence?.marketGaps;

  return (
    <div className={`min-h-screen ${isManagerMode ? 'bg-slate-50 text-slate-800' : ''}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className={`text-2xl md:text-3xl font-black uppercase tracking-tight ${isManagerMode ? 'text-slate-800' : 'text-slate-800'}`}>Visão Estratégica</h1>
          <p className={`mt-1 text-sm md:text-base ${isManagerMode ? 'text-indigo-600/60' : 'text-slate-600'}`}>Gestão Inteligente de Consultório</p>
          {todayHoliday && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full text-amber-700 text-xs font-bold">
              <Icons.Zap size={14} className="text-amber-500" />
              <span>Feriado Hoje: {todayHoliday.name}</span>
            </div>
          )}
        </div>
        <div className="text-left md:text-right p-2 md:p-0 rounded-lg w-full md:w-auto">
          <span className="block text-[10px] text-gray-400 uppercase tracking-widest font-black">Sincronização em tempo real</span>
          <span className={`text-sm font-black ${isManagerMode ? 'text-indigo-600' : 'text-slate-700'}`}>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className={`${isManagerMode ? 'bg-white border-indigo-100' : 'bg-white border-blue-100'} rounded-xl shadow-sm border p-6 flex flex-col justify-between text-left transition-all hover:shadow-md`}>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${isManagerMode ? 'text-indigo-600' : 'text-blue-600'}`}>Receita Total (LTV)</p>
            <h3 className={`text-2xl font-black mt-2 ${isManagerMode ? 'text-slate-900' : 'text-blue-900'}`}>R$ {stats.revenue?.toLocaleString('pt-BR') || '0'}</h3>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className={`${isManagerMode ? 'text-indigo-700 bg-indigo-50 border-indigo-100' : 'text-blue-700 bg-blue-50 border-blue-200'} px-2 py-0.5 rounded-md font-black uppercase text-[10px] border shadow-sm`}>Ticket Médio: R$ {stats.ticketMedio?.toFixed(0) || '0'}</span>
          </div>
        </div>

        <div className={`${isManagerMode ? 'bg-white border-indigo-100' : 'bg-white border-blue-100'} rounded-xl shadow-sm border p-6 flex flex-col justify-between text-left transition-all hover:shadow-md`}>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${isManagerMode ? 'text-indigo-600' : 'text-blue-600'}`}>Base de Pacientes</p>
            <h3 className={`text-2xl font-black mt-2 ${isManagerMode ? 'text-slate-900' : 'text-blue-900'}`}>{stats.activePatients || 0} <span className={`text-sm font-medium text-slate-400 capitalize`}>ativos</span></h3>
          </div>
          <div className={`mt-4 text-[10px] font-bold uppercase tracking-tight text-slate-500`}>
            Total de agendamentos: {stats.appointmentsCount || 0}
          </div>
        </div>

        <div className={`${isManagerMode ? 'bg-white border-indigo-100' : 'bg-white border-blue-100'} rounded-xl shadow-sm border p-6 flex flex-col justify-between text-left transition-all hover:shadow-md`}>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${isManagerMode ? 'text-indigo-600' : 'text-blue-600'}`}>Taxa de Faltas</p>
            <h3 className={`text-2xl font-black mt-2 ${stats.noShowRate > 15 ? 'text-rose-500' : (isManagerMode ? 'text-indigo-600' : 'text-blue-600')}`}>
              {stats.noShowRate || 0}%
            </h3>
          </div>
          <div className={`mt-4 text-[10px] font-bold uppercase tracking-tight text-slate-400`}>
            Índice de absenteísmo global
          </div>
        </div>

        <div className={`${isManagerMode ? 'bg-white border-indigo-100' : 'bg-white border-blue-100'} rounded-xl shadow-sm border p-6 transition-all hover:shadow-md`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isManagerMode ? 'text-indigo-600' : 'text-blue-600'}`}>Perfil de Gênero</p>
          <div className="flex items-center gap-4">
            <div className={`flex-1 text-center p-2 rounded ${isManagerMode ? 'bg-indigo-50 border-indigo-100' : 'bg-blue-50/50 border-blue-100'}`}>
              <span className={`block text-xl font-black ${isManagerMode ? 'text-indigo-600' : 'text-blue-600'}`}>{stats.genderDistribution?.Masculino || 0}</span>
              <span className={`text-[10px] font-black uppercase text-slate-500`}>Homens</span>
            </div>
            <div className={`flex-1 text-center p-2 rounded ${isManagerMode ? 'bg-rose-50 border-rose-100' : 'bg-rose-50 border-rose-100'}`}>
              <span className="block text-xl font-black text-rose-500">{stats.genderDistribution?.Feminino || 0}</span>
              <span className={`text-[10px] font-black uppercase text-rose-400`}>Mulheres</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        <div className={`bg-white border-indigo-100 shadow-sm rounded-xl border p-6 lg:col-span-2`}>
          <h3 className={`text-lg font-black uppercase tracking-tight mb-6 text-slate-800`}>Perfil Epidemiológico</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              {stats.topPathologies && stats.topPathologies.map((p: any, idx: number) => (
                <ProgressBar
                  key={idx}
                  label={p.name}
                  value={p.count}
                  color={['bg-indigo-600', 'bg-indigo-500', 'bg-indigo-400'][idx % 3]}
                  isManagerMode={true}
                />
              ))}
              {(!stats.topPathologies || stats.topPathologies.length === 0) && (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Icons.Activity className="text-slate-400" size={24} />
                  </div>
                  <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-2">Sem Dados Epidemiológicos</h4>
                  <p className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed italic">
                    As estatísticas de patologias serão exibidas automaticamente conforme novos diagnósticos forem registrados nas anamneses dos pacientes.
                  </p>
                </div>
              )}
            </div>

            <div className={`rounded-xl p-6 text-sm flex flex-col justify-between border bg-indigo-50 border-indigo-100 text-indigo-900 shadow-sm relative overflow-hidden`}>
              <div className="absolute top-0 right-0 p-2 opacity-10 text-indigo-900">
                <Icons.Brain size={48} />
              </div>
              <div>
                <div className={`flex items-center gap-2 mb-3 font-black uppercase tracking-wider text-[10px] text-indigo-600`}>
                  <Icons.Brain size={14} /> IA Manager Insight
                </div>
                <h4 className={`font-black mb-2 uppercase text-xs text-indigo-950`}>Análise Estratégica:</h4>
                <p className={`italic font-medium leading-relaxed text-indigo-800`}>"{aiInsights?.insight || 'Processando análise estratégica...'}"</p>
              </div>
              <div className={`mt-6 pt-4 border-t border-indigo-200`}>
                <span className={`block font-black mb-1 uppercase text-xs text-indigo-950`}>Plano de Ação:</span>
                <p className={`font-black uppercase text-xs tracking-tight text-indigo-600`}>{aiInsights?.action || 'Aguarde o processamento dos dados...'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`bg-white border-indigo-100 shadow-sm rounded-xl border p-6 flex flex-col h-full`}>
          <h3 className={`text-lg font-black uppercase tracking-tight mb-4 text-slate-800`}>Agenda Imediata</h3>
          <div className="space-y-4 flex-1">
            {!nextAppointments || nextAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Icons.Calendar className="text-slate-300 mb-3" size={32} />
                <p className={`text-sm font-bold text-slate-500`}>Agenda vazia hoje.</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Nenhum atendimento agendado para o período atual.</p>
              </div>
            ) : (
              nextAppointments.map((app: Appointment) => {
                const prof = professionals.find((p: Professional) => p.id === app.professionalId);
                return (
                  <div key={app.id} className={`flex items-start gap-4 pb-4 border-b border-indigo-50 last:border-0 last:pb-0 group/app`}>
                    <div className={`w-1 h-12 rounded-full transition-transform group-hover/app:scale-y-110 ${app.status === 'CONFIRMADO' ? 'bg-emerald-500' : (prof?.color || 'bg-indigo-400')}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className={`font-black text-sm truncate text-slate-800`}>{app.patientName}</p>
                        {prof && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${prof.color} border border-black/5 opacity-80`}>
                            {prof.name.split(' ').pop()}
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5`}>
                        {new Date(app.startTime).toLocaleDateString()} às {new Date(app.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <span className={`bg-indigo-50 text-indigo-700 border-indigo-100 px-2 py-0.5 rounded-full mt-2 inline-block text-[9px] font-black uppercase tracking-widest border shadow-sm`}>{app.type}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <button
            onClick={() => navigate('/agenda')}
            className={`w-full mt-6 text-[10px] font-black uppercase tracking-widest text-center py-3 rounded-lg transition-all duration-200 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-600 hover:text-white hover:shadow-lg active:scale-95`}
          >
            Acessar Fluxo de Agenda
          </button>
        </div>
      </div>

      {/* INTELLIGENCE SECTIONS */}
      <div className="space-y-8 pb-20">

        {/* FINANCIAL PREDICTION */}
        <section className={`bg-white border-indigo-100 rounded-[2.5rem] p-8 relative overflow-hidden shadow-lg border`}>
          <div className="absolute top-0 right-0 w-1/3 h-full bg-indigo-50/50 blur-[100px] -rotate-12 translate-x-20"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="size-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Icons.TrendingUp size={24} />
              </div>
              <div>
                <h3 className={`text-xl font-black uppercase tracking-tight text-slate-800`}>Performance Financeira Preditiva</h3>
                <p className={`text-[10px] font-black uppercase tracking-widest text-indigo-600`}>IA Strategic Forecast</p>
              </div>
            </div>

            {(!financial || !financial.hasSufficientData) && stats.revenue === 0 ? (
              <div className="p-10 border border-indigo-100 bg-indigo-50/30 rounded-3xl text-center">
                <Icons.Activity className="text-indigo-600 mx-auto mb-4 animate-pulse" size={32} />
                <p className="text-sm font-bold text-indigo-900 uppercase tracking-tight mb-2">Dados Insuficientes para Projeção</p>
                <p className="text-[11px] text-slate-600 max-w-md mx-auto leading-relaxed">
                  Para que a IA consiga projetar seu crescimento, você precisa registrar transações financeiras (recebimentos) no sistema. Comece cadastrando valores nas consultas ou no módulo financeiro.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-indigo-100 shadow-sm">
                  <div className="size-2 rounded-full bg-amber-500 animate-ping"></div>
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Aguardando histórico financeiro...</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white border border-indigo-100 p-6 rounded-3xl shadow-sm">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Projeção 30 Dias</span>
                  <p className="text-3xl font-black mt-2 text-slate-900">R$ {financial?.projection30d?.toLocaleString('pt-BR') || '---'}</p>
                  <div className="mt-4 h-1 w-full bg-indigo-50 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-[70%] animate-pulse"></div>
                  </div>
                </div>
                <div className="bg-white border border-indigo-100 p-6 rounded-3xl shadow-sm">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Projeção 60 Dias</span>
                  <p className="text-3xl font-black mt-2 text-slate-900">R$ {financial?.projection60d?.toLocaleString('pt-BR') || '---'}</p>
                </div>
                <div className="md:col-span-1 flex flex-col justify-center">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Gargalo Identificado:</span>
                  <p className="text-sm font-medium text-slate-600 italic leading-relaxed">"{financial?.bottleneck || 'Estabilizando fluxo...'}"</p>
                </div>
              </div>
            )}

            {financial?.analysis && (
              <div className="mt-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <p className="text-xs text-indigo-900 leading-relaxed font-medium"><b className="text-indigo-700">Análise de IA:</b> {financial?.analysis}</p>
              </div>
            )}
          </div>
        </section>

        {/* CRITICAL ALERTS (MANAGER WIDE) */}
        {visibleAlerts.length > 0 && (
          <section className="bg-white border-rose-100 rounded-[2.5rem] p-8 shadow-lg border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/4 h-full bg-rose-50/30 blur-[60px] translate-x-10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-sm animate-pulse">
                    <Icons.AlertCircle size={24} />
                  </div>
                  <div>
                    <h3 className={`text-xl font-black uppercase tracking-tight text-slate-800`}>Alertas Clínicos Críticos</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest text-rose-500`}>Atenção Prioritária (Equipe)</p>
                  </div>
                </div>
                <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">
                  {visibleAlerts.length} pendentes
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleAlerts.map((alert: any) => (
                  <div key={alert.id} className={`p-6 rounded-3xl border transition-all relative group bg-white border-slate-100 hover:border-rose-200 hover:shadow-md`}>
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${alert.severity === 'high' ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-600'}`}>
                        <Icons.Zap size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-800 truncate">{alert.patientName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{alert.type}</p>
                      </div>
                      <button onClick={() => handleDismissAlert(alert.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded-full transition-all">
                        <Icons.Check className="size-4 text-emerald-500" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-6 italic opacity-80 border-l-2 border-indigo-100 pl-3">
                      "{alert.message}"
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleWhatsAppAction(alert.phone, `Olá ${alert.patientName}, notei um alerta importante no sistema sobre ${alert.message}. Está tudo bem?`, alert.id)}
                        className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center gap-2`}
                      >
                        <Icons.MessageCircle className="size-3" />
                        Tratar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* UP-SELL / CROSS-SELL */}
          <section className={`bg-white border-indigo-100 rounded-[2.5rem] p-8 shadow-lg border`}>
            <div className="flex items-center justify-between mb-8">
              <h3 className={`text-xl font-black uppercase tracking-tight text-slate-800`}>Oportunidades de Up-sell</h3>
              <Icons.Zap className="text-amber-500" />
            </div>
            <div className="space-y-4">
              {opportunities.length > 0 ? opportunities.map((op: any, i: number) => (
                <div key={i} className={`p-5 rounded-3xl border group transition-all bg-slate-50 border-indigo-50 hover:border-indigo-200`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter bg-indigo-100 text-indigo-700`}>
                      {op.type}
                    </span>
                  </div>
                  <h4 className={`font-black text-sm mb-1 text-slate-900`}>{op.title}</h4>
                  <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">{op.description}</p>
                  <div className={`pt-3 border-t border-indigo-100 flex items-center justify-between`}>
                    <span className="text-[9px] font-bold text-slate-400 italic">Perfil Alvo: {op.targetProfile}</span>
                    <button className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest">Visualizar Estratégia</button>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                  <Icons.Zap className="text-slate-300 mx-auto mb-4" size={32} />
                  <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-2">Nenhuma Oportunidade</h4>
                  <p className="text-[11px] text-slate-500 max-w-[250px] mx-auto leading-relaxed italic">
                    Nossa IA analisa o comportamento de compra e as necessidades clínicas dos pacientes para sugerir upgrades e novos serviços. Continue alimentando o histórico dos pacientes para ativar.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* MARKET GAPS & PRODUCTS */}
          <section className={`${isManagerMode ? 'bg-indigo-50 border-indigo-100' : 'bg-indigo-50 border-indigo-100'} rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden border`}>
            <div className={`absolute -right-20 -top-20 size-60 rounded-full blur-[80px] ${isManagerMode ? 'bg-white' : 'bg-white0'}`}></div>
            <div className="relative z-10">
              <h3 className={`text-xl font-black uppercase tracking-tight mb-8 ${isManagerMode ? 'text-indigo-900' : 'text-indigo-900'}`}>Lacunas de Mercado & Produtos</h3>

              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-3">Carências da Base Atual</span>
                  <div className="flex flex-wrap gap-2">
                    {marketGaps?.commonDeficiencies && marketGaps.commonDeficiencies.length > 0 ? marketGaps.commonDeficiencies.map((d: string, i: number) => (
                      <span key={i} className={`${isManagerMode ? 'bg-white border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-indigo-200 text-indigo-700'} px-3 py-1.5 rounded-xl text-xs font-bold border`}>{d}</span>
                    )) : (
                      <div className="w-full p-4 bg-white/50 rounded-2xl border border-dashed border-indigo-200/50">
                        <p className="text-[10px] text-indigo-600/60 italic leading-relaxed">IA está cruzando dados de exames laboratoriais com diagnósticos para identificar carências nutricionais predominantes na sua base.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={`${isManagerMode ? 'bg-white border-indigo-100' : 'bg-white border-indigo-100'} p-5 rounded-3xl shadow-sm border`}>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-3">Novas Linhas</span>
                    <ul className="space-y-2">
                      {marketGaps?.suggestedProducts && marketGaps.suggestedProducts.length > 0 ? marketGaps.suggestedProducts.map((p: string, i: number) => (
                        <li key={i} className={`text-[11px] font-black flex items-center gap-2 ${isManagerMode ? 'text-indigo-900' : 'text-indigo-900'}`}>
                          <div className="size-1.5 rounded-full bg-indigo-500"></div>
                          {p}
                        </li>
                      )) : (
                        <li className="text-slate-500 italic text-[10px] font-medium">Análise em curso.</li>
                      )}
                    </ul>
                  </div>
                  <div className={`bg-indigo-50 p-5 rounded-3xl border border-indigo-100 shadow-sm`}>
                    <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest block mb-3">Mix de Suplementação</span>
                    <ul className="space-y-2">
                      {marketGaps?.supplementOpportunities && marketGaps.supplementOpportunities.length > 0 ? marketGaps.supplementOpportunities.map((p: string, i: number) => (
                        <li key={i} className="text-[11px] font-black text-indigo-950 flex items-center gap-2">
                          <div className="size-1.5 rounded-full bg-emerald-500"></div>
                          {p}
                        </li>
                      )) : (
                        <li className="text-indigo-900/40 italic text-[10px] font-medium">Aguardando dados clínicos.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
