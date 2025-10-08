import { Card } from '@/components/ui/card';

export const Legend = () => {
  const statusItems = [
    { color: '#f59e0b', label: 'Baru' },
    { color: '#3b82f6', label: 'Diproses' },
    { color: '#10b981', label: 'Selesai' },
  ];
  const severityItems = [
    { color: '#22c55e', label: 'Ringan' },
    { color: '#f97316', label: 'Sedang' },
    { color: '#ef4444', label: 'Berat' },
  ];

  return (
    <Card className="w-56 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 border shadow-md p-3">
      <div className="text-[11px] text-muted-foreground space-y-2">
        <div>
          <div className="text-foreground font-medium mb-1 leading-none">Status</div>
          <ul className="space-y-1">
            {statusItems.map((i) => (
              <li key={i.label} className="flex items-center gap-2 leading-none">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i.color }} />
                <span>{i.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="pt-2 border-t">
          <div className="text-foreground font-medium mb-1 leading-none">Severity (ring)</div>
          <ul className="space-y-1">
            {severityItems.map((i) => (
              <li key={i.label} className="flex items-center gap-2 leading-none">
                <span className="inline-block w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: i.color }} />
                <span>{i.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
};
