import { AIService } from './aiService';

export interface ManagerIntelligenceData {
    stats: {
        revenue: number;
        ticketMedio: number;
        activePatients: number;
        appointmentsCount: number;
        noShowRate: number;
        topPathologies: Array<{ name: string, count: number }>;
    };
    recentTransactions: any[];
    patientsSummary: Array<{
        id: string,
        name: string,
        picaDiagnosis?: string,
        mipanClassification?: string,
        lastGoal?: string
    }>;
}

export const AIManagerIntelligenceService = {
    async analyzeIntelligence(data: ManagerIntelligenceData): Promise<any> {
        const prompt = `
            Você é um Consultor de Gestão e Estrategista de Negócios para Clínicas de Nutrição de Alto Padrão (ControlClin).
            Sua tarefa é analisar os dados da clínica para fornecer:
            1. Performance Financeira Preditiva (Fluxo de caixa futuro e gargalos).
            2. Oportunidades de Up-sell/Cross-sell (Sugestões baseada em PICA/MIPAN).
            3. Lacunas de Mercado (Novos produtos/suplementos baseado nas dores comuns).

            DADOS DA CLÍNICA:
            - Faturamento LTV: R$ ${data.stats.revenue}
            - Ticket Médio: R$ ${data.stats.ticketMedio}
            - Taxa de No-Show: ${data.stats.noShowRate}%
            - Patologias mais comuns: ${data.stats.topPathologies.map(p => `${p.name} (${p.count})`).join(', ')}
            - Total Pacientes Ativos: ${data.stats.activePatients}

            PERFIL DOS PACIENTES (Amostra):
            ${JSON.stringify(data.patientsSummary.slice(0, 10))}

            SAÍDA ESPERADA (JSON):
            {
                "financial": {
                    "projection30d": 0, // Estimativa monetária
                    "projection60d": 0,
                    "analysis": "Sua análise técnica sobre o fluxo de caixa.",
                    "bottleneck": "O principal gargalo financeiro detectado."
                },
                "opportunities": [
                    {
                        "type": "UP-SELL|CROSS-SELL",
                        "title": "Título da oportunidade",
                        "description": "Explicação do porquê isso é rentável e benéfico.",
                        "targetProfile": "Qual tipo de paciente se beneficia."
                    }
                ],
                "marketGaps": {
                    "commonDeficiencies": ["Dores/Carências comuns"],
                    "suggestedProducts": ["Ex: Linha de Whey próprio, Kit Detox, etc."],
                    "supplementOpportunities": ["Suplementos alvo baseados nas patologias"]
                }
            }

            Responda APENAS o JSON em português.
        `;

        try {
            const aiResponse = await AIService.ask({
                prompt: prompt,
                role: 'manager',
                temperature: 0.4
            });

            if (aiResponse) {
                const start = aiResponse.indexOf('{');
                const end = aiResponse.lastIndexOf('}');
                if (start !== -1 && end !== -1 && end > start) {
                    return JSON.parse(aiResponse.substring(start, end + 1));
                }
            }
            return null;
        } catch (error) {
            console.error('[AI Manager Intelligence] Error:', error);
            return null;
        }
    }
};
