import { NextResponse } from "next/server";
import { fetchExplorePage, flattenSearchParams } from "@/lib/explore-query";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const flat: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    flat[k] = v;
  });
  const data = await fetchExplorePage(flattenSearchParams(flat));
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, max-age=15" },
  });
}
