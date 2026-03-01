
const items: Array<{ name: string; color: string; desc: string }> = [
  { name: "Baru", color: "bg-amber-500", desc: "Laporan baru dibuat dan menunggu peninjauan." },
  { name: "Diproses", color: "bg-primary", desc: "Sedang ditindaklanjuti oleh petugas." },
  { name: "Selesai", color: "bg-green-600", desc: "Sudah ditangani atau dinyatakan tuntas." },
];

export default function StatusLegend() {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-bold mb-6">Status Laporan</h3>
      <div className="space-y-4">
        {items.map((it) => (
          <div key={it.name} className="flex items-start gap-4">
            <div className={`w-3 h-3 rounded-full ${it.color} mt-1 flex-shrink-0`} />
            <div className="space-y-1">
              <div className="font-semibold text-sm">{it.name}</div>
              <div className="text-sm text-muted-foreground leading-relaxed">{it.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
