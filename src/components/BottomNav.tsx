import { Link, useLocation } from 'react-router-dom';
import { Map, FileText, PlusCircle, User, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const BottomNav = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  
  const isActive = (path: string) => location.pathname === path;
  
  const navItems = [
    { path: '/map', icon: Map, label: 'Peta' },
    { path: '/me/reports', icon: FileText, label: 'Laporan' },
    { path: '/report', icon: PlusCircle, label: 'Buat', primary: true },
    { path: isAdmin ? '/admin' : '/help', icon: isAdmin ? LayoutDashboard : User, label: isAdmin ? 'Admin' : 'Profil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t shadow-lifted md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          if (item.primary) {
            return (
              <Link key={item.path} to={item.path} className="relative -mt-8">
                <div className="w-14 h-14 rounded-full bg-primary shadow-float flex items-center justify-center btn-haptic">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
              </Link>
            );
          }
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors btn-haptic ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
