import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, Map as MapIcon } from 'lucide-react';

export default function BottomCTA() {
  return (
    <section className="container py-12 md:py-16 lg:py-20 px-2 md:px-4">
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-blue-600/90 to-teal-600/90 backdrop-blur-xl border border-white/20 p-8 md:p-12 lg:p-16 text-center max-w-5xl mx-auto shadow-2xl">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-40 h-40 md:w-64 md:h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 md:w-64 md:h-64 bg-teal-500/20 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4 leading-tight">Siap berkontribusi?</h3>
          <p className="text-base md:text-lg lg:text-xl text-white/90 mt-3 md:mt-4 max-w-2xl mx-auto leading-relaxed">
            Laporkan masalah infrastruktur di sekitar Anda atau lihat peta untuk memantau progres perbaikan.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mt-6 md:mt-8">
            <Link to="/report">
              <Button size="lg" className="gap-2 w-full sm:w-auto bg-white text-blue-600 hover:bg-white/90 shadow-xl rounded-xl py-5 md:py-6 px-6 md:px-8 text-sm md:text-base font-semibold hover:scale-105 transition-all">
                <FileText className="w-5 h-5" /> Buat Laporan
              </Button>
            </Link>
            <Link to="/map">
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto border-2 border-white bg-white text-blue-600 hover:bg-white/90 rounded-xl py-5 md:py-6 px-6 md:px-8 text-sm md:text-base font-semibold hover:scale-105 transition-all">
                <MapIcon className="w-5 h-5" /> Lihat Peta
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
