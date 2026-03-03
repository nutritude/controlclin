
import { Appointment, Patient, Role, User } from '../types';

// URL base do app em produção (Vercel) — fallback para window.location.origin em dev
const getAppBaseUrl = (): string => {
    // Em produção, usa a URL do Vercel. Em dev, usa o localhost atual.
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
        return window.location.origin;
    }
    // URL de produção do projeto Vercel
    return 'https://controlclin.vercel.app';
};

export const WhatsAppService = {
    /**
     * Gera um link wa.me com mensagem pré-preenchida
     */
    generateLink: (phone: string, text: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    },

    /**
     * Gera a URL pública de compartilhamento do SuccessCard
     */
    getSuccessCardUrl: (patientId: string): string => {
        const base = getAppBaseUrl();
        return `${base}/#/success-card/${patientId}`;
    },

    /**
     * Mensagem de Boas-vindas para novos pacientes
     */
    getWelcomeMessage: (patientName: string, clinicName: string) => {
        const firstName = patientName.split(' ')[0];
        return (
            `Olá ${firstName}! 👋 Bem-vindo(a) à ${clinicName}!\n\n` +
            `Estamos muito felizes em ter você conosco nessa jornada de saúde e bem-estar. 🌿\n\n` +
            `Nos próximos dias, você receberá seu plano alimentar personalizado. Qualquer dúvida, pode me chamar aqui mesmo pelo WhatsApp — estou à disposição!\n\n` +
            `Juntos vamos alcançar resultados incríveis. Vamos nessa? 💪`
        );
    },

    /**
     * Lembrete de Consulta (Agenda) — humanizado e com CTA claro
     */
    getAppointmentReminder: (patientName: string, date: string, time: string, clinicName: string) => {
        const firstName = patientName.split(' ')[0];
        return (
            `Oi ${firstName}! 😊 Aqui é da equipe ${clinicName}.\n\n` +
            `📅 Passando para confirmar sua consulta:\n` +
            `• Data: *${date}*\n` +
            `• Horário: *${time}*\n\n` +
            `Por favor, confirme sua presença respondendo *SIM* aqui no WhatsApp.\n\n` +
            `Caso precise reagendar, me avise com antecedência — temos outros horários disponíveis! 🗓️`
        );
    },

    /**
     * Insight Pós-Avaliação (Prontuário/Dashboard) — motivacional e específico
     */
    getPostAnthroInsight: (patientName: string, weightDiff: number, leanMassDiff: number) => {
        const firstName = patientName.split(' ')[0];
        const lines: string[] = [];

        lines.push(`Oi ${firstName}! Acabei de registrar os resultados da sua última avaliação e precisei te contar em primeira mão! 🎉\n`);

        if (weightDiff < 0) {
            lines.push(`🔥 *${Math.abs(weightDiff).toFixed(1)} kg eliminados!* Isso é resultado de muita consistência e dedicação. Parabéns!`);
        } else if (weightDiff > 0.5) {
            lines.push(`📊 Houve um aumento de *${weightDiff.toFixed(1)} kg*. Mas não se preocupe — vamos analisar juntos os ajustes necessários.`);
        } else {
            lines.push(`⚖️ Seu peso se manteve estável. Estabilidade também é conquista, especialmente em processos de recomposição corporal!`);
        }

        if (leanMassDiff > 0.3) {
            lines.push(`💪 *Massa magra: +${leanMassDiff.toFixed(1)} kg!* Isso é excelente — você está ganhando músculo enquanto transforma o corpo.`);
        } else if (leanMassDiff < -0.5) {
            lines.push(`🥩 Notei uma leve queda na massa magra. Nada que um ajuste no aporte proteico não resolva — vamos revisar seu plano?`);
        }

        lines.push(`\nContinue firme! Cada escolha saudável que você faz é um passo na direção certa. 🚀\n`);
        lines.push(`Alguma dúvida sobre o plano? Me chama aqui! 😊`);

        return lines.join('\n');
    },

    /**
     * Mensagem de Recuperação (Alertas) — empática, sem pressão
     */
    getRecoveryMessage: (patientName: string, daysInactive: number) => {
        const firstName = patientName.split(' ')[0];
        const weeks = Math.floor(daysInactive / 7);
        const timeText = weeks > 1 ? `${weeks} semanas` : `${daysInactive} dias`;

        return (
            `Oi ${firstName}, tudo bem? 💚\n\n` +
            `Faz ${timeText} que não nos falamos e fiquei pensando em você. Sei que a rotina pode ser corrida, mas quero que saiba que estou aqui quando você precisar.\n\n` +
            `Seu plano alimentar ainda está ativo e pronto para você retomar no seu ritmo. Às vezes, um pequeno ajuste é tudo que precisamos para volcar com tudo! 💪\n\n` +
            `Quer bater um papo rápido e planejarmos juntos os próximos passos? Me fala aqui! 😊`
        );
    },

    /**
     * Lembrete de Exames Pendentes — com senso de urgência leve
     */
    getExamReminder: (patientName: string, clinicName?: string) => {
        const firstName = patientName.split(' ')[0];
        return (
            `Oi ${firstName}! 🔬\n\n` +
            `Lembrei de você hoje! Na sua última consulta, solicitamos alguns exames que são fundamentais para o acompanhamento do seu tratamento.\n\n` +
            `Os resultados vão nos ajudar a:\n` +
            `✅ Personalizar seu plano alimentar com mais precisão\n` +
            `✅ Verificar indicadores metabólicos importantes\n` +
            `✅ Acelerar seus resultados\n\n` +
            `Assim que estiver com o resultado, me manda aqui ou traz na próxima consulta. Qualquer dúvida, pode me chamar! 😊`
        );
    },

    /**
     * Compartilhamento de conquista (Success Card) — link público do app
     */
    getSuccessCardShareMessage: (patientName: string, patientId: string, clinicName?: string) => {
        const firstName = patientName.split(' ')[0];
        const url = WhatsAppService.getSuccessCardUrl(patientId);
        return (
            `Oi ${firstName}! 🏆 Olha só o que conquistamos juntos!\n\n` +
            `Preparei um card especial com os resultados incríveis da sua última avaliação. Clique no link abaixo para ver:\n\n` +
            `👉 ${url}\n\n` +
            `Você pode compartilhar com quem quiser — família, amigos, redes sociais! 🎉\n\n` +
            `Orgulho do seu empenho. Continue assim! 💪`
        );
    },

    /**
     * Compartilhamento pelo próprio paciente (Self-share)
     */
    getPatientSelfShareMessage: (patientName: string, patientId: string) => {
        const firstName = patientName.split(' ')[0];
        const url = WhatsAppService.getSuccessCardUrl(patientId);
        return (
            `Olha só meus resultados! 💪🏆\n\n` +
            `Estou no meu processo de transformação com acompanhamento profissional e os números falam por si!\n\n` +
            `👉 ${url}\n\n` +
            `Quem quiser começar também, me chama! 😄 #ControlClin #Saúde #Resultados`
        );
    },

    /**
     * Mensagem para acesso ao App (Paciente)
     */
    getAppAccessMessage: (patientName: string, email: string, pass: string, clinicSlug: string) => {
        const firstName = patientName.split(' ')[0];
        const base = getAppBaseUrl();
        const appUrl = clinicSlug ? `${base}/${clinicSlug}` : base;

        return (
            `Olá ${firstName}! 📱 Seu acesso ao aplicativo da clínica já está liberado!\n\n` +
            `Acesse pelo link: ${appUrl}\n\n` +
            `Seus dados de acesso:\n` +
            `✉️ Email: ${email}\n` +
            `🔑 Senha: *${pass}*\n\n` +
            `Qualquer dúvida para acessar, é só me chamar! 😊`
        );
    }
};
