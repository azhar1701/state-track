import { Card } from "@/components/ui/card";

const categories: Array<{ key: string; label: string; desc: string }> = [
  { key: 'irigasi', label: 'Irigasi', desc: 'Saluran, pintu air, dan kelengkapannya.' },
  { key: 'sungai', label: 'Sungai', desc: 'Tanggul, erosi, atau sampah pada sungai.' },
  { key: 'lainnya', label: 'Lainnya', desc: 'Kategori umum lain yang relevan.' },
];

export default function CategoryLegend() {
  return (
    <Card variant="glass" className="rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-6">Kategori Laporan</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {categories.map((c) => (
          <div key={c.key} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-teal-500/30 transition-all duration-300">
            <div className="font-semibold mb-1">{c.label}</div>
            <div className="text-sm text-muted-foreground leading-relaxed">{c.desc}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
