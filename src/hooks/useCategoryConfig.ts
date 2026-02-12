import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Category = {
  id: string;
  value: string;
  label: string;
  icon?: string;
  color?: string;
  description?: string;
  is_active: boolean;
};

export const useCategoryConfig = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('custom_categories')
          .select('*')
          .eq('is_active', true)
          .order('label');

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.warn('[useCategoryConfig] Failed to load:', error);
        // Fallback to default categories
        setCategories([
          { id: '1', value: 'jalan', label: 'Jalan', icon: '🛣️', color: '#3b82f6', is_active: true },
          { id: '2', value: 'jembatan', label: 'Jembatan', icon: '🌉', color: '#22c55e', is_active: true },
          { id: '3', value: 'irigasi', label: 'Irigasi', icon: '💧', color: '#06b6d4', is_active: true },
          { id: '4', value: 'drainase', label: 'Drainase', icon: '🚰', color: '#eab308', is_active: true },
          { id: '5', value: 'sungai', label: 'Sungai', icon: '🌊', color: '#3b82f6', is_active: true },
          { id: '6', value: 'lainnya', label: 'Lainnya', icon: '📋', color: '#64748b', is_active: true },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();

    // Subscribe to changes
    const subscription = supabase
      .channel('category_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_categories' }, () => {
        loadCategories();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    categories,
    loading,
    activeCategories: categories.filter(c => c.is_active),
    getCategoryByValue: (value: string) => categories.find(c => c.value === value),
    getCategoryIcon: (value: string) => categories.find(c => c.value === value)?.icon || '📋',
    getCategoryColor: (value: string) => categories.find(c => c.value === value)?.color || '#64748b',
    getCategoryLabel: (value: string) => categories.find(c => c.value === value)?.label || value,
  };
};
