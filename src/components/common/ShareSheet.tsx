import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Share2, Copy, Facebook, Twitter, MessageCircle, Mail, X } from 'lucide-react';
import { toast } from 'sonner';

interface ShareSheetProps {
  title: string;
  text: string;
  url: string;
  onClose: () => void;
}

export const ShareSheet = ({ title, text, url, onClose }: ShareSheetProps) => {
  const [copied, setCopied] = useState(false);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        onClose();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link disalin ke clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Gagal menyalin link');
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'text-green-600',
      url: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'text-blue-600',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'text-sky-500',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'text-gray-600',
      url: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\n' + url)}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/50 animate-in fade-in">
      <Card className="w-full max-w-md glass-panel shadow-lifted animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 rounded-t-3xl md:rounded-2xl">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Bagikan Laporan</h3>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          {navigator.share && (
            <Button
              onClick={handleNativeShare}
              className="w-full btn-haptic"
              variant="outline"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Bagikan via...
            </Button>
          )}

          <div className="grid grid-cols-4 gap-4">
            {shareOptions.map((option) => (
              <a
                key={option.name}
                href={option.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors btn-haptic"
              >
                <div className={`p-3 rounded-full bg-muted ${option.color}`}>
                  <option.icon className="w-5 h-5" />
                </div>
                <span className="text-xs text-center">{option.name}</span>
              </a>
            ))}
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="w-full btn-haptic"
            >
              <Copy className="w-4 h-4 mr-2" />
              {copied ? 'Tersalin!' : 'Salin Link'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
