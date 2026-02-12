import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SettingsSectionProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  badge?: string;
  children: ReactNode;
  className?: string;
}

export const SettingsSection = ({ icon, title, description, badge, children, className = "" }: SettingsSectionProps) => {
  return (
    <Card className={`shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          {badge && <Badge variant="outline">{badge}</Badge>}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};
