import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";
import {
  Map,
  Bell,
  User,
  PlusCircle,
  LayoutDashboard,
  BarChart3,
  LogOut,
  Home,
  ChevronRight,
} from "lucide-react";
import { useState, memo, useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/services/client";
import ThemeToggle from "@/components/layout/ThemeToggle";

const Navbar = memo(() => {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    items: notifs,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications(10);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullName(data?.full_name || null);
      });
  }, [user?.id]);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const navLinks = [
    {
      path: "/",
      label: "Beranda",
      icon: Home,
      active:
        isActive("/") &&
        !isActive("/map") &&
        !isActive("/me") &&
        !isActive("/admin"),
    },
    {
      path: "/map",
      label: "Peta",
      icon: Map,
      active: isActive("/map"),
    },
    {
      path: "/me/reports",
      label: "Laporan Saya",
      icon: BarChart3,
      active: isActive("/me/reports"),
    },
    ...(isAdmin
      ? [
        {
          path: "/admin",
          label: "Dashboard",
          icon: LayoutDashboard,
          active: isActive("/admin"),
        },
      ]
      : []),
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container flex h-14 items-center px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 mr-8 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Map className="h-4 w-4" />
          </div>
          <span className="hidden font-bold text-base text-foreground sm:inline-block tracking-tight">
            SIPASDA
          </span>
        </Link>

        {/* Desktop Nav Links */}
        {user && (
          <div className="hidden md:flex items-center gap-0.5 flex-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="relative px-0.5"
                  aria-current={link.active ? "page" : undefined}
                >
                  {link.active && (
                    <motion.div
                      layoutId="navbar-active-pill"
                      className="absolute inset-0 bg-muted rounded-lg"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <div
                    className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${link.active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <ThemeToggle />

          {user ? (
            <>
              {/* New Report Button */}
              <Link to="/report" className="hidden md:block">
                <Button
                  size="sm"
                  className="gap-1.5 h-8 px-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Lapor
                </Button>
              </Link>

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                    aria-label="Notifikasi"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center px-1 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-80 max-w-[90vw]"
                >
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Notifikasi</span>
                    {unreadCount > 0 && (
                      <button
                        className="text-xs text-primary hover:underline font-medium"
                        onClick={() => void markAllAsRead()}
                      >
                        Tandai dibaca
                      </button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifs.length === 0 ? (
                      <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                        Belum ada notifikasi
                      </div>
                    ) : (
                      notifs.map((n) => (
                        <DropdownMenuItem
                          key={n.id}
                          className="flex flex-col items-start gap-1 cursor-pointer px-3 py-2.5"
                          onSelect={() => {
                            if (n.report_id)
                              navigate(`/map?report=${n.report_id}`);
                            void markAsRead(n.id);
                          }}
                        >
                          <div className="font-medium text-sm">{n.title}</div>
                          {n.body && (
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {n.body}
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground/70">
                            {new Date(n.created_at).toLocaleString("id-ID")}
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Menu Pengguna"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {fullName || user.email}
                      </p>
                      {fullName && user.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      )}
                      {isAdmin && (
                        <Badge
                          variant="secondary"
                          className="w-fit text-[10px] mt-1"
                        >
                          Admin
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button
                size="sm"
                className="h-8 px-4 text-sm font-medium rounded-lg gap-1"
              >
                Masuk
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
});

Navbar.displayName = "Navbar";

export default Navbar;
