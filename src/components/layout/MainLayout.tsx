import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
  sidebarPosition?: 'left' | 'right';
  className?: string;
}

export function MainLayout({
  children,
  sidebar,
  sidebarOpen = false,
  onSidebarToggle,
  sidebarPosition = 'left',
  className,
}: MainLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className={cn('flex h-dvh w-full overflow-hidden', className)}>
      {/* Desktop/Tablet Sidebar */}
      {sidebar && !isMobile && (
        <aside
          className={cn(
            'flex-shrink-0 transition-all duration-300 ease-in-out overflow-y-auto',
            sidebarOpen ? 'w-80 lg:w-96' : 'w-0',
            sidebarPosition === 'left' ? 'order-1' : 'order-3'
          )}
        >
          {sidebarOpen && (
            <div className="h-full glass-strong border-r border-white/10">
              {sidebar}
            </div>
          )}
        </aside>
      )}

      {/* Main Content (Map) */}
      <main className="flex-1 relative order-2 overflow-hidden">
        {children}
      </main>

      {/* Mobile Bottom Sheet Sidebar */}
      {sidebar && isMobile && sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-[1400] animate-fade-in"
            onClick={onSidebarToggle}
          />
          
          {/* Bottom Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-[1500] max-h-[80dvh] glass-strong rounded-t-3xl shadow-[0_-8px_24px_rgba(0,0,0,0.15)] animate-slide-up overflow-y-auto pb-safe-bottom">
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-inherit z-10">
              <div className="w-12 h-1 rounded-full bg-white/30" />
            </div>
            {sidebar}
          </div>
        </>
      )}
    </div>
  );
}
