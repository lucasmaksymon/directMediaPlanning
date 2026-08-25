/** Convierte imageSrc (path local, URL o data URI) a input de pptxgenjs. */
export async function imageForPptx(
  imageSrc: string | null,
): Promise<{ path?: string; data?: string } | null> {
  if (!imageSrc) return null;

  if (imageSrc.startsWith("data:")) {
    // pptxgenjs espera "image/jpeg;base64,...." sin el prefijo "data:"
    return { data: imageSrc.replace(/^data:/, "") };
  }

  if (!imageSrc.startsWith("http://") && !imageSrc.startsWith("https://")) {
    return { path: imageSrc };
  }

  try {
    const res = await fetch(imageSrc);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type") || "image/jpeg";
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    return { data: `image/${ext};base64,${buf.toString("base64")}` };
  } catch {
    return null;
  }
}
