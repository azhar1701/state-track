import { Skeleton } from "@/components/ui/skeleton";

export const StatSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-5">
    {[...Array(4)].map((_, i) => (
      <Skeleton key={i} className="h-24 md:h-28 w-full glass-surface border-l-4 border-l-muted animate-pulse" />
    ))}
  </div>
);

export const ChartSkeleton = () => (
  <div className="w-full h-full min-h-[300px] flex flex-col gap-4 p-4 glass-surface rounded-xl overflow-hidden">
    <div className="flex justify-between items-center mb-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-24" />
    </div>
    <div className="flex-1 flex items-end gap-2">
      {[...Array(12)].map((_, i) => (
        <Skeleton 
          key={i} 
          className="flex-1" 
          style={{ height: `${Math.random() * 60 + 20}%` }} 
        />
      ))}
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="w-full space-y-4">
    <div className="flex items-center justify-between gap-4 mb-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="border rounded-xl overflow-hidden glass-surface">
      <div className="p-4 border-b bg-muted/30">
        <div className="grid grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-border/50">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="p-4 grid grid-cols-6 gap-4 items-center">
            {[...Array(6)].map((_, j) => (
              <Skeleton key={j} className="h-4 w-full opacity-70" />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const DetailSkeleton = () => (
  <div className="space-y-6 p-6">
    <div className="flex items-center gap-4 mb-8">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
    <div className="space-y-2 pt-4">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  </div>
);
