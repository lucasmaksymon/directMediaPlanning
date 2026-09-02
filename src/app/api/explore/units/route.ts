import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { fetchExplorePage, flattenSearchParams } from "@/lib/explore-query";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

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
