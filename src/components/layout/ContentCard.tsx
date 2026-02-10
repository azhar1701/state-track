import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  headerAction?: ReactNode;
}

export default function ContentCard({ children, className, title, headerAction }: ContentCardProps) {
  return (
    <div className={cn(
      'bg-slate-900/50 backdrop-blur-md border border-white/10 shadow-xl shadow-black/20 rounded-2xl overflow-hidden',
      className
    )}>
      {title && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
