import React from "react";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void } | null;
  secondaryAction?: { label: string; onClick: () => void } | null;
  className?: string;
};

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, secondaryAction, className }) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center gap-2 py-10 text-muted-foreground ${className || ""}`}>
      {icon && <div className="mb-1">{icon}</div>}
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description && <div className="text-xs max-w-sm">{description}</div>}
      {(action || secondaryAction) && (
        <div className="flex gap-2 mt-2">
          {action && (
            <Button size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button size="sm" variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;

