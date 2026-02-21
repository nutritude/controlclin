
import { GoogleGenAI } from "@google/genai";
import { IndividualReportSnapshot } from '../types';

export const AIClinicalSummaryService = {
  /**
   * Generates a clinical summary text based on the report snapshot.
   */
  generateSummary: async (snapshot: IndividualReportSnapshot): Promise<string> => {
    const apiKey = process.env.API_KEY;

    if (!apiKey || apiKey.length === 0) {
      console.warn("API_KEY missing. Returning fallback summary.");
      return getFallbackSummary(snapshot);
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = buildPrompt(snapshot);

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature: 0.3, // Low temperature to prevent hallucination
        }
      });

      if (response.text) {
        return response.text;
      }
      throw new Error("Empty response from AI");

    } catch (error) {
      console.error("AI Clinical Summary Failed:", error);
      return getFallbackSummary(snapshot);
    }
  }
};

function buildPrompt(snapshot: IndividualReportSnapshot): string {
  // Minimize token usage by selecting only essential data
  const data = {
    patient: {
        age: new Date().getFullYear() - new Date(snapshot.patient.birthDate).getFullYear(),
        gender: snapshot.patient.gender
    },
    metrics: snapshot.metrics,
    diagnoses: snapshot.clinical.activeDiagnoses,
    anamnesis: snapshot.clinical.anamnesisSummary,
    latestAnthro: snapshot.anthropometry.current 
        ? { bmi: snapshot.anthropometry.current.anthro.bodyComp.bmi, weight: snapshot.anthropometry.current.anthro.weightKg } 
        : 'Sem dados recentes',
    anthroHistoryCount: snapshot.anthropometry.history.length,
    plan: snapshot.nutritional.activePlanTitle || 'Nenhum ativo',
    recentExams: snapshot.exams.slice(0, 3).map(e => `${e.name} (${e.status})`),
    lastEvents: snapshot.timeline.slice(0, 5).map(e => `${e.summary} em ${e.createdAt.split('T')[0]}`)
  };

  return `
    Atue como um assistente clínico sênior. Gere um resumo narrativo (texto corrido) do caso deste paciente para o relatório médico.
    
    REGRAS RÍGIDAS:
    1. NÃO invente números, valores de exames ou diagnósticos que não estejam listados abaixo.
    2. Use tom profissional e objetivo.
    3. Estruture em 3 parágrafos curtos: 
       - Visão Geral (Perfil, diagnósticos ativos).
       - Estado Atual (Última antropometria, plano alimentar, adesão).
       - Histórico Recente (Eventos relevantes da timeline).
    4. Se faltarem dados, apenas mencione "Dados de X não disponíveis".

    DADOS DO PACIENTE (JSON):
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
