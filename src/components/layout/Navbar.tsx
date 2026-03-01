import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";
import { Map, Bell, User, PlusCircle, LayoutDashboard, BarChart3, LogOut, Home } from "lucide-react";
import { useState, memo, useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/services/client";
import ThemeToggle from "@/components/layout/ThemeToggle";

const Navbar = memo(() => {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { items: notifs, unreadCount, markAsRead, markAllAsRead } = useNotifications(10);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullName(data?.full_name || null);
      });
  }, [user?.id]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const navLinks = [
    {
      path: "/",
      label: "Beranda",
      icon: Home,
      active: isActive("/") && !isActive("/map") && !isActive("/me") && !isActive("/admin")
    },
    {
      path: "/map",
      label: "Peta",
      icon: Map,
      active: isActive("/map")
    },
    {
      path: "/me/reports",
      label: "Laporan Saya",
      icon: BarChart3,
      active: isActive("/me/reports")
    },
    ...(isAdmin ? [{
      path: "/admin",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: isActive("/admin")
    }] : [])
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-primary-foreground/10 bg-primary text-primary-foreground backdrop-blur-md shadow-md">
      <div className="container flex h-16 items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
            <Map className="h-5 w-5 text-white" />
          </div>
          <span className="hidden font-bold text-lg text-primary-foreground sm:inline-block tracking-wide">SIPASDA</span>
        </Link>

        {/* Desktop Nav */}
        {user && (
          <div className="hidden md:flex items-center gap-1 flex-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.path} to={link.path} className="relative">
                  {link.active && (
                    <motion.div
                      layoutId="navbar-active-indicator"
                      className="absolute inset-0 rounded-md bg-accent shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`relative z-10 gap-2 ${
                      link.active
                        ? "text-accent-foreground hover:bg-transparent hover:text-accent-foreground"
                        : "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Theme Toggle */}
          <ThemeToggle />

          {user ? (
            <>
              <Link to="/report">
                <Button size="sm" className="gap-2 hidden md:flex bg-accent text-accent-foreground hover:bg-accent/90 shadow-md">
                  <PlusCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Lapor</span>
                </Button>
              </Link>

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" aria-label="Notifikasi">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-accent text-accent-foreground border-none">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 sm:w-72 md:w-80 max-w-[90vw]">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifikasi</span>
                    {unreadCount > 0 && (
                      <button className="text-xs text-primary hover:underline" onClick={() => void markAllAsRead()}>
                        Tandai dibaca
                      </button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifs.length === 0 ? (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">Belum ada notifikasi</div>
                    ) : (
                      notifs.map((n) => (
                        <DropdownMenuItem
                          key={n.id}
                          className="flex flex-col items-start gap-1 cursor-pointer"
                          onSelect={() => {
                            if (n.report_id) navigate(`/map?report=${n.report_id}`);
                            void markAsRead(n.id);
                          }}
                        >
                          <div className="font-medium text-sm">{n.title}</div>
                          {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                          <div className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString('id-ID')}</div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Menu Pengguna" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{fullName || user.email}</p>
                      {isAdmin && <Badge variant="secondary" className="w-fit text-[10px]">Admin</Badge>}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm">Masuk</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;
