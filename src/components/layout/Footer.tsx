import { Link } from 'react-router-dom';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-inner transition-all duration-300 rounded-t-xl">
      <div className="container py-10 px-2 md:px-4">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="font-semibold text-lg">SIPASDA</div>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              SIPASDA (Sistem Informasi Pelaporan SDA) adalah aplikasi web untuk pelaporan dan pemantauan sumber daya air di daerah. Masyarakat dapat melaporkan kondisi infrastruktur seperti irigasi, sungai, dan lainnya secara langsung, dilengkapi foto dan data spasial. Instansi terkait dapat menindaklanjuti laporan dengan cepat dan transparan, sementara pengguna bisa memantau status penanganannya.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="font-medium mb-2">Menu</div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li><Link to="/" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">Beranda</Link></li>
                <li><Link to="/map" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">Peta</Link></li>
                <li><Link to="/report" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">Buat Laporan</Link></li>
                <li><Link to="/admin" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-medium mb-2">Bantuan</div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">Panduan</a></li>
                <li><a href="#" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">Kebijakan Privasi</a></li>
                <li><a href="#" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">Syarat Layanan</a></li>
              </ul>
            </div>
          </div>
          <div>
            <div className="font-medium mb-2">Kontak</div>
            <p className="text-sm text-muted-foreground">Email: psdaciamis2025@gmail.com</p>
            <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">Instagram</a>
              <span>·</span>
              <a href="#" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">GitHub</a>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t text-xs text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-2">
          <div>© {year} SIPASDA. Semua hak dilindungi.</div>
          <div>Dibuat dengan React, Vite, Tailwind, dan Leaflet.</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

