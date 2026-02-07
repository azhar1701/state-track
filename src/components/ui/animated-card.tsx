import { Card, type CardProps } from './card';
import { cn } from '@/lib/utils';

export const AnimatedCard = ({ className, children, ...props }: CardProps) => (
  <Card 
    className={cn(
      "shadow-md hover:shadow-lg transition-all duration-300 rounded-xl border border-border",
      className
    )}
    {...props}
  >
    {children}
  </Card>
);
