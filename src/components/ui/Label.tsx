import { forwardRef, type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { labelBase } from "@/lib/ui-variants";

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  function Label({ className, ...props }, ref) {
    return <label className={cn(labelBase, className)} ref={ref} {...props} />;
  },
);
