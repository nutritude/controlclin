import { IndividualReportSnapshot } from '../types';
import { AIService } from './ai/aiService';

export const AIClinicalSummaryService = {
  /**
   * Generates a clinical summary text based on the report snapshot.
   */
  generateSummary: async (snapshot: IndividualReportSnapshot): Promise<string> => {
    console.log('[AI Clinical] Iniciando resumo inteligente...');

    try {
      const prompt = buildPrompt(snapshot);

      const aiResponse = await AIService.ask({
        prompt: prompt,
        role: 'professional',
        temperature: 0.3,
        model: 'google/gemini-1.5-flash'
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
    Você é um nutricionista clínico focado em comunicação clara e empática para o paciente.
    Sua missão é gerar um RESUMO CLÍNICO E COMPORTAMENTAL SIMPLIFICADO para o paciente ler.

    REGRAS CRÍTICAS:
    1. O texto deve ter NO MÁXIMO 10 LINHAS.
    2. Linguagem extremamente simples e motivadora (evite termos técnicos complexos demais).
    3. Foque no progresso atual e no que ele precisa fazer para continuar melhorando.
    4. NÃO use tabelas ou listas longas.
    5. O resumo deve ser focado no USO do paciente, não de outros profissionais.

    Estrutura:
    - Um parágrafo sobre como ele está (baseado na evolução dos dados).
    - O foco principal desta etapa do plano.
    - Uma frase final de incentivo.

    DADOS BRUTOS PARA ANÁLISE:
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
