import fetch from "node-fetch";

const API_KEY = process.env.VITE_GEMINI_API_KEY || "AIzaSyDhBZ3xGKkHZZIPjKBz6Dhr71X8xOZWGpY";
const model = "gemini-1.5-flash";

async function test() {
  console.log("Testing Gemini API with model:", model);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Hello, reply with OK" }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
    })
  });
  
  const text = await response.text();
  console.log("Status:", response.status);
  console.log("Response:", text);
}

test();
