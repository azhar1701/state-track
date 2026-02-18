/**
 * Modern Dashboard Layout with Sidebar
 * Clean Glassmorphism Design
 */

import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Map, 
  FileText, 
  Settings, 
  Users, 
  Database,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Home
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { label: 'Laporan', icon: FileText, path: '/admin/reports' },
  { label: 'Peta', icon: Map, path: '/map' },
  { label: 'Pengguna', icon: Users, path: '/admin/users' },
  { label: 'GeoData', icon: Database, path: '/admin/geodata' },
  { label: 'Pengaturan', icon: Settings, path: '/admin/settings' },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700/50">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
            <Map className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-white">SIPASDA</h1>
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                "hover:bg-slate-800/50",
                active && "bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 shadow-lg shadow-blue-500/10",
                !active && "text-slate-400 hover:text-white"
              )}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", active && "text-blue-400")} />
              {!collapsed && (
                <span className={cn("font-medium", active && "text-white")}>
                  {item.label}
                </span>
              )}
              {!collapsed && item.badge && (
                <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-blue-500 text-white rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-700/50 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800/50"
        >
          <Home className="h-4 w-4 mr-3" />
          {!collapsed && "Kembali ke Beranda"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4 mr-3" />
          {!collapsed && "Keluar"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col",
          "bg-slate-900/80 backdrop-blur-xl border-r border-slate-800",
          "transition-all duration-300 z-50",
          collapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        <SidebarContent />
        
        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft className={cn("h-4 w-4 text-slate-400 transition-transform", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 z-50 lg:hidden">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className={cn("lg:pl-64 transition-all duration-300", collapsed && "lg:pl-20")}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-400"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <div className="flex-1" />
            
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
