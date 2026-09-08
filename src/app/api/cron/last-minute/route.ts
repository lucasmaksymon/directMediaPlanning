import { NextResponse } from "next/server";
import { sendLastMinuteAlerts } from "@/app/actions/provider";
import { releaseExpiredHolds } from "@/app/actions/reservation";
import { requireCronSecret } from "@/lib/webhook-verify";

export async function GET(req: Request) {
  if (!requireCronSecret(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [alerts, holds] = await Promise.all([sendLastMinuteAlerts(), releaseExpiredHolds()]);
  return NextResponse.json({ ok: true, ...alerts, holdsReleased: holds.released });
}
