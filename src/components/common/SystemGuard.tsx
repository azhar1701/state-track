import React from 'react';
import { isSupabaseConfigured } from '@/services/client';
import { ShieldAlert, Terminal, ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface SystemGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  mode?: 'block' | 'overlay';
}

export const SystemGuard: React.FC<SystemGuardProps> = ({ 
  children, 
  fallback, 
  mode = 'block' 
}) => {
  if (isSupabaseConfigured) {
    return <>{children}</>;
  }

  const FallbackUI = () => (
    <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/5 backdrop-blur-2xl p-8 lg:p-12 shadow-2xl">
      {/* Background Decorative Orbs */}
      <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary/20 blur-[80px]" />
      <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-accent/20 blur-[80px]" />
      
      <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-lg mx-auto">
        <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 mb-2">
          <ShieldAlert className="w-12 h-12 text-amber-500" />
        </div>
        
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Konfigurasi Diperlukan
        </h2>
        
        <p className="text-muted-foreground leading-relaxed">
          Sistem belum terhubung ke backend (Supabase). Silakan tambahkan variabel lingkungan yang diperlukan pada file <code className="px-1.5 py-0.5 bg-muted rounded font-mono text-xs">.env.local</code> untuk mengaktifkan fitur ini.
        </p>

        <Card className="w-full bg-black/40 border-white/10 backdrop-blur-md overflow-hidden">
          <CardContent className="p-4 font-mono text-xs text-left text-blue-300/90 space-y-2">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2 text-white/50">
              <Terminal className="w-3.5 h-3.5" />
              <span>Instruksi Setup</span>
            </div>
            <p># Salin contoh environment</p>
            <p className="text-white">cp .env.example .env.local</p>
            <p className="mt-4"># Isi variabel berikut:</p>
            <p className="text-white">VITE_SUPABASE_URL=your_url</p>
            <p className="text-white">VITE_SUPABASE_PUBLISHABLE_KEY=your_key</p>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-4">
          <Button 
            variant="default" 
            size="lg" 
            className="rounded-full gap-2 px-8 h-12"
            onClick={() => window.open('https://app.supabase.com', '_blank')}
          >
            Buka Supabase Console <ExternalLink className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="rounded-full gap-2 px-8 h-12 bg-white/5 border-white/10 hover:bg-white/10"
            onClick={() => window.location.reload()}
          >
            Refresh Halaman <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  if (mode === 'overlay') {
    return (
      <div className="relative group">
        <div className="opacity-40 pointer-events-none filter blur-sm">
          {children}
        </div>
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 lg:p-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-2xl"
          >
            <FallbackUI />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4 lg:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {fallback || <FallbackUI />}
      </motion.div>
    </div>
  );
};
