import { z } from "zod";
import { auth } from "@/auth";
import { openai } from "@/lib/openai";
import { fetchImageAsFile, persistGeneratedImage, supportsInputFidelity } from "@/lib/ai/image-edit";
import { clientKey, rateLimit, rateLimitError } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

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

const FORMAT_LABEL: Record<string, string> = {
  digital_ooh: "digital LED screen / DOOH panel",
  static_ooh: "static billboard / printed OOH face",
  digital_package: "digital OOH screen pack",
};

function isAllowedSceneUrl(url: string) {
  return url.startsWith("/") || /^https?:\/\//i.test(url);
}

function isAllowedCreativeUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function buildCompositePrompt(input: z.infer<typeof bodySchema>) {
  const formatLabel = FORMAT_LABEL[input.unitFormat ?? ""] ?? "OOH advertising surface";
  const location = input.locationLabel?.trim() || "Argentina";
  const unitName = input.unitName?.trim();
  const medida = input.medida?.trim();

  return `This is a real photograph of an existing out-of-home advertising unit in ${location}${unitName ? ` ("${unitName}")` : ""}.
The advertising face is a ${formatLabel}${medida ? ` measuring ${medida}` : ""}.

The second image is the client's advertisement artwork.

Replace ONLY the content currently displayed on the billboard / LED screen / advertising face with the client's artwork.
Keep the EXACT same photograph: camera angle, perspective, crop, lighting, weather, surroundings, people, vehicles, structure, poles, frames and reflections.
Do not invent a new scene. Do not move or reshape the unit. Do not add extra boards.
The artwork must sit on the advertising surface with correct perspective, undistorted branding, readable typography, and original brand colors.
Do not add placeholder text.`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const limited = rateLimit(clientKey(req, `presentation-mockup:${session.user.id}`), 30, 10 * 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: rateLimitError(limited.retryAfterSec) }, { status: 429 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "IA no configurada." }, { status: 503 });
  }
  if (process.env.OPENAI_IMAGE_ENABLED !== "true") {
    return NextResponse.json(
      { error: "La generación de imágenes está desactivada (OPENAI_IMAGE_ENABLED)." },
      { status: 503 },
    );
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

  const imageModel = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
  const imageSize = input.unitFormat === "digital_ooh" ? "1536x1024" : "1024x1024";

  try {
    const [sceneFile, creativeFile] = await Promise.all([
      fetchImageAsFile(input.sceneImageUrl, "scene"),
      fetchImageAsFile(input.creativeImageUrl, "creative"),
    ]);

    const res = await openai.images.edit({
      model: imageModel,
      image: [sceneFile, creativeFile],
      prompt: buildCompositePrompt(input),
      ...(supportsInputFidelity(imageModel) ? { input_fidelity: "high" as const } : {}),
      size: imageSize as "1536x1024" | "1024x1024",
      quality: imageModel.startsWith("dall-e") ? "standard" : "medium",
    });

    const item = res.data?.[0];
    if (!item) {
      return NextResponse.json({ error: "La IA no devolvió una imagen." }, { status: 500 });
    }

    const imageUrl = await persistGeneratedImage(item);
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
