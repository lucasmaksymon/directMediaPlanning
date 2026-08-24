import { NextResponse } from "next/server";
import { sendLastMinuteAlerts } from "@/app/actions/provider";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendLastMinuteAlerts();
  return NextResponse.json({ ok: true, ...result });
}
