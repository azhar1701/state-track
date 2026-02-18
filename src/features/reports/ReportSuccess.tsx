import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ReportSuccess = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const id = params.get('id');

  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-14 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-3xl">✓</div>
      <h1 className="text-2xl font-semibold">Terima kasih! Laporan terkirim</h1>
      {id ? (
        <p className="text-muted-foreground">ID Laporan: <span className="font-mono font-medium">{id}</span></p>
      ) : (
        <p className="text-muted-foreground">Laporan Anda sudah kami terima dan sedang diproses.</p>
      )}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => navigate('/map')}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent/30"
        >
          Lihat di Peta
        </button>
        <button
          onClick={() => navigate('/')}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          Kembali ke Beranda
        </button>
      </div>
    </main>
  );
};

export default ReportSuccess;
