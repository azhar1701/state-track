# Security Settings - Dokumentasi

## Overview

Modul Security Settings menyediakan konfigurasi keamanan komprehensif untuk aplikasi State Track, mencakup autentikasi, kontrol akses, audit logging, dan enkripsi data.

## Arsitektur

### Komponen Utama

1. **SecuritySettings Component** (`src/components/admin/settings/SecuritySettings.tsx`)
   - UI dengan 4 tab: Autentikasi, Akses, Audit, Enkripsi
   - Form validation dan state management
   - Integrasi dengan useSecurityConfig hook

2. **useSecurityConfig Hook** (`src/hooks/useSecurityConfig.ts`)
   - Dual persistence: localStorage + Supabase
   - Helper functions: `isIPAllowed()`, `validatePassword()`
   - Real-time config loading dan saving

3. **Database Tables** (Migration: `20250117_security_settings.sql`)
   - `security_audit_logs`: Log event keamanan
   - `login_attempts`: Tracking percobaan login
   - `active_sessions`: Manajemen sesi aktif

## Fitur per Tab

### 1. Tab Autentikasi

**Kebijakan:**
- Multi-Factor Authentication (MFA) wajib untuk admin
- Password kuat (huruf besar, angka, simbol)
- Izinkan laporan anonim tanpa login

**Konfigurasi:**
- Durasi sesi: 5-1440 menit (default: 30)
- Panjang password minimal: 6-32 karakter (default: 8)
- Maksimal percobaan login: 3-10 kali (default: 5)
- Durasi lockout: 5-120 menit (default: 15)

**Validasi:**
```typescript
if (sessionTimeout < 5) → Error
if (maxLoginAttempts < 3) → Error
if (passwordMinLength < 6) → Error
```

### 2. Tab Akses

**Kontrol:**
- Rate limiting per IP (10-1000 request/menit)
- CORS protection dengan allowed origins
- Verifikasi email wajib sebelum akses penuh

**IP Whitelist:**
- Format: `192.168.1.1, 10.0.0.0/24`
- Kosongkan untuk izinkan semua IP
- Validasi CIDR notation sederhana

**Allowed Origins:**
- Format: `https://example.com, https://app.example.com`
- Hanya berlaku jika CORS enabled
- Kosongkan untuk izinkan semua origin

### 3. Tab Audit

**Event Logging:**
- ✅ Event autentikasi (login, logout, gagal login)
- ✅ Perubahan data (create, update, delete)
- ⚠️ Akses API (high volume, optional)

**Monitoring:**
- Alert aktivitas mencurigakan ke admin
- Retensi log: 30-365 hari (default: 90)
- Auto-cleanup via function `cleanup_old_audit_logs()`

**Event Types:**
- `login`, `logout`, `login_failed`
- `password_change`, `mfa_enabled`, `mfa_disabled`
- `permission_change`, `suspicious_activity`

### 4. Tab Enkripsi

**Data Protection:**
- Enkripsi data sensitif (nama, telepon, alamat)
- Enkripsi foto laporan (optional, impact performa)
- Enkripsi file backup (recommended)

**Key Management:**
- Rotasi encryption key: 30-365 hari (default: 90)
- Algoritma: AES-256-GCM
- Backup key secara terpisah di lokasi aman

## Database Schema

### security_audit_logs

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users
event_type TEXT -- 'login', 'logout', 'login_failed', etc.
ip_address TEXT
user_agent TEXT
details JSONB
severity TEXT -- 'info', 'warning', 'critical'
created_at TIMESTAMPTZ
```

**Indexes:**
- `user_id`, `event_type`, `created_at DESC`, `severity`

**RLS Policies:**
- Admin dapat view semua logs
- System dapat insert logs

### login_attempts

```sql
id UUID PRIMARY KEY
email TEXT NOT NULL
ip_address TEXT NOT NULL
success BOOLEAN DEFAULT false
attempted_at TIMESTAMPTZ
locked_until TIMESTAMPTZ
```

**Indexes:**
- `email`, `ip_address`, `attempted_at DESC`

**RLS Policies:**
- Admin dapat view semua attempts
- System dapat insert attempts (anon + authenticated)

### active_sessions

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users
session_token TEXT UNIQUE
ip_address TEXT
user_agent TEXT
expires_at TIMESTAMPTZ
created_at TIMESTAMPTZ
last_activity TIMESTAMPTZ
```

**Indexes:**
- `user_id`, `expires_at`, `session_token`

**RLS Policies:**
- User dapat view session sendiri
- Admin dapat view semua sessions
- System dapat manage sessions

## Helper Functions

### cleanup_old_audit_logs(retention_days)

Menghapus audit logs yang lebih lama dari retention period.

```sql
SELECT cleanup_old_audit_logs(90); -- Hapus log > 90 hari
```

### cleanup_expired_sessions()

Menghapus sesi yang sudah expired.

```sql
SELECT cleanup_expired_sessions();
```

### is_account_locked(email, max_attempts, lockout_minutes)

Cek apakah akun terkunci karena gagal login berulang.

```sql
SELECT is_account_locked('user@example.com', 5, 15);
```

### log_security_event(user_id, event_type, ip, user_agent, details, severity)

Log event keamanan ke audit table.

```sql
SELECT log_security_event(
  auth.uid(),
  'login',
  '192.168.1.1',
  'Mozilla/5.0...',
  '{"method": "password"}'::jsonb,
  'info'
);
```

## Integrasi dengan Aplikasi

### 1. Validasi Password

```typescript
import { useSecurityConfig } from '@/hooks/useSecurityConfig';

const { validatePassword } = useSecurityConfig();

const result = validatePassword('MyP@ssw0rd');
if (!result.valid) {
  toast.error(result.message);
}
```

### 2. IP Whitelist Check

```typescript
const { isIPAllowed } = useSecurityConfig();

if (!isIPAllowed(userIP)) {
  return <AccessDenied />;
}
```

### 3. Session Timeout

```typescript
const { config } = useSecurityConfig();

// Set session timeout di Supabase client
supabase.auth.setSession({
  expires_in: config.authentication.sessionTimeout * 60
});
```

### 4. Audit Logging

```typescript
// Log security event
await supabase.rpc('log_security_event', {
  p_user_id: user.id,
  p_event_type: 'login',
  p_ip_address: clientIP,
  p_user_agent: navigator.userAgent,
  p_details: { method: 'password' },
  p_severity: 'info'
});
```

## Best Practices

### Keamanan

1. ✅ Aktifkan MFA untuk semua admin
2. ✅ Set session timeout ≤ 30 menit untuk admin
3. ✅ Gunakan password kuat wajib
4. ✅ Aktifkan audit log untuk semua event penting
5. ✅ Enkripsi data sensitif dan backup
6. ✅ Review audit logs secara berkala
7. ✅ Rotasi encryption key setiap 90 hari

### Performa

1. ⚠️ Jangan aktifkan log API access kecuali debugging
2. ⚠️ Enkripsi foto dapat memperlambat upload/loading
3. ✅ Set retensi audit log sesuai kebutuhan (jangan terlalu lama)
4. ✅ Jalankan cleanup functions secara terjadwal

### Operasional

1. 📢 Komunikasikan perubahan keamanan ke tim
2. 📢 Backup encryption key di lokasi terpisah
3. 📢 Monitor alert aktivitas mencurigakan
4. 📢 Review IP whitelist secara berkala
5. 📢 Test session timeout sebelum deploy

## Troubleshooting

### 1. User terkunci setelah gagal login

**Penyebab:** Melebihi `maxLoginAttempts` dalam `lockoutDuration`

**Solusi:**
```sql
-- Reset lockout manual
UPDATE login_attempts
SET locked_until = NULL
WHERE email = 'user@example.com';
```

### 2. Session expired terlalu cepat

**Penyebab:** `sessionTimeout` terlalu rendah

**Solusi:** Naikkan di Security Settings → Autentikasi → Durasi sesi

### 3. Admin tidak bisa akses karena IP whitelist

**Penyebab:** IP admin tidak ada di whitelist

**Solusi:**
- Tambahkan IP admin ke whitelist
- Atau kosongkan whitelist untuk izinkan semua IP

### 4. Audit logs terlalu banyak

**Penyebab:** `logAPIAccess` aktif atau retensi terlalu lama

**Solusi:**
- Nonaktifkan log API access
- Kurangi retention days
- Jalankan cleanup manual:
```sql
SELECT cleanup_old_audit_logs(30);
```

### 5. Enkripsi foto memperlambat aplikasi

**Penyebab:** Overhead enkripsi/dekripsi

**Solusi:**
- Nonaktifkan enkripsi foto jika tidak critical
- Atau upgrade server resource
- Gunakan CDN untuk caching

## Scheduled Jobs (Recommended)

Setup cron jobs untuk maintenance otomatis:

```sql
-- Cleanup audit logs setiap hari jam 2 pagi
SELECT cron.schedule(
  'cleanup-audit-logs',
  '0 2 * * *',
  $$ SELECT cleanup_old_audit_logs(90); $$
);

-- Cleanup expired sessions setiap jam
SELECT cron.schedule(
  'cleanup-sessions',
  '0 * * * *',
  $$ SELECT cleanup_expired_sessions(); $$
);
```

## Monitoring & Alerts

### Metrics to Track

1. **Authentication:**
   - Failed login rate
   - Locked accounts count
   - MFA adoption rate

2. **Sessions:**
   - Active sessions count
   - Average session duration
   - Expired sessions per day

3. **Audit:**
   - Critical events count
   - Suspicious activities
   - Audit log size

### Alert Triggers

- Failed login > 10 kali dalam 5 menit dari IP sama
- Suspicious activity detected
- Encryption key rotation due
- Audit log retention > 80% capacity

## Migration Checklist

Saat deploy security settings:

- [ ] Apply migration `20250117_security_settings.sql`
- [ ] Verify tables created: `security_audit_logs`, `login_attempts`, `active_sessions`
- [ ] Test RLS policies dengan user biasa dan admin
- [ ] Setup scheduled cleanup jobs
- [ ] Configure monitoring alerts
- [ ] Backup encryption keys
- [ ] Communicate changes to team
- [ ] Test session timeout
- [ ] Test IP whitelist (jika digunakan)
- [ ] Verify audit logging works

## Security Considerations

### Data Privacy

- Audit logs berisi PII (email, IP address)
- Comply dengan GDPR/privacy regulations
- Provide user data export/deletion mechanism

### Encryption Keys

- NEVER commit keys to git
- Store keys in secure vault (AWS Secrets Manager, etc)
- Rotate keys regularly
- Have key recovery procedure

### Access Control

- Limit security settings access to super admin only
- Audit all changes to security config
- Require MFA for security settings changes
- Log all security config modifications

---

**Last Updated:** 2025-01-17  
**Version:** 1.0.0  
**Maintainer:** State Track Security Team
