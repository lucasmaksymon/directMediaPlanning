import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ className, ...props }, ref) {
    return (
      <input
        className={cn(
          "size-4 shrink-0 rounded border border-[color:var(--input-border)] bg-[var(--input-bg)] text-primary accent-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:opacity-55",
          className,
        )}
        ref={ref}
        type="checkbox"
        {...props}
      />
    );
  },
);
