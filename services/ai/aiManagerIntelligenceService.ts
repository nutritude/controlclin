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
    aggregatedData?: {
        picaDistribution: Record<string, number>;
        mipanDistribution: Record<string, number>;
        goalDistribution: Record<string, number>;
        financialTrend: Array<{ month: string, amount: number }>;
    };
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

            ANÁLISE AGREGADA DE TODOS OS PACIENTES:
            - Distribuição PICA: ${JSON.stringify(data.aggregatedData?.picaDistribution || {})}
            - Distribuição MIPAN: ${JSON.stringify(data.aggregatedData?.mipanDistribution || {})}
            - Objetivos Comuns: ${JSON.stringify(data.aggregatedData?.goalDistribution || {})}
            - Tendência Financeira (Últimos meses): ${JSON.stringify(data.aggregatedData?.financialTrend || [])}

            AMOSTRA DE PERFIS RECENTES:
            ${JSON.stringify(data.patientsSummary.slice(0, 5))}

            CRITÉRIO DE FALTA DE DADOS:
            Se houver poucos pacientes (< 3) ou nenhuma transação paga, informe no campo "analysis" que os dados são preliminares/insuficientes para projeções robustas.

            SAÍDA ESPERADA (JSON):
            {
                "financial": {
                    "projection30d": 0, 
                    "projection60d": 0,
                    "analysis": "...",
                    "bottleneck": "...",
                    "hasSufficientData": true 
                },
                "opportunities": [
                    {
                        "type": "UP-SELL|CROSS-SELL",
                        "title": "...",
                        "description": "...",
                        "targetProfile": "..."
                    }
                ],
                "marketGaps": {
                    "commonDeficiencies": ["..."],
                    "suggestedProducts": ["..."],
                    "supplementOpportunities": ["..."]
                }
            }

            Responda APENAS o JSON em português. Sem emojis.
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
