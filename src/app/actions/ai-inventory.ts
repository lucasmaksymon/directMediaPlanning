"use server";

import { auth } from "@/auth";
import { openai } from "@/lib/openai";

export type GenerateDescriptionResult =
  | { ok: true; description: string }
  | { ok: false; error: string };

export async function generateUnitDescription(input: {
  name: string;
  locationLabel: string;
  format: string;
  basePriceAmount: string;
  priceModel: string;
}): Promise<GenerateDescriptionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== "provider") {
    return { ok: false, error: "Solo proveedores pueden usar esta función." };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: "El servicio de IA no está configurado. Agregá OPENAI_API_KEY al entorno." };
  }

  const formatLabels: Record<string, string> = {
    digital_ooh: "pantalla digital OOH (vía pública)",
    static_ooh: "espacio OOH estático (valla, cartel)",
    digital_package: "paquete de espacios digitales",
  };

  const priceLabels: Record<string, string> = {
    fixed_list: "precio fijo",
    negotiable: "precio negociable",
    package: "precio por paquete",
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sos un experto en marketing OOH y publicidad exterior argentina. Escribís descripciones comerciales concisas, impactantes y en español rioplatense (vos). El tono es moderno, profesional y orientado a marcas anunciantes.",
        },
        {
          role: "user",
          content: `Escribí una descripción comercial para este espacio publicitario. Máximo 3 oraciones. Sin listas. Sin markdown. En segunda persona (vos).

Nombre del espacio: ${input.name}
Tipo: ${formatLabels[input.format] ?? input.format}
Ubicación: ${input.locationLabel}
Precio de referencia: $${input.basePriceAmount} ARS (${priceLabels[input.priceModel] ?? input.priceModel})

La descripción debe destacar: posicionamiento urbano, audiencia que alcanza, impacto visual y por qué es una buena opción para una marca.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const description = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!description) return { ok: false, error: "La IA no generó una descripción. Intentá de nuevo." };

    return { ok: true, description };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Error al consultar la IA: ${msg}` };
  }
}
