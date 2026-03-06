import fs from 'fs';

let content = fs.readFileSync('pages/Login.tsx', 'utf8');

const regex = /const renderLanding = \(\) => \([\s\S]*?\);\n\n  const renderRegister = \(\) => \(/;

const newLanding = `const renderLanding = () => (
    <div className="w-full flex flex-col items-center bg-white text-slate-800 font-sans selection:bg-emerald-500/20">
      {/* Seção de Abertura (Hero Section) */}
      <section className="relative w-full pt-40 pb-32 px-4 md:px-6 overflow-hidden bg-emerald-50/30 border-b border-emerald-100/50">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-emerald-200 bg-white shadow-sm mb-8 hover:scale-105 transition-transform">
             <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
             <span className="text-[10px] font-black tracking-[0.2em] text-emerald-800 uppercase">Gestão de Alta Performance</span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.05] tracking-tight text-slate-900 mb-8 max-w-5xl">
            ControlClin: Onde o cuidado encontra a <span className="italic text-emerald-500">gestão</span>.
          </h1>
          <p className="text-lg md:text-2xl text-slate-500 font-medium leading-relaxed max-w-3xl mb-12">
            Uma plataforma pensada para Nutricionistas que amam o que fazem, Pacientes que buscam resultados e Gestores que valorizam a inteligência. Unimos o melhor da tecnologia e da humanização para transformar a sua clínica.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-16">
            <button onClick={() => setView('REGISTER')} className="px-10 py-5 rounded-full text-lg font-black text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-1">
                Experimente Grátis por 14 Dias
            </button>
          </div>

          {/* Hero Main Screenshot */}
          <div className="w-full max-w-7xl relative group">
            <div className="bg-white rounded-[2.5rem] p-2 md:p-4 shadow-[0_40px_80px_-15px_rgba(16,185,129,0.12)] border border-emerald-100 relative overflow-hidden flex flex-col items-center">
              <img src="/screenshots/dashboard_main.png" alt="Dashboard Principal" className="w-full h-auto rounded-[1.5rem] border border-slate-100 shadow-sm transition-transform duration-700 hover:scale-[1.01]" />
            </div>
          </div>
        </div>
      </section>

      {/* Seção 1: Para o Profissional de Nutrição */}
      <section className="w-full py-32 px-4 md:px-6 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
               <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight">Sua paixão é cuidar. <br/><span className="text-emerald-500 italic">A nossa é cuidar de você.</span></h2>
               <p className="text-xl text-slate-600 leading-relaxed">Nós entendemos a sua jornada. Você se formou para transformar vidas, não para se perder em planilhas e papéis. O ControlClin foi desenhado por profissionais como você, para ser o seu braço direito, automatizando o que é repetitivo para que você possa focar no que realmente importa: o atendimento humanizado.</p>
               
               <div className="space-y-6 pt-4">
                   <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                       <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.Sparkles className="text-emerald-500"/> Inteligência Artificial que Trabalha por Você</h4>
                       <p className="text-slate-600 font-medium">Enquanto outros sistemas oferecem apenas prontuários digitais, nossa IA (desenvolvida com a tecnologia Gemini) sugere termos técnicos, analisa históricos e gera insights, economizando seu tempo e enriquecendo suas consultas. É como ter um assistente especialista ao seu lado, 24/7.</p>
                   </div>
                   <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                       <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.Activity className="text-emerald-500"/> Planejamento Alimentar sem Limites</h4>
                       <p className="text-slate-600 font-medium">Vá além dos cálculos básicos. Com o ControlClin, você tem acesso a múltiplos protocolos de antropometria, um banco de alimentos completo e uma interface visual para montar planos alimentares que seus pacientes realmente vão amar e seguir.</p>
                   </div>
                   <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                       <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.Monitor className="text-emerald-500"/> Liberdade e Flexibilidade</h4>
                       <p className="text-slate-600 font-medium">Chega de ficar preso a um sistema engessado. Nossa plataforma é 100% web, com um design que se adapta ao seu fluxo de trabalho, e não o contrário.</p>
                   </div>
               </div>
            </div>
            
            <div className="flex-1 w-full relative group">
                <div className="bg-white rounded-[2rem] p-2 md:p-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 relative text-center">
                     <img src="/screenshots/professional_mode.png" alt="Modo Profissional" className="w-full h-auto rounded-[1.5rem] border border-slate-50 transition-transform duration-700 hover:scale-[1.01]" />
                     <img src="/screenshots/relatorio_ind.png" alt="Relatórios" className="w-full h-auto rounded-[1.5rem] border border-slate-50 transition-transform duration-700 hover:scale-[1.01] mt-4" />
                </div>
            </div>
        </div>
      </section>

      {/* Seção 2: Para o Paciente */}
      <section className="w-full py-32 px-4 md:px-6 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="flex-1 space-y-8">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight">Sua jornada de saúde, <br/><span className="text-emerald-500 italic">simples e na palma da sua mão.</span></h2>
                <p className="text-xl text-slate-600 leading-relaxed">Chega de dietas de papel e dúvidas perdidas no WhatsApp. Com o aplicativo ControlClin, você tem acesso direto ao seu plano alimentar, pode registrar seu progresso, tirar dúvidas e visualizar sua evolução de forma clara e motivadora. É a sua saúde, organizada e acessível como nunca antes.</p>
                
                <div className="space-y-6 pt-4">
                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                       <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.Smartphone className="text-emerald-500"/> Um Aplicativo que Motiva</h4>
                       <p className="text-slate-600 font-medium">Diferente de apps genéricos, o nosso é uma extensão do cuidado do seu nutricionista. Visualize gráficos de progresso, receba lembretes e compartilhe suas conquistas com apenas um clique.</p>
                   </div>
                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                       <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.MessageCircle className="text-emerald-500"/> Comunicação Direta e Segura</h4>
                       <p className="text-slate-600 font-medium">Esqueça a troca de e-mails e mensagens. Tenha um canal direto e seguro para se comunicar com seu profissional, garantindo que suas dúvidas sejam respondidas rapidamente.</p>
                   </div>
                </div>
            </div>
            
            <div className="flex-1 w-full relative">
                <div className="relative w-full max-w-[360px] border-[12px] border-slate-900 rounded-[3rem] shadow-2xl overflow-hidden bg-white mx-auto">
                     <img src="/screenshots/patient_portal.png" alt="Portal Paciente" className="w-full h-auto block" />
                </div>
            </div>
        </div>
      </section>

      {/* Seção 3: Para a Clínica */}
      <section className="w-full py-32 px-4 md:px-6 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
               <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight">Menos planilhas, mais estratégia. <br/><span className="text-emerald-500 italic">Sua clínica na velocidade da inteligência.</span></h2>
               <p className="text-xl text-slate-600 leading-relaxed">Gerenciar uma clínica é mais do que agendar consultas. É sobre tomar decisões inteligentes que garantam o crescimento e a saúde financeira do seu negócio. O ControlClin oferece um painel de gestão que transforma dados em decisões, de forma visual e intuitiva.</p>
               
               <div className="space-y-6 pt-4">
                   <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                       <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.TrendingUp className="text-emerald-500"/> Dashboard com IA</h4>
                       <p className="text-slate-600 font-medium">Enquanto concorrentes focam em gestão geral, o ControlClin analisa seus dados e sugere ações estratégicas imediatas.</p>
                   </div>
                   <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                       <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.DollarSign className="text-emerald-500"/> Financeiro sem Complicação</h4>
                       <p className="text-slate-600 font-medium">DRE, fluxo de caixa, controle de pagamentos e relatórios que fazem sentido. Visão clara da sua saúde financeira.</p>
                   </div>
                   <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                       <h4 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-2"><Icons.PieChart className="text-emerald-500"/> Visão 360°</h4>
                       <p className="text-slate-600 font-medium">Do absenteísmo ao perfil de pacientes, tenha as informações que você precisa para crescer de fato.</p>
                   </div>
               </div>
            </div>
            
            <div className="flex-1 w-full relative group">
                <div className="bg-white rounded-[2rem] p-2 md:p-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 relative text-center">
                     <img src="/screenshots/gestor_mode.png" alt="Modo Gestor" className="w-full h-auto rounded-[1.5rem] border border-slate-50 transition-transform duration-700 hover:scale-[1.01]" />
                </div>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-16 px-6 bg-white flex flex-col items-center gap-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Control<span className="text-emerald-500">Clin</span></h2>
        <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <a href="#" className="hover:text-emerald-500 transition-colors">Termos</a>
          <a href="#" className="hover:text-emerald-500 transition-colors">Privacidade</a>
          <a href="#" className="hover:text-emerald-500 transition-colors">Contato</a>
        </div>
        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-4">
          © 2026 ControlClin Sistemas de Gestão. Software de Alta Performance.
        </p>
      </footer>
    </div>
  );

  const renderRegister = () => (`

content = content.replace(regex, newLanding);
fs.writeFileSync('pages/Login.tsx', content);

console.log("Substituição do renderLanding concluída usando regex.")

