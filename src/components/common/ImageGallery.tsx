import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageGalleryProps {
  images: string[];
  onClose: () => void;
  initialIndex?: number;
}

export const ImageGallery = ({ images, onClose, initialIndex = 0 }: ImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);

  const next = () => setCurrentIndex((i) => (i + 1) % images.length);
  const prev = () => setCurrentIndex((i) => (i - 1 + images.length) % images.length);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center animate-in fade-in">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full glass-panel btn-haptic"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      <button
        onClick={() => setZoomed(!zoomed)}
        className="absolute top-4 left-4 z-10 p-2 rounded-full glass-panel btn-haptic"
      >
        <ZoomIn className="w-6 h-6 text-white" />
      </button>

      {images.length > 1 && (
        <>
          <Button
            onClick={prev}
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full shadow-lifted btn-haptic"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            onClick={next}
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full shadow-lifted btn-haptic"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}

      <div className="relative w-full h-full flex items-center justify-center p-4">
        <img
          src={images[currentIndex]}
          alt={`Photo ${currentIndex + 1}`}
          className={`max-w-full max-h-full object-contain transition-transform duration-300 ${
            zoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
          }`}
          onClick={() => setZoomed(!zoomed)}
        />
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass-panel px-4 py-2 rounded-full">
          <div className="flex items-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex ? 'bg-white w-6' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 glass-panel px-3 py-1.5 rounded-lg">
        <span className="text-white text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </span>
      </div>
    </div>
  );
};
