import { z } from "zod";
import { auth } from "@/auth";
import { openai } from "@/lib/openai";
import { fetchImageBuffer } from "@/lib/ai/image-edit";
import {
  compositeCreativeOnQuad,
  normalizeCorners,
  parseDetectedSurfaces,
} from "@/lib/ai/composite-billboard";
import { savePresentationImage } from "@/lib/presentations/local-upload";
import { clientKey, rateLimit, rateLimitError } from "@/lib/rate-limit";
import { isPresentationMockupEnabled } from "@/lib/features";
import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  sceneImageUrl: z.string().min(1).max(2000),
  creativeImageUrl: z.string().min(1).max(2000),
  locationLabel: z.string().max(300).optional(),
  unitName: z.string().max(200).optional(),
  unitFormat: z.string().max(40).optional(),
  medida: z.string().max(200).optional(),
});

function isAllowedSceneUrl(url: string) {
  return url.startsWith("/") || /^https?:\/\//i.test(url);
}

function isAllowedCreativeUrl(url: string) {
  return /^https?:\/\//i.test(url) || url.startsWith("/tmp/presentations/");
}

async function detectAdSurface(
  sceneBuf: Buffer,
  context: { locationLabel?: string; unitName?: string; unitFormat?: string; medida?: string },
) {
  const preview = await sharp(sceneBuf, { failOn: "none", limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  const previewMeta = await sharp(preview).metadata();
  const previewW = previewMeta.width ?? 1280;
  const previewH = previewMeta.height ?? 1280;

  const formatHint =
    context.unitFormat === "digital_ooh" || context.unitFormat === "digital_package"
      ? "pantalla LED / DOOH"
      : "valla o cartel impreso de gran formato";
  const extras = [
    context.unitName ? `Unidad: ${context.unitName}` : "",
    context.locationLabel ? `Ubicación: ${context.locationLabel}` : "",
    context.medida ? `Medida: ${context.medida}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  const ask = async (extra: string) => {
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
            content:
            "Detectás la cara completa del aviso OOH ya impreso o en pantalla. Las 4 esquinas deben coincidir con las 4 puntas del poster actual, sin recortar ni salirse al cielo. Respondés solo JSON.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `En esta foto hay un ${formatHint}. ${extras}
Marcá el poster/pantalla ENTERO que ya tiene una campaña (marca, foto de producto, tipografía grande).
Las esquinas son las 4 puntas de ESA lona/pantalla, alineadas al marco del aviso. No un recorte. No el cielo. No el poste. No un logo suelto.

Coordenadas normalizadas 0-1 respecto de TODA la foto.
JSON:
{"surfaces":[{"kind":"billboard","label":"valla autopista poster completo","corners":[{"x":0.16,"y":0.20},{"x":0.78,"y":0.18},{"x":0.80,"y":0.62},{"x":0.15,"y":0.64}]}]}
${extra}`,
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${preview.toString("base64")}`, detail: "high" },
            },
          ],
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });
    const parsed = parseDetectedSurfaces(JSON.parse(res.choices[0]?.message?.content ?? "{}"));
    if (!parsed) return null;
    return normalizeCorners(parsed, previewW, previewH);
  };

  const first = await ask("");
  if (first) return first;
  const retry = await ask(
    "Reintentá. El poster grande ya visible (campaña actual) es el objetivo. Devolvé sus 4 esquinas exactas, de esquina a esquina del aviso.",
  );
  if (!retry) throw new Error("No se detectó la cara del cartel.");
  return retry;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  if (!isPresentationMockupEnabled()) {
    return NextResponse.json({ error: "El mockup con IA está deshabilitado." }, { status: 503 });
  }

  const limited = rateLimit(clientKey(req, `presentation-mockup:${session.user.id}`), 30, 10 * 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: rateLimitError(limited.retryAfterSec) }, { status: 429 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "IA no configurada." }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const input = parsed.data;
  if (!isAllowedSceneUrl(input.sceneImageUrl.trim())) {
    return NextResponse.json({ error: "La foto del cartel no es válida." }, { status: 400 });
  }
  if (!isAllowedCreativeUrl(input.creativeImageUrl.trim())) {
    return NextResponse.json({ error: "El arte del cliente no es una URL válida." }, { status: 400 });
  }

  try {
    const [scene, creative] = await Promise.all([
      fetchImageBuffer(input.sceneImageUrl),
      fetchImageBuffer(input.creativeImageUrl),
    ]);
    const corners = await detectAdSurface(scene.buffer, input);
    const composed = await compositeCreativeOnQuad(scene.buffer, creative.buffer, corners);
    const imageUrl = await savePresentationImage(composed, "image/jpeg");
    return NextResponse.json({ imageUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[presentation-mockup] Error:", msg);
    return NextResponse.json(
      { error: `No se pudo colocar el arte en el cartel: ${msg}` },
      { status: 500 },
    );
  }
}
