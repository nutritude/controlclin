import { PlanSnapshot } from '../../types';

export interface AdherenceTip {
    category: string;
    tip: string;
    rationale: string;
}

export interface AdherenceAnalysis {
    summary: string;
    tips: AdherenceTip[];
    idealTiming?: string;
}

export const AIAdherenceService = {
    /**
     * Gera dicas de adesão personalizadas baseadas no contexto clínico do paciente.
     */
    async generateTips(snapshot: PlanSnapshot): Promise<AdherenceAnalysis> {
        const { patient } = snapshot;
        const diagnoses = patient.diagnoses.join(', ') || 'Nenhum diagnóstico específico';

        // Simulação de IA (Substituir por chamada real ao LLM quando disponível no backend)
        // Por enquanto, implementaremos lógica baseada em regras inteligentes para rapidez

        const analysis: AdherenceAnalysis = {
            summary: `Estratégia personalizada para ${patient.name} focando em ${patient.objective}.`,
            tips: []
        };

        // Lógica baseada em Diagnósticos
        if (diagnoses.toLowerCase().includes('hipertensão') || diagnoses.toLowerCase().includes('has')) {
            analysis.tips.push({
                category: 'Controle de Sódio',
                tip: 'Vire o frasco de sal e use temperos naturais (limão, ervas, alho).',
                rationale: 'Reduzir a pressão arterial e evitar retenção hídrica.'
            });
        }

        if (diagnoses.toLowerCase().includes('diabetes') || diagnoses.toLowerCase().includes('resistência à insulina')) {
            analysis.tips.push({
                category: 'Índice Glicêmico',
                tip: 'Sempre combine frutas com uma fibra (chia/aveia) ou proteína.',
                rationale: 'Evita picos de insulina e controla a saciedade.'
            });
        }

        // Lógica baseada em Objetivo
        if (patient.objective.toLowerCase().includes('emagrecimento') || patient.objective.toLowerCase().includes('perda de peso')) {
            analysis.tips.push({
                category: 'Hidratação Estratégica',
                tip: 'Beba 500ml de água 20 minutos antes das grandes refeições.',
                rationale: 'Aumenta a distensão gástrica e reduz a ingestão calórica voluntária.'
            });
            analysis.idealTiming = 'Focar em proteínas e fibras na última refeição para evitar fome noturna.';
        }

        if (patient.objective.toLowerCase().includes('hipertrofia') || patient.objective.toLowerCase().includes('ganho de massa')) {
            analysis.tips.push({
                category: 'Janela de Oportunidade',
                tip: 'Priorize o consumo de 20-30g de proteína no pós-treino imediato.',
                rationale: 'Maximiza a síntese proteica muscular.'
            });
            analysis.idealTiming = 'Distribuição proteica equalitária em todas as 4-6 refeições.';
        }

        // Dica Geral de Ouro
        analysis.tips.push({
            category: 'Poder do Planejamento',
            tip: 'Prepare as marmitas no domingo para os dias de maior correria.',
            rationale: 'Evita a escolha por "conveniência" (fast-food) sob estresse.'
        });

        return analysis;
    }
};
