import { NextResponse } from "next/server";
import { markPaymentApproved } from "@/app/actions/payments";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { verifyMercadoPagoSignature } from "@/lib/webhook-verify";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const limited = rateLimit(clientKey(req, "mp-webhook"), 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("mp_webhook_missing_secret");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  try {
    const body = (await req.json()) as {
      type?: string;
      data?: { id?: string };
      id?: string;
    };
    const topic = body.type ?? req.headers.get("x-topic");
    const dataId = String(body.data?.id ?? body.id ?? "");

    const signed = verifyMercadoPagoSignature({
      signatureHeader: req.headers.get("x-signature"),
      requestId: req.headers.get("x-request-id"),
      dataId,
      secret,
    });
    if (!signed) {
      logger.warn("mp_webhook_invalid_signature");
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    if (topic === "payment" && dataId) {
      const mpPayment = await getMercadoPagoPayment(dataId);
      if (mpPayment?.status === "approved") {
        const payment = await prisma.payment.findFirst({
          where: { mercadoPagoPaymentId: dataId },
        });
        if (payment) {
          await markPaymentApproved(payment.reservationId, dataId);
        } else if (mpPayment.externalReference) {
          await markPaymentApproved(mpPayment.externalReference, dataId);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("mp_webhook_failed", { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
