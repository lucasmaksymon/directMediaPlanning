"use server";

import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export type RegisterState = { error?: string } | undefined;

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
  const roleRaw = String(formData.get("role") ?? "");
  const companyName = String(formData.get("companyName") ?? "").trim();
  const legalName = String(formData.get("legalName") ?? "").trim();

  if (!emailRaw || !isValidEmail(emailRaw)) {
    return { error: "Ingresá un correo electrónico válido." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== confirm) {
    return { error: "Las contraseñas no coinciden." };
  }

  let role: UserRole;
  if (roleRaw === "provider") role = UserRole.provider;
  else if (roleRaw === "advertiser") role = UserRole.advertiser;
  else return { error: "Seleccioná cómo vas a usar la plataforma." };

  if (role === UserRole.provider && companyName.length < 2) {
    return { error: "Indicá el nombre comercial o la razón social de tu medio." };
  }

  const existing = await prisma.user.findUnique({ where: { email: emailRaw } });
  if (existing) {
    return { error: "Ese email ya está registrado. Iniciá sesión o usá otro correo." };
  }

  const passwordHash = await hashPassword(password);

  if (role === UserRole.advertiser) {
    await prisma.user.create({
      data: {
        email: emailRaw,
        passwordHash,
        role,
        advertiserProfile: {
          create: legalName ? { legalName } : {},
        },
      },
    });
  } else {
    await prisma.user.create({
      data: {
        email: emailRaw,
        passwordHash,
        role,
        providerProfile: {
          create: { companyName },
        },
      },
    });
  }

  redirect("/login?registered=1");
}
