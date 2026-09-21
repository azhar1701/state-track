import { Link, useLocation } from "react-router-dom";
import {
  Map,
  FileText,
  PlusCircle,
  User,
  LayoutDashboard,
  Home,
  LogIn,
} from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { memo } from "react";
import { motion } from "framer-motion";

export const BottomNav = memo(() => {
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/", icon: Home, label: "Beranda" },
    { path: "/map", icon: Map, label: "Peta" },
    { path: "/report", icon: PlusCircle, label: "Lapor", primary: true },
    { path: user ? "/me/reports" : "/auth", icon: FileText, label: "Laporan" },
    {
      path: isAdmin ? "/admin" : user ? "/help" : "/auth",
      icon: isAdmin ? LayoutDashboard : user ? User : LogIn,
      label: isAdmin ? "Admin" : user ? "Profil" : "Masuk",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md shadow-lg md:hidden pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          if (item.primary) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative -mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full"
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                <div className="w-12 h-12 rounded-full bg-primary shadow-lg flex items-center justify-center transition-transform active:scale-95">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center min-h-[44px] min-w-[48px] gap-1 px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="bottom-nav-active-indicator"
                  className="absolute inset-x-2 -bottom-1 h-1 bg-primary rounded-t-md"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="w-5 h-5 relative z-10" />
              <span className="text-[10px] font-medium relative z-10">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = "BottomNav";
