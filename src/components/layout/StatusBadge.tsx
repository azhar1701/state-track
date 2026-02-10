import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  type?: 'success' | 'warning' | 'danger' | 'info' | 'default';
}

const typeStyles = {
  success: 'bg-green-500/10 text-green-400 border-green-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  default: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function StatusBadge({ status, type = 'default' }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
      typeStyles[type]
    )}>
      {status}
    </span>
  );
}
