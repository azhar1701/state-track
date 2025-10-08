import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, Menu, X, Map, FileText, LayoutDashboard, LogOut } from "lucide-react";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  // Prefetch heavy routes on hover/focus for faster navigation
  const prefetchMap = () => import("@/pages/MapView");
  const prefetchReport = () => import("@/pages/ReportForm");
  const prefetchAdmin = () => import("@/pages/AdminDashboard");

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container">
        <div className="flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <MapPin className="icon-sm text-primary" />
            </div>
            <span className="hidden sm:inline">LaporInfra</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            {user && (
              <>
                <Link to="/map">
                  <Button
                    variant={isActive("/map") ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                    onMouseEnter={prefetchMap}
                    onFocus={prefetchMap}
                  >
                    <Map className="icon-sm" />
                    Peta
                  </Button>
                </Link>
                <Link to="/report">
                  <Button
                    variant={isActive("/report") ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    onMouseEnter={prefetchReport}
                    onFocus={prefetchReport}
                  >
                    <FileText className="icon-sm" />
                    Buat Laporan
                  </Button>
                </Link>
                {isAdmin && (
                  <Link to="/admin">
                    <Button
                      variant={isActive("/admin") ? "accent" : "ghost"}
                      size="sm"
                      className="gap-2"
                      onMouseEnter={prefetchAdmin}
                      onFocus={prefetchAdmin}
                    >
                      <LayoutDashboard className="icon-sm" />
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
                  <LogOut className="icon-sm" />
                  Keluar
                </Button>
                <ThemeToggle />
              </>
            )}
            {!user && (
              <div className="flex items-center gap-2">
                <Link to="/auth">
                  <Button size="sm">Masuk / Daftar</Button>
                </Link>
                <ThemeToggle />
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="icon-md" /> : <Menu className="icon-md" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t">
            <div className="flex flex-col gap-2">
              {user && (
                <>
                  <Link to="/map" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={isActive("/map") ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-2"
                      onMouseEnter={prefetchMap}
                      onFocus={prefetchMap}
                    >
                      <Map className="icon-sm" />
                      Peta
                    </Button>
                  </Link>
                  <Link to="/report" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={isActive("/report") ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-2"
                      onMouseEnter={prefetchReport}
                      onFocus={prefetchReport}
                    >
                      <FileText className="icon-sm" />
                      Buat Laporan
                    </Button>
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Button
                        variant={isActive("/admin") ? "accent" : "ghost"}
                        size="sm"
                        className="w-full justify-start gap-2"
                        onMouseEnter={prefetchAdmin}
                        onFocus={prefetchAdmin}
                      >
                        <LayoutDashboard className="icon-sm" />
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
                    <LogOut className="icon-sm" />
                    Keluar
                  </Button>
                  <div className="flex w-full justify-start px-2 pt-2">
                    <ThemeToggle />
                  </div>
                </>
              )}
              {!user && (
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full">
                    Masuk / Daftar
                  </Button>
                </Link>
              )}
              {!user && (
                <div className="flex w-full justify-start px-2 pt-2">
                  <ThemeToggle />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
