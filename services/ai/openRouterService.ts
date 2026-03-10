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
     * Envia um prompt para o modelo Qwen3 Next 80B A3B via OpenRouter usando o perfil (Role) especificado.
     */
    async ask({ prompt, role, systemPrompt, temperature }: OpenRouterAskRequest): Promise<string> {
        try {
            const defaultSystemPrompt = role === 'manager' ? SYSTEM_PROMPT_MANAGER : SYSTEM_PROMPT_PROFESSIONAL;
            const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

            // Temperatura sugerida: 0.2 para profissionais (dados precisos), 0.7 para manager (ideias criativas)
            const finalTemperature = temperature ?? (role === 'manager' ? 0.7 : 0.2);

            // Chamada para a API usando o SDK corretamente encapsulado
            const stream = await openrouter.chat.send({
                chatGenerationParams: {
                    model: "qwen/qwen3-next-80b-a3b-instruct:free",
                    messages: [
                        {
                            role: "system",
                            content: finalSystemPrompt
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    stream: true,
                    temperature: finalTemperature
                }
            });

            let fullContent = "";

            // Itera pelo stream e concatena o conteúdo
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    fullContent += content;
                    // Em um ambiente de terminal poderíamos usar process.stdout.write, 
                    // mas no browser/frontend nós concatenamos para retornar a string completa.
                }
            }

            return fullContent;
        } catch (error) {
            console.error("Erro na integração com OpenRouter:", error);
            throw new Error("Falha ao comunicar com a inteligência artificial. Verifique a chave de API ou a conexão.");
        }
    }
};
