# Admin Settings - Quick Start Guide

## 🚀 Setup (5 menit)

### 1. Run Database Migration
```bash
# Copy migration file ke Supabase dashboard
# Atau jalankan via CLI:
supabase db push
```

### 2. Verify Installation
```sql
-- Check table exists
SELECT * FROM app_settings LIMIT 5;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'app_settings';
```

### 3. Test Access
1. Login sebagai admin
2. Navigate ke `/admin?tab=settings`
3. Klik tab "Tema"
4. Update warna dan klik "Simpan Tema"
5. Refresh page - settings harus persist

## 📖 Usage Examples

### Theme Settings
```tsx
// Component sudah siap pakai
import { ThemeSettings } from '@/components/admin/settings/ThemeSettings';

<TabsContent value="theme">
  <ThemeSettings />
</TabsContent>
```

### Email Settings
```tsx
import { EmailSettings } from '@/components/admin/settings/EmailSettings';

<TabsContent value="email">
  <EmailSettings />
</TabsContent>
```

### Custom Settings Component
```tsx
import { useAppSettings } from '@/hooks/useAppSettings';

export const MySettings = () => {
  const { value, loading, saving, saveSetting } = useAppSettings('my_category', 'my_key');
  const [myValue, setMyValue] = useState('');

  useEffect(() => {
    if (value) setMyValue(value.field as string);
  }, [value]);

  const handleSave = async () => {
    await saveSetting({ field: myValue });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <input value={myValue} onChange={(e) => setMyValue(e.target.value)} />
      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
};
```

## 🎯 Features Overview

| Component | Database | Features |
|-----------|----------|----------|
| ThemeSettings | ✅ | Color picker, Dark mode, Auto-save |
| EmailSettings | ✅ | SMTP config, Test connection, Toggle |
| ReportSettings | ✅ | Schedule, Format, Retention |
| SystemSettings | ⚡ | Real-time metrics, Cache clear |
| APISettings | ✅ | API keys, Webhook, Rate limit |

## 🔧 Troubleshooting

### Settings tidak tersimpan
```sql
-- Check RLS policies
SELECT * FROM user_roles WHERE user_id = auth.uid();

-- Verify admin role
INSERT INTO user_roles (user_id, role) 
VALUES (auth.uid(), 'admin');
```

### Loading terus-menerus
```tsx
// Check console untuk errors
// Verify Supabase connection
console.log(supabase.auth.getUser());
```

### Toast tidak muncul
```tsx
// Pastikan Toaster component ada di root
import { Toaster } from 'sonner';

<App>
  <Toaster />
  {children}
</App>
```

## 📊 Database Structure

```
app_settings
├── id (UUID)
├── category (TEXT) - e.g., 'theme', 'email'
├── key (TEXT) - e.g., 'colors', 'smtp'
├── value (JSONB) - Flexible JSON data
├── updated_by (UUID) - User who updated
├── updated_at (TIMESTAMPTZ)
└── created_at (TIMESTAMPTZ)
```

## 🎨 Customization

### Add New Setting Category
```tsx
// 1. Create component
export const MySettings = () => {
  const { value, saving, saveSetting } = useAppSettings('my_category', 'my_key');
  // ... your logic
};

// 2. Add to AdminSettings.tsx
<TabsTrigger value="my_tab">My Settings</TabsTrigger>
<TabsContent value="my_tab">
  <MySettings />
</TabsContent>
```

### Modify Existing Settings
```tsx
// Just edit the component file
// Changes auto-sync with database
```

## 🚀 Performance Tips

1. **Use memoization** untuk expensive computations
2. **Debounce** rapid updates
3. **Lazy load** heavy components
4. **Cache** frequently accessed settings
5. **Batch** multiple updates

## 📝 Checklist

- [x] Migration applied
- [x] RLS policies active
- [x] Admin role assigned
- [x] Components imported
- [x] Tabs configured
- [x] Toast notifications working
- [x] Settings persist after refresh

## 🎉 You're Ready!

Settings sekarang fully functional dengan:
- ✅ Database persistence
- ✅ Real-time updates
- ✅ Clean UI/UX
- ✅ Type safety
- ✅ Error handling
- ✅ Loading states
- ✅ Toast feedback

**Happy configuring! 🎊**
