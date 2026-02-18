# Vercel Deployment Checklist - SIPASDA

## Pre-Deployment Verification

### 1. Local Build Test
- [ ] Run `npm run build` locally
- [ ] Verify build completes without errors
- [ ] Check `dist/` folder is generated
- [ ] Run `npm run preview` to test production build locally
- [ ] Test all routes work (/, /admin, /map, /reports, etc.)
- [ ] Verify PWA manifest and service worker are generated

### 2. Environment Variables Preparation
Prepare these variables from your `.env.local` file:

**Required:**
- [ ] `VITE_SUPABASE_URL` - Your Supabase project URL
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key

**Optional:**
- [ ] `VITE_ADMIN_EMAILS` - Comma-separated admin email allowlist
- [ ] `VITE_MAPBOX_TOKEN` - Mapbox token (if using Mapbox features)

---

## Vercel Project Setup

### 3. Import Project to Vercel
- [ ] Go to https://vercel.com/new
- [ ] Import your GitHub repository: `azhar1701/state-track`
- [ ] Select the repository and click "Import"

### 4. Configure Build Settings

**Framework Preset:** Vite

**Build & Development Settings:**
- [ ] **Build Command:** `npm run build`
- [ ] **Output Directory:** `dist`
- [ ] **Install Command:** `npm install` (default)
- [ ] **Development Command:** `npm run dev` (default)

### 5. Environment Variables
In Vercel Dashboard → Settings → Environment Variables:

- [ ] Add `VITE_SUPABASE_URL`
  - Value: `https://your-project.supabase.co`
  - Environment: Production, Preview, Development

- [ ] Add `VITE_SUPABASE_PUBLISHABLE_KEY`
  - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - Environment: Production, Preview, Development

- [ ] Add `VITE_ADMIN_EMAILS` (optional)
  - Value: `admin@example.com,another@example.com`
  - Environment: Production

- [ ] Add `VITE_MAPBOX_TOKEN` (optional)
  - Value: `pk.eyJ1Ijoi...`
  - Environment: Production, Preview

### 6. Deploy
- [ ] Click "Deploy"
- [ ] Wait for build to complete (typically 2-3 minutes)
- [ ] Check deployment logs for errors

---

## Post-Deployment Verification

### 7. Test Production Deployment
- [ ] Visit your Vercel URL (e.g., `https://state-track.vercel.app`)
- [ ] Test homepage loads correctly
- [ ] Test navigation to all pages:
  - [ ] `/` - Home
  - [ ] `/map` - Map View
  - [ ] `/reports` - My Reports
  - [ ] `/report/new` - Report Form
  - [ ] `/admin` - Admin Dashboard (requires auth)
  - [ ] `/help` - Help Center
- [ ] Test page refresh on each route (SPA routing)
- [ ] Test authentication flow (login/logout)
- [ ] Test report submission
- [ ] Test PWA installation prompt
- [ ] Test offline functionality (disconnect network)

### 8. Performance & Security Checks
- [ ] Run Lighthouse audit (target: 90+ on all metrics)
- [ ] Verify security headers in browser DevTools → Network → Response Headers:
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `X-Frame-Options: DENY`
  - [ ] `X-XSS-Protection: 1; mode=block`
- [ ] Check caching headers:
  - [ ] `/assets/*` has `max-age=31536000, immutable`
  - [ ] `/index.html` has `max-age=0, must-revalidate`
  - [ ] `/sw.js` has `max-age=0, must-revalidate`

### 9. Supabase Configuration
- [ ] In Supabase Dashboard → Authentication → URL Configuration:
  - [ ] Add Vercel URL to "Site URL": `https://your-app.vercel.app`
  - [ ] Add to "Redirect URLs": `https://your-app.vercel.app/**`
- [ ] Test authentication after adding URLs

### 10. Custom Domain (Optional)
- [ ] Go to Vercel Dashboard → Settings → Domains
- [ ] Add your custom domain (e.g., `sipasda.example.com`)
- [ ] Update DNS records as instructed by Vercel
- [ ] Wait for SSL certificate provisioning (automatic)
- [ ] Update Supabase redirect URLs with custom domain

---

## Monitoring & Maintenance

### 11. Enable Vercel Analytics (Optional)
- [ ] Go to Vercel Dashboard → Analytics
- [ ] Enable Web Analytics
- [ ] Enable Speed Insights (already installed via `@vercel/speed-insights`)

### 12. Set Up Alerts
- [ ] Configure deployment notifications in Vercel → Settings → Notifications
- [ ] Add Slack/Discord webhook for deployment alerts (optional)

### 13. Continuous Deployment
- [ ] Verify automatic deployments on push to `main` branch
- [ ] Test by making a small commit and pushing
- [ ] Check preview deployments work for pull requests

---

## Troubleshooting

### Common Issues

**Issue: 404 on page refresh**
- Solution: Verify `vercel.json` has rewrite rule (already configured)

**Issue: Environment variables not working**
- Solution: Ensure variables start with `VITE_` prefix
- Solution: Redeploy after adding environment variables

**Issue: Build fails with "command not found"**
- Solution: Check `package.json` scripts match build command
- Solution: Verify Node.js version compatibility (Vercel uses Node 18 by default)

**Issue: Supabase auth redirect fails**
- Solution: Add Vercel URL to Supabase redirect URLs
- Solution: Check `VITE_SUPABASE_URL` is correct

**Issue: PWA not working**
- Solution: Verify HTTPS is enabled (automatic on Vercel)
- Solution: Check service worker is registered in browser DevTools

**Issue: Large bundle size warning**
- Solution: Already optimized with manual chunks in `vite.config.ts`
- Solution: Consider lazy loading more routes if needed

---

## Rollback Plan

### If Deployment Fails
1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"
4. Investigate issue in failed deployment logs
5. Fix locally and redeploy

---

## Configuration Files Reference

### vercel.json
```json
{
  "regions": ["sin1"],
  "rewrites": [...],
  "headers": [...]
}
```

**Region:** `sin1` (Singapore) - Closest to Indonesia for lowest latency

**Alternative regions if needed:**
- `hnd1` - Tokyo, Japan
- `bom1` - Mumbai, India
- `syd1` - Sydney, Australia

---

## Security Best Practices

- [x] Security headers configured in `vercel.json`
- [ ] Never commit `.env.local` to Git (already in `.gitignore`)
- [ ] Use Supabase RLS (Row Level Security) policies
- [ ] Rotate Supabase keys if exposed
- [ ] Enable Vercel Authentication for preview deployments (optional)
- [ ] Set up Vercel Firewall rules (optional, paid feature)

---

## Performance Optimization

- [x] Static asset caching (1 year)
- [x] HTML/SW no-cache for instant updates
- [x] Manual chunks for code splitting
- [x] PWA with service worker
- [ ] Consider enabling Vercel Edge Network (automatic)
- [ ] Monitor Core Web Vitals in Vercel Analytics

---

## Final Checklist

- [ ] All environment variables added
- [ ] Build succeeds on Vercel
- [ ] All routes accessible
- [ ] Authentication works
- [ ] Supabase integration works
- [ ] PWA installs correctly
- [ ] Security headers present
- [ ] Performance acceptable (Lighthouse 90+)
- [ ] Custom domain configured (if applicable)
- [ ] Team notified of deployment

---

**Deployment Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

**Production URL:** _________________________

**Deployed By:** _________________________

**Date:** _________________________

---

## Quick Commands

```bash
# Local build test
npm run build
npm run preview

# Check build output
ls -lh dist/

# Test environment variables locally
npm run dev

# Deploy via Vercel CLI (alternative)
npm i -g vercel
vercel --prod
```

---

**Next Steps After Deployment:**
1. Update README.md with production URL
2. Notify stakeholders
3. Monitor error logs in Vercel Dashboard
4. Set up uptime monitoring (e.g., UptimeRobot, Pingdom)
5. Schedule regular dependency updates
