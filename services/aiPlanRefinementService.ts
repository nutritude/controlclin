import { Meal } from '../types';
import { AIService } from './ai/aiService';

export const AIPlanRefinementService = {
    /**
     * Humaniza os nomes dos alimentos e reescreve observações das refeições.
     * CORRIGIDO: filtro anterior era restritivo demais (exigia vírgula ou >15 chars)
     */
    async refinePlanLanguage(meals: Meal[]): Promise<Meal[]> {
        console.log('[AI Refinement] Humanizando nomes técnicos...');

        // Coleta TODOS os nomes que ainda não foram humanizados (sem customName)
        const technicalNames = new Set<string>();
        meals.forEach(m => m.items.forEach(it => {
            if (!it.customName) {
                technicalNames.add(it.name);
            }
            if (it.substitutes && it.substitutes.length > 0) {
                it.substitutes.forEach(sub => {
                    if (!sub.customName) technicalNames.add(sub.name);
                });
            }
        }));

        // Coleta observações das refeições para humanizar
        const mealNotes: Record<string, string> = {};
        meals.forEach(m => {
            if (m.notes && m.notes.trim()) {
                mealNotes[m.name] = m.notes;
            }
        });

        if (technicalNames.size === 0 && Object.keys(mealNotes).length === 0) return meals;

        const list = Array.from(technicalNames);

        let prompt = `Atue como nutricionista clínico humanizando um cardápio para o paciente. 

TAREFA 1: Converta estes nomes técnicos de alimentos em nomes amigáveis e curtos para um cardápio impresso. Sem vírgulas invertidas. Mantenha o alimento reconhecível.
Retorne um JSON com chave "foods" contendo um objeto onde a chave é o nome técnico e o valor o amigável.

LISTA DE ALIMENTOS:
${list.join('\n')}`;

        if (Object.keys(mealNotes).length > 0) {
            prompt += `

TAREFA 2: Reescreva estas observações das refeições de modo INFORMAL, ATRATIVA e FUNCIONAL para o paciente leigo.
Adicione ao JSON uma chave "notes" com objeto onde a chave é o nome da refeição e o valor a observação reescrita.

OBSERVAÇÕES:
${Object.entries(mealNotes).map(([name, note]) => `${name}: ${note}`).join('\n')}`;
        }

        prompt += `

Retorne APENAS o JSON resultante. Exemplo:
{"foods": {"Arroz, branco, cozido": "Arroz branco"}, "notes": {"Almoço": "Capricha no azeite na salada! 🥗"}}`;

        try {
            const response = await AIService.ask({
                prompt: prompt,
                role: 'professional',
                temperature: 0.3,
                model: 'google/gemini-1.5-flash'
            });

            if (response) {
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    const foodMapping = result.foods || result;
                    const noteMapping = result.notes || {};

                    return meals.map(meal => ({
                        ...meal,
                        notes: noteMapping[meal.name] || meal.notes,
                        items: meal.items.map(item => {
                            let newItem = { ...item };
                            if (foodMapping[item.name]) {
                                newItem.customName = foodMapping[item.name];
                            }
                            if (newItem.substitutes && newItem.substitutes.length > 0) {
                                newItem.substitutes = newItem.substitutes.map(sub => {
                                    if (foodMapping[sub.name]) {
                                        return { ...sub, customName: foodMapping[sub.name] };
                                    }
                                    return sub;
                                });
                            }
                            return newItem;
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
