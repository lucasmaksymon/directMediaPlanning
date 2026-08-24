import { APP_URL } from "@/lib/email";

const MP_API = "https://api.mercadopago.com";

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

type PreferenceItem = {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
};

export async function createMercadoPagoPreference(params: {
  reservationId: string;
  items: PreferenceItem[];
  payerEmail?: string;
}): Promise<{ preferenceId: string; initPoint: string } | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: params.items.map((i) => ({
        ...i,
        currency_id: i.currency_id ?? "ARS",
      })),
      payer: params.payerEmail ? { email: params.payerEmail } : undefined,
      external_reference: params.reservationId,
      back_urls: {
        success: `${APP_URL}/advertiser/pagos/exito?reservation=${params.reservationId}`,
        failure: `${APP_URL}/advertiser/pagos/error?reservation=${params.reservationId}`,
        pending: `${APP_URL}/advertiser/pagos/pendiente?reservation=${params.reservationId}`,
      },
      auto_return: "approved",
      notification_url: `${APP_URL}/api/payments/mercadopago/webhook`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[MercadoPago] preference error:", err);
    return null;
  }

  const data = (await res.json()) as { id: string; init_point: string };
  return { preferenceId: data.id, initPoint: data.init_point };
}

export async function getMercadoPagoPayment(paymentId: string): Promise<{ status: string } | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;

  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { status: string };
  return { status: data.status };
}
