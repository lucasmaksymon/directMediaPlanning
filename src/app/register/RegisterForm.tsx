"use client";

import { useActionState } from "react";
import { registerUser, type RegisterState } from "@/app/actions/register";
import { fieldClass, labelClass, btnPrimary } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export function RegisterForm() {
  const [state, action, pending] = useActionState(
    async (prev: RegisterState, formData: FormData) => registerUser(prev, formData),
    undefined,
  );

  return (
    <form action={action} className="space-y-5">
      <fieldset className="space-y-3 rounded-2xl border border-border bg-muted/80 p-4 backdrop-blur-sm">
        <legend className="text-sm font-medium text-foreground">
          ¿Cómo vas a usar Direct Planning?
        </legend>
        <label className="flex cursor-pointer items-center gap-3 text-sm leading-snug text-foreground/90">
          <input defaultChecked name="role" required type="radio" value="advertiser" />
          Soy anunciante o represento a una marca
        </label>
        <label className="flex cursor-pointer items-center gap-3 text-sm leading-snug text-foreground/90">
          <input name="role" type="radio" value="provider" />
          Soy medio u ofrezco espacios publicitarios
        </label>
      </fieldset>

      <div>
        <label className={labelClass} htmlFor="email">
          Email
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
        <label className={labelClass} htmlFor="companyName">
          Nombre comercial o razón social (medios)
        </label>
        <input
          className={cn(fieldClass, "mt-1.5")}
          id="companyName"
          name="companyName"
          placeholder="Ej. tu empresa o red de pantallas"
          type="text"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="legalName">
          Empresa o nombre (opcional, anunciantes)
        </label>
        <input className={cn(fieldClass, "mt-1.5")} id="legalName" name="legalName" type="text" />
      </div>

      <div>
        <label className={labelClass} htmlFor="password">
          Contraseña (mínimo 8 caracteres)
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
          Confirmar contraseña
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

      <button className={cn(btnPrimary, "w-full")} disabled={pending} type="submit">
        {pending ? "Creando tu cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
