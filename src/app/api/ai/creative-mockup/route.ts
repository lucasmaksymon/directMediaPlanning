import { auth } from "@/auth";
import { openai } from "@/lib/openai";
import type OpenAI from "openai";
import { toFile } from "openai";
import { NextResponse } from "next/server";

function imageResultToUrl(item: OpenAI.Images.Image | undefined): string | null {
  if (!item) return null;
  if (item.url) return item.url;
  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  return null;
}

async function fetchCreativeFile(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DirectMediaPlanning/1.0)",
      Accept: "image/*",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`No se pudo descargar el creativo (${res.status}). Usá una URL directa a la imagen.`);
  }
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error("La URL no apunta a una imagen válida.");
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  return toFile(buffer, `creative.${ext}`, { type: contentType });
}

/** Solo gpt-image-1 / gpt-image-1.5 aceptan input_fidelity; gpt-image-2+ lo procesan en alta fidelidad sin el parámetro. */
function supportsInputFidelity(model: string): boolean {
  if (model.startsWith("gpt-image-2") || model.includes("gpt-image-1-mini")) return false;
  return model === "gpt-image-1" || model.startsWith("gpt-image-1.5");
}

function buildScenePrompt(
  formatLabel: string,
  locationLabel: string,
  unitName: string,
  description: string | undefined,
  withCreative: boolean,
) {
  const adInstruction = withCreative
    ? "The advertising surface must display the EXACT same advertisement as the reference image — preserve brand colors, logos, product photos, typography and layout. No placeholder text."
    : 'The surface shows a clean white placeholder with subtle text "TU MARCA AQUÍ".';

  return `Photorealistic OOH advertising mockup photograph.
Location: ${locationLabel}, Argentina. Unit: "${unitName}" (${formatLabel}).
${description ? `Context: ${description}.` : ""}
${adInstruction}
Realistic environment matching the location (airport terminal, highway, urban street, etc.).
Natural daylight, professional advertising photography.`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (session.user.role !== "advertiser" && session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { locationLabel, unitName, unitFormat, description, creativeImageUrl } = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "IA no configurada." }, { status: 503 });
  }

  const formatContext: Record<string, string> = {
    digital_ooh: "pantalla LED digital OOH",
    static_ooh: "valla publicitaria estática de gran formato",
    digital_package: "pack de pantallas digitales",
  };

  const formatLabel = formatContext[unitFormat] ?? "espacio publicitario OOH";
  const imageModel = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
  const imageEnabled = process.env.OPENAI_IMAGE_ENABLED === "true";
  const imageSize = unitFormat === "digital_ooh" ? "1536x1024" : "1024x1024";

  if (imageEnabled) {
    const prompt = buildScenePrompt(formatLabel, locationLabel, unitName, description, Boolean(creativeImageUrl));

    try {
      // Con creativo: composición fiel usando la imagen de referencia
      if (creativeImageUrl) {
        const creativeFile = await fetchCreativeFile(creativeImageUrl);
        const res = await openai.images.edit({
          model: imageModel,
          image: creativeFile,
          prompt,
          ...(supportsInputFidelity(imageModel) ? { input_fidelity: "high" as const } : {}),
          size: imageSize as "1536x1024" | "1024x1024",
          quality: imageModel.startsWith("dall-e") ? "standard" : "medium",
        });
        const imageUrl = imageResultToUrl(res.data?.[0]);
        if (imageUrl) return NextResponse.json({ imageUrl });
      } else {
        const res = await openai.images.generate({
          model: imageModel,
          prompt,
          n: 1,
          size: imageSize as "1536x1024" | "1024x1024",
          quality: imageModel.startsWith("dall-e") ? "standard" : "medium",
        });
        const imageUrl = imageResultToUrl(res.data?.[0]);
        if (imageUrl) return NextResponse.json({ imageUrl });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[creative-mockup] Imagen no disponible:", msg);
      if (creativeImageUrl) {
        return NextResponse.json(
          { error: `No se pudo generar el mockup con tu creativo: ${msg}` },
          { status: 500 },
        );
      }
    }
  }

  // Fallback: descripción textual
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "Sos un experto en producción OOH. Describís mockups publicitarios de forma visual y detallada.",
      }, {
        role: "user",
        content: `Describí cómo se vería un mockup de una ${formatLabel} en "${locationLabel}", Argentina.
Nombre del espacio: "${unitName}".
${description ? `Características: ${description}` : ""}
${creativeImageUrl ? "El creativo del anunciante ya fue cargado y debe aparecer en la pantalla/valla." : ""}

Respondé SOLO con este JSON sin markdown:
{
  "description": "Descripción visual detallada (2-3 oraciones)",
  "environment": "Entorno urbano",
  "dimensions": "Dimensiones típicas",
  "bestTime": "Mejor horario de impacto",
  "imagePrompt": "Prompt en inglés para generar la imagen"
}`,
      }],
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const text = res.choices[0]?.message?.content ?? "{}";
    const data = JSON.parse(text);
    return NextResponse.json({ mockup: data, imageUrl: null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[creative-mockup] Error:", msg);
    return NextResponse.json({ error: `No se pudo generar el mockup: ${msg}` }, { status: 500 });
  }
}
