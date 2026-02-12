import { ReactNode } from "react";

interface SettingsRowProps {
  label: string;
  description?: string;
  control: ReactNode;
}

export const SettingsRow = ({ label, description, control }: SettingsRowProps) => {
  return (
    <div className="bg-muted/30 rounded-lg p-3 border">
      <label className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{label}</div>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {control}
      </label>
    </div>
  );
};
