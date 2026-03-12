import React, { useState } from 'react';
import { Icons } from '../constants';
import { User, Clinic } from '../types';

interface HelpProps {
    user: User | null;
    clinic: Clinic | null;
    isManagerMode: boolean;
}

export const Help: React.FC<HelpProps> = ({ user, clinic, isManagerMode }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const professionalFAQs = [
        // FINANCEIRO E PACIENTE (Solicitados explicitamente)
        { q: 'Como gerenciar o Financeiro de um paciente?', a: 'Dentro do prontuário do paciente, acesse a aba Financeiro para registrar pagamentos, gerar recibos e controlar mensalidades.' },
        { q: 'Como cadastrar um novo Paciente?', a: 'Clique em "Pacientes" na barra lateral e use o botão "Novo Paciente". Preencha os dados básicos e salve para abrir o prontuário.' },
        { q: 'Como realizar a gestão financeira geral?', a: 'Se você tiver permissão de gestor, acesse o modo GESTOR para ver o fluxo de caixa consolidado de todos os atendimentos.' },

        // AGENDA
        { q: 'Como usar a Agenda de consultas?', a: 'Acesse "Agenda" na barra lateral. Você pode clicar em qualquer horário vago para agendar ou arrastar consultas existentes para reagendar.' },
        { q: 'Como confirmar presença do paciente?', a: 'Na Agenda, clique na consulta e altere o status para "Confirmado" ou "Em Atendimento" para iniciar o prontuário.' },

        // PRONTUÁRIO E ANTROPOMETRIA
        { q: 'Como registrar medidas na Antropometria?', a: 'No prontuário, aba Antropometria, insira Peso, Altura, Dobras Cutâneas e Circunferências. O sistema calcula o percentual de gordura automaticamente.' },
        { q: 'Como funciona o cálculo de Bioimpedância?', a: 'Se o paciente trouxe dados de balança de bioimpedância, insira os valores na seção específica da aba Antropometria.' },
        { q: 'Onde vejo a evolução do paciente?', a: 'Use a aba "Gráficos" no prontuário ou gere um "Relatório Individual" para ver curvas de evolução de peso e composição corporal.' },

        // PLANO ALIMENTAR E PROTOCOLO
        { q: 'Como criar um Plano Alimentar passo a passo?', a: 'Acesse o prontuário > aba Planejamento > Novo Plano. Defina as metas calóricas, macronutrientes e então adicione os alimentos em cada refeição.' },
        { q: 'O que são os Protocolos Clínicos (Sem Glúten, Vegano, etc)?', a: 'Ao criar um plano, você pode ativar um Protocolo. Isso filtra o banco de alimentos para mostrar apenas itens permitidos por aquela inteligência clínica.' },
        { q: 'Como adicionar alimentos personalizados no catálogo?', a: 'Na busca de alimentos, se não encontrar o item, use o botão "Adicionar Manual" para inserir informações nutricionais customizadas.' },

        // EXAMES E PRESCRIÇÕES
        { q: 'Como solicitar Exames Laboratoriais?', a: 'No prontuário, aba Exames, selecione os marcadores desejados através da busca inteligente por nome ou categoria.' },
        { q: 'Como criar uma Prescrição de suplementos?', a: 'Acesse a aba Prescrições, clique em Nova e descreva a fórmula, posologia e orientações de uso.' },

        // ALERTAS E RELATÓRIOS
        { q: 'Como funcionam os Alertas Clínicos?', a: 'O sistema analisa automaticamente os dados do paciente e exibe alertas (ex: risco de desnutrição, exames alterados) no ícone de campainha.' },
        { q: 'Como gerar o Relatório para o paciente?', a: 'Na aba Relatórios, escolha entre o relatório simplificado ou completo (PDF). Você pode incluir gráficos, fotos e o plano alimentar.' },

        // PORTAL DO PACIENTE E MAPAS MENTAIS
        { q: 'Como o paciente acessa a dieta?', a: 'O paciente deve acessar o link do Portal do Paciente com o e-mail cadastrado. Lá ele vê o plano, exames e orientações.' },
        { q: 'Como gerar Mapas Mentais para educação nutricional?', a: 'No prontuário, aba Mapas Mentais, escolha um tema (ex: "Como ler rótulos") e gere o mapa visual para o paciente.' },

        // CONFIGURAÇÕES
        { q: 'Como alterar meu perfil profissional?', a: 'Vá em Configurações no canto inferior da barra lateral para atualizar seu registro (CRN), especialidades e foto.' }
    ];

    const managerFAQs = [
        { q: 'Como analisar o Faturamento da clínica?', a: 'No Dashboard principal do Gestor, visualize o ticket médio, faturamento bruto e volume de atendimentos mensais.' },
        { q: 'Como gerenciar a Equipe (Nutricionistas/Recepcionistas)?', a: 'Acesse a aba "Equipe" na lateral. Lá você pode cadastrar profissionais, definir permissões e visualizar a agenda de cada um.' },
        { q: 'Como configurar a Identidade Visual da clínica?', a: 'Em Configurações > Clínica, faça o upload do seu Logo. Ele aparecerá automaticamente em todos os relatórios e PDFs.' },
        { q: 'Como controlar o Fluxo de Caixa?', a: 'Acesse Relatórios > Financeiro para ver o detalhamento de entradas por profissional ou por período selecionado.' },
        { q: 'Como funciona a gestão de pacientes ativa?', a: 'No modo Gestor, você tem uma visão macro de todos os pacientes da clínica, podendo identificar quais profissionais estão com maior demanda.' }
    ];

    const faqs = isManagerMode ? managerFAQs : professionalFAQs;

    const filteredFAQs = faqs.filter(faq =>
        faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* SEARCH HERO */}
            <div className={`relative p-8 md:p-12 rounded-3xl overflow-hidden border ${isManagerMode ? 'bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-400' : 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400'} shadow-2xl`}>
                {/* Elementos decorativos (atrás do texto) - z-0 */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl z-0"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-64 h-64 bg-black/10 rounded-full blur-3xl z-0"></div>

                {/* Conteúdo (frente) - z-10 explícito para garantir visibilidade */}
                <div className="relative z-10 max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-2 uppercase tracking-tight drop-shadow-md">
                        Central de Conhecimento
                    </h2>
                    <p className="text-white/90 text-sm md:text-base mb-10 font-medium italic">
                        Explore todas as funcionalidades do ControlClin e tire suas dúvidas instantaneamente.
                    </p>

                    <div className="relative group scale-105 transition-transform duration-300">
                        <Icons.Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors size-6" />
                        <input
                            type="text"
                            placeholder="Ex: financeiro, paciente, antropometria, exames..."
                            className="w-full pl-14 pr-6 py-5 bg-white/95 backdrop-blur-xl border-none rounded-2xl shadow-2xl text-slate-800 placeholder:text-slate-400 focus:ring-4 focus:ring-emerald-400/30 transition-all font-bold text-lg"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FAQs SECTION */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                            <Icons.HelpCircle className={`size-5 ${isManagerMode ? 'text-blue-500' : 'text-emerald-500'}`} />
                            Guia Completo do Sistema ({isManagerMode ? 'Gestão Clínica' : 'Atendimento Profissional'})
                        </h3>
                        <span className="text-[10px] font-bold bg-white text-slate-400 border border-slate-100 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                            {filteredFAQs.length} tópicos disponíveis
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {filteredFAQs.map((faq, i) => (
                            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all group cursor-default">
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1 p-2 rounded-xl flex-shrink-0 ${isManagerMode ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                        <Icons.Info className="size-4" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors text-base">{faq.q}</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed font-medium">{faq.a}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredFAQs.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 shadow-inner">
                                <div className="p-4 bg-slate-50 rounded-full inline-block mb-4">
                                    <Icons.Search className="size-8 text-slate-300" />
                                </div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum resultado para "{searchQuery}"</p>
                                <p className="text-slate-300 text-xs mt-2 italic">Tente palavras mais simples como "dieta" ou "agenda".</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* SIDE ACTIONS */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="bg-emerald-500/20 p-3 rounded-2xl inline-block mb-6 ring-1 ring-emerald-500/50">
                                <Icons.BookOpen className="size-8 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight mb-3">Manual Completo</h3>
                            <p className="text-sm text-slate-400 mb-8 leading-relaxed font-medium">
                                Tutorial passo a passo para dominar cada tela do ControlClin. Recomendado para novos usuários.
                            </p>
                            <button className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                                Abrir Documentação
                            </button>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/40 via-transparent to-transparent opacity-60"></div>
                    </div>

                    {/* CONTACT CARD */}
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl">
                        <h4 className="text-base font-black text-slate-800 uppercase tracking-tighter mb-6">Suporte Direto</h4>
                        <div className="space-y-4">
                            <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-emerald-50 transition-all border border-slate-50 hover:border-emerald-100 group">
                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <Icons.MessageCircle className="size-5" />
                                </div>
                                <div className="text-left leading-none">
                                    <span className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Atendimento VIP</span>
                                    <span className="text-sm font-black text-slate-700">WhatsApp Suporte</span>
                                </div>
                            </button>
                            <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-blue-50 transition-all border border-slate-50 hover:border-blue-100 group">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <Icons.Mail className="size-5" />
                                </div>
                                <div className="text-left leading-none">
                                    <span className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">E-mail Comercial</span>
                                    <span className="text-sm font-black text-slate-700">contato@controlclin.com</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* STATUS SYSTEM */}
                    <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-3">
                        <div className="relative">
                            <div className="size-2 rounded-full bg-emerald-500"></div>
                            <div className="absolute inset-0 size-2 rounded-full bg-emerald-500 animate-ping"></div>
                        </div>
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Sistemas operacionais</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
