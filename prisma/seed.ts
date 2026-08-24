/**
 * NextPlanning — seed de producción / bootstrap
 *
 * Requisitos:
 *   SEED_ADMIN_EMAIL
 *   SEED_ADMIN_PASSWORD
 *   SEED_RESET=true   (obligatorio para borrar y recrear)
 *
 * Carga:
 *   - 1 usuario admin
 *   - Proveedores del Drive Media Kits 2026 (sin login)
 *   - Paquetes LED AMBA en draft (precio a confirmar, sin fotos)
 *
 * Ejecutar: SEED_RESET=true npm run db:seed
 */
import {
  InventoryFormat,
  InventoryStatus,
  PriceModel,
  Prisma,
  PrismaClient,
  UserRole,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function d(amount: string | number) {
  return new Prisma.Decimal(amount);
}

/** Proveedores reales — carpetas Media Kits 2026 (sin PPT UNIFICADO ni archivos sueltos). */
const PROVIDERS: { companyName: string; description: string }[] = [
  { companyName: "ATACAMA", description: "Parque OOH — media kit 2026." },
  { companyName: "BAMBU", description: "Parque OOH — media kit 2026." },
  { companyName: "BAMP", description: "Parque OOH — media kit 2026." },
  { companyName: "BBYMC", description: "Parque OOH — media kit 2026." },
  { companyName: "BILLBOARD", description: "Parque OOH — media kit 2026." },
  { companyName: "BRAND PLUS", description: "Parque OOH — media kit 2026." },
  { companyName: "CITY MEDIA", description: "Parque OOH — media kit 2026." },
  { companyName: "DA3", description: "Parque OOH — media kit 2026." },
  { companyName: "DELFINO", description: "Parque OOH — media kit 2026." },
  { companyName: "ENVISION", description: "Parque OOH — media kit 2026." },
  { companyName: "ESTO ES / VURKINA", description: "Parque OOH — media kit 2026." },
  { companyName: "FILIPPO", description: "Parque OOH — media kit 2026." },
  { companyName: "GLOBAL", description: "Parque OOH — media kit 2026." },
  { companyName: "IDEAS CREATIVAS", description: "Parque OOH — media kit 2026." },
  { companyName: "LITORAL", description: "Parque OOH — media kit 2026." },
  { companyName: "MASA IDEAS", description: "Parque OOH — media kit 2026." },
  { companyName: "MEDIA 500", description: "Parque OOH — media kit 2026." },
  { companyName: "METROPOLI PUBLICIDAD", description: "Parque OOH — media kit 2026." },
  { companyName: "NE3 Publicidad", description: "Parque OOH — media kit 2026." },
  { companyName: "NEXO", description: "Parque OOH — media kit 2026." },
  { companyName: "OMB VIA PUBLICA", description: "Parque OOH — media kit 2026." },
  { companyName: "PC Carnevale", description: "Parque OOH — media kit 2026." },
  { companyName: "PUBLICAR", description: "Parque OOH — media kit 2026." },
  { companyName: "PUBLICITAR", description: "Parque OOH — media kit 2026." },
  { companyName: "ROMAN", description: "Parque OOH — media kit 2026." },
  { companyName: "SKY MEDIA", description: "Parque OOH — media kit 2026." },
  { companyName: "TOP VIEW", description: "Parque OOH — media kit 2026." },
  { companyName: "VIACART", description: "Parque OOH — media kit 2026." },
  { companyName: "VOLMEDIA", description: "Parque OOH — media kit 2026." },
  { companyName: "WALLSTREET", description: "Parque OOH — media kit 2026." },
];

async function clearAll() {
  await prisma.playLog.deleteMany();
  await prisma.playlistItem.deleteMany();
  await prisma.playlist.deleteMany();
  await prisma.screen.deleteMany();
  await prisma.slotAvailability.deleteMany();
  await prisma.programmaticDeal.deleteMany();
  await prisma.audienceReport.deleteMany();
  await prisma.publicationOrder.deleteMany();
  await prisma.proofOfPlay.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.creativeAsset.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.availabilityBlock.deleteMany();
  await prisma.circuitUnit.deleteMany();
  await prisma.circuit.deleteMany();
  await prisma.inventoryUnit.deleteMany();
  await prisma.agencyClient.deleteMany();
  await prisma.agencyProfile.deleteMany();
  await prisma.advertiserProfile.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const reset = process.env.SEED_RESET === "true";

  if (!reset) {
    throw new Error(
      "Seed abortado: seteá SEED_RESET=true para borrar y recrear la base. " +
        "Ejemplo: SEED_RESET=true SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run db:seed",
    );
  }

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Seed abortado: faltan SEED_ADMIN_EMAIL y/o SEED_ADMIN_PASSWORD.",
    );
  }

  if (adminPassword.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD debe tener al menos 8 caracteres.");
  }

  console.log("Limpiando base…");
  await clearAll();

  const passwordHash = await hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail.toLowerCase(),
      role: UserRole.admin,
      passwordHash,
    },
  });

  console.log(`Admin: ${admin.email}`);

  const packagesProvider = await prisma.providerProfile.create({
    data: {
      companyName: "NextMedia Paquetes",
      description:
        "Paquetes y circuitos de plataforma (LED AMBA). Tarifas a confirmar desde media kits.",
    },
  });

  for (const p of PROVIDERS) {
    await prisma.providerProfile.create({
      data: {
        companyName: p.companyName,
        description: p.description,
      },
    });
  }

  // Placeholder mínimo: schema exige basePriceAmount > 0; status draft = no sale en explorar.
  const placeholderPrice = d("1");

  await prisma.inventoryUnit.createMany({
    data: [
      {
        providerId: packagesProvider.id,
        name: "Paquete Pantallas LED AMBA",
        format: InventoryFormat.digital_package,
        locationLabel: "AMBA",
        description:
          "Referencia a paquetes LED AMBA (media kits 2026). Precio y unidades a confirmar por operaciones.",
        basePriceAmount: placeholderPrice,
        currency: "ARS",
        priceModel: PriceModel.negotiable,
        status: InventoryStatus.draft,
        imageUrls: [],
      },
      {
        providerId: packagesProvider.id,
        name: "Paquete Pantallas LED AMBA (editable)",
        format: InventoryFormat.digital_package,
        locationLabel: "AMBA",
        description:
          "Referencia al PPT editable de paquetes LED. Precio y composición a confirmar.",
        basePriceAmount: placeholderPrice,
        currency: "ARS",
        priceModel: PriceModel.negotiable,
        status: InventoryStatus.draft,
        imageUrls: [],
      },
    ],
  });

  console.log(`Proveedores medios: ${PROVIDERS.length}`);
  console.log(`Proveedor paquetes: ${packagesProvider.companyName}`);
  console.log("Unidades draft (paquetes LED AMBA): 2");
  console.log("Seed OK. /explorar queda vacío hasta publicar inventario con precio real.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
