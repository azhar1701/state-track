import { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 relative">
      {/* Radial Gradient Background */}
      <div className="fixed inset-0 bg-gradient-radial from-blue-900/20 via-transparent to-transparent pointer-events-none" />
      
      {/* Sticky Navbar */}
      <div className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-white/5">
        <Navbar />
      </div>
      
      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
