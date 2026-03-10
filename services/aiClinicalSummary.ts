import { IndividualReportSnapshot } from '../types';
import { OpenRouterService } from './ai/openRouterService';

export const AIClinicalSummaryService = {
  /**
   * Generates a clinical summary text based on the report snapshot.
   */
  generateSummary: async (snapshot: IndividualReportSnapshot): Promise<string> => {
    console.log('[AI Clinical] Iniciando resumo com OpenRouter...');

    try {
      const prompt = buildPrompt(snapshot);

      const aiResponse = await OpenRouterService.ask({
        prompt: prompt,
        role: 'professional',
        temperature: 0.3
      });

      if (aiResponse) {
        return aiResponse.trim();
      }
      throw new Error("Empty response from AI");

    } catch (error: any) {
      console.error("[AI Clinical] Falha no resumo:", error?.message || error);
      return getFallbackSummary(snapshot);
    }
  }
};

function buildPrompt(snapshot: IndividualReportSnapshot): string {
  // Helpers for evolution analysis
  const history = snapshot.anthropometry.history;
  const first = history[0];
  const last = history[history.length - 1];

  const data = {
    patient: {
      name: snapshot.patient.name,
      age: snapshot.patient.birthDate ? new Date().getFullYear() - new Date(snapshot.patient.birthDate).getFullYear() : '?',
      gender: snapshot.patient.gender,
      objective: snapshot.patient.clinicalSummary?.clinicalGoal || 'Não definido'
    },
    metrics: snapshot.metrics,
    diagnoses: snapshot.clinical.activeDiagnoses,
    anamnesis: snapshot.clinical.anamnesisSummary,
    // Evolution Data (Key for Chart Explanations)
    evolution: history.length > 1 ? {
      periodDays: Math.ceil((new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 3600 * 24)),
      weightChange: (last.weight - first.weight).toFixed(1),
      fatPercentageChange: last.bodyFatPercentage && first.bodyFatPercentage ? (last.bodyFatPercentage - first.bodyFatPercentage).toFixed(1) : 'N/A',
      leanMassChange: last.leanMass && first.leanMass ? (last.leanMass - first.leanMass).toFixed(1) : 'N/A',
      waistChange: (last.waistCircumference || last.circWaist || 0) - (first.waistCircumference || first.circWaist || 0),
      historyPoints: history.length
    } : 'Dados insuficientes para evolução',
    currentStatus: snapshot.anthropometry.current ? {
      bmi: snapshot.anthropometry.current.anthro.bodyComp.bmi,
      weight: snapshot.anthropometry.current.anthro.weightKg,
      bodyFat: snapshot.anthropometry.current.anthro.bodyComp.bodyFatPct,
      leanMass: snapshot.anthropometry.current.anthro.bodyComp.leanMassKg
    } : 'Sem dados recentes',
    adherence: {
      score: snapshot.adherence.score,
      recentCount: snapshot.adherence.history.length
    },
    plan: snapshot.nutritional.activePlanTitle || 'Nenhum ativo',
    recentExams: snapshot.exams.slice(0, 3).map(e => `${e.name}: ${e.status}. ${e.analysisResult?.summary || ''}`),
    recentNotes: snapshot.clinical.notes.slice(-2).map(n => n.content)
  };

  return `
    Você é um cientista de dados clínicos e nutricionista sênior. 
    Sua missão é gerar um RELATÓRIO DE EVOLUÇÃO COMPLETO e EXPLICATIVO para ser entregue ao paciente.
    O relatório deve ler e INTERPRETAR os gráficos de evolução implícitos nos dados abaixo.

    ESTRUTURA OBRIGATÓRIA DA RESPOSTA:

    1. **ANÁLISE NARRATIVA DO QUADRO**: Um parágrafo acolhedor e técnico sobre o momento atual do paciente.
    
    2. **INTERPRETAÇÃO DOS GRÁFICOS DE EVOLUÇÃO**: 
       - Analise a tendência nos gráficos:
         * **"Dinâmica de Composição"** (Massa Gorda vs. Massa Magra).
         * **"Dinâmica de Perdas e Ganhos"** (Variação de Circunferências).
         * **"Gordura Localizada"** (Variação de Dobras Cutâneas).
       - Se houve perda de gordura e ganho/manutenção de massa magra, explique a "Recomposição Corporal".
       - Comente sobre a redução de medidas (Cintura/Abdômen) e o impacto no risco metabólico.
       - Use os dados de "evolution" para quantificar os resultados (ex: "Desde o início, observamos uma redução de X kg de gordura...").

    3. **ADESÃO E COMPORTAMENTO**:
       - Interprete o score de adesão (${data.adherence.score}%). 
       - Relacione a adesão com os resultados obtidos (ex: "Sua alta adesão reflete diretamente na melhora do perfil lipídico...").

    4. **PARECER TÉCNICO E PRÓXIMOS PASSOS**:
       - Baseado nos exames e evolução, qual deve ser o foco clínico agora?

    REGRAS:
    - Responda em Markdown.
    - Use um tom de "Consultoria de Alta Performance".
    - Seja detalhado e explicativo, não apenas liste números.
    - Se houver diagnósticos ativos, relacione os resultados a eles (ex: melhora da glicemia para DM2).

    DADOS BRUTOS:
    ${JSON.stringify(data)}
  `;
}

function getFallbackSummary(snapshot: IndividualReportSnapshot): string {
  const age = new Date().getFullYear() - new Date(snapshot.patient.birthDate).getFullYear();
  const diags = snapshot.clinical.activeDiagnoses.length > 0 ? snapshot.clinical.activeDiagnoses.join(', ') : 'Nenhum diagnóstico ativo registrado';
  const plan = snapshot.nutritional.activePlanTitle ? `Segue plano "${snapshot.nutritional.activePlanTitle}"` : 'Sem plano nutricional ativo';
  const anthro = snapshot.anthropometry.current
    ? `IMC atual de ${snapshot.anthropometry.current.anthro.bodyComp.bmi}`
    : 'Sem antropometria recente';

  return `
    **Resumo Automático (Offline):**
    Paciente de ${age} anos, sexo ${snapshot.patient.gender}.
    Diagnósticos: ${diags}.
    Estado Nutricional: ${anthro}. ${plan}.
    Histórico: ${snapshot.metrics.totalAppointments} consultas realizadas desde ${snapshot.metrics.patientSince}.
  `;
}
