import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';

const ReportSuccess = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const id = params.get('id');

  return (
    <main className="mx-auto max-w-xl px-4 py-14 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border-border shadow-sm rounded-2xl p-8 border border-white/10 space-y-6 shadow-xl"
      >
        <div className="mx-auto h-20 w-20 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(34,197,94,0.3)]">✓</div>
        <h1 className="text-2xl font-semibold">Terima kasih! Laporan terkirim</h1>
        {id ? (
          <p className="text-muted-foreground">ID Laporan: <span className="font-mono font-medium">{id}</span></p>
        ) : (
          <p className="text-muted-foreground">Laporan Anda sudah kami terima dan sedang diproses.</p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/map')}
            className="bg-card border-border shadow-sm border border-white/10 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 transition-all"
          >
            Lihat di Peta
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 transition-all"
          >
            Kembali ke Beranda
          </button>
        </div>
      </motion.div>
    </main>
  );
};

export default ReportSuccess;
