import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/services/client';
import { useAuth } from '@/features/auth/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
}

const faqs = [
  { q: 'Bagaimana cara membuat laporan?', a: 'Buka menu Buat Laporan lalu isi formulir dan kirim.' },
  { q: 'Bagaimana cara melihat status laporan?', a: 'Buka halaman Laporan Saya untuk melihat status terkini.' },
  { q: 'Mengapa peta kosong?', a: 'Periksa koneksi internet, izinkan lokasi, atau segarkan halaman.' },
];

type SopModule = {
  title: string;
  goal: string;
  steps: string[];
  outputs?: string[];
  tips?: string[];
  notes?: string;
};

const userSopModules: SopModule[] = [
  {
    title: '1. Orientasi & Akses Aplikasi',
    goal: 'Pengguna memahami cara masuk, menyiapkan profil, dan memastikan perangkat siap untuk membuat laporan.',
    steps: [
      'Pastikan perangkat terhubung ke internet dan GPS aktif untuk akurasi lokasi.',
      'Buka aplikasi StateTrack melalui browser atau pintasan aplikasi lalu pilih menu Masuk/Daftar.',
      'Buat akun baru dengan email aktif dan verifikasi melalui tautan yang dikirimkan ke email.',
      'Lengkapi profil (nama, nomor telepon, wilayah domisili) di menu Pengaturan Akun.',
      'Baca ringkasan tata tertib pelaporan pada panel onboarding sebelum melanjutkan.',
    ],
    outputs: [
      'Akun terverifikasi dan dapat digunakan untuk membuat laporan.',
      'Profil pengguna menyimpan informasi kontak yang valid.',
    ],
    tips: [
      'Jika lupa kata sandi, gunakan fitur “Reset password” di halaman masuk.',
      'Gunakan email resmi instansi bila pelaporan dilakukan oleh perangkat daerah.',
    ],
  },
  {
    title: '2. Membuat Laporan Baru',
    goal: 'Pengguna dapat membuat laporan insiden lengkap dengan kategori, lokasi, dan deskripsi.',
    steps: [
      'Pilih menu Buat Laporan atau tombol + Laporan Baru di beranda.',
      'Isi judul laporan yang ringkas, pilih kategori (jalan, jembatan, irigasi, drainase, sungai, lainnya) dan tingkat keparahan.',
      'Gunakan peta untuk mem-pin lokasi kejadian atau isi alamat manual jika koordinat sulit dideteksi.',
      'Tambah deskripsi kronologi dan dampak yang terjadi secara jelas.',
      'Unggah dokumentasi (foto/ video) yang relevan, pastikan ukuran file sesuai batas yang ditampilkan.',
      'Periksa kembali ringkasan data, lalu kirim laporan dan tunggu konfirmasi berhasil.',
    ],
    outputs: [
      'Nomor tiket laporan yang tercatat di sistem.',
      'Data laporan tersimpan dengan status awal “baru”.',
    ],
    tips: [
      'Gunakan format waktu 24 jam dan sebutkan tanggal kejadian di awal deskripsi.',
      'Minimal unggah dua foto dari sudut berbeda untuk memudahkan verifikasi.',
    ],
  },
  {
    title: '3. Melampirkan Bukti Tambahan & Koreksi Data',
    goal: 'Pengguna dapat menambah atau mengoreksi data laporan yang sudah terkirim.',
    steps: [
      'Buka menu Laporan Saya dan pilih laporan yang ingin diperbarui.',
      'Gunakan tombol Tambah Bukti untuk mengunggah foto/ dokumen tambahan bila diminta petugas.',
      'Jika ada kesalahan data, ajukan koreksi melalui tombol Edit ringkasan (selama status belum “selesai”).',
      'Tambahkan catatan klarifikasi pada kolom komentar agar petugas memahami konteks perubahan.',
      'Simpan perubahan dan pantau status revisi melalui riwayat aktivitas.',
    ],
    outputs: [
      'Bukti tambahan tercatat di lampiran laporan.',
      'Catatan koreksi terlog otomatis dalam riwayat perubahan.',
    ],
    tips: [
      'Lakukan koreksi maksimal 1x24 jam setelah laporan dibuat untuk menghindari penolakan.',
      'Pastikan format file tambahan sesuai yang direkomendasikan (JPG/PNG/PDF).',
    ],
  },
  {
    title: '4. Memantau Progres & Berkoordinasi',
    goal: 'Pengguna dapat mengikuti perkembangan penanganan laporan dan memberikan respon.',
    steps: [
      'Aktifkan notifikasi email atau push notification di menu Pengaturan.',
      'Pantau status laporan (baru, diproses, selesai) pada halaman Laporan Saya atau panel timeline.',
      'Baca pesan petugas di kolom riwayat tindakan dan balas jika dibutuhkan klarifikasi.',
      'Gunakan tombol Hubungi Admin jika memerlukan respon cepat terhadap kondisi kritikal.',
      'Setelah tindakan lapangan selesai, periksa bukti penutupan dan berikan umpan balik.',
    ],
    outputs: [
      'Riwayat komunikasi terdokumentasi di detail laporan.',
      'Masukan pengguna tercatat sebagai evaluasi pelayanan.',
    ],
    tips: [
      'Selalu sertakan referensi nomor laporan saat berkoordinasi via telepon/WhatsApp.',
      'Gunakan fitur filter tanggal untuk mencari laporan lama yang sudah terselesaikan.',
    ],
  },
  {
    title: '5. Penutupan Laporan & Evaluasi',
    goal: 'Pengguna memastikan laporan ditutup dengan benar dan memberikan evaluasi layanan.',
    steps: [
      'Terima notifikasi status “selesai” dan buka detail laporan.',
      'Tinjau dokumentasi tindak lanjut yang diunggah petugas.',
      'Isi survei kepuasan singkat bila muncul pop-up evaluasi layanan.',
      'Apabila masalah berulang, buat laporan lanjutan dengan referensi tiket sebelumnya.',
      'Arsipkan laporan agar tidak tampil di daftar aktif bila sudah benar-benar selesai.',
    ],
    outputs: [
      'Laporan berstatus selesai dengan catatan evaluasi pengguna.',
      'Data arsip siap digunakan sebagai rujukan bila kasus berulang.',
    ],
    tips: [
      'Unduh ringkasan laporan dalam format PDF untuk dokumentasi pribadi.',
      'Gunakan fitur arsip agar daftar laporan yang aktif tetap ringkas.',
    ],
    notes: 'Jika respon tidak sesuai ekspektasi, pengguna dapat mengajukan eskalasi ke admin melalui tiket dukungan.',
  },
];

const adminSopModules: SopModule[] = [
  {
    title: '1. Monitoring Dashboard & Prioritas Harian',
    goal: 'Admin memahami gambaran umum laporan dan menentukan prioritas penanganan setiap hari.',
    steps: [
      'Masuk ke Dashboard Admin dan periksa ringkasan statistik (total, baru, diproses, selesai).',
      'Gunakan filter tanggal/kecamatan untuk melihat lonjakan laporan tertentu.',
      'Cek grafik tren dan kategori untuk menetapkan fokus harian.',
      'Catat laporan kritikal (severity tinggi) dari panel daftar laporan terbaru.',
      'Buat ringkasan prioritas pada briefing internal atau papan tugas harian.',
    ],
    outputs: [
      'Daftar prioritas laporan yang harus ditindak dalam 24 jam.',
      'Catatan analitik harian sebagai bahan rapat koordinasi.',
    ],
    tips: [
      'Aktifkan mode tampilan peta heatmap di tab Map View untuk memvalidasi area padat laporan.',
      'Simpan filter favorit agar admin lain dapat mengakses parameter yang sama.',
    ],
  },
  {
    title: '2. Validasi & Klasifikasi Laporan Masuk',
    goal: 'Admin menyeleksi laporan masuk, memastikan kelengkapan data, dan menentukan penanggung jawab.',
    steps: [
      'Buka detail laporan yang berstatus “baru” melalui drawer detail.',
      'Periksa deskripsi, kategori, dan bukti foto untuk memastikan kelayakan.',
      'Jika data kurang, hubungi pelapor melalui kontak yang tersedia atau kirim permintaan koreksi.',
      'Tetapkan tingkat keparahan dan ubah status menjadi “diproses” ketika laporan siap ditindak.',
      'Catat keputusan validasi pada kolom catatan admin agar riwayat jelas.',
    ],
    outputs: [
      'Laporan tervalidasi dengan status “diproses” dan catatan lengkap.',
      'Assignment penanggung jawab internal tercatat di sistem.',
    ],
    tips: [
      'Gunakan template pesan standar saat meminta kelengkapan data agar konsisten.',
      'Manfaatkan fitur clipboard koordinat untuk mengarahkan tim lapangan.',  
    ],
  },
  {
    title: '3. Penugasan & Koordinasi Tindak Lanjut',
    goal: 'Admin mengatur penugasan tim lapangan dan memantau progres pelaksanaan.',
    steps: [
      'Dari detail laporan, pilih tindakan “Buat catatan tindak lanjut” dan isi instruksi untuk tim.',
      'Bagikan koordinat lokasi melalui tombol Lihat di Peta atau tautan Google Maps.',
      'Update status menjadi “diproses” dan masukkan estimasi penyelesaian.',
      'Pantau update tim melalui log laporan atau unggahan dokumentasi lapangan.',
      'Setelah pekerjaan selesai, minta tim mengunggah bukti penutupan sebelum menutup laporan.',
    ],
    outputs: [
      'Instruksi tertulis untuk tim lapangan tersimpan di log laporan.',
      'Bukti tindak lanjut (foto sebelum/sesudah) terunggah di sistem.',
    ],
    tips: [
      'Gunakan grup komunikasi resmi (misal WhatsApp/Telegram) yang terhubung dengan nomor admin.',
      'Catat kendala lapangan di log agar menjadi bahan evaluasi berkala.',
    ],
  },
  {
    title: '4. Pengelolaan Data Geospasial & Dokumentasi',
    goal: 'Admin menjaga akurasi layer peta dan dokumentasi historis laporan.',
    steps: [
      'Secara berkala buka tab Geo Data untuk memvalidasi layer geospasial yang digunakan.',
      'Impor/ ekspor data shapefile jika ada pembaruan batas wilayah atau titik fasilitas.',
      'Pastikan setiap laporan memiliki koordinat yang benar; koreksi manual bila diperlukan.',
      'Simpan dokumentasi penting (laporan PDF, foto resolusi tinggi) di penyimpanan resmi instansi.',
      'Gunakan fitur export laporan untuk membuat rekap bulanan.',
    ],
    outputs: [
      'Layer peta yang mutakhir dan sinkron dengan data lapangan.',
      'Arsip dokumentasi laporan tersusun rapi untuk audit.',
    ],
    tips: [
      'Sebelum mengimpor data baru, lakukan backup layer lama untuk menghindari kehilangan data.',
      'Gunakan penamaan file standar: tanggal_wilayah_jenis-laporan.',
    ],
  },
  {
    title: '5. Penutupan Laporan & Evaluasi Layanan',
    goal: 'Admin menutup laporan secara formal dan menyusun evaluasi pelayanan.',
    steps: [
      'Pastikan bukti penanganan lengkap (foto sesudah, catatan teknis, biaya jika ada).',
      'Ubah status laporan menjadi “selesai” dan isi kolom hasil/respon dengan ringkasan tindakan.',
      'Kirim pesan penutupan ke pelapor dan minta feedback melalui survei kepuasan.',
      'Arsipkan laporan ke folder digital dan masukkan ke rekap mingguan/bulanan.',
      'Catat pembelajaran (lesson learned) untuk perbaikan SOP ke depan.',
    ],
    outputs: [
      'Laporan berstatus selesai dengan dokumentasi akhir lengkap.',
      'Rekap evaluasi pelayanan untuk pimpinan daerah.',
    ],
    tips: [
      'Gunakan tag atau label khusus untuk menandai laporan prioritas tinggi agar mudah diaudit.',
      'Sertakan indikator waktu penanganan (SLA) dalam notulen rapat evaluasi.',
    ],
    notes: 'Jika pelapor belum puas, admin wajib membuka kembali laporan dan menugaskan tindak lanjut tambahan.',
  },
];

export default function HelpCenter() {
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filteredFaqs = useMemo(() => {
    const s = search.toLowerCase();
    return faqs.filter((f) => f.q.toLowerCase().includes(s) || f.a.toLowerCase().includes(s));
  }, [search]);

  const loadTickets = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id,user_id,subject,message,status,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) return;
    setTickets((data ?? []) as Ticket[]);
  }, [user]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  const submitTicket = async () => {
    if (!user) return toast.error('Harap login');
    if (!subject.trim() || !message.trim()) return toast.error('Lengkapi subjek dan pesan');
    setLoading(true);
    const { error } = await supabase.from('support_tickets').insert({ user_id: user.id, subject, message });
    setLoading(false);
    if (error) return toast.error('Gagal mengirim tiket');
    toast.success('Tiket terkirim');
    setSubject('');
    setMessage('');
    void loadTickets();
  };

  const updateTicketStatus = async (ticketId: string, status: 'resolved' | 'closed') => {
    const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
    if (error) return toast.error('Gagal memperbarui status');
    toast.success(`Tiket ditandai ${status === 'resolved' ? 'selesai' : 'ditutup'}`);
    void loadTickets();
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, status });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Help Center</h1>
            <p className="text-sm text-muted-foreground mt-1">Panduan lengkap penggunaan aplikasi StateTrack</p>
          </div>
        </div>

        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>📖</span> SOP Pengguna (User)
            </CardTitle>
            <CardDescription>Ikuti modul berikut secara berurutan untuk memastikan pelaporan berjalan lengkap dan terdokumentasi.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="space-y-2">
              {userSopModules.map((module, index) => (
                <AccordionItem
                  key={module.title}
                  value={`user-${index}`}
                  className="rounded-xl border border-border/70 bg-muted/10 px-4"
                >
                  <AccordionTrigger className="text-left text-sm font-semibold tracking-tight">
                    {module.title}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm leading-relaxed text-foreground">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tujuan</p>
                      <p>{module.goal}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Langkah</p>
                      <ol className="list-decimal space-y-2 pl-6">
                        {module.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </div>
                    {module.outputs && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Output</p>
                        <ul className="list-disc space-y-2 pl-6">
                          {module.outputs.map((output) => (
                            <li key={output}>{output}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {module.tips && (
                      <div className="rounded-lg bg-background/60 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tips</p>
                        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
                          {module.tips.map((tip) => (
                            <li key={tip}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {module.notes && (
                      <div className="rounded-lg border border-dashed border-border/70 bg-background/80 p-3 text-xs text-muted-foreground">
                        {module.notes}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {isAdmin ? (
          <Card className="border-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>🔧</span> SOP Admin
              </CardTitle>
              <CardDescription>Gunakan modul berikut sebagai panduan operasional harian, mingguan, dan evaluasi berkala di lingkungan admin.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                {adminSopModules.map((module, index) => (
                  <AccordionItem
                    key={module.title}
                    value={`admin-${index}`}
                    className="rounded-xl border border-border/70 bg-muted/10 px-4"
                  >
                    <AccordionTrigger className="text-left text-sm font-semibold tracking-tight">
                      {module.title}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 text-sm leading-relaxed text-foreground">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tujuan</p>
                        <p>{module.goal}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Langkah</p>
                        <ol className="list-decimal space-y-2 pl-6">
                          {module.steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      </div>
                      {module.outputs && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Output</p>
                          <ul className="list-disc space-y-2 pl-6">
                            {module.outputs.map((output) => (
                              <li key={output}>{output}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {module.tips && (
                        <div className="rounded-lg bg-background/60 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tips</p>
                          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
                            {module.tips.map((tip) => (
                              <li key={tip}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {module.notes && (
                        <div className="rounded-lg border border-dashed border-border/70 bg-background/80 p-3 text-xs text-muted-foreground">
                          {module.notes}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-muted">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>🔒</span> SOP Admin
              </CardTitle>
              <CardDescription>Hanya admin yang dapat mengakses modul operasional internal.</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTitle>Akses Terbatas</AlertTitle>
                <AlertDescription>
                  Anda tidak memiliki hak akses sebagai admin. Jika membutuhkan informasi ini, silakan hubungi administrator aplikasi.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>❓</span> Pertanyaan Umum (FAQ)
            </CardTitle>
            <CardDescription>Gunakan pencarian di bawah untuk menemukan jawaban cepat sebelum menghubungi tim dukungan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input 
              id="faq-search"
              placeholder="🔍 Cari pertanyaan..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              aria-label="Cari FAQ"
            />
            <div className="space-y-2">
              {filteredFaqs.map((f, i) => (
                <div key={i} className="rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors">
                  <div className="font-semibold text-sm mb-2">{f.q}</div>
                  <div className="text-sm text-muted-foreground leading-relaxed">{f.a}</div>
                </div>
              ))}
              {filteredFaqs.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <span className="text-2xl block mb-2">🔍</span>
                  Tidak ada FAQ yang cocok dengan pencarian
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="border-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>🎫</span> Buat Tiket Dukungan
              </CardTitle>
              <CardDescription>Kirimkan kendala teknis atau kebutuhan tambahan fitur kepada tim pengembang.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="support-subject">Subjek</Label>
                <Input 
                  id="support-subject"
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)} 
                  placeholder="Ringkas masalah Anda"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="support-message">Pesan</Label>
                <Textarea 
                  id="support-message"
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)} 
                  placeholder="Jelaskan masalah secara detail" 
                  rows={5}
                />
              </div>
              <Button onClick={submitTicket} disabled={loading} className="w-full">
                {loading ? 'Mengirim...' : 'Kirim Tiket'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>📝</span> Tiket Saya
              </CardTitle>
              <CardDescription>Pantau progres tindak lanjut tiket dukungan yang telah Anda kirimkan.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Subjek</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Dibuat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => { setSelectedTicket(t); setDetailOpen(true); }}>
                        <TableCell className="font-medium">{t.subject}</TableCell>
                        <TableCell><Badge variant={t.status === 'open' ? 'default' : t.status === 'resolved' ? 'secondary' : 'outline'} className="capitalize">{t.status.replace(/_/g, ' ')}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                      </TableRow>
                    ))}
                    {tickets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <span className="text-2xl">📦</span>
                            <span className="text-sm">Belum ada tiket</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg">Detail Tiket</DialogTitle>
              <DialogDescription>Informasi lengkap tiket dukungan Anda</DialogDescription>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-4">
                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground">Subjek</span>
                  <span className="font-semibold">{selectedTicket.subject}</span>
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={selectedTicket.status === 'open' ? 'default' : selectedTicket.status === 'resolved' ? 'secondary' : 'outline'} className="capitalize w-fit">
                    {selectedTicket.status.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-muted-foreground">Dibuat</span>
                  <span>{new Date(selectedTicket.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</span>
                </div>
                <div>
                  <Label className="text-sm font-medium">Pesan</Label>
                  <div className="mt-2 p-4 rounded-lg border bg-muted/30 text-sm whitespace-pre-wrap">
                    {selectedTicket.message}
                  </div>
                </div>
                {selectedTicket.status === 'open' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')} className="flex-1">
                      ✓ Tandai Selesai
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateTicketStatus(selectedTicket.id, 'closed')} className="flex-1">
                      ✕ Tutup Tiket
                    </Button>
                  </div>
                )}
                {selectedTicket.status === 'resolved' && (
                  <Alert>
                    <AlertTitle>Tiket Selesai</AlertTitle>
                    <AlertDescription>Tiket ini telah ditandai selesai. Terima kasih atas laporannya.</AlertDescription>
                  </Alert>
                )}
                {selectedTicket.status === 'closed' && (
                  <Alert>
                    <AlertTitle>Tiket Ditutup</AlertTitle>
                    <AlertDescription>Tiket ini telah ditutup.</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
