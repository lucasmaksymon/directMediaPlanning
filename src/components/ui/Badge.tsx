import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { badgeVariants } from "@/lib/ui-variants";
import type { VariantProps } from "class-variance-authority";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  selected?: boolean;
};

export function Chip({ className, selected, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition",
        selected
          ? "border-primary/40 bg-primary-subtle text-foreground"
          : "border-border bg-card text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
