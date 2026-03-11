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
     */
    async ask({ prompt, role, systemPrompt, temperature, model }: OpenRouterAskRequest): Promise<string> {
        console.log(`[OpenRouter] Iniciando requisição segura via Proxy (Role: ${role})`);

        try {
            const defaultSystemPrompt = role === 'manager' ? SYSTEM_PROMPT_MANAGER : SYSTEM_PROMPT_PROFESSIONAL;
            const finalSystemPrompt = systemPrompt || defaultSystemPrompt;
            const finalTemperature = temperature ?? (role === 'manager' ? 0.7 : 0.1);
            const finalModel = model || "nvidia/nemotron-3-nano-30b-a3b:free";

            console.log(`[OpenRouter] Consultando modelo via API interna: ${finalModel}`);

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    systemPrompt: finalSystemPrompt,
                    temperature: finalTemperature,
                    model: finalModel,
                    stream: true
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
            }

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

                // Mantém a última linha incompleta no buffer
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

                    const dataStr = trimmedLine.slice(6).trim();
                    if (dataStr === '[DONE]') continue;

                    try {
                        const data = JSON.parse(dataStr);
                        const delta = data.choices[0]?.delta;

                        if (delta?.content) {
                            fullContent += delta.content;
                        }

                        // Logging opcional de raciocínio se o modelo prover
                        if (delta?.reasoning) {
                            console.log("[IA Pensando...]:", delta.reasoning);
                        }
                    } catch (e) {
                        // Ignora JSON incompleto ou mal formatado no stream
                    }
                }
            }

            if (fullContent) {
                console.log("[OpenRouter] Resposta gerada com sucesso via Proxy.");
                return fullContent;
            }

            throw new Error("O modelo não retornou conteúdo.");

        } catch (error: any) {
            console.error("Erro crítico na integração com OpenRouter (Proxy):", error);
            throw new Error(`Erro IA (${error.message || "Falha na comunicação"}). Verifique os logs da Vercel.`);
        }
    }
};
