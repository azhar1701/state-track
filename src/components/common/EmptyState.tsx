import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  illustration?: 'search' | 'reports' | 'offline' | 'error';
}

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  illustration,
}: EmptyStateProps) => {
  const illustrations = {
    search: (
      <svg className="w-32 h-32 mx-auto mb-4 text-muted-foreground/20" viewBox="0 0 200 200" fill="currentColor">
        <circle cx="80" cy="80" r="40" />
        <rect x="110" y="110" width="60" height="12" rx="6" transform="rotate(45 110 110)" />
      </svg>
    ),
    reports: (
      <svg className="w-32 h-32 mx-auto mb-4 text-muted-foreground/20" viewBox="0 0 200 200" fill="currentColor">
        <rect x="50" y="30" width="100" height="140" rx="8" />
        <rect x="70" y="60" width="60" height="8" rx="4" />
        <rect x="70" y="80" width="60" height="8" rx="4" />
        <rect x="70" y="100" width="40" height="8" rx="4" />
      </svg>
    ),
    offline: (
      <svg className="w-32 h-32 mx-auto mb-4 text-muted-foreground/20" viewBox="0 0 200 200" fill="currentColor">
        <path d="M100 50 L150 100 L100 150 L50 100 Z" />
        <circle cx="100" cy="100" r="20" fill="white" />
      </svg>
    ),
    error: (
      <svg className="w-32 h-32 mx-auto mb-4 text-muted-foreground/20" viewBox="0 0 200 200" fill="currentColor">
        <circle cx="100" cy="100" r="60" />
        <rect x="95" y="70" width="10" height="40" rx="5" fill="white" />
        <circle cx="100" cy="130" r="6" fill="white" />
      </svg>
    ),
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="max-w-md w-full p-8 text-center space-y-4 shadow-soft">
        {illustration && illustrations[illustration]}
        
        {!illustration && Icon && (
          <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
            <Icon className="w-10 h-10 text-muted-foreground" />
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <div className="flex gap-2 justify-center">
          {action && (
            <Button onClick={action.onClick} className="btn-haptic">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline" className="btn-haptic">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EmptyState;
