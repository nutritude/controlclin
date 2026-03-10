import { OpenRouter } from "@openrouter/sdk";

// Inicializa o cliente do OpenRouter com a chave da variável de ambiente
const openrouter = new OpenRouter({
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || ''
});

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
}

export const OpenRouterService = {
    /**
     * Envia um prompt para o modelo Nvidia Nemotron via OpenRouter.
     */
    async ask({ prompt, role, systemPrompt, temperature }: OpenRouterAskRequest): Promise<string> {
        const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
        console.log(`[OpenRouter] Iniciando requisição (Role: ${role}). API Key presente: ${!!apiKey}`);

        if (!apiKey || apiKey === 'PLACEHOLDER') {
            console.error("[OpenRouter] VITE_OPENROUTER_API_KEY não configurada corretamente.");
            throw new Error("Configuração ausente: VITE_OPENROUTER_API_KEY.");
        }

        try {
            const defaultSystemPrompt = role === 'manager' ? SYSTEM_PROMPT_MANAGER : SYSTEM_PROMPT_PROFESSIONAL;
            const finalSystemPrompt = systemPrompt || defaultSystemPrompt;
            const finalTemperature = temperature ?? (role === 'manager' ? 0.7 : 0.1);

            console.log("[OpenRouter] Consultando modelo: nvidia/nemotron-3-nano-30b-a3b:free");

            // Chamada otimizada com a estrutura correta para a versão do SDK instalada
            const stream = await openrouter.chat.send({
                chatGenerationParams: {
                    model: "nvidia/nemotron-3-nano-30b-a3b:free",
                    messages: [
                        { role: "system", content: finalSystemPrompt },
                        { role: "user", content: prompt }
                    ],
                    stream: true,
                    temperature: finalTemperature
                }
            });

            let fullContent = "";

            // Processamento do Stream compatível com Browser
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    fullContent += content;
                    // Log opcional para debug em tempo real no console do browser
                    // console.log("[IA Chunk]:", content);
                }

                // Captura opcional de tokens de raciocínio se o modelo suportar
                if (chunk.usage && (chunk.usage as any).reasoningTokens) {
                    console.log("[OpenRouter] Reasoning tokens:", (chunk.usage as any).reasoningTokens);
                }
            }

            if (!fullContent) {
                // Tenta fallback sem stream se o stream falhar em retornar conteúdo
                console.warn("[OpenRouter] Stream vazio, tentando modo convencional...");
                const response = await openrouter.chat.send({
                    chatGenerationParams: {
                        model: "nvidia/nemotron-3-nano-30b-a3b:free",
                        messages: [
                            { role: "system", content: finalSystemPrompt },
                            { role: "user", content: prompt }
                        ],
                        stream: false,
                        temperature: finalTemperature
                    }
                }) as any;

                fullContent = response.choices?.[0]?.message?.content || "";
            }

            if (fullContent) {
                console.log("[OpenRouter] Resposta gerada com sucesso.");
                return fullContent;
            }

            throw new Error("O modelo não retornou conteúdo.");

        } catch (error: any) {
            console.error("Erro crítico na integração com OpenRouter:", error);
            throw new Error(`Erro IA (${error.message || "Falha na comunicação"}). Verifique sua conexão e chave de API.`);
        }
    }
};
