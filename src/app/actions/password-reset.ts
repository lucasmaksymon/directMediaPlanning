"use server";

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { APP_URL } from "@/lib/email";
import { hashPassword } from "@/lib/password";
import { clientKey, rateLimit, rateLimitError } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export type PasswordResetState = { error?: string; ok?: boolean } | undefined;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function limiter(prefix: string) {
  const h = await headers();
  const req = { headers: h };
  return rateLimit(clientKey(req, prefix), 5, 15 * 60_000);
}

export async function requestPasswordReset(
  _prev: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const limited = await limiter("pw-reset");
  if (!limited.ok) return { error: rateLimitError(limited.retryAfterSec) };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Ingresá tu email." };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (user) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    sendEmail({
      type: "password_reset",
      to: user.email,
      resetUrl: `${APP_URL}/login/recuperar/${token}`,
    }).catch((e) => logger.error("email_failed", { type: "password_reset", error: String(e) }));
  }

  return { ok: true };
}

export async function completePasswordReset(
  token: string,
  _prev: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const limited = await limiter("pw-reset-complete");
  if (!limited.ok) return { error: rateLimitError(limited.retryAfterSec) };

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== confirm) return { error: "Las contraseñas no coinciden." };

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!row || row.expiresAt.getTime() < Date.now()) {
    return { error: "El enlace expiró o no es válido. Pedí uno nuevo." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: row.userId } }),
  ]);

  return { ok: true };
}
