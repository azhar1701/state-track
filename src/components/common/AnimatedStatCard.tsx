import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface AnimatedStatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
  suffix?: string;
  duration?: number;
}

export const AnimatedStatCard = ({
  label,
  value,
  icon: Icon,
  tone,
  suffix = '',
  duration = 1000,
}: AnimatedStatCardProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <Card className="glass-panel shadow-soft hover:shadow-float transition-all duration-300 group">
      <CardContent className="py-3 px-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="text-xl font-semibold mt-1 transition-all duration-300 group-hover:scale-110">
              {count.toLocaleString('id-ID')}
              {suffix}
            </p>
          </div>
          <div className={`p-2 rounded-lg bg-opacity-10 ${tone.replace('text-', 'bg-')}`}>
            <Icon className={`h-5 w-5 ${tone}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
