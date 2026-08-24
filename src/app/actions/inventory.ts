"use server";

import {
  BookingGranularity,
  InventoryFormat,
  InventoryStatus,
  PriceModel,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assertUnitBelongsToProvider,
  OpsAccessError,
  requireOpsSession,
  resolveProviderIdFromForm,
} from "@/lib/ops-access";
import { prisma } from "@/lib/prisma";

function parseEnum<T extends string>(value: string, allowed: readonly T[]): T | null {
  return allowed.includes(value as T) ? (value as T) : null;
}

export type ActionState = { error?: string } | undefined;

function parseOptionalCoord(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim().replace(",", ".");
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

export async function createInventoryUnit(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireOpsSession();
    const providerId = await resolveProviderIdFromForm(formData);

    const name = String(formData.get("name") ?? "").trim();
    const locationLabel = String(formData.get("locationLabel") ?? "").trim();
    const basePrice = Number(String(formData.get("basePriceAmount") ?? "").replace(",", "."));
    const format = parseEnum(String(formData.get("format") ?? ""), [
      "digital_ooh",
      "static_ooh",
      "digital_package",
    ] as const);
    const priceModel = parseEnum(String(formData.get("priceModel") ?? ""), [
      "fixed_list",
      "negotiable",
      "package",
    ] as const);
    const status = parseEnum(String(formData.get("status") ?? "draft"), [
      "draft",
      "published",
      "paused",
    ] as const);
    const granularity = parseEnum(String(formData.get("minimalBookingGranularity") ?? "week"), [
      "day",
      "week",
    ] as const);

    if (name.length < 2) return { error: "Indicá un nombre para identificar este espacio." };
    if (locationLabel.length < 2) return { error: "Indicá la ubicación o zona geográfica." };
    if (!Number.isFinite(basePrice) || basePrice <= 0) return { error: "Indicá un precio de referencia válido." };
    if (!format) return { error: "Seleccioná un formato." };
    if (!priceModel) return { error: "Seleccioná cómo se cotiza el espacio." };
    if (!status) return { error: "Seleccioná un estado de publicación." };
    if (!granularity) return { error: "Seleccioná la duración mínima de reserva." };

    const latitude = parseOptionalCoord(formData, "latitude");
    const longitude = parseOptionalCoord(formData, "longitude");
    if (latitude != null && (latitude < -90 || latitude > 90)) {
      return { error: "La latitud debe estar entre -90 y 90." };
    }
    if (longitude != null && (longitude < -180 || longitude > 180)) {
      return { error: "La longitud debe estar entre -180 y 180." };
    }

    const description = String(formData.get("description") ?? "").trim() || null;
    const imageUrlsRaw = String(formData.get("imageUrls") ?? "").trim();
    const imageUrls = imageUrlsRaw ? imageUrlsRaw.split(",").map((u) => u.trim()).filter(Boolean) : [];

    const instantBookEnabled = formData.get("instantBookEnabled") === "true";
    const instantBookMinDays = Math.max(1, Number(formData.get("instantBookMinDays") ?? "1") || 1);
    const lastMinuteEnabled = formData.get("lastMinuteEnabled") === "true";
    const lastMinuteDiscountPercent = Math.min(90, Math.max(0, Number(formData.get("lastMinuteDiscountPercent") ?? "20") || 20));

    await prisma.inventoryUnit.create({
      data: {
        providerId,
        name,
        format: format as InventoryFormat,
        locationLabel,
        description,
        basePriceAmount: basePrice,
        priceModel: priceModel as PriceModel,
        status: status as InventoryStatus,
        minimalBookingGranularity: granularity as BookingGranularity,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        imageUrls,
        instantBookEnabled,
        instantBookMinDays,
        lastMinuteEnabled,
        lastMinuteDiscountPercent,
      },
    });

    revalidatePath("/admin/operaciones/inventory");
    revalidatePath("/explorar");
    redirect("/admin/operaciones/inventory");
  } catch (e) {
    if (e instanceof OpsAccessError) return { error: e.message };
    throw e;
  }
}

export async function updateInventoryUnit(
  unitId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireOpsSession();
    const providerId = await resolveProviderIdFromForm(formData);
    await assertUnitBelongsToProvider(unitId, providerId);

    const name = String(formData.get("name") ?? "").trim();
    const locationLabel = String(formData.get("locationLabel") ?? "").trim();
    const basePrice = Number(String(formData.get("basePriceAmount") ?? "").replace(",", "."));
    const format = parseEnum(String(formData.get("format") ?? ""), [
      "digital_ooh",
      "static_ooh",
      "digital_package",
    ] as const);
    const priceModel = parseEnum(String(formData.get("priceModel") ?? ""), [
      "fixed_list",
      "negotiable",
      "package",
    ] as const);
    const status = parseEnum(String(formData.get("status") ?? "draft"), [
      "draft",
      "published",
      "paused",
    ] as const);
    const granularity = parseEnum(String(formData.get("minimalBookingGranularity") ?? "week"), [
      "day",
      "week",
    ] as const);

    if (name.length < 2) return { error: "Indicá un nombre para identificar este espacio." };
    if (locationLabel.length < 2) return { error: "Indicá la ubicación o zona geográfica." };
    if (!Number.isFinite(basePrice) || basePrice <= 0) return { error: "Indicá un precio de referencia válido." };
    if (!format || !priceModel || !status || !granularity) {
      return { error: "Revisá que todos los campos estén completos y volvé a intentar." };
    }

    const latitude = parseOptionalCoord(formData, "latitude");
    const longitude = parseOptionalCoord(formData, "longitude");
    if (latitude != null && (latitude < -90 || latitude > 90)) {
      return { error: "La latitud debe estar entre -90 y 90." };
    }
    if (longitude != null && (longitude < -180 || longitude > 180)) {
      return { error: "La longitud debe estar entre -180 y 180." };
    }

    const description = String(formData.get("description") ?? "").trim() || null;
    const imageUrlsRaw = String(formData.get("imageUrls") ?? "").trim();
    const imageUrls = imageUrlsRaw ? imageUrlsRaw.split(",").map((u) => u.trim()).filter(Boolean) : [];
    const instantBookEnabled = formData.get("instantBookEnabled") === "true";
    const instantBookMinDays = Math.max(1, Number(formData.get("instantBookMinDays") ?? "1") || 1);
    const lastMinuteEnabled = formData.get("lastMinuteEnabled") === "true";
    const lastMinuteDiscountPercent = Math.min(90, Math.max(0, Number(formData.get("lastMinuteDiscountPercent") ?? "20") || 20));

    await prisma.inventoryUnit.update({
      where: { id: unitId },
      data: {
        providerId,
        name,
        format: format as InventoryFormat,
        locationLabel,
        description,
        basePriceAmount: basePrice,
        priceModel: priceModel as PriceModel,
        status: status as InventoryStatus,
        minimalBookingGranularity: granularity as BookingGranularity,
        latitude: latitude === null ? null : latitude,
        longitude: longitude === null ? null : longitude,
        imageUrls,
        instantBookEnabled,
        instantBookMinDays,
        lastMinuteEnabled,
        lastMinuteDiscountPercent,
      },
    });

    revalidatePath("/admin/operaciones/inventory");
    revalidatePath("/explorar");
    revalidatePath(`/explorar/${unitId}`);
    revalidatePath(`/admin/operaciones/inventory/${unitId}/edit`);
    redirect("/admin/operaciones/inventory");
  } catch (e) {
    if (e instanceof OpsAccessError) return { error: e.message };
    throw e;
  }
}
