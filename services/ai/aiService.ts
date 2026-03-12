
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
}

export const AIService = {
    /**
     * Envia um prompt via Proxy Seguro (/api/ai) com fallback direto para Gemini em Modo Dev.
     */
    async ask({ prompt, role, systemPrompt, temperature, model }: AIAskRequest): Promise<string> {
        const finalModel = model || "google/gemini-2.5-flash";

        console.log(`[AI Service] Iniciando requisição Gemini (${finalModel})`);

        try {
            const defaultSystemPrompt = role === 'manager' ? SYSTEM_PROMPT_MANAGER : SYSTEM_PROMPT_PROFESSIONAL;
            const finalSystemPrompt = systemPrompt || defaultSystemPrompt;
            const finalTemperature = temperature ?? (role === 'manager' ? 0.7 : 0.1);

            let response;
            try {
                response = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt,
                        systemPrompt: finalSystemPrompt,
                        temperature: finalTemperature,
                        model: finalModel
                    })
                });
            } catch (e) {
                console.warn("[AI Service] Falha na rede ao contactar /api/ai. Tentando fallback direto...");
                // Simula 404 para acionar o fallback
                response = { status: 404, ok: false };
            }

            // FALLBACK PARA LOCALHOST / Modo Dev (Se o proxy /api/ai der 404, tentamos chamada direta via client)
            if (response.status === 404) {
                console.info("[AI Service] Proxy /api/ai não encontrado (Modo Local). Tentando chamada direta ao Gemini...");

                const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
                if (!geminiKey) throw new Error("Chave Gemini (VITE_GEMINI_API_KEY) não encontrada no .env.local");

                const googleModel = finalModel.includes('/') ? finalModel.split('/')[1] : finalModel;
                const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${geminiKey}`;

                const directResponse = await fetch(apiEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ role: "user", parts: [{ text: finalSystemPrompt + "\n\n" + prompt }] }],
                        generationConfig: { temperature: finalTemperature, maxOutputTokens: 2048 }
                    })
                });

                if (!directResponse.ok) {
                    const errorDetails = await directResponse.text();
                    throw new Error(`Erro API Gemini Direta (${directResponse.status}): ${errorDetails}`);
                }

                const data = await directResponse.json();
                const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

                if (!content) {
                    console.error("[AI Service] Resposta vazia da API Gemini", data);
                    throw new Error("Resposta da IA retornou vazia.");
                }

                return content;
            }

            if (!response.ok) {
                const errorData = await (response as Response).json().catch(() => ({}));
                throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
            }

            // Resposta JSON normalizada do Proxy
            const data = await (response as Response).json();
            return data.choices?.[0]?.message?.content || "";

        } catch (error: any) {
            console.error("[AI Service] Erro Crítico:", error);
            throw new Error(`IA Offline: ${error.message || "Erro de comunicação"}`);
        }
    }
};
