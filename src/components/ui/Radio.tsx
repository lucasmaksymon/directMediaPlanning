import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { className, ...props },
  ref,
) {
  return (
    <input
      className={cn(
        "size-4 shrink-0 border border-[color:var(--input-border)] bg-[var(--input-bg)] text-primary accent-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:opacity-55",
        className,
      )}
      ref={ref}
      type="radio"
      {...props}
    />
  );
});
