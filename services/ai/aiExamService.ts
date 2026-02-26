
import { GoogleGenAI } from "@google/genai";
import { Exam, ExamMarker, ExamAnalysisResult, Patient } from '../../types';
import { LaboratService } from '../laboratService';

export const AIExamService = {
    /**
     * Extrai marcadores de um documento (PDF/Imagem) ou texto utilizando Gemini
     */
    extractMarkers: async (fileData?: { base64: string, mimeType: string }, text?: string): Promise<ExamMarker[]> => {
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
        console.log("[AI Exam] Iniciando extração. API Key presente:", !!apiKey);

        if (!apiKey) {
            console.error("[AI Exam] Erro: VITE_GEMINI_API_KEY não encontrada.");
            return [];
        }

        const genAI = new GoogleGenAI({ apiKey });

        const prompt = `
      Você é um especialista em biomedicina e extração de dados laboratoriais.
      Analise o documento anexo (ou texto) e retorne os dados estruturados no formato JSON.
      Ignore cabeçalhos e rodapés irrelevantes. Foque em: Nome do exame/marcador, Valor numérico, Unidade de medida.

      REGRAS:
      1. Extraia apenas o valor numérico (remova vírgulas por pontos se necessário).
      2. Tente identificar a unidade (mg/dL, %, uUI/mL, etc).
      3. Se o marcador tiver um valor de referência no documento, ignore-o e foque no resultado do paciente.
      4. Retorne no formato: [{"name": "Glicose", "value": 95, "unit": "mg/dL"}, ...]

      ${text ? `TEXTO ADICIONAL:\n${text}` : ''}
    `;

        try {
            const parts: any[] = [{ text: prompt }];

            if (fileData) {
                parts.push({
                    inlineData: {
                        data: fileData.base64.split(',')[1] || fileData.base64,
                        mimeType: fileData.mimeType
                    }
                });
            }

            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent({
                contents: [{ role: 'user', parts }],
                generationConfig: { responseMimeType: "application/json" }
            });

            const responseText = result.response.text();
            if (!responseText) throw new Error("Resposta vazia da IA");

            const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const raw = JSON.parse(jsonStr);

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
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            });

            const responseText = result.response.text();
            if (!responseText) throw new Error("Resposta vazia da IA");

            const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr) as ExamAnalysisResult;
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
