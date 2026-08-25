import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/** Shared field / control surface classes for the design system. */
export const fieldBase =
  "w-full rounded-[var(--radius-input)] border bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-foreground shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-muted-foreground border-[color:var(--input-border)] focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-55";

export const labelBase = "nm-label block";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)]",
        secondary:
          "border border-primary/40 bg-transparent text-foreground hover:bg-primary-subtle",
        ghost: "bg-transparent text-foreground hover:bg-muted",
        destructive:
          "bg-error text-error-foreground hover:opacity-90",
        outline:
          "border border-border bg-card text-foreground hover:bg-muted",
        marketing:
          "!rounded-full bg-primary !px-7 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-sm hover:shadow-[0_0_20px_rgba(0,182,199,0.35)]",
        "marketing-secondary":
          "!rounded-full border-2 border-primary bg-transparent !px-7 text-sm font-bold uppercase tracking-wide text-foreground hover:bg-primary/10",
      },
      size: {
        sm: "min-h-9 rounded-[var(--radius-md)] px-3 text-xs",
        md: "min-h-10 rounded-[var(--radius-md)] px-4 text-sm",
        lg: "min-h-11 rounded-[var(--radius-md)] px-5 text-sm",
        icon: "size-10 rounded-[var(--radius-md)] p-0",
        "icon-sm": "size-9 rounded-[var(--radius-md)] p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        brand: "bg-primary-subtle text-led",
        success: "bg-[var(--success-subtle)] text-success",
        warning: "bg-[var(--warning-subtle)] text-warning",
        error: "bg-[var(--error-subtle)] text-error",
        info: "bg-[var(--info-subtle)] text-info",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function surfaceCardClass(className?: string) {
  return cn(
    "rounded-[var(--radius-card)] border border-border bg-card text-card-foreground shadow-[var(--shadow-sm)]",
    className,
  );
}
