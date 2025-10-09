import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, Map as MapIcon } from 'lucide-react';

export default function BottomCTA() {
  return (
    <section className="container py-10">
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-accent/5 p-6 md:p-8 text-center max-w-6xl mx-auto">
        <h3 className="text-2xl font-bold">Siap berkontribusi?</h3>
        <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-2xl mx-auto">
          Laporkan masalah infrastruktur di sekitar Anda atau lihat peta untuk memantau progres perbaikan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-5">
          <Link to="/report">
            <Button className="gap-2 shadow">
              <FileText className="w-4 h-4" /> Buat Laporan
            </Button>
          </Link>
          <Link to="/map">
            <Button variant="outline" className="gap-2">
              <MapIcon className="w-4 h-4" /> Lihat Peta
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
