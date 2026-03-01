import { Link } from 'react-router-dom';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="glass-surface border-t border-white/10 rounded-t-3xl pb-24 md:pb-6 mt-auto">
      <div className="container py-12 px-4 md:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">SIPASDA</div>
            <p className="text-sm text-muted-foreground mt-4 max-w-sm leading-relaxed">
              SIPASDA (Sistem Informasi Pelaporan SDA) adalah aplikasi web untuk pelaporan dan pemantauan sumber daya air di daerah. Masyarakat dapat melaporkan kondisi infrastruktur seperti irigasi, sungai, dan lainnya secara langsung, dilengkapi foto dan data spasial. Instansi terkait dapat menindaklanjuti laporan dengan cepat dan transparan, sementara pengguna bisa memantau status penanganannya.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-4">Menu</div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/" className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">Beranda</Link></li>
                <li><Link to="/map" className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">Peta</Link></li>
                <li><Link to="/report" className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">Buat Laporan</Link></li>
                <li><Link to="/admin" className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-4">Bantuan</div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">Panduan</a></li>
                <li><a href="#" className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">Kebijakan Privasi</a></li>
                <li><a href="#" className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">Syarat Layanan</a></li>
              </ul>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-4">Kontak</div>
            <p className="text-sm text-muted-foreground">Email: psdaciamis2025@gmail.com</p>
            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">Instagram</a>
              <span className="text-white/20">·</span>
              <a href="#" className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">GitHub</a>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/10 text-xs text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-4">
          <div>© {year} SIPASDA. Semua hak dilindungi.</div>
          <div>Dibuat dengan React, Vite, Tailwind, dan Leaflet.</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

