
import { GoogleGenAI } from "@google/genai";
import { PlanSnapshot, AIAnalysisResult } from '../types';

export const AIPlanAnalysisService = {
  /**
   * Analyzes the nutritional plan using Gemini Flash 2.5 or falls back to a deterministic analysis.
   */
  analyzePlan: async (snapshot: PlanSnapshot): Promise<AIAnalysisResult> => {
    const apiKey = process.env.API_KEY;

    if (!apiKey || apiKey.length === 0) {
      console.warn("API_KEY missing. Returning fallback analysis.");
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
          temperature: 0.3, // Low temperature for consistent adherence to guidelines
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as AIAnalysisResult;
      }
      throw new Error("Empty response from AI");

    } catch (error) {
      console.error("AI Analysis Failed:", error);
      return getFallbackAnalysis(snapshot);
    }
  }
};

/**
 * Constructs the prompt for the AI, strictly defining the output schema and clinical guidelines.
 */
function buildPrompt(snapshot: PlanSnapshot): string {
  return `
    Você é um nutricionista sênior especialista no Guia Alimentar para a População Brasileira.
    Analise o seguinte plano alimentar (snapshot JSON) e gere um relatório clínico.

    REGRAS RÍGIDAS DE EXECUÇÃO (CRÍTICO):
    1. PERCORRA TODAS AS REFEIÇÕES DO PLANO (Café, Lanches, Almoço, Jantar, Ceia, etc.).
    2. ANALISE TODOS OS ALIMENTOS DE CADA REFEIÇÃO. Não faça amostragem.
    3. Para cada item, verifique a adequação ao objetivo e ao Guia Alimentar.
    4. NÃO invente números, calorias ou macros. Use apenas os fornecidos no snapshot.
    5. Suas substituições devem priorizar alimentos in natura ou minimamente processados.
    6. Evite sugerir ultraprocessados.
    7. Responda ESTRITAMENTE com o JSON Schema abaixo.

    DADOS DO PACIENTE:
    - Idade: ${snapshot.patient.age}, Sexo: ${snapshot.patient.gender}
    - Objetivo: ${snapshot.patient.objective}
    - Diagnósticos: ${snapshot.patient.diagnoses.join(', ') || 'Nenhum'}
    - Meta Kcal: ${snapshot.patient.kcalTarget} (Atual do plano: ${snapshot.totals.kcal})
    
    ESTRUTURA DO PLANO (ANALISAR 100%):
    ${JSON.stringify(snapshot.plan.meals)}

    JSON OUTPUT SCHEMA:
    {
      "summary": "Resumo executivo da adequação do plano ao objetivo do paciente (max 3 frases).",
      "guidelines": {
        "adherence": "LOW|MEDIUM|HIGH",
        "keyFindings": ["Ponto positivo 1", "Ponto de atenção 1"],
        "risks": ["Risco potencial se houver (ex: baixo teor de fibra)"],
        "nextActions": ["Ação sugerida 1"]
      },
      "mealFeedback": [
        { "mealName": "Nome da Refeição", "notes": ["Obs 1"], "simpleFixes": ["Ajuste simples"] }
      ],
      "substitutions": [
        {
          "foodName": "Nome do Alimento Original",
          "foodCategory": "Categoria",
          "replacements": [
            { "name": "Substituto 1", "reason": "Motivo (ex: mais fibra)", "guideTag": "in_natura" }
          ]
        }
      ],
      "disclaimers": ["Avisos legais padrão"]
    }
    
    Gere 5 substituições simples para os principais alimentos do plano.
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
