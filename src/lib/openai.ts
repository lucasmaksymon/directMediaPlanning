import OpenAI from "openai";

let client: OpenAI | null = null;

/** Cliente OpenAI lazy: no instancia en import (evita fallar el build de Render sin API key). */
export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada");
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

export const openai: OpenAI = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const c = getOpenAI();
    const value = Reflect.get(c, prop, c);
    return typeof value === "function" ? value.bind(c) : value;
  },
});
