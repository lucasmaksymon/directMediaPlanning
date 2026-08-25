"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { buttonVariants } from "@/lib/ui-variants";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: "icon" | "icon-sm";
  variant?: "ghost" | "outline" | "secondary" | "primary";
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { className, label, size = "icon", variant = "ghost", type = "button", children, ...props },
    ref,
  ) {
    return (
      <button
        aria-label={label}
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        title={label}
        type={type}
        {...props}
      >
        {children}
      </button>
    );
  },
);
