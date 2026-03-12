import { Meal } from '../types';
import { AIService } from './ai/aiService';

export const AIPlanRefinementService = {
    /**
     * Humaniza os nomes dos alimentos.
     * OTIMIZAÇÃO EXTREMA: Envia apenas os nomes sem contexto adicional desnecessário.
     */
    async refinePlanLanguage(meals: Meal[]): Promise<Meal[]> {
        console.log('[AI Refinement] Humanizando nomes técnicos...');

        const technicalNames = new Set<string>();
        meals.forEach(m => m.items.forEach(it => {
            if (!it.customName && (it.name.includes(',') || it.name.length > 15)) {
                technicalNames.add(it.name);
            }
        }));

        if (technicalNames.size === 0) return meals;

        const list = Array.from(technicalNames);
        const prompt = `Atue como nutricionista clínico. Converta estes nomes técnicos de alimentos em nomes amigáveis e curtos para um cardápio (sem vírgulas invertidas). 
        Retorne APENAS um objeto JSON plano onde a chave é o nome técnico e o valor é o nome amigável.
        
        Exemplo: {"Arroz, branco, cozido": "Arroz branco"}
        
        LISTA:
        ${list.join('\n')}`;

        try {
            const response = await AIService.ask({
                prompt: prompt,
                role: 'professional',
                temperature: 0, // Zero para máxima consistência e velocidade
                model: 'google/gemini-2.5-flash'
            });

            if (response) {
                // Regex para localizar o JSON caso a IA envie texto extra
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const mapping = JSON.parse(jsonMatch[0]);
                    return meals.map(meal => ({
                        ...meal,
                        items: meal.items.map(item => {
                            if (mapping[item.name]) {
                                return { ...item, customName: mapping[item.name] };
                            }
                            return item;
                        })
                    }));
                }
            }
            return meals;
        } catch (error) {
            console.error("[Refinement] Error:", error);
            return meals;
        }
    }
};
