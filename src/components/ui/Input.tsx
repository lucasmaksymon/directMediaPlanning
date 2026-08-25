import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { fieldBase } from "@/lib/ui-variants";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      className={cn(
        fieldBase,
        invalid && "border-error focus:border-error focus:ring-[var(--error-subtle)]",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
