import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, Map as MapIcon } from 'lucide-react';

export default function BottomCTA() {
  return (
    <section className="container py-20">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/90 to-teal-600/90 backdrop-blur-xl border border-white/20 p-12 md:p-16 text-center max-w-5xl mx-auto shadow-2xl">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <h3 className="text-4xl md:text-5xl font-bold text-white mb-4">Siap berkontribusi?</h3>
          <p className="text-lg md:text-xl text-white/90 mt-4 max-w-2xl mx-auto leading-relaxed">
            Laporkan masalah infrastruktur di sekitar Anda atau lihat peta untuk memantau progres perbaikan.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link to="/report">
              <Button size="lg" className="gap-2 bg-white text-blue-600 hover:bg-white/90 shadow-xl rounded-xl py-6 px-8 text-base font-semibold hover:scale-105 transition-all">
                <FileText className="w-5 h-5" /> Buat Laporan
              </Button>
            </Link>
            <Link to="/map">
              <Button size="lg" variant="outline" className="gap-2 border-2 border-white bg-white text-blue-600 hover:bg-white/90 rounded-xl py-6 px-8 text-base font-semibold hover:scale-105 transition-all">
                <MapIcon className="w-5 h-5" /> Lihat Peta
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
