import { Link } from "react-router-dom";
import { Map } from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();

  const menuLinks = [
    { to: "/", label: "Beranda" },
    { to: "/map", label: "Peta" },
    { to: "/report", label: "Buat Laporan" },
    { to: "/admin", label: "Dashboard" },
  ];

  const helpLinks = [
    { label: "Panduan", href: "/help" },
    { label: "Kebijakan Privasi" },
    { label: "Syarat Layanan" },
  ];

  return (
    <footer className="border-t border-border bg-card pb-20 md:pb-0 mt-auto">
      <div className="container px-4 md:px-6">
        {/* Main grid */}
        <div className="grid gap-10 md:grid-cols-4 py-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Map className="h-4 w-4" />
              </div>
              <span className="font-bold text-base text-foreground tracking-tight">
                SIPASDA
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Platform pelaporan dan pemantauan sumber daya air untuk
              pemerintah daerah dan masyarakat.
            </p>
          </div>

          {/* Menu */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
              Menu
            </h4>
            <ul className="space-y-2.5">
              {menuLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Bantuan */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
              Bantuan
            </h4>
            <ul className="space-y-2.5">
              {helpLinks.map((link) => (
                <li key={link.label}>
                  {link.href ? (
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground cursor-default">
                      {link.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Kontak */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
              Kontak
            </h4>
            <a
              href="mailto:psdaciamis2025@gmail.com"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors break-all"
            >
              psdaciamis2025@gmail.com
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {year} SIPASDA. Semua hak dilindungi.</span>
          <span>Ditenagai React, Vite, dan Leaflet</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
