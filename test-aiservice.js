import fs from "fs";
import { format } from "util";

const API_KEY = process.env.VITE_GEMINI_API_KEY || "AIzaSyCEpgbVZ6Mzv-9dVa0jQT3oRPSoJ3ItS7M";
const prompt = `Você é um especialista. Responda APENAS {"status":"OK"}`;

async function run() {
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 8192, temperature: 0.1 }
      })
  });
  console.log("Status:", response.status);
  const data = await response.json();
  console.dir(data, { depth: null });
}
run();
