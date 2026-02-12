import { useState, useEffect } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileText } from 'lucide-react';

export const ReportSettings = () => {
  const { value, loading, saving, saveSetting } = useAppSettings('reports', 'export');
  const [schedule, setSchedule] = useState('none');
  const [format, setFormat] = useState('csv');
  const [retention, setRetention] = useState(365);

  useEffect(() => {
    if (value) {
      setSchedule((value.schedule as string) || 'none');
      setFormat((value.format as string) || 'csv');
      setRetention((value.retention as number) || 365);
    }
  }, [value]);

  const handleSave = async () => {
    await saveSetting({ schedule, format, retention });
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-500" />
          Laporan & Ekspor
        </CardTitle>
        <CardDescription>Atur jadwal ekspor dan retensi data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Jadwal Auto-Export</label>
          <Select value={schedule} onValueChange={setSchedule}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tidak Aktif</SelectItem>
              <SelectItem value="daily">Harian (00:00)</SelectItem>
              <SelectItem value="weekly">Mingguan (Senin)</SelectItem>
              <SelectItem value="monthly">Bulanan (Tanggal 1)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Format Ekspor</label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="excel">Excel (XLSX)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Retensi Data (hari)</label>
          <Input
            type="number"
            value={retention}
            onChange={(e) => setRetention(Number(e.target.value))}
            min={30}
            max={3650}
            className="h-9"
          />
          <p className="text-xs text-muted-foreground">Data lebih lama dari ini akan diarsipkan</p>
        </div>

        <Separator />
        
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {schedule !== 'none' ? 'Ekspor akan dikirim via email' : 'Ekspor manual tersedia di tab Laporan'}
          </p>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
