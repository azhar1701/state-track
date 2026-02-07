import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "destructive";
}

const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const variantClasses = {
      default: "glass-btn",
      primary: "glass-btn-primary",
      secondary: "glass-btn bg-gradient-to-br from-secondary/80 to-secondary/60 border-secondary/30 text-white hover:from-secondary/90 hover:to-secondary/70",
      destructive: "glass-btn bg-gradient-to-br from-destructive/80 to-destructive/60 border-destructive/30 text-white hover:from-destructive/90 hover:to-destructive/70",
    };

    return (
      <button
        ref={ref}
        className={cn(variantClasses[variant], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlassButton.displayName = "GlassButton";

export { GlassButton };
