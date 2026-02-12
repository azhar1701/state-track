import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface DangerZoneProps {
  children: ReactNode;
}

export const DangerZone = ({ children }: DangerZoneProps) => {
  return (
    <div className="border-2 border-destructive/40 rounded-lg p-4 bg-destructive/5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="font-semibold text-destructive">Danger Zone</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Tindakan di bawah ini bersifat permanen dan tidak dapat dibatalkan.
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
};
