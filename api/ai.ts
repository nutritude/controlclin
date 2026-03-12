
export const config = {
    runtime: 'edge',
};

/**
 * ControlClin AI Proxy Handler
 * Suporta OpenRouter e Google Gemini nativamente.
 */
export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { prompt, systemPrompt, temperature, model, stream: shouldStream } = await req.json();

        // Identifica se o modelo é Gemini
        const isGemini = model?.toLowerCase().includes('gemini');
        const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;

        // --- ROTA GEMINI DIRETA (GOOGLE AI STUDIO) ---
        if (isGemini && geminiKey) {
            console.log(`[Proxy AI] Roteando para Google Gemini (${model})`);

            // Mapeia o nome do modelo para o formato da Google se necessário
            // Para 2.5 Flash, usamos o identificador vindo do front ou o GA
            const googleModel = model.includes('/') ? model.split('/')[1] : model;
            const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${geminiKey}`;

            const response = await fetch(apiEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        { role: "user", parts: [{ text: systemPrompt + "\n\n" + prompt }] }
                    ],
                    generationConfig: {
                        temperature: temperature ?? 0.1,
                        maxOutputTokens: 2048,
                    }
                })
            });

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
        }

        // --- ROTA OPENROUTER (FALLBACK OU OUTROS MODELOS) ---
        console.log(`[Proxy AI] Roteando para OpenRouter (${model})`);

        if (!openRouterKey) {
            return new Response(JSON.stringify({ error: 'Configuração de API pendente no servidor.' }), { status: 500 });
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://controlclin.vercel.app",
                "X-Title": "ControlClin"
            },
            body: JSON.stringify({
                model: model || "google/gemini-2.5-flash", // Default para o novo modelo
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                stream: shouldStream,
                temperature: temperature ?? 0.1
            })
        });

        return response;

    } catch (error: any) {
        console.error("[Proxy AI] Erro Crítico:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
