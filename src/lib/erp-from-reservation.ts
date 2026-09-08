import { Prisma } from "@prisma/client";
import { ERP_ORDER, ERP_RECORD } from "@/lib/erp";
import { logger } from "@/lib/logger";

function periodLabel(startsAt: Date, endsAt: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  return `${fmt(startsAt)} – ${fmt(endsAt)}`;
}

export async function syncReservationToErp(
  db: Prisma.TransactionClient,
  reservationId: string,
): Promise<void> {
  const resv = await db.reservation.findUnique({
    where: { id: reservationId },
    include: {
      inventoryUnit: { select: { name: true, locationLabel: true, format: true } },
      advertiser: {
        select: {
          email: true,
          advertiserProfile: { select: { legalName: true, taxId: true } },
        },
      },
    },
  });
  if (!resv || resv.erpSaleOrderId) return;

  const company = await db.erpCompany.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!company) {
    logger.warn("erp_bridge_skipped_no_company", { reservationId });
    return;
  }

  const email = resv.advertiser.email;
  const name = resv.advertiser.advertiserProfile?.legalName || email;
  const taxId = resv.advertiser.advertiserProfile?.taxId ?? null;

  let client = await db.erpClient.findFirst({
    where: {
      companyId: company.id,
      OR: [{ email }, ...(taxId ? [{ taxId }] : [])],
    },
  });
  if (!client) {
    client = await db.erpClient.create({
      data: {
        companyId: company.id,
        name,
        legalName: resv.advertiser.advertiserProfile?.legalName ?? name,
        email,
        taxId,
        estado: ERP_RECORD.active,
      },
    });
  }

  const issuedAt = new Date();
  const year = issuedAt.getFullYear();
  const month = issuedAt.getMonth() + 1;
  const count = await db.erpSaleOrder.count({ where: { year, month } });
  const number = `NP-${year}${String(month).padStart(2, "0")}-${String(count + 1).padStart(4, "0")}`;

  const net = Number(resv.agreedAmount ?? 0);
  const vat = Math.round(net * 0.21 * 100) / 100;
  const amount = Math.round((net + vat) * 100) / 100;

  const order = await db.erpSaleOrder.create({
    data: {
      clientId: client.id,
      issuedAt,
      month,
      year,
      number,
      product: resv.inventoryUnit.name,
      plaza: resv.inventoryUnit.locationLabel,
      periodLabel: periodLabel(resv.startsAt, resv.endsAt),
      observations: `Generada desde reserva marketplace ${resv.id}`,
      net,
      vat,
      amount,
      estado: ERP_ORDER.issued,
      items: {
        create: {
          element: resv.inventoryUnit.format,
          location: resv.inventoryUnit.locationLabel,
          quantity: 1,
          unitCost: net,
          exhibitionNet: net,
          startsAt: resv.startsAt,
          endsAt: resv.endsAt,
        },
      },
    },
  });

  await db.reservation.update({
    where: { id: resv.id },
    data: { erpSaleOrderId: order.id },
  });
}
