
export const config = {
    runtime: 'edge',
};

/**
 * ControlClin AI Proxy Handler
 * Agora exclusivo para Google Gemini.
 */
export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { prompt, systemPrompt, temperature, model } = await req.json();

        const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

        if (!geminiKey) {
            return new Response(JSON.stringify({ error: 'Configuração de API Gemini pendente no servidor.' }), { status: 500 });
        }

        console.log(`[Proxy AI] Roteando para Google Gemini (${model})`);

        // Mapeia o nome do modelo para o formato da Google se necessário
        const googleModel = model?.includes('/') ? model.split('/')[1] : (model || "gemini-1.5-flash");
        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${geminiKey}`;

        const response = await fetch(apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: (systemPrompt ? systemPrompt + "\n\n" : "") + prompt }] }
                ],
                generationConfig: {
                    temperature: temperature ?? 0.1,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Proxy AI] Erro Gemini:", errorText);
            return new Response(JSON.stringify({ error: `Erro na API Gemini: ${response.status}` }), { status: response.status });
        }

        const data = await response.json();

        // Normaliza a resposta para o formato que o front espera (estilo OpenAI/OpenRouter)
        const normalizedResponse = {
            choices: [{
                message: {
                    content: data.candidates?.[0]?.content?.parts?.[0]?.text || "Erro: Resposta vazia do Gemini."
                }
            }]
        };

        return new Response(JSON.stringify(normalizedResponse), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("[Proxy AI] Erro Crítico:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
