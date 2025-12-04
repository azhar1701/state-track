import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, Menu, X, Map, FileText, LayoutDashboard, LogOut, Bell } from "lucide-react";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { useNotifications } from "@/hooks/useNotifications";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { user, isAdmin, signOut, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { items: notifs, unreadCount, markAsRead, markAllAsRead } = useNotifications(10);

  const isActive = (path: string) => {
    // Treat nested routes as active (e.g., /admin?tab=geo or /map/...) for clearer UX
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };
  // Prefetch heavy routes on hover/focus for faster navigation
  const prefetchMap = () => import("@/pages/MapView");
  const prefetchReport = () => import("@/pages/ReportForm");
  const prefetchAdmin = () => import("@/pages/AdminDashboard");
  const prefetchMyReports = () => import("@/pages/MyReports");
  const prefetchHelp = () => import("@/pages/HelpCenter");
  // const prefetchAssets = () => import("@/pages/Assets");

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md transition-all duration-300">
      <div className="container px-2 md:px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/auth" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <div className="p-2 bg-primary/10 rounded-xl shadow-sm">
              <MapPin className="icon-sm text-primary" />
            </div>
            <span className="hidden sm:inline">LaporInfra</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <>
                {/* Primary nav: Map, My Reports, Report */}
                <Link to="/map">
                  <Button
                    variant={isActive("/map") ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    onMouseEnter={prefetchMap}
                    onFocus={prefetchMap}
                  >
                    <Map className="icon-sm" />
                    Peta
                  </Button>
                </Link>
                <Link to="/me/reports">
                  <Button
                    variant={isActive("/me/reports") ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    onMouseEnter={prefetchMyReports}
                    onFocus={prefetchMyReports}
                  >
                    <FileText className="icon-sm" />
                    Laporan Saya
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

                {/* Context nav: Admin Dashboard or Help Center (non-admin) */}
                {loading ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    disabled
                  >
                    <LayoutDashboard className="icon-sm animate-pulse" />
                    Memuat...
                  </Button>
                ) : isAdmin ? (
                  <Link to="/admin">
                    <Button
                      variant={isActive("/admin") ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-2"
                      onMouseEnter={prefetchAdmin}
                      onFocus={prefetchAdmin}
                    >
                      <LayoutDashboard className="icon-sm" />
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link to="/help">
                    <Button
                      variant={isActive("/help") ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-2"
                      onMouseEnter={prefetchHelp}
                      onFocus={prefetchHelp}
                    >
                      <FileText className="icon-sm" />
                      Help Center
                    </Button>
                  </Link>
                )}

                {/* Notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative p-2 rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring">
                      <Bell className="icon-sm" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] leading-none px-1 py-0.5 rounded">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel className="flex items-center justify-between">
                      <span>Notifikasi</span>
                      {unreadCount > 0 && (
                        <button className="text-xs text-primary hover:underline" onClick={(e) => { e.preventDefault(); void markAllAsRead(); }}>
                          Tandai semua dibaca
                        </button>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {notifs.length === 0 ? (
                      <div className="px-3 py-6 text-sm text-muted-foreground">Belum ada notifikasi</div>
                    ) : (
                      notifs.map((n) => (
                        <DropdownMenuItem
                          key={n.id}
                          className="flex items-start gap-2"
                          onSelect={(e) => {
                            e.preventDefault();
                            if (n.report_id) {
                              navigate(`/map?report=${n.report_id}`);
                            }
                            void markAsRead(n.id);
                          }}
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium">{n.title}</div>
                            {n.body && <div className="text-xs text-muted-foreground leading-snug">{n.body}</div>}
                            <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                          </div>
                          {!n.read_at && (
                            <button className="text-xs text-primary hover:underline" onClick={(e) => { e.preventDefault(); void markAsRead(n.id); }}>
                              Tandai dibaca
                            </button>
                          )}
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Session & theme */}
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
            className="md:hidden p-2 rounded-lg border border-border bg-background shadow-sm transition-all duration-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Buka menu"
          >
            {mobileMenuOpen ? <X className="icon-md" /> : <Menu className="icon-md" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t bg-background rounded-b-xl shadow-lg transition-all duration-300">
            <div className="flex flex-col gap-3 px-2">
              {user && (
                <>
                  {/* Primary nav */}
                  <Link to="/map" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={isActive("/map") ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-2"
                      onMouseEnter={prefetchMap}
                      onFocus={prefetchMap}
                    >
                      <Map className="icon-sm" />
                      Peta
                    </Button>
                  </Link>
                  <Link to="/me/reports" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={isActive("/me/reports") ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-2"
                      onMouseEnter={prefetchMyReports}
                      onFocus={prefetchMyReports}
                    >
                      <FileText className="icon-sm" />
                      Laporan Saya
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

                  {/* Context nav */}
                  {loading ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2"
                      disabled
                    >
                      <LayoutDashboard className="icon-sm animate-pulse" />
                      Memuat...
                    </Button>
                  ) : isAdmin ? (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Button
                        variant={isActive("/admin") ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start gap-2"
                        onMouseEnter={prefetchAdmin}
                        onFocus={prefetchAdmin}
                      >
                        <LayoutDashboard className="icon-sm" />
                        Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/help" onClick={() => setMobileMenuOpen(false)}>
                      <Button
                        variant={isActive("/help") ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start gap-2"
                        onMouseEnter={prefetchHelp}
                        onFocus={prefetchHelp}
                      >
                        <FileText className="icon-sm" />
                        Help Center
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
