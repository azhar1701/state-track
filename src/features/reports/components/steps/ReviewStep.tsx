import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, MapPin, Calendar, User, Phone } from "lucide-react";
import { ReportStepProps, LocationData } from "../../types";

interface ReviewStepProps extends ReportStepProps {
  location: LocationData | null;
  photoPreviews: string[];
  loading: boolean;
  uploadPercent: number | null;
  onSubmit: () => void;
}

export const ReviewStep = ({
  formData,
  location,
  photoPreviews,
  loading,
  uploadPercent,
  onSubmit,
  onBack,
}: ReviewStepProps) => {
  const severityVariant = formData.severity === 'berat' ? 'destructive' : formData.severity === 'sedang' ? 'warning' : 'secondary';

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          Tinjau Laporan Anda
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Judul</Label>
              <p className="text-sm font-medium">{formData.title}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Kategori & Severity</Label>
              <div className="flex gap-2">
                <Badge variant="outline">{formData.category}</Badge>
                <Badge variant={severityVariant as any}>{formData.severity}</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase">Deskripsi</Label>
            <p className="text-sm bg-background/50 p-2 rounded border">{formData.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{formData.incidentDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{location?.name || `${formData.desa}, ${formData.kecamatan}`}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>{formData.reporterName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{formData.phone}</span>
            </div>
          </div>
        </div>
      </div>

      {photoPreviews.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase">Lampiran Foto ({photoPreviews.length})</Label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photoPreviews.map((src, i) => (
              <img key={i} src={src} className="h-20 w-20 object-cover rounded-lg border flex-shrink-0" />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 pt-2">
        {uploadPercent !== null && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span>Mengirim Laporan...</span>
              <span>{uploadPercent}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300" 
                style={{ width: `${uploadPercent}%` }} 
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} disabled={loading} className="flex-1">
            Kembali
          </Button>
          <Button onClick={onSubmit} disabled={loading} className="flex-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirim Laporan"}
          </Button>
        </div>
      </div>
    </div>
  );
};
