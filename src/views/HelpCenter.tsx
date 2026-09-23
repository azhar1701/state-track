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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { FAQ_ITEMS } from '@/lib/content-constants';
import { handleApiError } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import {
  BookOpen,
  Wrench,
  Search,
  MessageSquare,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Sparkles,
  RefreshCcw,
  Send,
  HelpCircle,
  FileQuestion,
} from 'lucide-react';

export interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at?: string;
  admin_notes?: string | null;
  user_profile?: {
    full_name: string | null;
    email: string | null;
    phone?: string | null;
  } | null;
}

const faqs = FAQ_ITEMS.map(item => ({ q: item.question, a: item.answer }));

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
      'Buka aplikasi SIPASDA melalui browser atau pintasan aplikasi lalu pilih menu Masuk/Daftar.',
      'Buat akun baru dengan email aktif dan verifikasi melalui tautan yang dikirimkan ke email.',
      'Lengkapi profil (nama, nomor telepon, wilayah domisili) di menu Pengaturan Akun.',
      'Baca ringkasan tata tertib pelaporan pada panel onboarding sebelum melanjutkan.',
    ],
    outputs: [
      'Akun terverifikasi dan dapat digunakan untuk membuat laporan.',
      'Profil pengguna menyimpan informasi kontak yang valid.',
    ],
    tips: [
      'Jika lupa kata sandi, gunakan fitur "Reset password" di halaman masuk.',
      'Gunakan email resmi instansi bila pelaporan dilakukan oleh perangkat daerah.',
    ],
  },
  {
    title: '2. Membuat Laporan Baru',
    goal: 'Pengguna dapat membuat laporan insiden lengkap dengan kategori, lokasi, dan deskripsi.',
    steps: [
      'Pilih menu Buat Laporan atau tombol + Laporan Baru di beranda.',
      'Unggah foto kejadian dan gunakan tombol "SARAN AI" untuk mendapatkan rekomendasi otomatis kategori serta tingkat keparahan.',
      'Gunakan peta untuk mem-pin lokasi kejadian atau isi alamat manual jika koordinat sulit dideteksi.',
      'Isi judul laporan yang ringkas, pilih kategori (jalan, jembatan, irigasi, drainase, sungai, lainnya) dan tingkat keparahan.',
      'Tambah deskripsi kronologi dan dampak yang terjadi secara jelas.',
      'Unggah dokumentasi (foto/video) yang relevan, pastikan ukuran file sesuai batas yang ditampilkan.',
      'Periksa kembali ringkasan data, lalu kirim laporan dan tunggu konfirmasi berhasil.',
    ],
    outputs: [
      'Nomor tiket laporan yang tercatat di sistem.',
      'Data laporan tersimpan dengan status awal "baru".',
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
      'Gunakan tombol Tambah Bukti untuk mengunggah foto/dokumen tambahan bila diminta petugas.',
      'Jika ada kesalahan data, ajukan koreksi melalui tombol Edit ringkasan (selama status belum "selesai").',
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
      'Manfaatkan fitur "Cari Rute Terbaik" pada detail laporan untuk merencanakan rute peninjauan lokasi yang paling efisien.',
    ],
  },
  {
    title: '5. Penutupan Laporan & Evaluasi',
    goal: 'Pengguna memastikan laporan ditutup dengan benar dan memberikan evaluasi layanan.',
    steps: [
      'Terima notifikasi status "selesai" dan buka detail laporan.',
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
      'Buka detail laporan yang berstatus "baru" melalui drawer detail.',
      'Gunakan asisten AI untuk memvalidasi kategori dan tingkat keparahan berdasarkan bukti foto.',
      'Jika muncul peringatan "Konflik Sinkronisasi", tinjau perubahan terbaru sebelum menimpa data laporan.',
      'Tetapkan tingkat keparahan dan ubah status menjadi "diproses" ketika laporan siap ditindak.',
      'Periksa deskripsi, kategori, dan bukti foto untuk memastikan kelayakan.',
      'Jika data kurang, hubungi pelapor melalui kontak yang tersedia atau kirim permintaan koreksi.',
      'Catat keputusan validasi pada kolom catatan admin agar riwayat jelas.',
    ],
    outputs: [
      'Laporan tervalidasi dengan status "diproses" dan catatan lengkap.',
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
      'Dari detail laporan, pilih tindakan "Buat catatan tindak lanjut" dan isi instruksi untuk tim.',
      'Gunakan fitur "Cari Rute Terbaik" untuk menghitung jalur tercepat menuju lokasi menggunakan teknologi OSRM.',
      'Update status menjadi "diproses" dan masukkan estimasi penyelesaian.',
      'Bagikan koordinat lokasi melalui tombol Lihat di Peta atau tautan Google Maps.',
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
      'Impor/ekspor data GeoJSON jika ada pembaruan batas wilayah atau titik fasilitas.',
      'Pastikan setiap laporan memiliki koordinat yang benar; koreksi manual bila diperlukan.',
      'Simpan dokumentasi penting (laporan PDF, foto resolusi tinggi) di penyimpanan resmi instansi.',
      'Gunakan fitur export laporan untuk membuat rekap bulanan CSV berstandar Excel.',
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
      'Ubah status laporan menjadi "selesai" dan isi kolom hasil/respon dengan ringkasan tindakan.',
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

interface HelpCenterProps {
  embedded?: boolean;
}

export default function HelpCenter({ embedded = false }: HelpCenterProps) {
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Admin ticket scope & status filter
  const [ticketScope, setTicketScope] = useState<'all' | 'mine'>(isAdmin ? 'all' : 'mine');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Search filter
  const cleanSearch = search.trim().toLowerCase();

  const filteredFaqs = useMemo(() => {
    if (!cleanSearch) return faqs;
    return faqs.filter((f) => f.q.toLowerCase().includes(cleanSearch) || f.a.toLowerCase().includes(cleanSearch));
  }, [cleanSearch]);

  const filteredUserSop = useMemo(() => {
    if (!cleanSearch) return userSopModules;
    return userSopModules.filter((m) =>
      m.title.toLowerCase().includes(cleanSearch) ||
      m.goal.toLowerCase().includes(cleanSearch) ||
      m.steps.some((step) => step.toLowerCase().includes(cleanSearch)) ||
      m.tips?.some((tip) => tip.toLowerCase().includes(cleanSearch)) ||
      m.outputs?.some((out) => out.toLowerCase().includes(cleanSearch))
    );
  }, [cleanSearch]);

  const filteredAdminSop = useMemo(() => {
    if (!cleanSearch) return adminSopModules;
    return adminSopModules.filter((m) =>
      m.title.toLowerCase().includes(cleanSearch) ||
      m.goal.toLowerCase().includes(cleanSearch) ||
      m.steps.some((step) => step.toLowerCase().includes(cleanSearch)) ||
      m.tips?.some((tip) => tip.toLowerCase().includes(cleanSearch)) ||
      m.outputs?.some((out) => out.toLowerCase().includes(cleanSearch))
    );
  }, [cleanSearch]);

  const totalSearchMatches = useMemo(() => {
    if (!cleanSearch) return 0;
    return filteredFaqs.length + filteredUserSop.length + (isAdmin ? filteredAdminSop.length : 0);
  }, [cleanSearch, filteredFaqs.length, filteredUserSop.length, filteredAdminSop.length, isAdmin]);

  const loadTickets = useCallback(async () => {
    if (!user) return;
    setTicketsLoading(true);
    try {
      let query = supabase
        .from('support_tickets')
        .select('id, user_id, subject, message, status, created_at, updated_at, admin_notes')
        .order('created_at', { ascending: false });

      // If not admin, or if admin explicitly chooses "Tiket Saya"
      if (!isAdmin || ticketScope === 'mine') {
        query = query.eq('user_id', user.id);
      }

      if (ticketStatusFilter !== 'all') {
        query = query.eq('status', ticketStatusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rawTickets = (data ?? []) as Ticket[];

      // Enrich tickets with creator profile if admin
      if (rawTickets.length > 0 && isAdmin) {
        const uniqueUserIds = Array.from(new Set(rawTickets.map((t) => t.user_id)));
        try {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone')
            .in('id', uniqueUserIds);

          const profileMap = new Map((profilesData || []).map((p) => [p.id, p]));
          const enriched = rawTickets.map((t) => ({
            ...t,
            user_profile: profileMap.get(t.user_id) || null
          }));
          setTickets(enriched);
        } catch {
          setTickets(rawTickets);
        }
      } else {
        setTickets(rawTickets);
      }
    } catch (error) {
      logger.error('Failed to load support tickets', error);
      toast.error(handleApiError(error, 'Gagal memuat daftar tiket dukungan'));
    } finally {
      setTicketsLoading(false);
    }
  }, [user, isAdmin, ticketScope, ticketStatusFilter]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const submitTicket = async () => {
    if (!user) {
      toast.error('Harap login terlebih dahulu untuk mengirimkan tiket');
      return;
    }
    if (!subject.trim() || !message.trim()) {
      toast.error('Harap lengkapi subjek dan pesan kendala');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        subject: subject.trim(),
        message: message.trim()
      });
      if (error) throw error;

      toast.success('Tiket dukungan berhasil terkirim', {
        icon: <CheckCircle2 className="h-4 w-4" />
      });
      setSubject('');
      setMessage('');
      void loadTickets();
    } catch (error) {
      logger.error('Failed to submit support ticket', error);
      toast.error(handleApiError(error, 'Gagal mengirimkan tiket dukungan'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: Ticket['status'], notes?: string) => {
    setUpdatingStatus(true);
    try {
      const payload: Record<string, unknown> = { status };
      if (notes !== undefined) {
        payload.admin_notes = notes;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(payload)
        .eq('id', ticketId);

      if (error) throw error;

      const labels: Record<Ticket['status'], string> = {
        open: 'Baru (Open)',
        in_progress: 'Sedang Diproses',
        resolved: 'Selesai (Resolved)',
        closed: 'Ditutup (Closed)'
      };

      toast.success(`Status tiket diubah menjadi ${labels[status]}`, {
        icon: <CheckCircle2 className="h-4 w-4" />
      });

      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, status, admin_notes: notes ?? prev.admin_notes } : null));
      }
      void loadTickets();
    } catch (error) {
      logger.error('Failed to update ticket status', error);
      toast.error(handleApiError(error, 'Gagal memperbarui status tiket'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10">Baru (Open)</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="text-blue-500 border-blue-500/30 bg-blue-500/10">Diproses</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">Selesai</Badge>;
      case 'closed':
        return <Badge variant="outline" className="text-muted-foreground border-border bg-muted/20">Ditutup</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const contentLayout = (
    <div className="space-y-6">
      {/* Header section (only rendered if not embedded in Admin Dashboard) */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Help Center & Panduan</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Panduan operasional, SOP teknis, FAQ, dan layanan tiket bantuan sistem SIPASDA
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5 py-1 px-3 w-fit text-xs">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Pusat Bantuan Resmi
          </Badge>
        </div>
      )}

      {/* SEARCH BOX */}
      <Card variant="glass" className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="faq-search"
              placeholder="Cari kata kunci panduan, SOP, OSRM, koordinat GPS, atau FAQ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 glass-surface border-border/50 text-sm focus-visible:ring-primary/30"
              aria-label="Cari panduan dan FAQ"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
          </div>
          {cleanSearch && (
            <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>
                Hasil pencarian untuk <span className="font-semibold text-foreground">&quot;{search}&quot;</span>:
              </span>
              <Badge variant="secondary" className="text-[11px] font-medium">
                {totalSearchMatches} bagian ditemukan
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SOP USER */}
      <Card variant="glass" className="border-0 shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-500" />
              SOP Pengguna (Pelapor)
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {filteredUserSop.length} Modul
            </Badge>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Panduan berurutan untuk masyarakat dan perangkat pelapor dari pendaftaran hingga penutupan aduan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          <Accordion type="multiple" className="space-y-2">
            {filteredUserSop.map((module, index) => (
              <AccordionItem
                key={module.title}
                value={`user-${index}`}
                className="rounded-xl glass-surface border border-border/50 px-4 transition-colors hover:border-emerald-500/30"
              >
                <AccordionTrigger className="text-left text-xs sm:text-sm font-semibold tracking-tight py-3 hover:no-underline">
                  <span className="flex items-center gap-2">
                    <span className="text-primary font-mono text-xs">#{index + 1}</span>
                    {module.title}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3.5 text-xs sm:text-sm leading-relaxed text-foreground pt-1 pb-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tujuan</p>
                    <p className="mt-0.5">{module.goal}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Langkah Pelaksanaan</p>
                    <ol className="list-decimal space-y-1.5 pl-5 mt-1 text-muted-foreground">
                      {module.steps.map((step, sIdx) => (
                        <li key={sIdx} className="text-foreground">{step}</li>
                      ))}
                    </ol>
                  </div>
                  {module.outputs && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Output Hasil</p>
                      <ul className="list-disc space-y-1 pl-5 mt-1 text-muted-foreground">
                        {module.outputs.map((output, oIdx) => (
                          <li key={oIdx}>{output}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {module.tips && (
                    <div className="rounded-lg bg-background/50 border border-border/40 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500">Tips Lapangan</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground text-xs">
                        {module.tips.map((tip, tIdx) => (
                          <li key={tIdx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {module.notes && (
                    <div className="rounded-lg border border-dashed border-border/70 bg-background/60 p-2.5 text-xs text-muted-foreground">
                      {module.notes}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {filteredUserSop.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Tidak ada SOP Pengguna yang cocok dengan kata kunci &quot;{search}&quot;
            </div>
          )}
        </CardContent>
      </Card>

      {/* SOP ADMIN */}
      {isAdmin ? (
        <Card variant="glass" className="border-0 shadow-sm">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Wrench className="h-5 w-5 text-blue-500" />
                SOP Administrator & Tim Teknis
              </CardTitle>
              <Badge variant="outline" className="text-xs text-blue-500 border-blue-500/30 bg-blue-500/10">
                Akses Khusus Admin ({filteredAdminSop.length} Modul)
              </Badge>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Pedoman verifikasi laporan, mitigasi konflik real-time, navigasi OSRM, dan pengelolaan layer geospasial.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <Accordion type="multiple" className="space-y-2">
              {filteredAdminSop.map((module, index) => (
                <AccordionItem
                  key={module.title}
                  value={`admin-${index}`}
                  className="rounded-xl glass-surface border border-border/50 px-4 transition-colors hover:border-blue-500/30"
                >
                  <AccordionTrigger className="text-left text-xs sm:text-sm font-semibold tracking-tight py-3 hover:no-underline">
                    <span className="flex items-center gap-2">
                      <span className="text-blue-500 font-mono text-xs">#{index + 1}</span>
                      {module.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3.5 text-xs sm:text-sm leading-relaxed text-foreground pt-1 pb-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tujuan</p>
                      <p className="mt-0.5">{module.goal}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Langkah Operasional</p>
                      <ol className="list-decimal space-y-1.5 pl-5 mt-1 text-muted-foreground">
                        {module.steps.map((step, sIdx) => (
                          <li key={sIdx} className="text-foreground">{step}</li>
                        ))}
                      </ol>
                    </div>
                    {module.outputs && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Output Kerja</p>
                        <ul className="list-disc space-y-1 pl-5 mt-1 text-muted-foreground">
                          {module.outputs.map((output, oIdx) => (
                            <li key={oIdx}>{output}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {module.tips && (
                      <div className="rounded-lg bg-background/50 border border-border/40 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">Tips Admin</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground text-xs">
                          {module.tips.map((tip, tIdx) => (
                            <li key={tIdx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {module.notes && (
                      <div className="rounded-lg border border-dashed border-border/70 bg-background/60 p-2.5 text-xs text-muted-foreground">
                        {module.notes}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {filteredAdminSop.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Tidak ada SOP Admin yang cocok dengan kata kunci &quot;{search}&quot;
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* FAQ */}
      <Card variant="glass" className="border-0 shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-amber-500" />
              Pertanyaan Umum (FAQ)
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {filteredFaqs.length} FAQ
            </Badge>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Jawaban ringkas seputar mekanisme pelaporan, AI vision, dan tindak lanjut laporan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredFaqs.map((f, i) => (
              <div
                key={i}
                className="rounded-xl glass-surface border border-border/50 p-4 transition-colors hover:border-amber-500/30"
              >
                <div className="font-semibold text-xs sm:text-sm mb-1.5 flex items-start gap-2">
                  <span className="text-amber-500 shrink-0 font-bold">Q:</span>
                  <span>{f.q}</span>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed pl-5">
                  {f.a}
                </div>
              </div>
            ))}
          </div>
          {filteredFaqs.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Tidak ada FAQ yang cocok dengan kata kunci &quot;{search}&quot;
            </div>
          )}
        </CardContent>
      </Card>

      {/* SUPPORT TICKETS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create ticket form (4 cols on lg) */}
        <div className="lg:col-span-4">
          <Card variant="glass" className="border-0 shadow-sm h-full">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                Buat Tiket Dukungan
              </CardTitle>
              <CardDescription className="text-xs">
                Laporkan anomali teknis atau sampaikan permohonan bantuan kepada tim sistem.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="support-subject" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Subjek Aduan
                </Label>
                <Input
                  id="support-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Contoh: Kendala sinkronisasi rute peta"
                  autoComplete="off"
                  className="h-10 glass-surface border-border/50 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="support-message" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pesan / Rincian Masalah
                </Label>
                <Textarea
                  id="support-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Jelaskan kendala, lokasi, atau pesan error yang dialami..."
                  rows={4}
                  className="glass-surface border-border/50 text-xs sm:text-sm resize-none"
                />
              </div>

              <Button
                onClick={submitTicket}
                disabled={loading || !subject.trim() || !message.trim()}
                className="w-full gap-2 text-xs sm:text-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {loading ? 'Mengirimkan...' : 'Kirim Tiket'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tickets Table (8 cols on lg) */}
        <div className="lg:col-span-8">
          <Card variant="glass" className="border-0 shadow-sm h-full flex flex-col">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    {isAdmin && ticketScope === 'all' ? 'Semua Tiket Bantuan Masuk' : 'Tiket Bantuan Saya'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isAdmin
                      ? 'Daftar tiket bantuan teknis dan aduan pengguna sistem'
                      : 'Pantau status dan catatan balasan tiket yang pernah Anda kirimkan'}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {isAdmin && (
                    <div className="flex items-center glass-surface p-0.5 rounded-lg border border-border/50">
                      <Button
                        size="sm"
                        variant={ticketScope === 'all' ? 'secondary' : 'ghost'}
                        onClick={() => setTicketScope('all')}
                        className="h-7 text-xs px-2.5 rounded-md"
                      >
                        Semua Tiket
                      </Button>
                      <Button
                        size="sm"
                        variant={ticketScope === 'mine' ? 'secondary' : 'ghost'}
                        onClick={() => setTicketScope('mine')}
                        className="h-7 text-xs px-2.5 rounded-md"
                      >
                        Tiket Saya
                      </Button>
                    </div>
                  )}

                  <Select
                    value={ticketStatusFilter}
                    onValueChange={(v) => setTicketStatusFilter(v as typeof ticketStatusFilter)}
                  >
                    <SelectTrigger className="h-8 text-xs glass-surface border-border/50 w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="open">Baru (Open)</SelectItem>
                      <SelectItem value="in_progress">Diproses</SelectItem>
                      <SelectItem value="resolved">Selesai</SelectItem>
                      <SelectItem value="closed">Ditutup</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void loadTickets()}
                    disabled={ticketsLoading}
                    className="h-8 w-8 p-0"
                    title="Muat Ulang Tiket"
                  >
                    <RefreshCcw className={`h-3.5 w-3.5 ${ticketsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 pt-0 flex-1 flex flex-col justify-between">
              <div className="rounded-xl border border-border/50 overflow-hidden glass-surface">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold text-xs py-2.5">Subjek</TableHead>
                      {isAdmin && ticketScope === 'all' && (
                        <TableHead className="font-semibold text-xs py-2.5">Pelapor</TableHead>
                      )}
                      <TableHead className="font-semibold text-xs py-2.5">Status</TableHead>
                      <TableHead className="font-semibold text-xs py-2.5">Dibuat</TableHead>
                      <TableHead className="text-right font-semibold text-xs py-2.5">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ticketsLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          {isAdmin && ticketScope === 'all' && (
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          )}
                          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-7 w-14 rounded-md ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : tickets.length > 0 ? (
                      tickets.map((t) => (
                        <TableRow
                          key={t.id}
                          className="hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedTicket(t);
                            setAdminNoteInput(t.admin_notes || '');
                            setDetailOpen(true);
                          }}
                        >
                          <TableCell className="font-medium text-xs sm:text-sm py-3">
                            <div className="line-clamp-1">{t.subject}</div>
                          </TableCell>
                          {isAdmin && ticketScope === 'all' && (
                            <TableCell className="text-xs text-muted-foreground py-3">
                              {t.user_profile?.full_name || t.user_profile?.email || 'Pengguna'}
                            </TableCell>
                          )}
                          <TableCell className="py-3">{getStatusBadge(t.status)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground py-3">
                            {new Date(t.created_at).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-primary">
                              Buka
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={isAdmin && ticketScope === 'all' ? 5 : 4} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <HelpCircle className="h-7 w-7 opacity-40" />
                            <span className="text-xs">Tidak ada tiket bantuan yang ditemukan</span>
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
      </div>

      {/* DETAIL TICKET DIALOG */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-xl glass-floating border-border/50">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Detail Tiket Bantuan
              </DialogTitle>
              {selectedTicket && getStatusBadge(selectedTicket.status)}
            </div>
            <DialogDescription className="text-xs">
              Informasi lengkap dan catatan tindak lanjut aduan teknis.
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 glass-surface p-3 rounded-xl border border-border/50">
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">Subjek</span>
                  <p className="font-medium text-foreground mt-0.5">{selectedTicket.subject}</p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">Tanggal Diajukan</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {new Date(selectedTicket.created_at).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>
                {selectedTicket.user_profile && (
                  <div className="col-span-2 pt-1 border-t border-border/40">
                    <span className="text-[11px] text-muted-foreground uppercase font-semibold">Pengirim</span>
                    <p className="font-medium text-foreground mt-0.5 flex items-center gap-2">
                      <span>{selectedTicket.user_profile.full_name || 'Tanpa Nama'}</span>
                      {selectedTicket.user_profile.email && (
                        <span className="text-xs text-muted-foreground font-mono">({selectedTicket.user_profile.email})</span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Pesan Pengaduan</Label>
                <div className="mt-1.5 p-3 rounded-xl glass-surface border border-border/50 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedTicket.message}
                </div>
              </div>

              {/* ADMIN NOTES (Tanggapan Admin) */}
              {isAdmin ? (
                <div className="space-y-1.5">
                  <Label htmlFor="admin-note" className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-primary" />
                    Catatan Penanganan Admin (Tanggapan)
                  </Label>
                  <Textarea
                    id="admin-note"
                    value={adminNoteInput}
                    onChange={(e) => setAdminNoteInput(e.target.value)}
                    placeholder="Tuliskan catatan teknis atau respon penyelesaian untuk pemohon..."
                    rows={3}
                    className="glass-surface border-border/50 text-xs sm:text-sm"
                  />
                </div>
              ) : selectedTicket.admin_notes ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1">
                  <span className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wide flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Tanggapan Petugas:
                  </span>
                  <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.admin_notes}
                  </p>
                </div>
              ) : null}

              {/* ACTION BUTTONS (For Admin or Owner) */}
              <div className="pt-2 border-t border-border/50 flex flex-wrap gap-2 justify-end">
                {isAdmin ? (
                  <>
                    {selectedTicket.status !== 'in_progress' && selectedTicket.status !== 'resolved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus(selectedTicket.id, 'in_progress', adminNoteInput)}
                        className="text-xs gap-1 border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Mulai Tangani
                      </Button>
                    )}
                    {selectedTicket.status !== 'resolved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus(selectedTicket.id, 'resolved', adminNoteInput)}
                        className="text-xs gap-1 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Tandai Selesai
                      </Button>
                    )}
                    {selectedTicket.status !== 'closed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus(selectedTicket.id, 'closed', adminNoteInput)}
                        className="text-xs gap-1 border-border text-muted-foreground hover:text-foreground"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Tutup Tiket
                      </Button>
                    )}
                    {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus(selectedTicket.id, 'open', adminNoteInput)}
                        className="text-xs gap-1 text-amber-500 hover:bg-amber-500/10"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        Buka Kembali
                      </Button>
                    )}
                  </>
                ) : (
                  selectedTicket.status === 'open' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus(selectedTicket.id, 'closed')}
                      className="text-xs gap-1"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Batalkan Tiket
                    </Button>
                  )
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDetailOpen(false)}
                  className="text-xs"
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  if (embedded) {
    return contentLayout;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {contentLayout}
    </div>
  );
}
