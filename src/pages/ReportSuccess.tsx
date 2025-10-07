import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ReportSuccess = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const id = params.get('id');

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-16 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-3xl">✓</div>
      <h1 className="text-2xl font-semibold">Laporan Berhasil Dikirim</h1>
      {id ? (
        <p className="text-slate-600">ID Laporan: <span className="font-mono font-medium">{id}</span></p>
      ) : (
        <p className="text-slate-600">Terima kasih, laporan Anda sudah kami terima.</p>
      )}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Kembali ke Beranda
        </button>
        <button
          onClick={() => navigate(id ? `/report/status?id=${id}` : '/report/status')}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
        >
          Lihat Status
        </button>
      </div>
    </main>
  );
};

export default ReportSuccess;
