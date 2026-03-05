
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Patient, NutritionalPlan } from '../../types';

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export const AIChatService = {
    /**
     * Responde a dúvidas do paciente com base no contexto nutricional
     */
    askQuestion: async (
        question: string,
        history: ChatMessage[],
        patient: Patient,
        activePlan: NutritionalPlan | null
    ): Promise<string> => {
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            return "Desculpe, o serviço de IA não está configurado. Por favor, contate seu nutricionista.";
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const contextPrompt = `
      Você é um Nutricionista Inteligente assistente do paciente ${patient.name}.
      Seu objetivo é tirar dúvidas sobre: Nutrição Integrativa, Avaliação Física, Exames, Gerenciamento de Cardápios e Planos Alimentares.
      
      CONTEXTO DO PACIENTE:
      - Nome: ${patient.name}
      - Sexo: ${patient.gender}
      - Idade: ${calculateAge(patient.birthDate)} anos
      - Objetivos: ${patient.clinicalSummary?.clinicalGoal || 'Melhorar saúde geral'}
      - Plano Ativo: ${activePlan ? activePlan.strategyName : 'Nenhum plano ativo no momento'}

      REGRAS DE CONDUTA:
      1. Seja empático, profissional e use linguagem clara.
      2. Baseie suas respostas em nutrição baseada em evidências.
      3. Se a dúvida for sobre o plano alimentar, incentive a adesão conforme prescrito pelo nutricionista.
      4. Se for algo clínico complexo, sugira falar diretamente com o profissional na próxima consulta.
      5. Nunca prescreva medicamentos ou substitua a consulta presencial.
      
      HISTÓRICO DA CONVERSA:
      ${history.map(m => `${m.role === 'user' ? 'Paciente' : 'Assistente'}: ${m.text}`).join('\n')}
      
      PERGUNTA ATUAL: ${question}
    `;

        try {
            const result = await model.generateContent(contextPrompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Erro no Chat AI:", error);
            return "Ops! Tive um pequeno problema técnico. Pode repetir a pergunta?";
        }
    }
};

function calculateAge(birthDate?: string): number {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}
