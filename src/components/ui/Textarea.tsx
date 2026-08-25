import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { fieldBase } from "@/lib/ui-variants";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        className={cn(
          fieldBase,
          "min-h-[6rem] resize-y",
          invalid && "border-error focus:border-error focus:ring-[var(--error-subtle)]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
