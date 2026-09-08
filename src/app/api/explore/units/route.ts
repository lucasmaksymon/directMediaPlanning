import { NextResponse } from "next/server";
import { fetchExplorePage, flattenSearchParams } from "@/lib/explore-query";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const limited = rateLimit(clientKey(req, "explore"), 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Demasiados intentos." }, { status: 429 });
  }

  const url = new URL(req.url);
  const flat: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    flat[k] = v;
  });
  const data = await fetchExplorePage(flattenSearchParams(flat));
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=15" },
  });
}
