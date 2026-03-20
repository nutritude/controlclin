
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
    async ask({ prompt, role, systemPrompt, temperature, model, fileData }: AIAskRequest): Promise<string> {
        const finalModel = model || "google/gemini-1.5-flash";
        const googleModel = finalModel.includes('/') ? finalModel.split('/')[1] : finalModel;
        const defaultSystemPrompt = role === 'manager' ? SYSTEM_PROMPT_MANAGER : SYSTEM_PROMPT_PROFESSIONAL;
        const finalSystemPrompt = systemPrompt || defaultSystemPrompt;
        const finalTemperature = temperature ?? (role === 'manager' ? 0.7 : 0.1);

        console.log(`[AI Service] Processando requisição (${finalModel})...`);

        // 1. ESTRATÉGIA HIGH-PERFORMANCE: Tenta chamada DIRETA (Client-side)
        // Isso burla o limite de 10s do Vercel e permite análises complexas de até 90s.
        const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (geminiKey) {
            try {
                console.log("[AI Service] Iniciando chamada direta Browser-to-Google...");
                const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${geminiKey}`;
                
                const parts: any[] = [{ text: finalSystemPrompt + "\n\n" + prompt }];
                if (fileData) {
                    const pureBase64 = fileData.base64.includes('base64,') ? fileData.base64.split('base64,')[1] : fileData.base64;
                    parts.push({ inline_data: { mime_type: fileData.mimeType, data: pureBase64 } });
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 segundos para exames pesados

                const directResponse = await fetch(apiEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: controller.signal,
                    body: JSON.stringify({
                        contents: [{ role: "user", parts }],
                        generationConfig: { temperature: finalTemperature, maxOutputTokens: 8192 }
                    })
                });
                clearTimeout(timeoutId);

                if (directResponse.ok) {
                    const data = await directResponse.json();
                    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    if (content) {
                        console.log("[AI Service] Sucesso via conexão direta.");
                        return content;
                    }
                } else {
                    console.warn(`[AI Service] Chamada direta falhou (${directResponse.status}). Tentando Proxy...`);
                }
            } catch (err: any) {
                console.warn("[AI Service] Conexão direta bloqueada ou lenta. Recuando para Proxy Vercel...", err.message);
            }
        }

        // 2. ESTRATÉGIA COMPATIBILIDADE: Proxy /api/ai
        try {
            console.log("[AI Service] Estabelecendo conexão via Proxy Secundário...");
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 28000); // Limite próximo ao do Vercel Pro (30s)

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    prompt,
                    systemPrompt: finalSystemPrompt,
                    temperature: finalTemperature,
                    model: finalModel,
                    fileData
                })
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Erro de Gateway: ${response.status}`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || "";

        } catch (error: any) {
            const isTimeout = error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('504');
            console.error("[AI Service] Erro Crítico:", error);
            
            if (isTimeout) {
                throw new Error("⚠️ BLOQUEIO DE INFRAESTRUTURA: A análise deste PDF é complexa e excedeu os 10 segundos do servidor (Vercel). Para sanar definitivamente: adicione 'VITE_GEMINI_API_KEY' nas Settings do Vercel e faça um Redeploy.");
            }
            throw new Error(`IA Offline: ${error.message || "Erro de comunicação"}`);
        }
    }
};
