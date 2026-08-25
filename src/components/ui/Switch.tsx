"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role">;

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { className, id, checked, defaultChecked, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label className={cn("relative inline-flex h-6 w-11 cursor-pointer items-center", className)}>
      <input
        checked={checked}
        className="peer sr-only"
        defaultChecked={defaultChecked}
        id={inputId}
        ref={ref}
        role="switch"
        type="checkbox"
        {...props}
      />
      <span className="absolute inset-0 rounded-full bg-muted transition peer-checked:bg-primary peer-focus-visible:ring-[3px] peer-focus-visible:ring-[var(--ring)] peer-disabled:opacity-55" />
      <span className="absolute left-0.5 size-5 rounded-full bg-card shadow-sm transition peer-checked:translate-x-5" />
    </label>
  );
});
