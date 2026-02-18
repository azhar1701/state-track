import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Loader2, Tags, X, Edit2, Plus, CheckCircle, Palette, BarChart3, Settings2 } from 'lucide-react';
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
  icon?: string;
  color?: string;
  description?: string;
  is_active: boolean;
  count?: number;
  created_at?: string;
};

const iconOptions = [
  { value: '🛣️', label: 'Jalan' },
  { value: '🌉', label: 'Jembatan' },
  { value: '💧', label: 'Irigasi' },
  { value: '🚰', label: 'Drainase' },
  { value: '🌊', label: 'Sungai' },
  { value: '📋', label: 'Lainnya' },
  { value: '⚠️', label: 'Peringatan' },
  { value: '🔧', label: 'Perbaikan' },
];

const colorOptions = [
  { value: '#3b82f6', label: 'Biru' },
  { value: '#ef4444', label: 'Merah' },
  { value: '#22c55e', label: 'Hijau' },
  { value: '#eab308', label: 'Kuning' },
  { value: '#a855f7', label: 'Ungu' },
  { value: '#f97316', label: 'Oranye' },
  { value: '#64748b', label: 'Abu-abu' },
  { value: '#06b6d4', label: 'Cyan' },
];

export const CategorySettings = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState({ label: '', icon: '📋', color: '#3b82f6', description: '' });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const { data: cats, error: catsError } = await supabase
        .from('custom_categories')
        .select('*')
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
      toast.error('Gagal memuat kategori');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAdd = async () => {
    if (!newCategory.label.trim()) {
      toast.error('Nama kategori tidak boleh kosong');
      return;
    }

    const value = newCategory.label.toLowerCase().replace(/\s+/g, '_');
    if (categories.some(cat => cat.value === value)) {
      toast.error('Kategori sudah ada');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('custom_categories')
        .insert({
          value,
          label: newCategory.label.trim(),
          icon: newCategory.icon,
          color: newCategory.color,
          description: newCategory.description.trim() || null,
        });
      
      if (error) throw error;
      
      setNewCategory({ label: '', icon: '📋', color: '#3b82f6', description: '' });
      toast.success('Kategori berhasil ditambahkan', { icon: <CheckCircle className="h-4 w-4" /> });
      await loadCategories();
    } catch (error) {
      console.error('Failed to add category:', error);
      toast.error('Gagal menambahkan kategori');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editingCategory.label.trim()) {
      toast.error('Nama kategori tidak boleh kosong');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('custom_categories')
        .update({
          label: editingCategory.label.trim(),
          icon: editingCategory.icon,
          color: editingCategory.color,
          description: editingCategory.description?.trim() || null,
        })
        .eq('id', editingCategory.id);
      
      if (error) throw error;
      
      setEditingCategory(null);
      toast.success('Kategori berhasil diupdate', { icon: <CheckCircle className="h-4 w-4" /> });
      await loadCategories();
    } catch (error) {
      console.error('Failed to update category:', error);
      toast.error('Gagal mengupdate kategori');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('custom_categories')
        .update({ is_active: isActive })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success(isActive ? 'Kategori diaktifkan' : 'Kategori dinonaktifkan');
      await loadCategories();
    } catch (error) {
      console.error('Failed to toggle category:', error);
      toast.error('Gagal mengubah status kategori');
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
        .delete()
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
      <Card className="border-0 shadow-md">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const activeCategories = categories.filter(c => c.is_active);
  const inactiveCategories = categories.filter(c => !c.is_active);
  const totalReports = categories.reduce((sum, cat) => sum + (cat.count || 0), 0);

  return (
    <>
      <Card className="border-0 shadow-md">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Tags className="h-5 w-5 text-orange-500" />
                Kategori Laporan
              </CardTitle>
              <CardDescription className="mt-1.5">
                Kelola kategori, icon, warna, dan statistik laporan
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1.5">
              <Settings2 className="h-3 w-3" />
              {activeCategories.length} Aktif
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="manage" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="manage" className="gap-1.5 text-xs sm:text-sm">
                <Tags className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Kelola</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-1.5 text-xs sm:text-sm">
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Statistik</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manage" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold">Tambah Kategori Baru</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    value={newCategory.label}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Nama kategori..."
                    className="h-9"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                  <div className="flex gap-2">
                    <select
                      value={newCategory.icon}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                      className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {iconOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.value} {opt.label}</option>
                      ))}
                    </select>
                    <Input
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                      className="h-9 w-16 p-1"
                    />
                    <Button onClick={handleAdd} disabled={saving} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Tambah
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold">Kategori Aktif ({activeCategories.length})</h4>
                </div>

                <div className="space-y-2">
                  {activeCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl">{cat.icon || '📋'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{cat.label}</span>
                            <div
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: cat.color || '#3b82f6' }}
                            />
                          </div>
                          {cat.description && (
                            <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                          )}
                        </div>
                        {cat.count !== undefined && cat.count > 0 && (
                          <Badge variant="secondary" className="shrink-0">{cat.count}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Switch
                          checked={cat.is_active}
                          onCheckedChange={(checked) => handleToggleActive(cat.id, checked)}
                          disabled={saving}
                        />
                        <Button
                          onClick={() => setEditingCategory(cat)}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => setDeleteCategory(cat.id)}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive"
                          disabled={cat.count && cat.count > 0}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {inactiveCategories.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <X className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold">Kategori Nonaktif ({inactiveCategories.length})</h4>
                    </div>
                    <div className="space-y-2">
                      {inactiveCategories.map((cat) => (
                        <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10 opacity-60">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{cat.icon || '📋'}</span>
                            <span className="font-medium">{cat.label}</span>
                          </div>
                          <Switch
                            checked={cat.is_active}
                            onCheckedChange={(checked) => handleToggleActive(cat.id, checked)}
                            disabled={saving}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="stats" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold">Statistik Kategori</h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{categories.length}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Total Kategori</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">{activeCategories.length}</div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">Aktif</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{totalReports}</div>
                    <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">Total Laporan</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {totalReports > 0 ? Math.round(totalReports / activeCategories.length) : 0}
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Rata-rata</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {activeCategories
                    .sort((a, b) => (b.count || 0) - (a.count || 0))
                    .map((cat) => {
                      const percentage = totalReports > 0 ? ((cat.count || 0) / totalReports) * 100 : 0;
                      return (
                        <div key={cat.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span>{cat.icon || '📋'}</span>
                              <span className="font-medium">{cat.label}</span>
                            </div>
                            <span className="text-muted-foreground">{cat.count || 0} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: cat.color || '#3b82f6',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Sheet open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Edit Kategori
            </SheetTitle>
            <SheetDescription>
              Kustomisasi icon, warna, dan deskripsi kategori
            </SheetDescription>
          </SheetHeader>

          {editingCategory && (
            <div className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Nama</label>
                <Input
                  value={editingCategory.label}
                  onChange={(e) => setEditingCategory(prev => prev ? ({ ...prev, label: e.target.value }) : null)}
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Icon</label>
                  <select
                    value={editingCategory.icon || '📋'}
                    onChange={(e) => setEditingCategory(prev => prev ? ({ ...prev, icon: e.target.value }) : null)}
                    className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm"
                  >
                    {iconOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.value} {opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Warna</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={editingCategory.color || '#3b82f6'}
                      onChange={(e) => setEditingCategory(prev => prev ? ({ ...prev, color: e.target.value }) : null)}
                      className="h-9 w-16 p-1"
                    />
                    <Input
                      value={editingCategory.color || '#3b82f6'}
                      onChange={(e) => setEditingCategory(prev => prev ? ({ ...prev, color: e.target.value }) : null)}
                      className="h-9 flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Deskripsi (opsional)</label>
                <Input
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  placeholder="Deskripsi singkat kategori..."
                  className="h-9"
                />
              </div>

              <Separator />

              <div className="bg-muted/30 rounded-lg p-4 border">
                <div className="text-xs font-semibold mb-3">Preview</div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{editingCategory.icon || '📋'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{editingCategory.label}</span>
                      <div
                        className="w-5 h-5 rounded-full border-2"
                        style={{ backgroundColor: editingCategory.color || '#3b82f6' }}
                      />
                    </div>
                    {editingCategory.description && (
                      <p className="text-xs text-muted-foreground mt-1">{editingCategory.description}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={() => setEditingCategory(null)} variant="outline" className="flex-1">
                  Batal
                </Button>
                <Button onClick={handleSaveEdit} disabled={saving} className="flex-1">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

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
