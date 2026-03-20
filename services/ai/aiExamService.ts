import { Exam, ExamMarker, ExamAnalysisResult, Patient } from '../../types';
import { LaboratService } from '../laboratService';
import { AIService } from './aiService';

export const AIExamService = {
    /**
     * Extrai marcadores de um documento (PDF/Imagem) ou texto utilizando Gemini
     */
    extractMarkers: async (fileData?: { base64: string, mimeType: string }, text?: string): Promise<ExamMarker[]> => {
        console.log("[AI Exam] Iniciando extração profunda de marcadores...");

        const prompt = `
      Você é um especialista em biomedicina e extração de dados estruturados de laudos laboratoriais.
      Analise TODO o documento fornecido (pode conter várias páginas e múltiplos exames diferentes).
      
      OBJETIVO:
      Extraia TODOS os biomarcadores encontrados em todos os exames presentes no arquivo.
      Retorne uma lista única contendo cada marcador identificado.

      REGRAS DE EXTRAÇÃO:
      1. Extraia o Nome do marcador (ex: Glicose, Hemoglobina, TSH).
      2. Extraia o Valor numérico (converta vírgulas para pontos se necessário).
      3. Identifique a Unidade de medida (ex: mg/dL, %, uUI/mL).
      4. IGNORE valores de referência. Foque apenas no resultado do paciente.
      5. Capture dados de TODAS as páginas e de todos os títulos de exames presentes.
      6. Se houver resultados qualitativos importantes (ex: Ausência de nitritos), ignore-os desta extração numérica.

      FORMATO DE RETORNO (APENAS JSON):
      [{"name": "Marcador", "value": 12.3, "unit": "unidade"}]

      ${text ? `CONTEÚDO TEXTUAL AUXILIAR:\n${text}` : ''}
    `;

        try {
            const aiResponse = await AIService.ask({
                prompt: prompt,
                role: 'professional',
                temperature: 0.1,
                fileData: fileData, 
                model: "google/gemini-2.0-flash" // Modelo v2.0 Flash: Equilíbrio perfeito entre Pro e Flash 1.5
            });

            if (!aiResponse) throw new Error("Resposta vazia da IA");

            // Parser resiliente: busca o bloco JSON mesmo se houver texto em volta
            let jsonStr = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonMatch = jsonStr.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            const raw = JSON.parse(jsonStr);
            return LaboratService.processMarkers(raw);
        } catch (error) {
            console.error("Erro na extração AI (2.0 Flash):", error);
            // Fallback: se o 2.0 falhar, tenta o 1.5 Flash
            if (fileData) {
                 console.log("[AI Exam] Tentando fallback para 1.5 Flash...");
                 try {
                     const flashResponse = await AIService.ask({
                         prompt: prompt,
                         role: 'professional',
                         temperature: 0.1,
                         fileData: fileData,
                         model: "google/gemini-1.5-flash"
                     });
                     const clean = flashResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                     const match = clean.match(/\[\s*\{[\s\S]*\}\s*\]/);
                     return LaboratService.processMarkers(JSON.parse(match ? match[0] : clean));
                 } catch (e) {
                     return [];
                 }
            }
            return [];
        }
    },

    /**
     * Realiza a análise clínica e cruzamento de dados de um ou mais exames
     */
    analyzeResults: async (patient: Patient, exams: Exam[]): Promise<ExamAnalysisResult> => {
        const allMarkers = exams.flatMap(e => e.markers || []);

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
            const aiResponse = await AIService.ask({
                prompt: prompt,
                role: 'professional',
                temperature: 0.3
            });

            if (aiResponse) {
                const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
                return JSON.parse(jsonMatch ? jsonMatch[0] : cleanJson) as ExamAnalysisResult;
            }
            throw new Error("Empty response from AI");
        } catch (error: any) {
            console.error("Erro na análise AI:", error);
            return getFallbackAnalysis(allMarkers, error.message);
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

function getFallbackAnalysis(markers: ExamMarker[], errorMsg?: string): ExamAnalysisResult {
    const altered = markers.filter(m => m.interpretation !== 'NORMAL');
    return {
        summary: "⚠️ Modo offline (IA não respondeu).",
        findings: altered.map(m => ({
            marker: m.name,
            correlation: `Marcador identificado como ${m.interpretation}.`,
            impact: m.interpretation === 'NORMAL' ? 'POSITIVO' : 'NEGATIVO'
        })),
        possibleCauses: ["Não foi possível realizar a análise cruzada via IA."],
        suggestedTreatments: ["Aguarde o deploy completo ou verifique sua conexão."],
        nextSteps: [`MOTIVO: ${errorMsg || 'Erro de comunicação desconhecido'}`],
        isFallback: true
    };
}
