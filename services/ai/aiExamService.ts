import { Exam, ExamMarker, ExamAnalysisResult, Patient } from '../../types';
import { LaboratService } from '../laboratService';
import { AIService } from './aiService';

export const AIExamService = {
    /**
     * Extrai marcadores de um documento (PDF/Imagem) ou texto utilizando Gemini
     */
    extractMarkers: async (fileData?: { base64: string, mimeType: string }, text?: string): Promise<ExamMarker[]> => {
        console.log("[AI Exam] Iniciando extração profunda de marcadores (Gemini 2.0 Flash)...");

        const prompt = `
      Você é um especialista sênior em biomedicina e extração de dados estruturados de laudos laboratoriais complexos.
      
      TAREFA:
      Analise EXAUSTIVAMENTE o documento fornecido (PDF ou Imagem). 
      Este arquivo pode conter múltiplas páginas, tabelas densas, múltiplos cabeçalhos e diversos exames (ex: Hemograma completo, Bioquímica, Tireoide, Urina, etc).
      
      OBJETIVO:
      Extraia TODOS os biomarcadores laboratoriais numéricos encontrados em TODO o documento.
      Se houver 10 páginas e 100 marcadores, extraia os 100. NÃO SUPRIMA DADOS.
      
      REGRAS TÉCNICAS:
      1. NOME: Use o nome clínico padrão (ex: Glicose, TSH).
      2. VALOR: Numérico apenas (use . para decimais).
      3. UNIDADE: Identifique a unidade (mg/dl, %, etc).
      4. FILTRAGEM: Ignore referências e textos longos.
      5. TODOS: Revise todas as páginas do arquivo.

      FORMATO (JSON ARRAY): [{"name": "Marcador", "value": 12.3, "unit": "un"}]
    `;

        try {
            const aiResponse = await AIService.ask({
                prompt: prompt,
                role: 'professional',
                temperature: 0.1,
                model: "google/gemini-flash-latest" // Usando Flash Latest para extração (mais rápido e estável para OCR)
            });

            if (!aiResponse) throw new Error("Resposta vazia da IA");

            let jsonStr = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonMatch = jsonStr.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            const raw = JSON.parse(jsonStr);
            console.log(`[AI Exam] ${raw.length} marcadores brutos extraídos.`);
            return LaboratService.processMarkers(raw);
        } catch (error: any) {
            console.error("Erro na extração AI (2.0 Flash):", error);
            
            // Fallback: se o 2.0 falhar/timeout e houver arquivo carregado
            if (fileData) {
                 console.log("[AI Exam] Tentando fallback para 1.5 Flash pela robustez...");
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
     * Realiza a análise clínica e cruzamento de dados conforme Prática Clínica Avançada
     */
    analyzeResults: async (patient: Patient, exams: Exam[]): Promise<ExamAnalysisResult> => {
        const allMarkers = exams.flatMap(e => e.markers || []);

        const prompt = `
      Você é um Nutricionista Clínico Funcional e Especialista em Bioquímica e Medicina Laboratorial.
      Sua missão é realizar uma ANÁLISE PROFISSIONAL AVANÇADA do Prontuário Laboratorial de ${patient.name} (${patient.gender}, ${calculateAge(patient.birthDate)} anos).
      
      CONTEXTO CLÍNICO DO PACIENTE:
      - Diagnósticos/Queixas: ${patient.clinicalSummary?.activeDiagnoses?.join(', ') || 'Nenhum'}
      - Objetivo: ${patient.clinicalSummary?.clinicalGoal || 'Otimização metabólica'}
 
      DADOS DOS EXAMES (VALORES REAIS DO PACIENTE):
      ${JSON.stringify(allMarkers.map(m => ({
            marcador: m.name,
            valor: m.value,
            unidade: m.unit,
            referencia: m.reference.label,
            interpretacao: m.interpretation
        })))}
 
      REQUISITOS DA ANÁLISE (Responda em modo PRÁTICA CLÍNICA AVANÇADA):
      1. RESUMO DOS DESVIOS: Identifique claramente os marcadores fora do "alcance desejável" (níveis ótimos, não apenas laboratoriais).
      2. PONTOS DE ATENÇÃO: Destaque os 3 principais riscos para o quadro atual do paciente.
      3. CRUZAMENTO DE DADOS (Padrões Laboratoriais): Identifique como um marcador explica o outro. 
         Ex: "Colesterol alto + TSH elevado sugere hipotiroidismo subclínico impactando o metabolismo lipídico."
      4. POSSÍVEIS CAUSAS: Apresente justificativas fisiológicas e causas fundamentais para os desvios.
      5. PONTOS DE INVESTIGAÇÃO: Indique quais sinais, sintomas ou exames de imagem seriam necessários para confirmar as suspeitas.
      6. RISCOS ASSOCIADOS: Liste os riscos para a saúde futura se estes níveis não forem corrigidos.

      FORMATO DE RETORNO (JSON RIGOROSO):
      {
        "summary": "Resumo clínico executivo de alto impacto",
        "findings": [
          { "marker": "Nome do Marcador/Padrão", "correlation": "Justificativa cruzada e impacto sistêmico", "impact": "POSITIVO|NEUTRO|NEGATIVO" }
        ],
        "possibleCauses": ["Causa fisiológica identificada + breve justificativa"],
        "suggestedTreatments": ["Sugestões nutricionais/suplementares baseadas em diretrizes funcionais"],
        "nextSteps": ["Pontos de investigação, riscos identificados e exames para descobrir novos marcadores"]
      }
    `;

        try {
            const aiResponse = await AIService.ask({
                prompt: prompt,
                role: 'professional',
                model: "google/gemini-flash-latest"
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
        summary: "⚠️ Modo offline ou timeout detectado.",
        findings: altered.map(m => ({
            marker: m.name,
            correlation: `Valor de ${m.value} para o marcador ${m.name} está ${m.interpretation}.`,
            impact: m.interpretation === 'NORMAL' ? 'POSITIVO' : 'NEGATIVO'
        })),
        possibleCauses: ["Não foi possível realizar o cruzamento de dados devido a um erro na IA."],
        suggestedTreatments: ["Aguarde o processamento completo do servidor."],
        nextSteps: [
            "Justificativa: " + (errorMsg?.includes('Timeout') ? "A análise deste exame foi muito complexa para o tempo limite." : errorMsg || 'Falha na comunicação'),
            "Ponto de Investigação: Verifique os valores manualmente no laudo.",
            "Risco: Omissão de tendências clínicas ocultas (necessária análise manual)."
        ],
        isFallback: true
    };
}
