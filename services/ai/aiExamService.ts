
import { GoogleGenAI } from "@google/genai";
import { Exam, ExamMarker, ExamAnalysisResult, Patient } from '../../types';
import { LaboratService } from '../laboratService';

export const AIExamService = {
    /**
     * Extrai marcadores de um texto (OCR) utilizando Gemini
     */
    extractMarkers: async (text: string): Promise<ExamMarker[]> => {
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
        if (!apiKey) return [];

        const genAI = new GoogleGenAI({ apiKey });

        const prompt = `
      Você é um especialista em biomedicina e extração de dados laboratoriais.
      Analise o texto abaixo extraído de um exame e retorne os dados estruturados no formato JSON.
      Ignore cabeçalhos e rodapés irrelevantes. Foque em: Nome do exame/marcador, Valor numérico, Unidade de medida.

      REGRAS:
      1. Extraia apenas o valor numérico (remova vírgulas por pontos se necessário).
      2. Tente identificar a unidade (mg/dL, %, uUI/mL, etc).
      3. Retorne no formato: [{"name": "Glicose", "value": 95, "unit": "mg/dL"}, ...]

      TEXTO DO EXAME:
      ${text}
    `;

        try {
            const response = await genAI.models.generateContent({
                model: "gemini-1.5-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            const raw = JSON.parse(response.text);
            return LaboratService.processMarkers(raw);
        } catch (error) {
            console.error("Erro na extração AI:", error);
            return [];
        }
    },

    /**
     * Realiza a análise clínica e cruzamento de dados de um ou mais exames
     */
    analyzeResults: async (patient: Patient, exams: Exam[]): Promise<ExamAnalysisResult> => {
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;

        // Coletar todos os marcadores de todos os exames passados
        const allMarkers = exams.flatMap(e => e.markers || []);

        if (!apiKey) return getFallbackAnalysis(allMarkers);

        const genAI = new GoogleGenAI({ apiKey });

        const prompt = `
      Você é um Nutricionista Clínico Funcional e Especialista em Medicina Laboratorial.
      Analise os resultados laboratoriais do paciente ${patient.name} (${patient.gender}, ${calculateAge(patient.birthDate)} anos).
      
      CONTEXTO CLÍNICO:
      Diagnósticos: ${patient.clinicalSummary?.activeDiagnoses?.join(', ') || 'Nenhum'}
      Objetivo: ${patient.clinicalSummary?.clinicalGoal || 'Não definido'}

      RESULTADOS PARA ANÁLISE:
      ${JSON.stringify(allMarkers.map(m => ({
            marcador: m.name,
            valor: m.value,
            unidade: m.unit,
            referencia: m.reference.label,
            interpretacao: m.interpretation
        })))}

      ESTRUTURA DE RESPOSTA (JSON):
      {
        "summary": "Resumo clínico geral focando em saúde metabólica.",
        "findings": [
          { "marker": "Nome", "correlation": "Como este indicador afeta os outros ou o objetivo do paciente", "impact": "POSITIVO|NEUTRO|NEGATIVO" }
        ],
        "possibleCauses": ["Hipóteses para os valores alterados"],
        "suggestedTreatments": ["Sugestões nutricionais ou suplementares baseadas em diretrizes"],
        "nextSteps": ["Exames adicionais ou condutas imediatas"]
      }
    `;

        try {
            const response = await genAI.models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            return JSON.parse(response.text) as ExamAnalysisResult;
        } catch (error) {
            console.error("Erro na análise AI:", error);
            return getFallbackAnalysis(allMarkers);
        }
    }
};

function calculateAge(birthDate: string): number {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function getFallbackAnalysis(markers: ExamMarker[]): ExamAnalysisResult {
    const altered = markers.filter(m => m.interpretation !== 'NORMAL');
    return {
        summary: "Análise offline baseada em indicadores individuais.",
        findings: altered.map(m => ({
            marker: m.name,
            correlation: `Marcador identificado como ${m.interpretation}.`,
            impact: m.interpretation === 'NORMAL' ? 'POSITIVO' : 'NEGATIVO'
        })),
        possibleCauses: ["Necessário conexão com IA para cruzamento de dados."],
        suggestedTreatments: ["Consulte as diretrizes individuais de cada marcador na tabela."],
        nextSteps: ["Habilitar chave da IA para análise preditiva."],
        isFallback: true
    };
}
