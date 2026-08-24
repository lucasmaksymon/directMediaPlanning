import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export class OpsAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpsAccessError";
  }
}

/** Solo equipo NextMedia (admin) puede operar inventario y backoffice. */
export async function requireOpsSession() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new OpsAccessError("Acceso denegado.");
  }
  return session;
}

export async function resolveProviderIdFromForm(formData: FormData): Promise<string> {
  const providerId = String(formData.get("providerId") ?? "").trim();
  if (!providerId) {
    throw new OpsAccessError("Seleccioná un proveedor interno.");
  }
  const exists = await prisma.providerProfile.findUnique({
    where: { id: providerId },
    select: { id: true },
  });
  if (!exists) {
    throw new OpsAccessError("Proveedor interno no encontrado.");
  }
  return providerId;
}

export async function assertUnitBelongsToProvider(unitId: string, providerId: string) {
  const unit = await prisma.inventoryUnit.findFirst({
    where: { id: unitId, providerId },
    select: { id: true },
  });
  if (!unit) {
    throw new OpsAccessError("No encontramos esa unidad o no pertenece al proveedor seleccionado.");
  }
}

export async function listInternalProviders() {
  return prisma.providerProfile.findMany({
    select: { id: true, companyName: true },
    orderBy: { companyName: "asc" },
  });
}
