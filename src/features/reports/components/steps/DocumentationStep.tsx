import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Upload, Trash2 } from "lucide-react";
import { ReportStepProps } from "../../types";

interface DocumentationStepProps extends ReportStepProps {
  photoFiles: File[];
  photoPreviews: string[];
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  onShowCamera: () => void;
}

export const DocumentationStep = ({
  photoFiles,
  photoPreviews,
  onPhotoChange,
  onRemovePhoto,
  onShowCamera,
  onNext,
  onBack,
}: DocumentationStepProps) => {
  return (
    <div className="space-y-6 fade-in">
      <div className="space-y-4">
        <Label className="text-sm font-semibold">Dokumentasi Foto (Opsional)</Label>
        
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onShowCamera}
            className="flex-1 h-20 flex-col gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5"
          >
            <Camera className="w-6 h-6" />
            <span className="text-xs">Ambil Foto</span>
          </Button>
          
          <div className="flex-1 relative">
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={onPhotoChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("photo-upload")?.click()}
              className="w-full h-20 flex-col gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5"
            >
              <Upload className="w-6 h-6" />
              <span className="text-xs">Upload Galeri</span>
            </Button>
          </div>
        </div>

        {photoPreviews.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photoPreviews.map((src, idx) => (
              <div key={idx} className="relative group rounded-lg overflow-hidden border aspect-square bg-muted">
                <img
                  src={src}
                  alt={`Preview ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <button
                  type="button"
                  onClick={() => onRemovePhoto(idx)}
                  className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Maksimal 10 foto. Gunakan foto yang jelas untuk mempermudah analisis AI.
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">Kembali</Button>
        <Button onClick={onNext} className="flex-1">Lanjut</Button>
      </div>
    </div>
  );
};
