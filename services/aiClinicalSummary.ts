
import { GoogleGenAI } from "@google/genai";
import { IndividualReportSnapshot } from '../types';

export const AIClinicalSummaryService = {
  /**
   * Generates a clinical summary text based on the report snapshot.
   */
  generateSummary: async (snapshot: IndividualReportSnapshot): Promise<string> => {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY);

    if (!apiKey || apiKey.length === 0) {
      console.warn("[AI Clinical] VITE_GEMINI_API_KEY não encontrada. Usando resumo offline.");
      return getFallbackSummary(snapshot);
    }
    console.log('[AI Clinical] API Key detectada. Gerando resumo com Gemini...');

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = buildPrompt(snapshot);

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          temperature: 0.3, // Low temperature to prevent hallucination
        }
      });

      if (response && response.text) {
        return response.text;
      }
      throw new Error("Empty response from AI");

    } catch (error: any) {
      console.error("[AI Clinical] Falha no resumo:", error?.message || error);
      return getFallbackSummary(snapshot);
    }
  }
};

function buildPrompt(snapshot: IndividualReportSnapshot): string {
  const data = {
    patient: {
      age: snapshot.patient.birthDate ? new Date().getFullYear() - new Date(snapshot.patient.birthDate).getFullYear() : '?',
      gender: snapshot.patient.gender
    },
    metrics: snapshot.metrics,
    diagnoses: snapshot.clinical.activeDiagnoses,
    anamnesis: snapshot.clinical.anamnesisSummary,
    latestAnthro: snapshot.anthropometry.current
      ? {
        bmi: snapshot.anthropometry.current.anthro.bodyComp.bmi,
        weight: snapshot.anthropometry.current.anthro.weightKg,
        bodyFat: snapshot.anthropometry.current.anthro.bodyComp.bodyFatPct
      }
      : 'Sem dados recentes',
    anthroHistoryCount: snapshot.anthropometry.history.length,
    plan: snapshot.nutritional.activePlanTitle || 'Nenhum ativo',
    recentExams: snapshot.exams.slice(0, 3).map(e => `${e.name} (${e.status})`),
    lastEvents: snapshot.timeline.slice(0, 5).map(e => `${e.summary} em ${e.createdAt.split('T')[0]}`)
  };

  return `
    Você é um assistente de redação clínica de alto nível. Sua tarefa é converter os dados brutos de um paciente em um resumo narrativo profissional para compor o relatório de evolução.

    ESTRUTURA DO RELATÓRIO:
    1. PERFIL E QUADRO CLÍNICO: Descreva brevemente o paciente e seus diagnósticos ativos principais.
    2. STATUS NUTRICIONAL E ADESÃO: Analise o estado antropométrico atual vs meta, e comente sobre a adesão ao plano nutricional.
    3. EVOLUÇÃO E CONDUTA: Sintetize os eventos recentes e exames, sugerindo o foco para o próximo período.

    REGRAS DE OURO:
    - Use terminologia técnica adequada (ex: eutrofia, sarcopenia, dislipidemia).
    - Mantenha o tom formal e conciso.
    - NÃO extrapole dados. Se algo não estiver no JSON, não mencione.
    - Responda em PORTUGUÊS (PT-BR).

    DADOS BRUTOS (JSON):
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
