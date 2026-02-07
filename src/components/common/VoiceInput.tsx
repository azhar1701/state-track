import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language?: string;
}

export const VoiceInput = ({ onTranscript, language = 'id-ID' }: VoiceInputProps) => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }, []);

  const startListening = () => {
    if (!supported) {
      toast.error('Browser tidak mendukung voice input');
      return;
    }

    const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
      toast.message('Mendengarkan...', {
        description: 'Mulai berbicara',
      });
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      toast.success('Teks berhasil dikenali', {
        description: transcript,
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      toast.error('Gagal mengenali suara', {
        description: 'Coba lagi atau ketik manual',
      });
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant={listening ? 'default' : 'outline'}
      size="icon"
      onClick={startListening}
      disabled={listening}
      className="btn-haptic"
    >
      {listening ? (
        <MicOff className="w-4 h-4 animate-pulse" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </Button>
  );
};
