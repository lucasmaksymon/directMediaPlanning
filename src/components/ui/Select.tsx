import { cn } from "@/lib/cn";
import { fieldBase } from "@/lib/ui-variants";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  compact?: boolean;
  invalid?: boolean;
};

export function Select({ className, compact, invalid, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        fieldBase,
        "nm-select",
        compact && "nm-select-compact",
        invalid && "border-error focus:border-error focus:ring-[var(--error-subtle)]",
        className,
      )}
      {...props}
    />
  );
}
