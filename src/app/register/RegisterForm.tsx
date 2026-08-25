"use client";

import { useActionState, useState } from "react";
import { registerUser, type RegisterState } from "@/app/actions/register";
import { PRODUCT_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Overlay";
import { cn } from "@/lib/cn";

type RoleOption = {
  id: "advertiser" | "provider" | "agency";
  label: string;
  description: string;
};

const ROLES: RoleOption[] = [
  {
    id: "advertiser",
    label: "Anunciante",
    description: "Quiero planificar campañas y reservar espacios publicitarios.",
  },
  {
    id: "provider",
    label: "Medio / Empresa OOH",
    description: "Tengo carteles, pantallas u otros espacios para ofrecer.",
  },
  {
    id: "agency",
    label: "Agencia",
    description: "Gestiono campañas para varios anunciantes como intermediaria.",
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
        <p className="nm-secondary">
          Elegí qué tipo de cuenta querés crear en {PRODUCT_NAME}:
        </p>
        <div className="grid gap-3">
          {ROLES.map((role) => (
            <button
              key={role.id}
              className={cn(
                "flex w-full items-start gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-5 text-left transition",
                "hover:border-primary/50 hover:bg-primary-subtle focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]",
              )}
              onClick={() => setSelectedRole(role.id)}
              type="button"
            >
              <div>
                <p className="font-semibold text-foreground">{role.label}</p>
                <p className="nm-secondary mt-0.5">{role.description}</p>
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
      <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-primary/30 bg-primary-subtle px-4 py-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{role.label}</p>
          <p className="nm-caption">{role.description}</p>
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

      <div className="space-y-1.5">
        <Label htmlFor="legalName">
          {selectedRole === "advertiser" ? "Empresa o nombre *" : "Nombre de la empresa *"}
        </Label>
        <Input
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

      <div className="space-y-1.5">
        <Label htmlFor="email">Email *</Label>
        <Input autoComplete="email" id="email" name="email" required type="email" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Teléfono / WhatsApp</Label>
        <Input id="phone" name="phone" placeholder="+54 9 11 1234-5678" type="tel" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña (mínimo 8 caracteres) *</Label>
        <Input
          autoComplete="new-password"
          id="password"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirmar contraseña *</Label>
        <Input
          autoComplete="new-password"
          id="confirm"
          minLength={8}
          name="confirm"
          required
          type="password"
        />
      </div>

      {state?.error ? (
        <Alert variant="error" role="alert">
          {state.error}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 pt-1">
        <Button className="w-full" disabled={pending} type="submit">
          {pending ? "Creando tu cuenta…" : "Crear cuenta"}
        </Button>
        <Button
          className="w-full"
          disabled={pending}
          onClick={() => setSelectedRole(null)}
          type="button"
          variant="secondary"
        >
          Volver
        </Button>
      </div>
    </form>
  );
}
