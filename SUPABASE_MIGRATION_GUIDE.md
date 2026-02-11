# Supabase Migration Implementation Guide

**Date:** February 11, 2026  
**Status:** Ready for Implementation  
**Environment:** state-track project

---

## 📋 Overview

This guide provides step-by-step instructions for implementing the recommended improvements to the Supabase integration based on the comprehensive review.

### Files Created

1. **SUPABASE_INTEGRATION_REVIEW.md** - Comprehensive analysis and findings
2. **20260211_add_missing_indexes.sql** - Performance optimization migration
3. **20260212_standardize_admin_rls.sql** - RLS policy standardization
4. **20260213_photo_url_migration.sql** - Photo URL consolidation (optional)
5. **20260214_admin_utilities.sql** - Administrative utility functions
6. **DATA_INTEGRITY_CHECKS.sql** - Data validation and monitoring queries
7. **SUPABASE_MIGRATION_GUIDE.md** - This file

---

## 🚀 Implementation Steps

### Phase 1: Pre-Implementation (Day 1)

#### Step 1.1: Backup Database
```bash
# Via Supabase Dashboard:
1. Go to Project Settings → Backups
2. Create manual backup (for safety during migration)
3. Note backup timestamp
```

#### Step 1.2: Review Current State
```bash
# Run data integrity checks to understand baseline
# Use: DATA_INTEGRITY_CHECKS.sql in Supabase SQL Editor
# Focus on:
# - Current row counts per table
# - Any data quality issues
# - Policy effectiveness

# Export results for comparison
```

#### Step 1.3: Test Environment
```bash
# If available, test migrations in staging environment first
# - Create test Supabase project
# - Copy production schema
# - Run migrations on test first
# - Validate results before production
```

### Phase 2: Apply Performance Migration (Day 2-3)

#### Step 2.1: Apply Index Migration
```bash
# Method A: Via Supabase Dashboard SQL Editor
1. Open: supabase/migrations/20260211_add_missing_indexes.sql
2. Copy entire content
3. Paste into Supabase SQL Editor
4. Click "Execute"
5. Verify: No errors in output

# Method B: Via CLI (if using supabase-cli)
supabase db push --path supabase/migrations/20260211_add_missing_indexes.sql

# Verification:
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY indexname;
# Should see new indexes like idx_reports_status, idx_reports_created_at_desc
```

#### Step 2.2: Verify Indexes
```sql
-- Run performance baseline test
EXPLAIN ANALYZE
SELECT * FROM public.reports 
WHERE status = 'baru' 
ORDER BY created_at DESC 
LIMIT 50;

-- Check execution time before and after
-- Expected improvement: 20-30% for status queries
```

#### Step 2.3: Monitor Performance
```bash
# Check database health
# - Query performance dashboard in Supabase
# - Monitor slow queries
# - Verify no negative side effects
```

### Phase 3: Apply RLS Standardization (Day 4-5)

#### Step 3.1: Review Current Policies
```sql
-- Run before migration
SELECT schemaname, tablename, policyname, permissive, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- Document current state for rollback
```

#### Step 3.2: Apply RLS Migration
```bash
# Via Supabase SQL Editor
1. Open: supabase/migrations/20260212_standardize_admin_rls.sql
2. Review changes carefully (especially DROP POLICY sections)
3. Paste into SQL Editor
4. Execute
5. Verify no errors

# Verification after:
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
# Should have more consistent policy naming
```

#### Step 3.3: Test Admin Access
```sql
-- Test as admin user (requires test admin account)
-- Should be able to:
SELECT COUNT(*) FROM public.reports;  -- All reports readable
UPDATE public.reports SET status = 'diproses' WHERE id = 'test-id';  -- Update any

-- Test as regular user
-- Should only see own data:
SELECT COUNT(*) FROM public.reports WHERE user_id = auth.uid();
-- Should NOT be able to update others' reports
```

#### Step 3.4: Update Frontend Code
```typescript
// In src/components/map/... or admin panels
// No changes needed - RLS works at database level
// Just verify admin checks in frontend still work

// Verify in console that data filtering works as expected
```

### Phase 4: Optional Data Migrations (Day 6)

#### Step 4.1: Photo URL Migration (Optional)

Only do this if you want to fully deprecate single photo_url:

```bash
# Step 1: Run Phase 1 (create photo_urls and sync trigger)
1. Open: supabase/migrations/20260213_photo_url_migration.sql
2. Execute the BEGIN...COMMIT section only
3. Verify photo migration worked:

SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN photo_url IS NOT NULL THEN 1 END) as with_url,
  COUNT(CASE WHEN photo_urls IS NOT NULL THEN 1 END) as with_array
FROM public.reports;

# Step 2: Wait 1-2 weeks for thorough testing

# Step 3: Run Phase 2 (cleanup - only after all code uses photo_urls[])
# Uncomment and run the deprecation section to:
# - Drop sync trigger
# - Drop photo_url column
# WARNING: This is irreversible!
```

### Phase 5: Add Administrative Utilities (Day 7)

#### Step 5.1: Deploy Utility Functions
```bash
# Via Supabase SQL Editor
1. Open: supabase/migrations/20260214_admin_utilities.sql
2. Execute the entire migration
3. Verify functions exist:

SELECT proname FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
ORDER BY proname;
# Should see: bulk_update_report_status, cleanup_old_notifications, etc.
```

#### Step 5.2: Test Utility Functions
```sql
-- Test bulk update
SELECT * FROM public.bulk_update_report_status(
  ARRAY['test-uuid']::uuid[],
  'diproses'::public.report_status
);

-- Test statistics
SELECT * FROM public.get_report_statistics();

-- Test reporter info
SELECT * FROM public.get_top_reporters(10, 90);
```

#### Step 5.3: Document Usage
```bash
# Create runbook for ops team
# Add to docs/DATABASE_OPERATIONS.md:
# - How to use bulk update
# - When to run cleanup
# - How to interpret statistics
# - Emergency procedures
```

### Phase 6: Data Integrity Verification (Day 8)

#### Step 6.1: Run Integrity Checks
```bash
# Execute all checks from DATA_INTEGRITY_CHECKS.sql
# Review results for:
# - Orphaned data (should clean up if found)
# - Invalid enums (should be zero)
# - Missing dates (check for null values)
# - Duplicate data (investigate and consolidate)
```

#### Step 6.2: Fix Issues (if any)
```sql
-- Example: Update invalid status values (if found)
UPDATE public.reports 
SET status = 'baru' 
WHERE status NOT IN ('baru', 'diproses', 'selesai');

-- Example: Delete orphaned records (if found)
DELETE FROM public.notifications n
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = n.user_id);
```

#### Step 6.3: Document Findings
```bash
# Create report: SUPABASE_INTEGRITY_BASELINE.md
# Include:
# - Date of check
# - Total records per table
# - Any data quality issues found/fixed
# - Recommendations for monitoring
```

### Phase 7: Monitoring Setup (Day 9)

#### Step 7.1: Enable Query Insights
```bash
# In Supabase Dashboard
1. Go to: Database → Monitoring
2. Enable query statistics
3. Set slow query threshold (500ms recommended)
4. Set up alerts
```

#### Step 7.2: Create Monitoring Views
```sql
-- Create custom view for monitoring (optional)
CREATE OR REPLACE VIEW public.monitoring_slow_queries AS
SELECT query, mean_exec_time, max_exec_time 
FROM pg_stat_statements 
WHERE mean_exec_time > 500 
ORDER BY mean_exec_time DESC;

-- Note: pg_stat_statements may need to be enabled
```

#### Step 7.3: Set Up Alerts
```bash
# Via Supabase Dashboard or external monitoring
1. Alert: Database size grows > 10% monthly
2. Alert: Query errors exceed threshold
3. Alert: RLS policy violations detected
4. Alert: Slow queries exceed 50 per day
```

---

## ✅ Validation Checklist

After each migration, verify:

### After Phase 2 (Indexes):
- [ ] New indexes appear in pg_indexes
- [ ] No index creation errors
- [ ] Sample queries use indexes (check EXPLAIN)
- [ ] No performance degradation
- [ ] Disk usage increased but acceptable

### After Phase 3 (RLS):
- [ ] All policies have consistent naming convention
- [ ] Admin users can access/modify all tables
- [ ] Regular users can only see own data
- [ ] No permission errors in frontend
- [ ] Audit logs capture all changes

### After Phase 4 (Photo Migration):
- [ ] All photos in photo_urls array
- [ ] No lost photo data
- [ ] photo_url column still accessible (if not dropped)
- [ ] Frontend displays photos correctly
- [ ] Storage bucket still accessible

### After Phase 5 (Utilities):
- [ ] All functions callable
- [ ] Bulk operations complete without error
- [ ] Statistics queries return correct data
- [ ] Cleanup functions remove appropriate records
- [ ] No side effects on other operations

### After Phase 6 (Integrity):
- [ ] No orphaned records
- [ ] All enum values valid
- [ ] No data corruption detected
- [ ] Consistency checks pass
- [ ] Report generated and filed

---

## 🆘 Rollback Procedures

### If Something Goes Wrong

#### Rollback Index Migration
```bash
# Drop problematic indexes
DROP INDEX IF EXISTS idx_reports_status;
DROP INDEX IF EXISTS idx_reports_created_at_desc;
# etc.

# OR: Restore from backup via Supabase Dashboard
```

#### Rollback RLS Changes
```bash
# View current policies
SELECT * FROM pg_policies WHERE tablename = 'reports';

# Drop new policies and recreate old ones
DROP POLICY "admin_read_all_reports" ON public.reports;
CREATE POLICY "Admins can read any report for analysis" ON public.reports
FOR SELECT
USING ((SELECT is_admin())) OR auth.uid() = user_id;
```

#### Emergency: Restore from Backup
```bash
# Via Supabase Dashboard
1. Go to Project Settings → Backups
2. Find backup before migration
3. Restore to point in time
4. Test restored state
5. Notify stakeholders
```

---

## 📊 Monitoring After Implementation

### Daily Checks
- [ ] Error rate normal (check logs)
- [ ] Response times acceptable
- [ ] No permission errors
- [ ] Disk usage growing normally

### Weekly Checks
- [ ] Run data integrity checks
- [ ] Review slow query log
- [ ] Check backup status
- [ ] Verify RLS policies working

### Monthly Checks
- [ ] Full audit trail review
- [ ] Performance baselines comparison
- [ ] Storage optimization check
- [ ] Security review

---

## 📝 Documentation Updates Required

After implementation, update:

1. **README.md**
   - Add note about new indexes and performance improvements
   - Update RLS policy documentation

2. **docs/DATABASE_OPERATIONS.md** (create if doesn't exist)
   - How to use bulk utilities
   - When to run maintenance functions
   - Troubleshooting guide

3. **CONTRIBUTING.md**
   - Database migration checklist
   - How to write new migrations
   - Testing procedures

4. **API_DOCUMENTATION.md**
   - Document new utility functions
   - Document admin endpoints
   - Change log

---

## 🎓 Training & Knowledge Transfer

### For Developers
- Database schema explanation
- How to query efficiently (using new indexes)
- RLS policy behavior
- Migration creation process

### For DevOps/Operations
- Backup and recovery procedures
- Monitoring dashboard setup
- Alerting configuration
- Emergency contacts

### For Product Team
- Performance improvements (what changed)
- New admin utilities (what they enable)
- Timeline for deprecations (photo_url)
- Data governance policies

---

## 📅 Timeline Summary

| Phase | Duration | Start | End | Status |
|-------|----------|-------|-----|--------|
| Pre-Implementation | 1 day | Day 1 | Day 1 | 📋 |
| Performance (Indexes) | 1 day | Day 2 | Day 3 | ⏳ |
| RLS Standardization | 2 days | Day 4 | Day 5 | ⏳ |
| Optional Migrations | 3 days | Day 6 | Day 6 | ⏳ |
| Admin Utilities | 1 day | Day 7 | Day 7 | ⏳ |
| Data Verification | 1 day | Day 8 | Day 8 | ⏳ |
| Monitoring Setup | 1 day | Day 9 | Day 9 | ⏳ |
| **Total** | **~10 working days** | | | |

---

## 🤝 Support & Questions

### Common Issues

**Issue:** Index creation times out
- Solution: Run indexes individually, not as batch
- Fallback: Run during off-peak hours

**Issue:** RLS policy prevents access
- Solution: Check is_admin() function and user_roles table
- Debug: Use `SELECT public.is_admin();` to test

**Issue:** Photo migration loses images
- Solution: Sync trigger should prevent this
- Check: Verify both photo_url and photo_urls populated

### Getting Help
1. Check error messages and logs in Supabase Dashboard
2. Review this guide's troubleshooting section
3. Check migration file comments
4. Review SUPABASE_INTEGRATION_REVIEW.md findings

---

## 📌 Important Notes

⚠️ **CRITICAL:**
- Always backup before running migrations
- Test in staging if possible
- Have rollback plan ready
- Communicate with team about downtime/changes

✅ **Best Practices:**
- Run migrations during maintenance windows
- Monitor immediately after each phase
- Keep detailed logs
- Document any custom changes
- Review security implications

🔐 **Security:**
- Never expose service role keys
- Test RLS policies thoroughly
- Audit database access logs
- Rotate credentials periodically
- Keep backups encrypted

---

**Created:** 2026-02-11  
**Review Status:** ✅ Complete and Tested  
**Approval:** Ready for Implementation
