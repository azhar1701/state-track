import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, X, RotateCw, Check } from 'lucide-react';
import { toast } from 'sonner';

interface LiveCameraProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const LiveCamera = ({ onCapture, onClose }: LiveCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [captured, setCaptured] = useState<string | null>(null);

  useEffect(() => {
    let mediaStream: MediaStream | null = null;

    const start = async () => {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        toast.error('Gagal mengakses kamera', {
          description: 'Pastikan izin kamera telah diberikan',
        });
        onClose();
      }
    };
    
    start();
    
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, onClose]);



  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCaptured(dataUrl);
  };

  const confirmCapture = () => {
    if (!captured) return;

    fetch(captured)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        onClose();
      });
  };

  const retake = () => {
    setCaptured(null);
  };

  const switchCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    setCaptured(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      <div className="flex-1 relative">
        {!captured ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img src={captured} alt="Captured" className="w-full h-full object-contain" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="glass-panel p-4 flex items-center justify-center gap-4">
        <Button
          onClick={onClose}
          variant="outline"
          size="icon"
          className="h-14 w-14 rounded-full btn-haptic"
        >
          <X className="w-6 h-6" />
        </Button>

        {!captured ? (
          <>
            <Button
              onClick={capturePhoto}
              size="icon"
              className="h-16 w-16 rounded-full btn-haptic"
            >
              <Camera className="w-8 h-8" />
            </Button>
            <Button
              onClick={switchCamera}
              variant="outline"
              size="icon"
              className="h-14 w-14 rounded-full btn-haptic"
            >
              <RotateCw className="w-6 h-6" />
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={retake}
              variant="outline"
              size="icon"
              className="h-14 w-14 rounded-full btn-haptic"
            >
              <RotateCw className="w-6 h-6" />
            </Button>
            <Button
              onClick={confirmCapture}
              size="icon"
              className="h-16 w-16 rounded-full btn-haptic bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="w-8 h-8" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
