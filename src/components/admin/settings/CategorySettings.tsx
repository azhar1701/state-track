import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Tags, X, Edit2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Category = {
  id: string;
  value: string;
  label: string;
  count?: number;
};

export const CategorySettings = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteCategory, setDeleteCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const { data: cats, error: catsError } = await supabase
        .from('custom_categories')
        .select('id, value, label')
        .eq('is_active', true)
        .order('label');
      
      if (catsError) throw catsError;

      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('category');
      
      if (reportsError) throw reportsError;

      const categoryCounts = (reports || []).reduce((acc, { category }) => {
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const updatedCategories = (cats || []).map(cat => ({
        ...cat,
        count: categoryCounts[cat.value] || 0
      }));

      setCategories(updatedCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newCategory.trim()) {
      toast.error('Nama kategori tidak boleh kosong');
      return;
    }

    const value = newCategory.toLowerCase().replace(/\s+/g, '_');
    if (categories.some(cat => cat.value === value)) {
      toast.error('Kategori sudah ada');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('custom_categories')
        .insert({ value, label: newCategory.trim() });
      
      if (error) throw error;
      
      setNewCategory('');
      toast.success('Kategori berhasil ditambahkan');
      await loadCategories();
    } catch (error) {
      console.error('Failed to add category:', error);
      toast.error('Gagal menambahkan kategori');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (cat) {
      setEditingCategory(id);
      setEditValue(cat.label);
    }
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim()) {
      toast.error('Nama kategori tidak boleh kosong');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('custom_categories')
        .update({ label: editValue.trim() })
        .eq('id', editingCategory);
      
      if (error) throw error;
      
      setEditingCategory(null);
      setEditValue('');
      toast.success('Kategori berhasil diupdate');
      await loadCategories();
    } catch (error) {
      console.error('Failed to update category:', error);
      toast.error('Gagal mengupdate kategori');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCategory) return;

    const cat = categories.find(c => c.id === deleteCategory);
    if (cat && cat.count && cat.count > 0) {
      toast.error(`Tidak dapat menghapus kategori yang memiliki ${cat.count} laporan`);
      setDeleteCategory(null);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('custom_categories')
        .update({ is_active: false })
        .eq('id', deleteCategory);
      
      if (error) throw error;
      
      setDeleteCategory(null);
      toast.success('Kategori berhasil dihapus');
      await loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Gagal menghapus kategori');
    } finally {
      setSaving(false);
    }
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
    <>
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-orange-500" />
            Kategori & Status
          </CardTitle>
          <CardDescription>Kelola kategori laporan dan workflow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Nama kategori baru..."
              className="h-9"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={saving} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Tambah
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Kategori Tersedia</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <div key={cat.id} className="relative group">
                  {editingCategory === cat.id ? (
                    <div className="flex gap-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 w-32 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') setEditingCategory(null);
                        }}
                      />
                      <Button onClick={handleSaveEdit} size="sm" className="h-8 px-2">
                        ✓
                      </Button>
                      <Button
                        onClick={() => setEditingCategory(null)}
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80 pr-1 gap-1"
                    >
                      <span>{cat.label}</span>
                      {cat.count !== undefined && cat.count > 0 && (
                        <span className="text-xs opacity-60">({cat.count})</span>
                      )}
                      <div className="flex gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(cat.id)}
                          className="hover:bg-primary/20 rounded p-0.5"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setDeleteCategory(cat.id)}
                          className="hover:bg-destructive/20 rounded p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Hover pada badge untuk edit atau hapus kategori
            </p>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kategori "{categories.find(c => c.id === deleteCategory)?.label}"?
              {categories.find(c => c.id === deleteCategory)?.count ? (
                <span className="block mt-2 text-destructive font-medium">
                  Kategori ini memiliki {categories.find(c => c.id === deleteCategory)?.count} laporan dan tidak dapat dihapus.
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving || (categories.find(c => c.id === deleteCategory)?.count || 0) > 0}
              className="bg-destructive hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
