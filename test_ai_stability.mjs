const GEMINI_KEY = "AIzaSyDhBZ3xGKkHZZIPjKBz6Dhr71X8xOZWGpY";
const MODEL = "gemini-flash-latest"; // O modelo que vimos na lista

async function testAIStep() {
    console.log("--- TESTE DE ESTABILIDADE IA (PADRONIZADO) ---");
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    
    const payload = {
        contents: [{
            role: "user",
            parts: [{ text: "Responda apenas com a palavra 'ESTAVEL' se estiver funcionando." }]
        }]
    };

    try {
        console.log(`📡 Conectando ao Google Gemini (${MODEL})...`);
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (text === "ESTAVEL" || text.includes("ESTAVEL")) {
            console.log("✅ IA ESTÁ ONLINE E RESPONDENDO.");
            process.exit(0);
        } else {
            console.warn(`🌐 IA ONLINE, mas retornou: ${text}`);
            process.exit(0);
        }
    } catch (err) {
        console.error("❌ FALHA NA CONEXÃO COM A IA:");
        console.error(err.message);
        process.exit(1);
    }
}

testAIStep();
