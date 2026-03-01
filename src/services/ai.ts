import { supabase } from '@/services/client';
import { logger } from '@/lib/logger';

export type AISuggestion = {
  category: 'jalan' | 'jembatan' | 'irigasi' | 'sungai' | 'lainnya';
  severity: 'ringan' | 'sedang' | 'berat';
  confidence: number;
  reasoning: string;
};

const SEVERITY_WEIGHTS = {
  ringan: 1,
  sedang: 2,
  berat: 3,
};

const CATEGORY_WEIGHTS = {
  jalan: 3,
  jembatan: 3,
  irigasi: 2,
  sungai: 2,
  lainnya: 1,
};

export function calculatePriorityScore(category: string, severity: string): number {
  const sWeight = SEVERITY_WEIGHTS[severity as keyof typeof SEVERITY_WEIGHTS] || 1;
  const cWeight = CATEGORY_WEIGHTS[category as keyof typeof CATEGORY_WEIGHTS] || 1;
  
  // Max score is 3 * 3 = 9, but we want 1-10. 
  // Let's use (sWeight * cWeight) and cap/scale if needed.
  // Actually, the prompt says 1-10. 
  // (3 * 3) = 9. We can just use that or add 1.
  return Math.min(10, sWeight * cWeight);
}

export async function analyzeReportPhoto(file: File): Promise<AISuggestion | null> {
  try {
    // Convert file to base64 for the edge function
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const base64Data = await base64Promise;

    const { data, error } = await supabase.functions.invoke('analyze-vision', {
      body: { image: base64Data },
    });

    if (error) throw error;
    return data as AISuggestion;
  } catch (err) {
    logger.error('AI Vision analysis failed:', err);
    return null;
  }
}
