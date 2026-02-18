import { Link, useLocation } from 'react-router-dom';
import { Map, FileText, PlusCircle, User, LayoutDashboard, Home } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { memo } from 'react';

export const BottomNav = memo(() => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  
  const isActive = (path: string) => location.pathname === path;
  
  const navItems = [
    { path: '/', icon: Home, label: 'Beranda' },
    { path: '/map', icon: Map, label: 'Peta' },
    { path: '/report', icon: PlusCircle, label: 'Lapor', primary: true },
    { path: '/me/reports', icon: FileText, label: 'Laporan' },
    { path: isAdmin ? '/admin' : '/help', icon: isAdmin ? LayoutDashboard : User, label: isAdmin ? 'Admin' : 'Profil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          if (item.primary) {
            return (
              <Link key={item.path} to={item.path} className="relative -mt-6">
                <div className="w-12 h-12 rounded-full bg-primary shadow-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
              </Link>
            );
          }
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-1 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';
