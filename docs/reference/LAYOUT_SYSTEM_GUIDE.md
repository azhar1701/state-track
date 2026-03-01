# Layout System Usage Guide

## Overview
This guide demonstrates how to refactor existing pages using the new layout components for a consistent, modern dark mode aesthetic.

## Core Components

### 1. MainLayout
Wraps entire pages with consistent background, navbar, and footer.

```tsx
import { MainLayout } from '@/components/layout';

export default function MyPage() {
  return (
    <MainLayout>
      {/* Your page content */}
    </MainLayout>
  );
}
```

### 2. PageHeader
Provides consistent page titles with optional action buttons.

```tsx
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';

<PageHeader
  title="Dashboard Admin"
  subtitle="Kelola laporan dan pengaturan sistem"
  actionButton={
    <Button>Tambah Laporan</Button>
  }
/>
```

### 3. ContentCard
Glassmorphism container for any content type.

```tsx
import { ContentCard } from '@/components/layout';

<ContentCard title="Laporan Terbaru">
  {/* Tables, forms, charts, etc. */}
</ContentCard>

// With header action
<ContentCard 
  title="Data Laporan"
  headerAction={<Button size="sm">Export</Button>}
>
  <Table>...</Table>
</ContentCard>
```

### 4. StatusBadge
Consistent status indicators.

```tsx
import { StatusBadge } from '@/components/layout';

<StatusBadge status="Selesai" type="success" />
<StatusBadge status="Diproses" type="info" />
<StatusBadge status="Baru" type="warning" />
<StatusBadge status="Gagal" type="danger" />
```

## Complete Example: Refactoring AdminDashboard

### Before (Fragment):
```tsx
return (
  <div className="min-h-screen bg-gradient-to-br from-accent/5 via-background to-primary/5 py-6">
    <div className="container">
      <div className="mb-4">
        <h1 className="text-3xl font-bold mb-1">Dashboard Admin</h1>
        <p className="text-muted-foreground">Kelola laporan...</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Stats</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Stats content */}
        </CardContent>
      </Card>
    </div>
  </div>
);
```

### After (With Layout System):
```tsx
import { MainLayout, PageHeader, ContentCard, StatusBadge } from '@/components/layout';

return (
  <MainLayout>
    <PageHeader
      title="Dashboard Admin"
      subtitle="Kelola laporan dan pengaturan sistem secara terpusat"
      actionButton={
        <Button onClick={exportData}>Export Data</Button>
      }
    />
    
    {/* Stats Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
      <ContentCard>
        <div className="flex items-center gap-4">
          <FileText className="w-10 h-10 text-blue-500" />
          <div>
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-sm text-slate-400">Total Laporan</div>
          </div>
        </div>
      </ContentCard>
      {/* More stat cards... */}
    </div>
    
    {/* Data Table */}
    <ContentCard 
      title="Semua Laporan"
      headerAction={
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Export CSV</Button>
          <Button variant="outline" size="sm">Export PDF</Button>
        </div>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Judul</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tanggal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell>{report.title}</TableCell>
              <TableCell>
                <StatusBadge 
                  status={report.status} 
                  type={getStatusType(report.status)} 
                />
              </TableCell>
              <TableCell>{formatDate(report.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ContentCard>
  </MainLayout>
);
```

## Responsive Patterns

### Mobile-First Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <ContentCard>...</ContentCard>
  <ContentCard>...</ContentCard>
  <ContentCard>...</ContentCard>
</div>
```

### Stacked Layout for Forms
```tsx
<MainLayout>
  <PageHeader title="Buat Laporan" />
  
  <ContentCard className="max-w-2xl mx-auto">
    <form className="space-y-6">
      <div>
        <Label>Judul</Label>
        <Input />
      </div>
      <div>
        <Label>Deskripsi</Label>
        <Textarea />
      </div>
      <Button type="submit">Submit</Button>
    </form>
  </ContentCard>
</MainLayout>
```

### Map Container
```tsx
<ContentCard className="h-[600px] p-0">
  <MapContainer />
</ContentCard>
```

## Styling Guidelines

### Colors
- Background: `bg-slate-950` (deep dark)
- Cards: `bg-slate-900/50` (glassmorphism)
- Borders: `border-white/10` (subtle)
- Text: `text-white` (primary), `text-slate-400` (secondary)
- Accents: `text-blue-500`, `text-teal-500`, `text-amber-500`

### Spacing
- Section gaps: `gap-6` or `gap-8`
- Card padding: `p-6`
- Page margins: `mb-8` between major sections

### Shadows
- Cards: `shadow-xl shadow-black/20`
- Hover: `hover:shadow-2xl`

## Migration Checklist

- [ ] Wrap page in `<MainLayout>`
- [ ] Replace page title with `<PageHeader>`
- [ ] Replace `<Card>` with `<ContentCard>` for main containers
- [ ] Replace status badges with `<StatusBadge>`
- [ ] Update color scheme to dark mode palette
- [ ] Test responsive behavior on mobile
- [ ] Verify dynamic content (tables, charts) fits properly
