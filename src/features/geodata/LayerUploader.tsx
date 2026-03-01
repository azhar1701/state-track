import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileUp, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';
import shp from 'shpjs';
import type { FeatureCollection, Geometry } from 'geojson';

interface LayerUploaderProps {
  onSave: (data: { key: string; name: string; geometry_type: string | null; data: { featureCollection: FeatureCollection<Geometry>; crs: string } }) => Promise<void>;
}

const CRS_OPTIONS = [
  { value: 'EPSG:4326', label: 'WGS84 (EPSG:4326)' },
  { value: 'EPSG:3857', label: 'Web Mercator (EPSG:3857)' },
  { value: 'EPSG:32749', label: 'UTM 49S (EPSG:32749)' },
];

export default function LayerUploader({ onSave }: LayerUploaderProps) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [crs, setCrs] = useState('EPSG:4326');
  const [file, setFile] = useState<File | null>(null);
  const [fc, setFc] = useState<FeatureCollection<Geometry> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = async (file: File) => {
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      let raw: unknown = null;

      if (ext === 'geojson' || ext === 'json') {
        raw = JSON.parse(await file.text());
      } else if (ext === 'zip') {
        raw = await shp(await file.arrayBuffer());
      } else {
        throw new Error('Format tidak didukung');
      }

      const collection = (raw as { type?: string })?.type === 'FeatureCollection'
        ? raw as FeatureCollection<Geometry>
        : null;

      if (!collection || !collection.features?.length) {
        throw new Error('File tidak valid atau kosong');
      }

      setFc(collection);
      setFile(file);

      // Auto-fill name from filename
      if (!name) {
        setName(file.name.replace(/\.(geojson|json|zip)$/i, ''));
      }
      if (!key) {
        setKey(file.name.replace(/\.(geojson|json|zip)$/i, '').toLowerCase().replace(/[^a-z0-9]/g, '_'));
      }

      toast.success('File berhasil diparse');
    } catch (e) {
      toast.error('Gagal membaca file', { description: e instanceof Error ? e.message : 'Unknown error' });
      setFile(null);
      setFc(null);
    }
  };

  const handleUpload = async () => {
    if (!fc || !key || !name) {
      toast.error('Lengkapi semua field');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      setProgress(30);
      await new Promise(resolve => setTimeout(resolve, 300));

      setProgress(70);
      await onSave({
        key,
        name,
        geometry_type: fc.features[0]?.geometry?.type || null,
        data: { featureCollection: fc, crs }
      });

      setProgress(100);
      toast.success('Layer berhasil disimpan');

      // Reset
      setKey('');
      setName('');
      setFile(null);
      setFc(null);
      setProgress(0);
    } catch (e) {
      toast.error('Gagal menyimpan layer');
    } finally {
      setUploading(false);
    }
  };

  const stats = fc ? {
    features: fc.features.length,
    type: fc.features[0]?.geometry?.type || 'Unknown'
  } : null;

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card className={`border-2 transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-dashed'}`}>
        <CardContent className="p-8">
          <div
            className="flex flex-col items-center justify-center space-y-4"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) void parseFile(f);
            }}
          >
            <div className="rounded-full bg-primary/10 p-6">
              <FileUp className="h-12 w-12 text-primary" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">
                {file ? 'File Terpilih' : 'Upload Layer Geospasial'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {file ? file.name : 'Drag & drop atau klik tombol di bawah'}
              </p>
            </div>

            {!file && (
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="secondary">GeoJSON</Badge>
                <Badge variant="secondary">Shapefile (.zip)</Badge>
                <Badge variant="secondary">CSV</Badge>
              </div>
            )}

            <Button
              variant={file ? 'outline' : 'default'}
              size="lg"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {file ? 'Ganti File' : 'Pilih File'}
            </Button>

            <input
              ref={inputRef}
              type="file"
              accept=".geojson,.json,.zip,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void parseFile(f);
                e.currentTarget.value = '';
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>{stats.features}</strong> fitur • Tipe: <strong>{stats.type}</strong>
            </span>
            <Badge variant="outline">{crs}</Badge>
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      {fc && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="key">Layer Key *</Label>
                <Input
                  id="key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="unique_layer_key"
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground">Identifier unik untuk layer</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nama Layer *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama yang mudah dibaca"
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="crs">Coordinate Reference System</Label>
              <Select value={crs} onValueChange={setCrs} disabled={uploading}>
                <SelectTrigger id="crs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Uploading...</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setFc(null);
                  setKey('');
                  setName('');
                }}
                disabled={uploading}
              >
                Batal
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!key || !name || uploading}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Simpan Layer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
