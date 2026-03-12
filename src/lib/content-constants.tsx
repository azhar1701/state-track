import { 
  BarChart3, 
  Zap, 
  Droplets, 
  Send, 
  Eye, 
  Shield 
} from 'lucide-react';

export const FAQ_ITEMS = [
  {
    question: "Bagaimana cara membuat laporan?",
    answer: "Anda dapat menekan tombol '+ Laporan Baru' di halaman utama atau menu Laporan, lalu ikuti instruksi pengisian data dan unggah foto."
  },
  {
    question: "Berapa lama laporan ditindaklanjuti?",
    answer: "Laporan akan ditinjau dalam 1x24 jam. Waktu penanganan bervariasi tergantung tingkat keparahan dan prioritas di lapangan."
  },
  {
    question: "Apakah saya bisa melaporkan secara anonim?",
    answer: "Untuk validitas data, kami memerlukan akun terverifikasi. Namun, identitas Anda akan dirahasiakan dari publik."
  },
  {
    question: "Apa itu fitur 'Saran AI'?",
    answer: "Fitur AI kami membantu mengenali jenis kerusakan dan tingkat urgensi secara otomatis berdasarkan foto yang Anda unggah."
  },
  {
    question: "Bagaimana cara memantau status laporan?",
    answer: "Status laporan dapat dipantau melalui menu 'Laporan Saya' atau melalui notifikasi yang dikirimkan ke akun Anda."
  }
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: "Daftar & Masuk",
    desc: "Buat akun gratis untuk mulai melaporkan",
    icon: Shield,
    gradient: "from-primary to-blue-600",
  },
  {
    step: 2,
    title: "Buat Laporan",
    desc: "Ambil foto, tandai lokasi, kirim laporan",
    icon: Zap,
    gradient: "from-teal-500 to-teal-600",
  },
  {
    step: 3,
    title: "Pantau Progress",
    desc: "Ikuti status perbaikan di peta real-time",
    icon: Droplets,
    gradient: "from-green-500 to-green-600",
  },
];

export const FEATURE_LIST = [
  {
    title: "Laporan Mudah",
    desc: "Kirim laporan lengkap dengan foto, lokasi GPS, dan AI-assisted severity detection dalam hitungan detik.",
    icon: Send,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "hover:border-primary/40",
  },
  {
    title: "Peta Interaktif",
    desc: "Visualisasi real-time semua laporan di peta. Filter, routing, dan analisis spasial langsung di browser.",
    icon: Eye,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    border: "hover:border-cyan-500/40",
  },
  {
    title: "Dashboard Admin",
    desc: "Panel kontrol profesional untuk mengelola, memantau, dan menindaklanjuti semua laporan infrastruktur.",
    icon: BarChart3,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "hover:border-amber-500/40",
  },
];
