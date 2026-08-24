import { NextResponse } from "next/server";
import { markPaymentApproved } from "@/app/actions/payments";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topic = body.type ?? req.headers.get("x-topic");
    const dataId = body.data?.id ?? body.id;

    if (topic === "payment" && dataId) {
      const mpPayment = await getMercadoPagoPayment(String(dataId));
      if (mpPayment?.status === "approved") {
        const payment = await prisma.payment.findFirst({
          where: { mercadoPagoPaymentId: String(dataId) },
        });
        if (payment) {
          await markPaymentApproved(payment.reservationId, String(dataId));
        } else {
          const externalRef = body.data?.external_reference ?? body.external_reference;
          if (externalRef) {
            await markPaymentApproved(String(externalRef), String(dataId));
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[MP webhook]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
