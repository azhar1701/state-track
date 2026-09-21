import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import { ReportStatus, ReportSeverity } from '@/features/admin/types';
import { Clock, Loader2, CheckCircle2, ShieldAlert, AlertCircle, Info, type LucideIcon } from 'lucide-react';

const STATUS_ICONS: Record<string, LucideIcon> = {
  baru: Clock,
  diproses: Loader2,
  selesai: CheckCircle2,
};

const SEVERITY_ICONS: Record<string, LucideIcon> = {
  ringan: Info,
  sedang: AlertCircle,
  berat: ShieldAlert,
};

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-all border shadow-sm",
  {
    variants: {
      status: {
        baru: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400",
        diproses: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary-foreground",
        selesai: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400",
      },
    },
    defaultVariants: {
      status: "baru",
    },
  }
);

type StatusVariant = "baru" | "diproses" | "selesai";

const STATUS_LABELS: Record<string, string> = {
  baru: "Baru",
  diproses: "Diproses",
  selesai: "Selesai",
};

interface StatusBadgeProps {
  status: ReportStatus | string;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const label = STATUS_LABELS[status] ?? (status || "Tidak diketahui");
  const Icon = STATUS_ICONS[status];
  const variantKey: StatusVariant = (status in STATUS_LABELS ? status : "baru") as StatusVariant;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(statusBadgeVariants({ status: variantKey }), "gap-1.5", className)}
    >
      {Icon && <Icon className={cn("w-3.5 h-3.5", status === 'diproses' && "animate-spin")} />}
      {label}
    </Badge>
  );
};

const severityBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-all border shadow-sm",
  {
    variants: {
      severity: {
        ringan: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:bg-slate-500/20 dark:text-slate-400",
        sedang: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400",
        berat: "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400",
      },
    },
    defaultVariants: {
      severity: "ringan",
    },
  }
);

type SeverityVariant = "ringan" | "sedang" | "berat";

const SEVERITY_LABELS: Record<string, string> = {
  ringan: "Ringan",
  sedang: "Sedang",
  berat: "Berat",
};

interface SeverityBadgeProps {
  severity?: ReportSeverity | string | null;
  className?: string;
}

export const SeverityBadge = ({ severity, className }: SeverityBadgeProps) => {
  if (!severity) {
    return <span className="text-[10px] text-muted-foreground italic font-medium">Belum dinilai</span>;
  }
  
  const label = SEVERITY_LABELS[severity] ?? severity;
  const Icon = SEVERITY_ICONS[severity];
  const variantKey: SeverityVariant = (severity in SEVERITY_LABELS ? severity : "ringan") as SeverityVariant;

  return (
    <Badge 
      variant="outline" 
      className={cn(severityBadgeVariants({ severity: variantKey }), "gap-1.5", className)}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </Badge>
  );
};
