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
        { q: 'Como criar um plano alimentar?', a: 'Acesse o prontuário do paciente, selecione a aba Planejamento e clique em Novo Plano.' },
        { q: 'Como interpretar alertas clínicos?', a: 'Os alertas são automáticos baseados nos exames e anamnese. Clique no ícone de alerta no topo para ver detalhes.' },
        { q: 'Como gerar um mapa mental?', a: 'No perfil do paciente, aba Mapas Mentais, escolha o tipo de mapa e clique em Gerar com IA.' },
        { q: 'Como cadastrar um novo alimento?', a: 'No modal de busca de alimentos, escolha a opção "Adicionar item manual" se não encontrar no catálogo.' }
    ];

    const managerFAQs = [
        { q: 'Como ver o faturamento da clínica?', a: 'No Painel principal do Gestor, você encontra os indicadores financeiros de faturamento e ticket médio.' },
        { q: 'Como cadastrar um novo nutricionista?', a: 'Acesse a aba Equipe na barra lateral e clique no botão Cadastrar Profissional.' },
        { q: 'Como alterar o logo da clínica?', a: 'Vá em Configurações e faça o upload da imagem na seção Identidade Visual.' },
        { q: 'Como gerenciar acessos?', a: 'Nas configurações de Equipe, você pode definir as permissões de cada usuário.' }
    ];

    const faqs = isManagerMode ? managerFAQs : professionalFAQs;

    const filteredFAQs = faqs.filter(faq =>
        faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* SEARCH HERO */}
            <div className={`relative p-8 rounded-3xl overflow-hidden border ${isManagerMode ? 'bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-400' : 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400'} shadow-2xl`}>
                <div className="relative z-10 max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Como podemos ajudar?</h2>
                    <p className="text-white/80 text-sm mb-8 font-medium italic">Encontre respostas rápidas sobre as funcionalidades do sistema.</p>

                    <div className="relative group">
                        <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Pesquise por uma funcionalidade ou dúvida..."
                            className="w-full pl-12 pr-4 py-4 bg-white/95 backdrop-blur-xl border-none rounded-2xl shadow-xl text-slate-800 placeholder:text-slate-400 focus:ring-4 focus:ring-white/20 transition-all font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                {/* Decoration */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-48 h-48 bg-black/10 rounded-full blur-3xl"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FAQs SECTION */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                            <Icons.HelpCircle className={`size-5 ${isManagerMode ? 'text-blue-500' : 'text-emerald-500'}`} />
                            Dúvidas Frequentes ({isManagerMode ? 'Gestão' : 'Clínico'})
                        </h3>
                        {searchQuery && (
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase tracking-widest">
                                {filteredFAQs.length} resultados
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {filteredFAQs.map((faq, i) => (
                            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all group">
                                <h4 className="font-bold text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">{faq.q}</h4>
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">{faq.a}</p>
                            </div>
                        ))}
                        {filteredFAQs.length === 0 && (
                            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                <p className="text-slate-400 font-medium italic">Nenhuma dúvida encontrada para sua busca.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* SIDE ACTIONS */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="bg-emerald-500/20 p-2 rounded-lg inline-block mb-4">
                                <Icons.BookOpen className="size-6 text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-black uppercase tracking-tight mb-2">Guia do Sistema</h3>
                            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                                Acesse o manual completo de instruções nativo para dominar todas as ferramentas.
                            </p>
                            <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                                Abrir Manual
                            </button>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/40 via-transparent to-transparent opacity-50"></div>
                    </div>

                    {/* CONTACT CARD */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter mb-4">Canais Diretos</h4>
                        <div className="space-y-3">
                            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all border border-slate-100">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <Icons.MessageCircle className="size-4" />
                                </div>
                                <div className="text-left leading-none">
                                    <span className="block text-[10px] font-black uppercase text-slate-400 mb-1">WhatsApp</span>
                                    <span className="text-xs font-bold text-slate-700">Suporte ao Cliente</span>
                                </div>
                            </button>
                            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all border border-slate-100">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Icons.Mail className="size-4" />
                                </div>
                                <div className="text-left leading-none">
                                    <span className="block text-[10px] font-black uppercase text-slate-400 mb-1">E-mail</span>
                                    <span className="text-xs font-bold text-slate-700">contato@controlclin.com</span>
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
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Todos os sistemas operacionais</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
