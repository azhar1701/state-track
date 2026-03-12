import { supabase } from '@/services/client';
import { Database } from './types';
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

/**
 * Calculates priority score based on severity and category weights.
 * @param category - The infrastructure category
 * @param severity - The reported severity level
 * @returns Priority score from 1-9 (higher is more urgent)
 */
export function calculatePriorityScore(
  category: Database['public']['Enums']['report_category'],
  severity: Database['public']['Enums']['report_severity']
): number {
  const sWeight = SEVERITY_WEIGHTS[severity] || 1;
  const cWeight = CATEGORY_WEIGHTS[category] || 1;

  // Final score is a product of severity and category weights.
  // Results in a scale of 1-9, capped at 10 for safety.
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
