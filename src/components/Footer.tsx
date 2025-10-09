import { Link } from 'react-router-dom';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="font-semibold text-lg">LaporInfra</div>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Platform pelaporan dan monitoring kondisi infrastruktur publik.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="font-medium mb-2">Menu</div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li><Link to="/" className="hover:text-foreground">Beranda</Link></li>
                <li><Link to="/map" className="hover:text-foreground">Peta</Link></li>
                <li><Link to="/report" className="hover:text-foreground">Buat Laporan</Link></li>
                <li><Link to="/admin" className="hover:text-foreground">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-medium mb-2">Bantuan</div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Panduan</a></li>
                <li><a href="#" className="hover:text-foreground">Kebijakan Privasi</a></li>
                <li><a href="#" className="hover:text-foreground">Syarat Layanan</a></li>
              </ul>
            </div>
          </div>
          <div>
            <div className="font-medium mb-2">Kontak</div>
            <p className="text-sm text-muted-foreground">Email: support@example.com</p>
            <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground">Twitter</a>
              <span>·</span>
              <a href="#" className="hover:text-foreground">GitHub</a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t text-xs text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-2">
          <div>© {year} LaporInfra. Semua hak dilindungi.</div>
          <div>Dibuat dengan React, Vite, Tailwind, dan Leaflet.</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
