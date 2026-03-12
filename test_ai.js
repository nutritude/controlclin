import axios from 'axios';

async function test() {
    const key = "AIzaSyAtvkp4lHY3HhlziIM85nvFOfmMySUP7L0";
    const prompt = `Você é um especialista em fisiologia do exercício e nutrição clínica.
    Analise o paciente 35 anos, masculino.
    Peso: 100kg, Altura: 1.80m, IMC: 30.8.
    Retorne UM JSON MOCK, exemplo {"summary":"OK"}`;
    
    try {
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 2048, temperature: 0.2 }
        });
        console.log(response.data.candidates[0].content.parts[0].text);
    } catch(e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
test();
