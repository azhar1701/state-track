import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2, Image } from 'lucide-react';

interface PhotoUploadProgressProps {
  files: Array<{
    name: string;
    status: 'compressing' | 'uploading' | 'done';
    progress: number;
  }>;
}

export const PhotoUploadProgress = ({ files }: PhotoUploadProgressProps) => {
  return (
    <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Image className="w-4 h-4" />
        Memproses {files.length} foto
      </div>
      
      {files.map((file, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="truncate flex-1 mr-2">{file.name}</span>
            <div className="flex items-center gap-1.5">
              {file.status === 'compressing' && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                  <span className="text-blue-600">Kompres...</span>
                </>
              )}
              {file.status === 'uploading' && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                  <span className="text-amber-600">{file.progress}%</span>
                </>
              )}
              {file.status === 'done' && (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-600">Selesai</span>
                </>
              )}
            </div>
          </div>
          <Progress value={file.progress} className="h-1.5" />
        </div>
      ))}
    </div>
  );
};
