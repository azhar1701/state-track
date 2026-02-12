# Admin Settings Components

Komponen reusable untuk membangun halaman pengaturan yang konsisten dan mudah di-maintain.

## Components

### SettingsSection
Wrapper untuk setiap section pengaturan dengan header, icon, dan badge.

```tsx
import { SettingsSection } from '@/components/admin/settings/SettingsSection';
import { Settings } from 'lucide-react';

<SettingsSection
  icon={<Settings className="h-5 w-5 text-primary" />}
  title="Preferensi Peta"
  description="Atur tampilan default peta dan layer geografis"
  badge="Beta"
>
  {/* Your settings content */}
</SettingsSection>
```

### SettingsRow
Layout konsisten untuk setting individual dengan label dan control.

```tsx
import { SettingsRow } from '@/components/admin/settings/SettingsRow';
import { Switch } from '@/components/ui/switch';

<SettingsRow
  label="Aktifkan Notifikasi"
  description="Terima pemberitahuan untuk laporan baru"
  control={<Switch checked={enabled} onCheckedChange={setEnabled} />}
/>
```

### DangerZone
Section khusus untuk aksi berbahaya dengan warning visual.

```tsx
import { DangerZone } from '@/components/admin/settings/DangerZone';
import { Button } from '@/components/ui/button';

<DangerZone>
  <Button variant="destructive" onClick={handleDelete}>
    Hapus Semua Data
  </Button>
  <Button variant="destructive" onClick={handleReset}>
    Reset ke Default
  </Button>
</DangerZone>
```

## Usage Example

```tsx
import { SettingsSection } from '@/components/admin/settings/SettingsSection';
import { SettingsRow } from '@/components/admin/settings/SettingsRow';
import { DangerZone } from '@/components/admin/settings/DangerZone';
import { Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export const MySettings = () => {
  return (
    <SettingsSection
      icon={<Settings className="h-5 w-5" />}
      title="General Settings"
      description="Configure general application settings"
    >
      <SettingsRow
        label="Enable Feature"
        description="Turn on the new feature"
        control={<Switch />}
      />
      
      <DangerZone>
        <Button variant="destructive">Delete Account</Button>
      </DangerZone>
    </SettingsSection>
  );
};
```

## Styling

All components use Tailwind CSS and shadcn/ui design tokens for consistency:
- `shadow-sm hover:shadow-md` for cards
- `text-muted-foreground` for descriptions
- `border-destructive` for danger zones
- Responsive spacing with `space-y-*` utilities

## Best Practices

1. **Group related settings** in one SettingsSection
2. **Use descriptive labels** and helpful descriptions
3. **Place dangerous actions** in DangerZone
4. **Provide visual feedback** with loading states
5. **Validate before save** and show toast notifications
