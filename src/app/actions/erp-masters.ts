"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOpsSession } from "@/lib/ops-access";
import { ERP_RECORD, parseIntField, parseMoney, requiredString } from "@/lib/erp";
import {
  syncErpCatalogFromInventory as pullCatalogFromInventory,
  syncErpElementsFromCampaigns as pullElementsFromCampaigns,
} from "@/lib/erp-catalog";
import { erpFail, requiredId, type ErpResult } from "@/lib/erp-write";

type Result = ErpResult;

function refreshMasters() {
  revalidatePath("/backoffice");
  revalidatePath("/backoffice/clientes");
  revalidatePath("/backoffice/proveedores");
  revalidatePath("/backoffice/gastos");
  revalidatePath("/backoffice/config/empresas");
  revalidatePath("/backoffice/config/plazas");
  revalidatePath("/backoffice/config/monedas");
  revalidatePath("/backoffice/config/elementos");
  revalidatePath("/backoffice/ordenes/venta");
  revalidatePath("/backoffice/informe");
  revalidatePath("/backoffice/gestion");
}

function companyData(formData: FormData) {
  return {
    name: requiredString(formData.get("name"), "el nombre"),
    currency: String(formData.get("currency") ?? "ARS").trim() || "ARS",
    paymentDays: parseIntField(formData.get("paymentDays"), 30),
    estado: parseIntField(formData.get("estado"), ERP_RECORD.active),
  };
}

function clientData(formData: FormData) {
  return {
    name: requiredString(formData.get("name"), "el cliente"),
    companyId: requiredString(formData.get("companyId"), "la empresa"),
    executiveUserId: String(formData.get("executiveUserId") ?? "").trim() || null,
    taxId: String(formData.get("taxId") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    contact: String(formData.get("contact") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    costRate: parseMoney(formData.get("costRate")),
    agencyFee: parseMoney(formData.get("agencyFee")),
    taxCondition: parseIntField(formData.get("taxCondition"), 0),
    estado: parseIntField(formData.get("estado"), ERP_RECORD.active),
    industry: String(formData.get("industry") ?? "").trim() || null,
    legalName: String(formData.get("legalName") ?? "").trim() || null,
  };
}

function vendorData(formData: FormData) {
  return {
    kind: parseIntField(formData.get("kind"), 0),
    name: requiredString(formData.get("name"), "el proveedor"),
    taxId: String(formData.get("taxId") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    contact: String(formData.get("contact") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    cbu: String(formData.get("cbu") ?? "").trim() || null,
    taxCondition: parseIntField(formData.get("taxCondition"), 0),
    estado: parseIntField(formData.get("estado"), ERP_RECORD.active),
    paymentDays: parseIntField(formData.get("paymentDays"), 30),
    nextmediaProviderId: String(formData.get("nextmediaProviderId") ?? "").trim() || null,
  };
}

export async function createErpCompany(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpCompany.create({ data: companyData(formData) });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function updateErpCompany(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpCompany.update({
      where: { id: requiredId(formData.get("id")) },
      data: companyData(formData),
    });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpCompany(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    const used = await prisma.erpClient.count({ where: { companyId: id } });
    if (used > 0) throw new Error("No se puede borrar: tiene clientes asociados.");
    await prisma.erpCompany.delete({ where: { id } });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function createErpClient(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpClient.create({ data: clientData(formData) });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function updateErpClient(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpClient.update({
      where: { id: requiredId(formData.get("id")) },
      data: clientData(formData),
    });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpClient(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    const [orders, invoices, receipts] = await Promise.all([
      prisma.erpSaleOrder.count({ where: { clientId: id } }),
      prisma.erpSaleInvoice.count({ where: { clientId: id } }),
      prisma.erpSaleReceipt.count({ where: { clientId: id } }),
    ]);
    if (orders + invoices + receipts > 0) {
      throw new Error("No se puede borrar: tiene órdenes, facturas o recibos.");
    }
    await prisma.erpClient.delete({ where: { id } });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function createErpVendor(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpVendor.create({ data: vendorData(formData) });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function updateErpVendor(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpVendor.update({
      where: { id: requiredId(formData.get("id")) },
      data: vendorData(formData),
    });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpVendor(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    const [po, prod, inv, rec, pay] = await Promise.all([
      prisma.erpPurchaseOrder.count({ where: { vendorId: id } }),
      prisma.erpProductionOrder.count({ where: { vendorId: id } }),
      prisma.erpPurchaseInvoice.count({ where: { vendorId: id } }),
      prisma.erpPurchaseReceipt.count({ where: { vendorId: id } }),
      prisma.erpPaymentOrder.count({ where: { vendorId: id } }),
    ]);
    if (po + prod + inv + rec + pay > 0) {
      throw new Error("No se puede borrar: tiene órdenes o facturas asociadas.");
    }
    await prisma.erpVendor.delete({ where: { id } });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function createErpProvince(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpProvince.create({
      data: { name: requiredString(formData.get("name"), "la plaza") },
    });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function updateErpProvince(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpProvince.update({
      where: { id: requiredId(formData.get("id")) },
      data: { name: requiredString(formData.get("name"), "la plaza") },
    });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpProvince(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpProvince.delete({ where: { id } });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function createErpCity(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpCity.create({
      data: {
        name: requiredString(formData.get("name"), "la localidad"),
        provinceId: requiredString(formData.get("provinceId"), "la plaza"),
      },
    });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function updateErpCity(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpCity.update({
      where: { id: requiredId(formData.get("id")) },
      data: {
        name: requiredString(formData.get("name"), "la localidad"),
        provinceId: requiredString(formData.get("provinceId"), "la plaza"),
      },
    });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpCity(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpCity.delete({ where: { id } });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function createErpCurrency(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpCurrency.create({
      data: {
        code: requiredString(formData.get("code"), "el código").toUpperCase(),
        name: requiredString(formData.get("name"), "el nombre"),
        rate: parseMoney(formData.get("rate")) || 1,
      },
    });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function updateErpCurrency(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpCurrency.update({
      where: { id: requiredId(formData.get("id")) },
      data: {
        code: requiredString(formData.get("code"), "el código").toUpperCase(),
        name: requiredString(formData.get("name"), "el nombre"),
        rate: parseMoney(formData.get("rate")) || 1,
      },
    });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpCurrency(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpCurrency.delete({ where: { id } });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function createErpElement(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpElement.create({
      data: {
        name: requiredString(formData.get("name"), "el elemento"),
        estado: parseIntField(formData.get("estado"), ERP_RECORD.active),
      },
    });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function updateErpElement(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const id = requiredId(formData.get("id"));
    const name = requiredString(formData.get("name"), "el elemento");
    const prev = await prisma.erpElement.findUnique({ where: { id }, select: { name: true } });
    await prisma.erpElement.update({
      where: { id },
      data: { name, estado: parseIntField(formData.get("estado"), ERP_RECORD.active) },
    });
    if (prev && prev.name !== name) {
      await Promise.all([
        prisma.erpCampaignItem.updateMany({ where: { element: prev.name }, data: { element: name } }),
        prisma.erpGestionLine.updateMany({ where: { element: prev.name }, data: { element: name } }),
      ]);
    }
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpElement(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpElement.delete({ where: { id } });
    refreshMasters();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function syncErpElementsFromCampaigns(): Promise<
  { ok: true; message: string } | { ok: false; error: string }
> {
  try {
    await requireOpsSession();
    const s = await pullElementsFromCampaigns();
    refreshMasters();
    const parts = [
      s.created ? `${s.created} elementos` : null,
      s.renamed ? `${s.renamed} ítems unificados` : null,
    ].filter(Boolean);
    return {
      ok: true,
      message: parts.length ? `Se actualizaron ${parts.join(" y ")}.` : "El catálogo ya estaba al día.",
    };
  } catch (e) {
    return erpFail(e);
  }
}

export async function syncErpCatalogFromInventory(): Promise<
  { ok: true; message: string } | { ok: false; error: string }
> {
  try {
    await requireOpsSession();
    const s = await pullCatalogFromInventory();
    refreshMasters();
    const parts = [
      s.provincesCreated ? `${s.provincesCreated} plazas` : null,
      s.citiesCreated ? `${s.citiesCreated} localidades` : null,
      s.currenciesCreated ? `${s.currenciesCreated} monedas` : null,
      s.renamed ? `${s.renamed} ubicaciones unificadas` : null,
    ].filter(Boolean);
    return {
      ok: true,
      message: parts.length ? `Se agregaron ${parts.join(", ")}.` : "El catálogo ya estaba al día.",
    };
  } catch (e) {
    return erpFail(e);
  }
}

export async function upsertErpExpense(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const month = parseIntField(formData.get("month"));
    const year = parseIntField(formData.get("year"));
    if (month < 1 || month > 12 || year < 2000) throw new Error("Mes o año inválido.");
    await prisma.erpExpense.upsert({
      where: { month_year: { month, year } },
      create: {
        month,
        year,
        fixed: parseMoney(formData.get("fixed")),
        bank: parseMoney(formData.get("bank")),
        vat: parseMoney(formData.get("vat")),
        commissions: parseMoney(formData.get("commissions")),
      },
      update: {
        fixed: parseMoney(formData.get("fixed")),
        bank: parseMoney(formData.get("bank")),
        vat: parseMoney(formData.get("vat")),
        commissions: parseMoney(formData.get("commissions")),
      },
    });
    revalidatePath("/backoffice/gastos");
    revalidatePath("/backoffice/informe");
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpExpense(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpExpense.delete({ where: { id } });
    revalidatePath("/backoffice/gastos");
    revalidatePath("/backoffice/informe");
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}
