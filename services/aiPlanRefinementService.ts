import { Meal, PlanSnapshot } from '../types';
import { OpenRouterService } from './ai/openRouterService';

export const AIPlanRefinementService = {
    /**
     * Reescreve os nomes dos alimentos no plano para uma linguagem amigável e convencional,
     * mantendo as porções e informações técnicas precisas.
     */
    async refinePlanLanguage(plan: Meal[]): Promise<Meal[]> {
        console.log('[AI Refinement] Iniciando humanização do plano...');

        try {
            const prompt = `
        Você é um nutricionista focado em experiência do paciente.
        Abaixo está uma lista de refeições de um plano alimentar. 
        Muitos alimentos vieram diretamente de um banco de dados técnico e estão com nomes pouco naturais (ex: "Pão, trigo, forma, integral" ou "Arroz, branco, cozido").

        Sua tarefa é identificar esses nomes técnicos e convertê-los para nomes AMIGÁVEIS e APETITOSOS que uma pessoa comum usaria (ex: "Pão de forma integral" ou "Arroz branco").

        REGRAS DE OURO:
        1. Identifique nomes que usem vírgulas para separar atributos (ex: "Alimento, tipo, estado") e transforme-os em linguagem fluida.
        2. Mantenha a essência do alimento.
        3. NÃO altere quantidades ou porções.
        4. Retorne EXATAMENTE o mesmo JSON de entrada, apenas com o campo "customName" de cada item atualizado.
        5. Se um item já tiver um nome amigável ou personalizado pelo profissional, mantenha-o.

        PLANO ATUAL:
        ${JSON.stringify(plan)}
      `;

            const aiResponse = await OpenRouterService.ask({
                prompt: prompt,
                role: 'professional',
                temperature: 0.3
            });

            if (aiResponse) {
                const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleanJson) as Meal[];
            }
            throw new Error("Resposta vazia da IA");

        } catch (error: any) {
            console.error("[AI Refinement] Falha na humanização:", error?.message || error);
            return plan; // Fallback para o plano original
        }
    }
};
