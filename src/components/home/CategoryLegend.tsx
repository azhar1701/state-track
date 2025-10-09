const categories: Array<{ key: string; label: string; desc: string }> = [
  { key: 'jalan', label: 'Jalan', desc: 'Kerusakan jalan, lubang, retak, genangan.' },
  { key: 'jembatan', label: 'Jembatan', desc: 'Kerusakan struktur atau akses jembatan.' },
  { key: 'irigasi', label: 'Irigasi', desc: 'Saluran, pintu air, dan kelengkapannya.' },
  { key: 'drainase', label: 'Drainase', desc: 'Sumbatan, kerusakan saluran lingkungan.' },
  { key: 'sungai', label: 'Sungai', desc: 'Tanggul, erosi, atau sampah pada sungai.' },
  { key: 'lainnya', label: 'Lainnya', desc: 'Kategori umum lain yang relevan.' },
];

export default function CategoryLegend() {
  return (
    <div className="space-y-3 rounded-md border p-4">
      <h3 className="text-base md:text-lg font-semibold">Kategori Laporan</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {categories.map((c) => (
          <div key={c.key} className="rounded-md border p-3">
            <div className="font-medium">{c.label}</div>
            <div className="text-sm text-muted-foreground">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
