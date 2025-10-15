import React from "react";

type LoadingOverlayProps = {
  show: boolean;
  text?: string;
  className?: string;
};

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ show, text = "Memuat data...", className }) => {
  if (!show) return null;
  return (
    <div className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm text-muted-foreground text-xs ${className || ""}`}>
      {text}
    </div>
  );
};

export default LoadingOverlay;

