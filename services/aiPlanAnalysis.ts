
import { GoogleGenAI } from "@google/genai";
import { PlanSnapshot, AIAnalysisResult } from '../types';

export const AIPlanAnalysisService = {
  /**
   * Analyzes the nutritional plan using Gemini Flash 2.5 or falls back to a deterministic analysis.
   */
  analyzePlan: async (snapshot: PlanSnapshot): Promise<AIAnalysisResult> => {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY);

    if (!apiKey || apiKey.length === 0) {
      console.warn("[AI Plan] VITE_GEMINI_API_KEY não encontrada. Usando análise offline.");
      return getFallbackAnalysis(snapshot);
    }
    console.log('[AI Plan] API Key detectada. Iniciando análise com Gemini...');

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = buildPrompt(snapshot);

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3, // Low temperature for consistent adherence to guidelines
        }
      });

      if (response && response.text) {
        return JSON.parse(response.text) as AIAnalysisResult;
      }
      throw new Error("Empty response from AI");

    } catch (error: any) {
      console.error("[AI Plan] Falha na análise:", error?.message || error);
      return getFallbackAnalysis(snapshot);
    }
  }
};

/**
 * Constructs the prompt for the AI, strictly defining the output schema and clinical guidelines.
 */
function buildPrompt(snapshot: PlanSnapshot): string {
  return `
    Você é um nutricionista clínico sênior com vasta experiência em dietoterapia e no Guia Alimentar para a População Brasileira.
    Analise o plano alimentar (snapshot JSON) para fornecer uma revisão clínica rigorosa.

    REGRAS RÍGIDAS DE EXECUÇÃO:
    1. QUALIDADE NUTRICIONAL: Avalie a densidade de nutrientes. Há excesso de ultraprocessados? Faltam fibras ou gorduras boas?
    2. ADEQUAÇÃO AO OBJETIVO: O balanço energético e a distribuição de macros estão alinhados com "${snapshot.patient.objective}"?
    3. MANEJO CLÍNICO: Considere os diagnósticos (${snapshot.patient.diagnoses.join(', ') || 'Nenhum'}). Há restrições necessárias (ex: sódio para HAS, índice glicêmico para DM2)?
    4. SUBSTITUIÇÕES INTELIGENTES: Sugira substituições que mantenham os macros mas melhorem a qualidade (ex: trocar pão branco por integral, ou frios por ovos).
    5. NÃO invente dados. Responda ESTRITAMENTE no formato JSON abaixo.

    DADOS DO PACIENTE:
    - Idade: ${snapshot.patient.age}, Sexo: ${snapshot.patient.gender}
    - Objetivo: ${snapshot.patient.objective}
    - Diagnósticos: ${snapshot.patient.diagnoses.join(', ') || 'Nenhum'}
    - Meta Kcal: ${snapshot.patient.kcalTarget} | Atual: ${snapshot.totals.kcal}
    - Macros Alvo (g): P:${snapshot.patient.macroTargets.protein} C:${snapshot.patient.macroTargets.carbs} G:${snapshot.patient.macroTargets.fat}
    - Macros Atuais (g): P:${snapshot.totals.protein} C:${snapshot.totals.carbs} G:${snapshot.totals.fat}
    
    ESTRUTURA DO PLANO:
    ${JSON.stringify(snapshot.plan.meals)}

    JSON OUTPUT SCHEMA (PORTUGUÊS):
    {
      "summary": "Análise técnica da viabilidade e qualidade do plano (max 4 frases).",
      "guidelines": {
        "adherence": "LOW|MEDIUM|HIGH",
        "keyFindings": ["Ponto positivo/negativo técnico", "..."],
        "risks": ["Risco clínico ou nutricional detectado", "..."],
        "nextActions": ["Sugestão de ajuste para o profissional", "..."]
      },
      "mealFeedback": [
        { "mealName": "Nome da Refeição", "notes": ["Avaliação específica"], "simpleFixes": ["Sugestão de melhora rápida"] }
      ],
      "substitutions": [
        {
          "foodName": "Alimento Alvo",
          "foodCategory": "Categoria",
          "replacements": [
            { "name": "Opção Superior", "reason": "Justificativa nutricional", "guideTag": "in_natura|minimamente_processado" }
          ]
        }
      ],
      "disclaimers": ["Nota de responsabilidade clínica"]
    }
  `;
}

/**
 * Deterministic fallback when AI is unavailable.
 * Checks basic math and guidelines rules programmatically.
 */
function getFallbackAnalysis(snapshot: PlanSnapshot): AIAnalysisResult {
  const diffKcal = snapshot.totals.kcal - snapshot.patient.kcalTarget;
  const percentDiff = (diffKcal / snapshot.patient.kcalTarget) * 100;

  const adherence = Math.abs(percentDiff) < 10 ? "HIGH" : Math.abs(percentDiff) < 20 ? "MEDIUM" : "LOW";

  const risks = [];
  if (snapshot.totals.fiber < 25) risks.push("Fibras abaixo da recomendação geral (25g).");
  if (percentDiff < -20) risks.push("Déficit calórico muito agressivo (>20%).");
  if (percentDiff > 20) risks.push("Superávit calórico excessivo (>20%).");

  const mealFeedback = snapshot.plan.meals.map(m => ({
    mealName: m.name,
    notes: [`Contém ${m.items.length} itens.`],
    simpleFixes: []
  }));

  return {
    summary: `Análise determinística (Modo Offline). O plano está com ${snapshot.totals.kcal} kcal, o que representa uma variação de ${percentDiff.toFixed(1)}% em relação à meta.`,
    guidelines: {
      adherence: adherence,
      keyFindings: [
        `Proteína Total: ${snapshot.totals.protein}g`,
        `Carboidratos Totais: ${snapshot.totals.carbs}g`,
        `Gorduras Totais: ${snapshot.totals.fat}g`
      ],
      risks: risks,
      nextActions: ["Revisar metas calóricas manualmente.", "Verificar micronutrientes na tabela detalhada."]
    },
    mealFeedback: mealFeedback,
    substitutions: [], // No smart substitutions in fallback mode
    disclaimers: ["Esta é uma análise preliminar baseada em regras matemáticas simples. A IA está indisponível no momento."],
    isFallback: true
  };
}
