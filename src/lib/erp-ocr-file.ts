export function asOcrFile(file: File) {
  const name = file.name || "comprobante";
  if (file.type && file.type !== "application/octet-stream") return file;
  const mime = name.toLowerCase().endsWith(".pdf")
    ? "application/pdf"
    : /\.png$/i.test(name)
      ? "image/png"
      : /\.webp$/i.test(name)
        ? "image/webp"
        : /\.gif$/i.test(name)
          ? "image/gif"
          : file.type.startsWith("image/")
            ? file.type
            : "image/jpeg";
  return new File([file], name, { type: mime });
}

export function attachmentDisplayName(url: string) {
  try {
    const parsed = new URL(url, "http://local");
    const named = parsed.searchParams.get("name")?.trim();
    if (named) return named;
    const id = decodeURIComponent(parsed.pathname.split("/").pop() ?? "");
    const fromId = id.match(/^[0-9a-f-]{36}--(.+)$/i)?.[1];
    if (fromId) return fromId;
  } catch {
    /* ignore */
  }
  const fallback = url.split("/").pop()?.split("?")[0] ?? "";
  try {
    return decodeURIComponent(fallback) || "Adjunto";
  } catch {
    return fallback || "Adjunto";
  }
}

export function ocrFormData(file: File, kindHint: string, issuedOnly = false) {
  const data = new FormData();
  data.set("file", asOcrFile(file));
  data.set("kindHint", kindHint);
  data.set("issuedOnly", issuedOnly ? "1" : "0");
  return data;
}
