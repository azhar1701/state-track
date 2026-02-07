import { X } from "lucide-react";
import { GlassButton } from "./glass-button";
import { cn } from "@/lib/utils";

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function GlassModal({ isOpen, onClose, title, children, className }: GlassModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={cn("glass-modal relative z-10 animate-scale-in", className)}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <GlassButton
            onClick={onClose}
            className="!p-2 !rounded-full hover:rotate-90 transition-transform duration-300"
          >
            <X className="w-5 h-5" />
          </GlassButton>
        </div>

        {/* Body */}
        <div className="text-foreground/90">
          {children}
        </div>
      </div>
    </div>
  );
}
