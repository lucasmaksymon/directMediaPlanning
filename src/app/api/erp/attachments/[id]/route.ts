import { NextResponse } from "next/server";
import { requireOpsSession } from "@/lib/ops-access";
import { readErpAttachment } from "@/lib/erp-attachment";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireOpsSession();
    const { id } = await params;
    const file = await readErpAttachment(decodeURIComponent(id));
    if (!file) return new NextResponse("No encontrado.", { status: 404 });
    const named = new URL(req.url).searchParams.get("name")?.replace(/["\r\n]/g, "_");
    const filename = named || file.filename;
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Acceso denegado.", { status: 401 });
  }
}
