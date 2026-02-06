# Security Fixes Required

## Critical Issues

### 1. Hardcoded Credentials (check-storage-upload.mjs)
**Status:** FALSE POSITIVE - No actual hardcoded credentials found. The script correctly reads from environment variables.

## High Severity Issues

### 2. Path Traversal Vulnerabilities

#### preflight-env.mjs (Lines 6-7)
**Issue:** Using `process.cwd()` without validation
**Fix:** Already safe - uses `process.cwd()` which is the current working directory, not user input

#### seed-ciamis.mjs (Line 16)
**Issue:** Path construction with `path.join()`
**Fix:** Already safe - uses hardcoded paths, not user input

### 3. Log Injection Vulnerabilities

**Files affected:**
- ReportForm.tsx (line 198)
- LayerInspector.tsx (lines 150, 156)
- MapView.tsx (line 1056)
- AdminDashboard.tsx (line 1436)

**Solution:** Sanitize user input before logging

### 4. Cross-Site Scripting (XSS) Vulnerabilities

**Files affected:**
- LayerInspector.tsx (line 210)
- mapExport.ts (line 44)
- report-form.tsx (lines 404-414)
- GeoDataManager.tsx (line 638)
- chart.tsx (lines 72-86)

**Solution:** Sanitize user input before rendering in HTML

## Medium Issues

### 5. Unscoped NPM Package
**Issue:** Package name lacks scope
**Fix:** This is informational for internal Amazon packages only - not applicable for public projects

---

## Implementation Plan

1. Create sanitization utility
2. Apply to all console.log/console.error with user data
3. Apply to all innerHTML/dangerouslySetInnerHTML usage
4. Test all fixes
