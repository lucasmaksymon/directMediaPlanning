"use client";

import { useActionState, useState } from "react";
import { registerUser, type RegisterState } from "@/app/actions/register";
import { PRODUCT_NAME } from "@/lib/brand";
import { fieldClass, labelClass, btnPrimary, btnSecondary } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

type RoleOption = {
  id: "advertiser" | "provider" | "agency";
  label: string;
  description: string;
  icon: string;
};

const ROLES: RoleOption[] = [
  {
    id: "advertiser",
    label: "Anunciante",
    description: "Quiero planificar campañas y reservar espacios publicitarios.",
    icon: "📢",
  },
  {
    id: "provider",
    label: "Medio / Empresa OOH",
    description: "Tengo carteles, pantallas u otros espacios para ofrecer.",
    icon: "🏙️",
  },
  {
    id: "agency",
    label: "Agencia",
    description: "Gestiono campañas para varios anunciantes como intermediaria.",
    icon: "🤝",
  },
];

export function RegisterForm() {
  const [selectedRole, setSelectedRole] = useState<RoleOption["id"] | null>(null);
  const [state, action, pending] = useActionState(
    async (prev: RegisterState, formData: FormData) => registerUser(prev, formData),
    undefined,
  );

  if (!selectedRole) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Elegí qué tipo de cuenta querés crear en {PRODUCT_NAME}:
        </p>
        <div className="grid gap-3">
          {ROLES.map((role) => (
            <button
              key={role.id}
              className={cn(
                "flex w-full items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left transition duration-200",
                "hover:border-led/60 hover:bg-led/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-led",
              )}
              onClick={() => setSelectedRole(role.id)}
              type="button"
            >
              <span className="text-2xl" aria-hidden="true">{role.icon}</span>
              <div>
                <p className="font-semibold text-foreground">{role.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{role.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const role = ROLES.find((r) => r.id === selectedRole)!;

  return (
    <form action={action} className="space-y-5">
      {/* Header rol seleccionado */}
      <div className="flex items-center gap-3 rounded-2xl border border-led/30 bg-led/5 px-4 py-3">
        <span className="text-xl">{role.icon}</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{role.label}</p>
          <p className="text-xs text-muted-foreground">{role.description}</p>
        </div>
        <button
          type="button"
          className="text-xs font-medium text-led underline underline-offset-2"
          onClick={() => setSelectedRole(null)}
        >
          Cambiar
        </button>
      </div>

      <input type="hidden" name="role" value={selectedRole} />

      <div>
        <label className={labelClass} htmlFor="legalName">
          {selectedRole === "advertiser" ? "Empresa o nombre *" : "Nombre de la empresa *"}
        </label>
        <input
          className={cn(fieldClass, "mt-1.5")}
          id="legalName"
          name="legalName"
          placeholder={
            selectedRole === "provider"
              ? "Ej. Pantallas Córdoba S.A."
              : selectedRole === "agency"
              ? "Ej. Agencia Publicidad XYZ"
              : "Ej. Empresa S.A. o Juan Pérez"
          }
          required
          type="text"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="email">
          Email *
        </label>
        <input
          autoComplete="email"
          className={cn(fieldClass, "mt-1.5")}
          id="email"
          name="email"
          required
          type="email"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="phone">
          Teléfono / WhatsApp
        </label>
        <input
          className={cn(fieldClass, "mt-1.5")}
          id="phone"
          name="phone"
          placeholder="+54 9 11 1234-5678"
          type="tel"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="password">
          Contraseña (mínimo 8 caracteres) *
        </label>
        <input
          autoComplete="new-password"
          className={cn(fieldClass, "mt-1.5")}
          id="password"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="confirm">
          Confirmar contraseña *
        </label>
        <input
          autoComplete="new-password"
          className={cn(fieldClass, "mt-1.5")}
          id="confirm"
          minLength={8}
          name="confirm"
          required
          type="password"
        />
      </div>

      {state?.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 pt-1">
        <button className={cn(btnPrimary, "w-full")} disabled={pending} type="submit">
          {pending ? "Creando tu cuenta…" : "Crear cuenta"}
        </button>
        <button
          className={cn(btnSecondary, "w-full")}
          disabled={pending}
          onClick={() => setSelectedRole(null)}
          type="button"
        >
          ← Volver
        </button>
      </div>
    </form>
  );
}
