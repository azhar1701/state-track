import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HelpTooltipProps {
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export const HelpTooltip = ({ content, side = 'top' }: HelpTooltipProps) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <HelpCircle className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const helpTexts = {
  severity: 'Ringan: Tidak mengganggu aktivitas. Sedang: Mengganggu sebagian. Berat: Menghentikan aktivitas.',
  category: 'Pilih kategori yang paling sesuai dengan masalah infrastruktur yang dilaporkan.',
  location: 'Geser pin atau klik peta untuk menyesuaikan lokasi kejadian.',
  photo: 'Foto akan dikompres otomatis untuk menghemat data. Maksimal 10 foto.',
  incidentDate: 'Tanggal saat masalah pertama kali terjadi atau ditemukan.',
  clustering: 'Mengelompokkan marker yang berdekatan untuk mengurangi kekacauan peta.',
  heatmap: 'Menampilkan kepadatan laporan dalam bentuk peta panas.',
};
