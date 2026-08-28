import { auth } from "@/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildMonthlyReport } from "@/lib/erp-informe";
import { ErpInformeDocument } from "@/lib/pdf/erp-informe-document";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const month = Number(searchParams.get("mes")) || now.getMonth() + 1;
  const year = Number(searchParams.get("anio")) || now.getFullYear();
  const rows = await buildMonthlyReport(month, year);

  const buffer = await renderToBuffer(ErpInformeDocument({ month, year, rows }));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="informe-${year}-${String(month).padStart(2, "0")}.pdf"`,
    },
  });
}
