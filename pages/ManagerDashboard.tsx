import React from 'react';
import { Appointment } from '../types';
import { Icons } from '../constants';

interface ProgressBarProps {
  value: number;
  label: string;
  color: string;
  isManagerMode: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, label, color, isManagerMode }) => (
  <div className="mb-3">
    <div className="flex justify-between text-xs mb-1">
      <span className={`font-medium ${isManagerMode ? 'text-slate-600' : 'text-emerald-800'}`}>{label}</span>
      <span className={`${isManagerMode ? 'text-slate-400' : 'text-emerald-600'}`}>{value} pac.</span>
    </div>
    <div className={`w-full rounded-full h-2.5 ${isManagerMode ? 'bg-blue-50' : 'bg-emerald-100/50'} border border-gray-100`}>
      <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${color.includes('bg-') ? color : `bg-${color}-500`}`} style={{ width: `${Math.min(value * 10, 100)}%` }}></div>
    </div>
  </div>
);

export const ManagerDashboard = ({ stats, aiInsights, intelligence, nextAppointments, navigate, isManagerMode }: any) => {
  if (!stats) return null;

  const financial = intelligence?.financial;
  const opportunities = intelligence?.opportunities || [];
  const marketGaps = intelligence?.marketGaps;

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className={`text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-800`}>Visão Estratégica</h1>
          <p className={`mt-1 text-sm md:text-base text-slate-600`}>Gestão Inteligente de Consultório</p>
        </div>
        <div className="text-left md:text-right bg-white/50 md:bg-transparent p-2 md:p-0 rounded-lg w-full md:w-auto">
          <span className="block text-[10px] text-gray-400 uppercase tracking-widest font-black">Última atualização</span>
          <span className={`text-sm font-black text-slate-700`}>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className={`bg-white border-blue-100 rounded-xl shadow-sm border p-6 flex flex-col justify-between text-left transition-all hover:shadow-md hover:border-blue-200`}>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest text-blue-600`}>Receita Total (LTV)</p>
            <h3 className={`text-2xl font-black mt-2 text-blue-900`}>R$ {stats.revenue?.toLocaleString('pt-BR') || '0'}</h3>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className={`text-blue-700 bg-blue-50 border-blue-200 px-2 py-0.5 rounded-md font-black uppercase text-[10px] border shadow-sm`}>Ticket Médio: R$ {stats.ticketMedio?.toFixed(0) || '0'}</span>
          </div>
        </div>

        <div className={`bg-white border-blue-100 rounded-xl shadow-sm border p-6 flex flex-col justify-between text-left transition-all hover:shadow-md hover:border-blue-200`}>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest text-blue-600`}>Base de Pacientes</p>
            <h3 className={`text-2xl font-black mt-2 text-blue-900`}>{stats.activePatients || 0} <span className={`text-sm font-medium text-slate-400 capitalize`}>ativos</span></h3>
          </div>
          <div className={`mt-4 text-[10px] font-bold uppercase tracking-tight text-slate-500`}>
            Total de agendamentos: {stats.appointmentsCount || 0}
          </div>
        </div>

        <div className={`bg-white border-blue-100 rounded-xl shadow-sm border p-6 flex flex-col justify-between text-left transition-all hover:shadow-md hover:border-blue-200`}>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest text-blue-600`}>Taxa de Faltas</p>
            <h3 className={`text-2xl font-black mt-2 ${stats.noShowRate > 15 ? 'text-rose-500' : 'text-blue-600'}`}>
              {stats.noShowRate || 0}%
            </h3>
          </div>
          <div className={`mt-4 text-[10px] font-bold uppercase tracking-tight text-slate-400`}>
            Índice de absenteísmo global
          </div>
        </div>

        <div className={`bg-white border-blue-100 rounded-xl shadow-sm border p-6 transition-all hover:shadow-md hover:border-blue-200`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-3 text-blue-600`}>Perfil de Gênero</p>
          <div className="flex items-center gap-4">
            <div className={`flex-1 text-center p-2 rounded bg-blue-50/50 border border-blue-100`}>
              <span className="block text-xl font-black text-blue-600">{stats.genderDistribution?.Masculino || 0}</span>
              <span className={`text-[10px] font-black uppercase text-slate-500`}>Homens</span>
            </div>
            <div className={`flex-1 text-center p-2 rounded bg-rose-50 border border-rose-100`}>
              <span className="block text-xl font-black text-rose-500">{stats.genderDistribution?.Feminino || 0}</span>
              <span className={`text-[10px] font-black uppercase text-rose-400`}>Mulheres</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        <div className={`bg-white border-blue-100 shadow-sm rounded-xl border p-6 lg:col-span-2`}>
          <h3 className={`text-lg font-black uppercase tracking-tight mb-6 text-blue-900`}>Top Patologias (Perfil Epidemiológico)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              {stats.topPathologies && stats.topPathologies.map((p: any, idx: number) => (
                <ProgressBar
                  key={idx}
                  label={p.name}
                  value={p.count}
                  color={['bg-blue-600', 'bg-blue-400', 'bg-blue-300'][idx % 3]}
                  isManagerMode={true}
                />
              ))}
              {(!stats.topPathologies || stats.topPathologies.length === 0) && <p className="text-sm text-slate-400 italic">Dados insuficientes.</p>}
            </div>

            <div className={`rounded-xl p-6 text-sm flex flex-col justify-between border bg-blue-50 border-blue-100 text-blue-900 shadow-sm relative overflow-hidden`}>
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <Icons.Brain size={48} />
              </div>
              <div>
                <div className={`flex items-center gap-2 mb-3 font-black uppercase tracking-wider text-[10px] text-blue-600`}>
                  <Icons.Brain size={14} /> IA Manager Insight
                </div>
                <h4 className={`font-black mb-2 text-blue-900 uppercase text-xs`}>Análise Clínica:</h4>
                <p className={`italic font-medium text-blue-800/80 leading-relaxed`}>"{aiInsights?.insight || 'Analisando dados estratégicos...'}"</p>
              </div>
              <div className={`mt-6 pt-4 border-t border-blue-100`}>
                <span className={`block font-black mb-1 text-blue-900 uppercase text-xs`}>Ação Sugerida:</span>
                <p className={`text-blue-700 font-black uppercase text-xs tracking-tight`}>{aiInsights?.action || 'Aguarde processamento...'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`bg-white border-blue-100 shadow-sm rounded-xl border p-6 flex flex-col h-full`}>
          <h3 className={`text-lg font-black uppercase tracking-tight mb-4 text-blue-900`}>Agenda Imediata</h3>
          <div className="space-y-4 flex-1">
            {!nextAppointments || nextAppointments.length === 0 ? (
              <p className={`text-center py-4 text-slate-400 italic font-medium`}>Agenda livre nos próximos dias.</p>
            ) : (
              nextAppointments.map((app: Appointment) => (
                <div key={app.id} className={`flex items-start gap-4 pb-4 border-b border-blue-50 last:border-0 last:pb-0 group/app`}>
                  <div className={`w-1 h-12 rounded-full transition-transform group-hover/app:scale-y-110 ${app.status === 'CONFIRMADO' ? 'bg-emerald-500' : 'bg-blue-200'}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-blue-900 text-sm truncate`}>{app.patientName}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5`}>
                      {new Date(app.startTime).toLocaleDateString()} às {new Date(app.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <span className={`bg-blue-50 text-blue-700 border-blue-100 px-2 py-0.5 rounded-full mt-2 inline-block text-[9px] font-black uppercase tracking-widest border shadow-sm`}>{app.type}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => navigate('/agenda')}
            className={`w-full mt-6 text-[10px] font-black uppercase tracking-widest text-center py-3 rounded-lg transition-all duration-200 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-600 hover:text-white hover:shadow-lg active:scale-95`}
          >
            Ver agenda completa
          </button>
        </div>
      </div>

      {/* NEW: INTELLIGENCE SECTIONS */}
      <div className="space-y-8 pb-20">

        {/* FINANCIAL PREDICTION */}
        <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-500/10 blur-[100px] -rotate-12 translate-x-20"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="size-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Icons.TrendingUp size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Performance Financeira Preditiva</h3>
                <p className="text-blue-400/60 text-[10px] font-black uppercase tracking-widest">Análise de Fluxo via IA</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-sm">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Projeção 30 Dias</span>
                <p className="text-3xl font-black mt-2">R$ {financial?.projection30d?.toLocaleString('pt-BR') || '---'}</p>
                <div className="mt-4 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[70%] animate-pulse"></div>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-sm">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Projeção 60 Dias</span>
                <p className="text-3xl font-black mt-2">R$ {financial?.projection60d?.toLocaleString('pt-BR') || '---'}</p>
              </div>
              <div className="md:col-span-1 flex flex-col justify-center">
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Gargalo Identificado:</span>
                <p className="text-sm font-medium text-slate-300 italic">"{financial?.bottleneck || 'Processando análise de perdas...'}"</p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <p className="text-xs text-blue-100/80 leading-relaxed font-medium">📋 <b className="text-blue-300">Análise de IA:</b> {financial?.analysis || "Aguardando volume de dados para projeção precisa."}</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* UP-SELL / CROSS-SELL */}
          <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Oportunidades de Up-sell</h3>
              <Icons.Zap className="text-amber-500" />
            </div>
            <div className="space-y-4">
              {opportunities.length > 0 ? opportunities.map((op: any, i: number) => (
                <div key={i} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 group transition-all hover:border-blue-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${op.type === 'UP-SELL' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {op.type}
                    </span>
                  </div>
                  <h4 className="font-black text-slate-800 text-sm mb-1">{op.title}</h4>
                  <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">{op.description}</p>
                  <div className="pt-3 border-t border-slate-200/50 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 italic">Perfil: {op.targetProfile}</span>
                    <button className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest">Aplicar Estratégia</button>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center text-slate-300 italic text-sm">Nenhuma oportunidade identificada no momento.</div>
              )}
            </div>
          </section>

          {/* MARKET GAPS & PRODUCTS */}
          <section className="bg-indigo-50 border border-indigo-100 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden">
            <div className="absolute -right-20 -top-20 size-60 bg-white/50 rounded-full blur-[80px]"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-black text-indigo-900 uppercase tracking-tight mb-8">Lacunas de Mercado & Produtos</h3>

              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-3">Dores Comuns Detectadas</span>
                  <div className="flex flex-wrap gap-2">
                    {marketGaps?.commonDeficiencies?.map((d: string, i: number) => (
                      <span key={i} className="bg-white border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 shadow-sm">{d}</span>
                    )) || <span className="text-slate-400 italic text-xs">Mapeando base de pacientes...</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-indigo-100">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-3">Novos Produtos</span>
                    <ul className="space-y-2">
                      {marketGaps?.suggestedProducts?.map((p: string, i: number) => (
                        <li key={i} className="text-[11px] font-black text-indigo-900 flex items-center gap-2">
                          <div className="size-1.5 rounded-full bg-indigo-400"></div>
                          {p}
                        </li>
                      )) || <li className="text-slate-400 italic text-xs">Sem sugestões ativos.</li>}
                    </ul>
                  </div>
                  <div className="bg-indigo-900 p-5 rounded-3xl shadow-xl">
                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block mb-3">Suplementação Alvo</span>
                    <ul className="space-y-2">
                      {marketGaps?.supplementOpportunities?.map((p: string, i: number) => (
                        <li key={i} className="text-[11px] font-black text-white flex items-center gap-2">
                          <div className="size-1.5 rounded-full bg-emerald-400"></div>
                          {p}
                        </li>
                      )) || <li className="text-slate-400 italic text-xs">Aguardando análise PICA.</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};
