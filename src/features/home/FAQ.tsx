import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function FAQ() {
  return (
    <div className="glass-surface p-6 rounded-2xl flex flex-col h-full">
      <h3 className="text-xl font-bold mb-6">Pertanyaan Umum</h3>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>Bagaimana cara membuat laporan?</AccordionTrigger>
          <AccordionContent>
            Klik tombol "Buat Laporan", isi judul, deskripsi, pilih kategori, tentukan lokasi di peta, dan unggah foto (opsional). Lalu kirim.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Informasi apa saja yang diperlukan?</AccordionTrigger>
          <AccordionContent>
            Minimal judul, deskripsi, kategori, tingkat keparahan, dan lokasi. Tambahan foto akan membantu verifikasi lebih cepat.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Bagaimana status laporan ditentukan?</AccordionTrigger>
          <AccordionContent>
            Setelah dikirim, laporan berstatus "Baru". Petugas akan meninjau ("Diproses") dan menutup jika selesai ("Selesai").
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
