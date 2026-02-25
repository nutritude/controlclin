
import { GoogleGenAI } from "@google/genai";
import { AnthroSnapshot, AnthroAnalysisResult } from '../types';

export const AIAnthroAnalysisService = {
  /**
   * Generates a clinical analysis based on the anthropometry snapshot.
   */
  analyze: async (snapshot: AnthroSnapshot): Promise<AnthroAnalysisResult> => {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY);

    if (!apiKey || apiKey.length === 0) {
      console.warn("[AI Anthro] VITE_GEMINI_API_KEY não encontrada. Usando análise offline.");
      return getFallbackAnalysis(snapshot);
    }
    console.log('[AI Anthro] API Key detectada. Iniciando análise com Gemini...');

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = buildPrompt(snapshot);

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2, // Low temp for clinical consistency
        }
      });

      if (response && response.text) {
        return JSON.parse(response.text) as AnthroAnalysisResult;
      }
      throw new Error("Empty response from AI");

    } catch (error: any) {
      console.error("[AI Anthro] Falha na análise:", error?.message || error);
      return getFallbackAnalysis(snapshot);
    }
  }
};

function buildPrompt(snapshot: AnthroSnapshot): string {
  return `
    Você é um especialista em fisiologia do exercício e nutrição clínica com foco em cineantropometria.
    Analise o snapshot antropométrico abaixo para fornecer uma interpretação clínica profunda.
    
    REGRAS RÍGIDAS DE ANÁLISE:
    1. AVALIAÇÃO DE COMPOSIÇÃO: Vá além do IMC. Avalie se a gordura está em níveis atléticos, saudáveis ou de risco para a idade/sexo.
    2. RISCO METABÓLICO: Use a Relação Cintura-Quadril (RCQ) e Circunferência de Cintura para estratificar risco de doenças cardiovasculares e resistência à insulina.
    3. MASSA MUSCULAR: Estime se a massa magra está adequada ou se há sinais de sarcopenia/descondicionamento.
    4. CONTEXTO CLÍNICO: Relacione as medidas com os diagnósticos ativos (ex: impacto da obesidade na HAS/Diabetes).
    5. NÃO invente dados. Se algo faltar (ex: dobras), indique a impossibilidade de análise específica.
    6. Suas recomendações devem ser práticas e baseadas em evidências.

    PACIENTE:
    - Sexo: ${snapshot.patient.gender}, Idade: ${snapshot.patient.age}
    - Objetivo: ${snapshot.clinical.objective || 'Não informado'}
    - Diagnósticos Ativos: ${snapshot.clinical.activeDiagnoses.join(', ') || 'Nenhum registrado'}

    SNAPSHOT DE DADOS:
    - Peso: ${snapshot.anthro.weightKg}kg, Altura: ${snapshot.anthro.heightM}m
    - IMC: ${snapshot.anthro.bodyComp.bmi}
    - Gordura Corporal Est.: ${snapshot.anthro.bodyComp.bodyFatPct || '?'}%
    - Massa Magra Est.: ${snapshot.anthro.bodyComp.leanMassKg || '?'}kg
    - RCQ: ${snapshot.anthro.bodyComp.whr || '?'}
    - Circunferência Cintura: ${snapshot.anthro.circumferencesCm.waist || '?'} cm
    - Circunferência Abdominal: ${snapshot.anthro.circumferencesCm.abdomen || '?'} cm

    JSON OUTPUT SCHEMA (RETORNE APENAS O JSON):
    {
      "summary": "Relato clínico detalhado, integrando peso, composição e riscos (max 4 frases).",
      "keyFindings": ["Achado metabólico/estrutural relevante", "..."],
      "risks": ["Risco específico identificado (ex: Gordura Visceral)", "..."],
      "recommendedActions": ["Ação imediata recomendada", "..."],
      "measureDiagnosticsCross": [
         { "measure": "Medida", "value": "Valor", "meaning": "Interpretação fisiológica", "linkedDiagnoses": ["Diagnóstico impactado"] }
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
