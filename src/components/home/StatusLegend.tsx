import { Badge } from "@/components/ui/badge";

const items: Array<{ name: string; color: string; desc: string }> = [
  { name: "Baru", color: "bg-amber-500 text-black", desc: "Laporan baru dibuat dan menunggu peninjauan." },
  { name: "Diproses", color: "bg-blue-600 text-white", desc: "Sedang ditindaklanjuti oleh petugas." },
  { name: "Selesai", color: "bg-green-600 text-white", desc: "Sudah ditangani atau dinyatakan tuntas." },
];

export default function StatusLegend() {
  return (
    <div className="space-y-3 rounded-md border p-4">
      <h3 className="text-base md:text-lg font-semibold">Status Laporan</h3>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.name} className="flex items-start gap-3">
            <span className={`inline-flex items-center justify-center h-6 rounded px-2 text-xs font-medium ${it.color}`}>
              {it.name}
            </span>
            <span className="text-sm text-muted-foreground">{it.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
