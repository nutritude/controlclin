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
        Você é um nutricionista com foco em comunicação humanizada.
        Abaixo está uma lista de refeições de um plano alimentar com nomes de alimentos que podem estar em formato técnico de banco de dados (ex: "Arroz Branco Cozido", "Pão de forma integral").
        
        Sua tarefa é reescrever os nomes dos alimentos (customName) para uma linguagem AMIGÁVEL e CONVENCIONAL que um paciente entenda perfeitamente.
        
        REGRAS:
        1. Mantenha a essência do alimento e a porção técnica.
        2. NÃO altere as quantidades (gramas, unidades). Use-as para tornar a descrição clara.
        3. Se o nome já estiver amigável, mantenha-o.
        4. Retorne EXATAMENTE o mesmo JSON de entrada (array de refeições), mas com o campo "customName" de cada item atualizado.
        5. NÃO adicione ou remova itens ou refeições.
        
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
