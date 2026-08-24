"use server";

import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { sendEmail } from "@/lib/email";

export type RegisterState = { error?: string } | undefined;

const ALLOWED_ROLES: UserRole[] = [UserRole.advertiser, UserRole.provider, UserRole.agency];

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function registerUser(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const emailRaw = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const legalName = String(formData.get("legalName") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "advertiser") as UserRole;
  const phone = String(formData.get("phone") ?? "").trim();

  if (!emailRaw || !isValidEmail(emailRaw)) {
    return { error: "Ingresá un correo electrónico válido." };
  }
  if (!ALLOWED_ROLES.includes(roleRaw)) {
    return { error: "Tipo de cuenta inválido." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== confirm) {
    return { error: "Las contraseñas no coinciden." };
  }
  if (!legalName) {
    return { error: "El nombre de empresa o persona es obligatorio." };
  }

  const existing = await prisma.user.findUnique({ where: { email: emailRaw } });
  if (existing) {
    return { error: "Ese email ya está registrado. Iniciá sesión o usá otro correo." };
  }

  const passwordHash = await hashPassword(password);

  if (roleRaw === UserRole.advertiser) {
    await prisma.user.create({
      data: {
        email: emailRaw,
        passwordHash,
        role: UserRole.advertiser,
        advertiserProfile: {
          create: { legalName, phone: phone || undefined },
        },
      },
    });
  } else if (roleRaw === UserRole.provider) {
    await prisma.user.create({
      data: {
        email: emailRaw,
        passwordHash,
        role: UserRole.provider,
        providerProfile: {
          create: { companyName: legalName, phone: phone || undefined },
        },
      },
    });
  } else if (roleRaw === UserRole.agency) {
    await prisma.user.create({
      data: {
        email: emailRaw,
        passwordHash,
        role: UserRole.agency,
        agencyProfile: {
          create: { companyName: legalName, phone: phone || undefined },
        },
      },
    });
  }

  sendEmail({
    type: "welcome",
    to: emailRaw,
    role: roleRaw as "advertiser" | "provider" | "agency",
    name: legalName || undefined,
  }).catch(() => {});

  redirect("/login?registered=1");
}
