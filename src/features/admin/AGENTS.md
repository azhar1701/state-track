# Admin Module Knowledge Base

## OVERVIEW
Handles system administration, report management, and analytics.

## STRUCTURE
```text
src/features/admin/
├── AdminDashboard.tsx      # Analytics and Report Table
├── AdminSettings.tsx       # System configuration entry
├── settings/               # Sub-settings modules
└── useSystemSettings.ts    # Centralized configuration hook
```

## CONVENTIONS
- **Synchronization**: Always trigger `fetchStats()` on real-time events, even if the report table is not visible.
- **Audit Logs**: All manual changes to reports must be logged to the `report_logs` table.

## ANTI-PATTERNS
- **Silent Failures**: Always wrap Supabase mutations in try-catch with `handleApiError`.
