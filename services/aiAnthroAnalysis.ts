
import { GoogleGenAI } from "@google/genai";
import { AnthroSnapshot, AnthroAnalysisResult } from '../types';

export const AIAnthroAnalysisService = {
  /**
   * Generates a clinical analysis based on the anthropometry snapshot.
   */
  analyze: async (snapshot: AnthroSnapshot): Promise<AnthroAnalysisResult> => {
    const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;

    if (!apiKey || apiKey.length === 0) {
      console.warn("GEMINI_API_KEY missing. Returning fallback anthropometry analysis.");
      return getFallbackAnalysis(snapshot);
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = buildPrompt(snapshot);

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2, // Very low temp for clinical consistency
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as AnthroAnalysisResult;
      }
      throw new Error("Empty response from AI");

    } catch (error) {
      console.error("AI Anthro Analysis Failed:", error);
      return getFallbackAnalysis(snapshot);
    }
  }
};

function buildPrompt(snapshot: AnthroSnapshot): string {
  return `
    Atue como um fisiologista ou nutricionista clínico sênior. Analise os dados antropométricos do paciente.
    
    REGRAS RÍGIDAS:
    1. NÃO invente números. Use apenas o que foi fornecido.
    2. Se faltarem dados (ex: dobras), indique "Dados insuficientes" para aquele ponto específico.
    3. Cruzar medidas com diagnósticos ativos SE existirem.
    4. Responda ESTRITAMENTE com o JSON Schema abaixo.

    PACIENTE:
    - Sexo: ${snapshot.patient.gender}, Idade: ${snapshot.patient.age}
    - Objetivo: ${snapshot.clinical.objective || 'Não informado'}
    - Diagnósticos: ${snapshot.clinical.activeDiagnoses.join(', ') || 'Nenhum registrado'}

    MEDIDAS ATUAIS:
    - Peso: ${snapshot.anthro.weightKg}kg, Altura: ${snapshot.anthro.heightM}m
    - IMC: ${snapshot.anthro.bodyComp.bmi}
    - Cintura: ${snapshot.anthro.circumferencesCm.waist || '?'} cm
    - RCQ (Cintura/Quadril): ${snapshot.anthro.bodyComp.whr || '?'}
    - Gordura Estimada: ${snapshot.anthro.bodyComp.bodyFatPct || '?'}%
    - Massa Muscular Est.: ${snapshot.anthro.bodyComp.leanMassKg || '?'}kg

    JSON OUTPUT SCHEMA:
    {
      "summary": "Resumo clínico curto e direto (max 3 frases).",
      "keyFindings": ["Achado 1 (ex: IMC elevado)", "Achado 2 (ex: RCQ indicando risco)"],
      "risks": ["Risco 1 (ex: Cardiometabólico se cintura alta)", "Risco 2"],
      "recommendedActions": ["Ação 1 (foco nutricional/exercício)", "Ação 2 (exames complementares?)"],
      "measureDiagnosticsCross": [
         { "measure": "Nome da Medida", "value": "Valor", "meaning": "Interpretação", "linkedDiagnoses": ["Diag Relacionado"] }
      ]
    }
  `;
}

function getFallbackAnalysis(snapshot: AnthroSnapshot): AnthroAnalysisResult {
  const { bmi, whr, bodyFatPct } = snapshot.anthro.bodyComp;
  const findings = [];
  const risks = [];

  // Deterministic Logic
  if (bmi > 25) findings.push(`IMC (${bmi}) indica sobrepeso/obesidade.`);
  else if (bmi < 18.5) findings.push(`IMC (${bmi}) indica baixo peso.`);
  else findings.push(`IMC (${bmi}) dentro da eutrofia.`);

  if (whr > 0) {
    const cutoff = snapshot.patient.gender === 'Masculino' ? 0.90 : 0.85;
    if (whr > cutoff) risks.push("Relação Cintura-Quadril elevada (Risco Cardiometabólico Aumentado).");
  }

  if (bodyFatPct === 0) risks.push("Percentual de gordura não calculado (dobras ausentes).");

  return {
    summary: `Análise preliminar (Offline). Paciente com IMC ${bmi}. ${findings.join(' ')}`,
    keyFindings: findings,
    risks: risks,
    recommendedActions: ["Preencher todas as dobras cutâneas para análise precisa.", "Monitorar circunferência abdominal."],
    isFallback: true
  };
}
