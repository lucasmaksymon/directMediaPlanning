import { cn } from "@/lib/cn";
import { selectClass, selectClassCompact } from "@/lib/ui-classes";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  compact?: boolean;
};

export function Select({ className, compact, ...props }: SelectProps) {
  return (
    <select
      className={cn(compact ? selectClassCompact : selectClass, className)}
      {...props}
    />
  );
}
