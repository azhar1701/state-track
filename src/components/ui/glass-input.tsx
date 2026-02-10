import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

type GlassInputProps = InputHTMLAttributes<HTMLInputElement>;

const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn("glass-input w-full", className)}
        {...props}
      />
    );
  }
);

GlassInput.displayName = "GlassInput";

export { GlassInput };
