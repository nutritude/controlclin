
export const config = {
    runtime: 'nodejs',
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
        const { prompt, systemPrompt, temperature, model, fileData } = await req.json();

        const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

        if (!geminiKey) {
            return new Response(JSON.stringify({ error: 'Configuração de API Gemini pendente (VITE_GEMINI_API_KEY).' }), { status: 500 });
        }

        console.log(`[Proxy AI] Modelo: ${model} | Arquivo: ${fileData ? 'Sim' : 'Não'}`);

        // Mapeia o nome do modelo para o formato da Google
        let googleModel = model || "gemini-flash-latest";
        if (googleModel.includes('/')) googleModel = googleModel.split('/')[1];

        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${geminiKey}`;

        // Prepara as partes da mensagem
        const parts: any[] = [];
        
        // Texto combinado
        parts.push({ text: (systemPrompt ? systemPrompt + "\n\n" : "") + prompt });

        // Arquivo Multimodal
        if (fileData && fileData.base64) {
            try {
                const base64Data = fileData.base64.split(',')[1] || fileData.base64;
                parts.push({
                    inline_data: {
                        mime_type: fileData.mimeType,
                        data: base64Data
                    }
                });
            } catch (err) {
                console.error("[Proxy AI] Erro no processamento de anexo:", err);
            }
        }

        const response = await fetch(apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts }],
                generationConfig: {
                    temperature: temperature ?? 0.1,
                    maxOutputTokens: 8192, // Aumentado para suportar exames longos
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Proxy AI] Erro Google:", errorText);
            return new Response(JSON.stringify({ 
                error: `Erro na API Gemini: ${response.status}`,
                details: errorText.substring(0, 200)
            }), { status: response.status });
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        return new Response(JSON.stringify({
            choices: [{ message: { content } }]
        }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
        console.error("[Proxy AI] Erro Crítico:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
