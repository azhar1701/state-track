import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Map, Bell, User, PlusCircle, LayoutDashboard, BarChart3, LogOut, Home } from "lucide-react";
import { useState, memo, useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";

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

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Map className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="hidden font-bold sm:inline-block">SIPASDA</span>
        </Link>

        {/* Desktop Nav */}
        {user && (
          <div className="hidden md:flex items-center gap-1 flex-1">
            <Link to="/">
              <Button variant={isActive("/") && !isActive("/map") && !isActive("/me") && !isActive("/admin") ? "secondary" : "ghost"} size="sm" className="gap-2">
                <Home className="h-4 w-4" />
                Beranda
              </Button>
            </Link>
            <Link to="/map">
              <Button variant={isActive("/map") ? "secondary" : "ghost"} size="sm" className="gap-2">
                <Map className="h-4 w-4" />
                Peta
              </Button>
            </Link>
            <Link to="/me/reports">
              <Button variant={isActive("/me/reports") ? "secondary" : "ghost"} size="sm" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Laporan Saya
              </Button>
            </Link>
            {isAdmin && (
              <Link to="/admin">
                <Button variant={isActive("/admin") ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Theme Toggle */}
          <ThemeToggle />

          {user ? (
            <>
              <Link to="/report">
                <Button size="sm" className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Lapor</span>
                </Button>
              </Link>

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
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
                  <Button variant="ghost" size="icon">
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
