export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { prompt, systemPrompt, temperature, model, stream: shouldStream } = await req.json();
        const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;

        if (!apiKey || apiKey === 'PLACEHOLDER') {
            return new Response(JSON.stringify({ error: 'OpenRouter API Key is not configured on Vercel environment variables.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://controlclin.vercel.app", // Optional, for OpenRouter tracking
                "X-Title": "ControlClin"
            },
            body: JSON.stringify({
                model: model || "nvidia/nemotron-3-nano-30b-a3b:free",
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
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
