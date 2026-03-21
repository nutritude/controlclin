
export type AIPersonaRole = 'manager' | 'professional';

const SYSTEM_PROMPT_PROFESSIONAL = `Você é um Assistente Clínico Avançado especializado em Nutrição e Fisiologia Médica. 
Sua função é apoiar o profissional de saúde interpretando dados biométricos, sugerindo condutas baseadas em ciência (guidelines atuais) e identificando riscos clínicos e nutricionais. 
Seja sempre objetivo, focado em diretrizes de saúde, empático caso esteja moldando uma mensagem ao paciente, e sempre responda estruturado para leitura de um profissional de saúde. 
Responda APENAS o que foi pedido, em português (BR), formato JSON ou texto direto conforme solicitado pelo prompt do usuário.`;

const SYSTEM_PROMPT_MANAGER = `Você é um Consultor Sênior de Inteligência de Negócios (BI) especializado em Clínicas de Saúde. 
Seu foco é maximizar receitas (LTV), reduzir absenteísmo (taxa de faltas) e analisar dados populacionais para estratégias de marketing. 
Ao receber um conjunto de indicadores de uma clínica, retorne sempre uma análise executiva breve seguida de uma 'Ação Sugerida' prática para otimização do negócio. 
Responda APENAS o que foi pedido, em português (BR), focado em dados e conversão.`;

export interface AIAskRequest {
    prompt: string;
    role: AIPersonaRole;
    systemPrompt?: string;
    temperature?: number;
    model?: string;
    fileData?: { base64: string, mimeType: string };
}

export const AIService = {
    /**
     * AIService: Gerencia chamadas à IA priorizando Performance e Estabilidade.
     * Tenta chamada direta (Browser -> Google) para evitar limites de timeout de proxies (Vercel).
     */
    async ask({ prompt, role, systemPrompt, temperature, model, fileData }: AIAskRequest, retries = 1): Promise<string> {
        const primaryModel = model || "google/gemini-1.5-flash-latest";
        const stabilityModel = "google/gemini-1.5-flash-latest";
        
        const defaultSystemPrompt = role === 'manager' ? SYSTEM_PROMPT_MANAGER : SYSTEM_PROMPT_PROFESSIONAL;
        const finalSystemPrompt = systemPrompt || defaultSystemPrompt;
        const finalTemperature = temperature ?? (role === 'manager' ? 0.7 : 0.1);

        const callGoogle = async (targetModel: string, useProxy: boolean) => {
            const googleModel = targetModel.includes('/') ? targetModel.split('/')[1] : targetModel;
            const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

            if (useProxy) {
                console.log(`[AI] Proxy: ${googleModel}...`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 28000);

                const response = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
                    body: JSON.stringify({ prompt, systemPrompt: finalSystemPrompt, temperature: finalTemperature, model: targetModel, fileData })
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Erro Proxy: ${response.status}`);
                }
                const data = await response.json();
                return data.choices?.[0]?.message?.content || "";
            } else {
                if (!geminiKey) throw new Error("VITE_GEMINI_API_KEY ausente.");
                console.log(`[AI] Direto: ${googleModel}...`);
                const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${geminiKey}`;
                
                const parts: any[] = [{ text: finalSystemPrompt + "\n\n" + prompt }];
                if (fileData) {
                    const pureBase64 = fileData.base64.includes('base64,') ? fileData.base64.split('base64,')[1] : fileData.base64;
                    parts.push({ inline_data: { mime_type: fileData.mimeType, data: pureBase64 } });
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 90000);

                const response = await fetch(apiEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: controller.signal,
                    body: JSON.stringify({
                        contents: [{ role: "user", parts }],
                        generationConfig: { temperature: finalTemperature, maxOutputTokens: 8192 },
                        safetySettings: [
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                        ]
                    })
                });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`Status ${response.status}`);
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) throw new Error("Resposta sem conteúdo.");
                return text;
            }
        };

        // LOOP DE TENTATIVAS PADRONIZADO
        let lastError: any = null;
        for (let i = 0; i <= retries; i++) {
            try {
                if (i > 0) await new Promise(r => setTimeout(r, 1000 * i));
                
                // FLUXO DE RESILIÊNCIA EXECUTIVO
                // 1. Tenta Direto Primário
                try {
                    return await callGoogle(primaryModel, false);
                } catch (e1) {
                    // 2. Tenta Proxy Primário
                    try {
                        return await callGoogle(primaryModel, true);
                    } catch (e2) {
                        // 3. Se falhou e o modelo primário era 'latest' ou diferente, tenta 1.5-flash (Estabilidade)
                        if (primaryModel !== stabilityModel) {
                            console.log("[AI] Iniciando modo de estabilidade (1.5 Flash)...");
                            try {
                                return await callGoogle(stabilityModel, false);
                            } catch (e3) {
                                return await callGoogle(stabilityModel, true);
                            }
                        }
                        throw e2;
                    }
                }
            } catch (err: any) {
                lastError = err;
                console.error(`[AI] Falha na camada ${i+1}:`, err.message);
            }
        }

        throw new Error(`ESTABILIDADE IA COMPROMETIDA Corretiva: ${lastError?.message || "Sem sinal de IA"}`);
    }
};
