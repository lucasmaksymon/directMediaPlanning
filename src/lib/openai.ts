import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("[openai] OPENAI_API_KEY no está definida. Las funciones de IA no funcionarán.");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});
