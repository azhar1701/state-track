import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, Menu, X, Map, FileText, LayoutDashboard, LogOut } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <span className="hidden sm:inline">LaporInfra</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {user && (
              <>
                <Link to="/map">
                  <Button
                    variant={isActive("/map") ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <Map className="w-4 h-4" />
                    Peta
                  </Button>
                </Link>
                <Link to="/report">
                  <Button
                    variant={isActive("/report") ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Buat Laporan
                  </Button>
                </Link>
                {isAdmin && (
                  <Link to="/admin">
                    <Button
                      variant={isActive("/admin") ? "accent" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar
                </Button>
              </>
            )}
            {!user && (
              <Link to="/auth">
                <Button size="sm">Masuk / Daftar</Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-2">
              {user && (
                <>
                  <Link to="/map" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={isActive("/map") ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-2"
                    >
                      <Map className="w-4 h-4" />
                      Peta
                    </Button>
                  </Link>
                  <Link to="/report" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={isActive("/report") ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Buat Laporan
                    </Button>
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Button
                        variant={isActive("/admin") ? "accent" : "ghost"}
                        size="sm"
                        className="w-full justify-start gap-2"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-start gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </Button>
                </>
              )}
              {!user && (
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full">
                    Masuk / Daftar
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
