import { Card } from '@/components/ui/card';

export type LegendOverlayItem =
  | { type: 'line'; label: string; color: string; dashArray?: string }
  | { type: 'fill'; label: string; color: string; fillColor: string }
  | { type: 'point'; label: string; color: string }
  | { type: 'multiclass'; label: string; items: Array<{ label: string; color?: string; fillColor?: string }> };

export const Legend = ({ overlays }: { overlays?: LegendOverlayItem[] }) => {
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

        {overlays && overlays.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-foreground font-medium mb-1 leading-none">Overlay</div>
            <ul className="space-y-1">
              {overlays.map((item, idx) => {
                if (item.type === 'line') {
                  return (
                    <li key={idx} className="flex items-center gap-2 leading-none">
                      <span className="inline-block w-4 h-1" style={{ backgroundColor: item.color, borderRadius: 2, borderTop: item.dashArray ? '1px dashed '+item.color : undefined }} />
                      <span>{item.label}</span>
                    </li>
                  );
                }
                if (item.type === 'point') {
                  return (
                    <li key={idx} className="flex items-center gap-2 leading-none">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.label}</span>
                    </li>
                  );
                }
                if (item.type === 'fill') {
                  return (
                    <li key={idx} className="flex items-center gap-2 leading-none">
                      <span className="inline-block w-3 h-3 border" style={{ backgroundColor: item.fillColor, borderColor: item.color }} />
                      <span>{item.label}</span>
                    </li>
                  );
                }
                if (item.type === 'multiclass') {
                  return (
                    <li key={idx} className="leading-none">
                      <div className="mb-0.5">{item.label}</div>
                      <ul className="space-y-0.5 pl-3">
                        {item.items.map((c, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 border" style={{ backgroundColor: c.fillColor, borderColor: c.color }} />
                            <span>{c.label}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
};
