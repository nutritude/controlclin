
export type AIPersonaRole = 'manager' | 'professional';

const SYSTEM_PROMPT_PROFESSIONAL = `Você é um Assistente Clínico Avançado especializado em Nutrição e Fisiologia Médica. 
Sua função é apoiar o profissional de saúde interpretando dados biométricos, sugerindo condutas baseadas em ciência (guidelines atuais) e identificando riscos clínicos e nutricionais. 
Seja sempre objetivo, focado em diretrizes de saúde, empático caso esteja moldando uma mensagem ao paciente, e sempre responda estruturado para leitura de um profissional de saúde. 
Responda APENAS o que foi pedido, em português (BR), formato JSON ou texto direto conforme solicitado pelo prompt do usuário.`;

const SYSTEM_PROMPT_MANAGER = `Você é um Consultor Sênior de Inteligência de Negócios (BI) especializado em Clínicas de Saúde. 
Seu foco é maximizar receitas (LTV), reduzir absenteísmo (taxa de faltas) e analisar dados populacionais para estratégias de marketing. 
Ao receber um conjunto de indicadores de uma clínica, retorne sempre uma análise executiva breve seguida de uma 'Ação Sugerida' prática para otimização do negócio. 
Responda APENAS o que foi pedido, em português (BR), focado em dados e conversão.`;

export interface OpenRouterAskRequest {
    prompt: string;
    role: AIPersonaRole;
    systemPrompt?: string;
    temperature?: number;
    model?: string;
}

export const OpenRouterService = {
    /**
     * Envia um prompt via Proxy Seguro (/api/ai).
     * Agora otimizado para Gemini 2.5 Flash por padrão.
     */
    async ask({ prompt, role, systemPrompt, temperature, model }: OpenRouterAskRequest): Promise<string> {
        const finalModel = model || "google/gemini-2.5-flash";
        const isGemini = finalModel.toLowerCase().includes('gemini');

        console.log(`[AI Service] Iniciando requisição (Model: ${finalModel}, Role: ${role})`);

        try {
            const defaultSystemPrompt = role === 'manager' ? SYSTEM_PROMPT_MANAGER : SYSTEM_PROMPT_PROFESSIONAL;
            const finalSystemPrompt = systemPrompt || defaultSystemPrompt;
            const finalTemperature = temperature ?? (role === 'manager' ? 0.7 : 0.1);

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    systemPrompt: finalSystemPrompt,
                    temperature: finalTemperature,
                    model: finalModel,
                    stream: !isGemini // Desabilitamos stream para Gemini nativo via proxy por simplicidade de normalização
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
            }

            // Se for Gemini nativo (não-streaming), processamos o JSON direto
            if (!isGemini) {
                // Lógica de Streaming para OpenRouter tradicional
                const reader = response.body?.getReader();
                if (!reader) throw new Error("Corpo da resposta indisponível para streaming.");

                let fullContent = "";
                let buffer = "";
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || "";

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

                        const dataStr = trimmedLine.slice(6).trim();
                        if (dataStr === '[DONE]') continue;

                        try {
                            const data = JSON.parse(dataStr);
                            const delta = data.choices[0]?.delta;
                            if (delta?.content) fullContent += delta.content;
                        } catch (e) { }
                    }
                }
                return fullContent;
            } else {
                // Resposta JSON normalizada do Proxy para Gemini
                const data = await response.json();
                return data.choices?.[0]?.message?.content || "";
            }

        } catch (error: any) {
            console.error("Erro crítico na integração AI:", error);
            throw new Error(`Falha na IA: ${error.message || "Erro de comunicação"}`);
        }
    }
};
