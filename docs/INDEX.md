# SIPASDA Documentation Index

## 📋 Quick Links

### Getting Started
- [README.md](../README.md) - Main project documentation
- [ROADMAP.md](../ROADMAP.md) - Project roadmap & planned features
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Quick reference guide

### Architecture & Features
- [FEATURE_SUMMARY.md](FEATURE_SUMMARY.md) - Complete feature list
- [TECHNICAL_IMPLEMENTATION.md](../TECHNICAL_IMPLEMENTATION.md) - Technical architecture
- [GEOSPATIAL_INDEX.md](GEOSPATIAL_INDEX.md) - Geospatial features overview

### Admin & Settings
- [ADMIN_SETTINGS_QUICKSTART.md](ADMIN_SETTINGS_QUICKSTART.md) - Admin setup guide
- [ADMIN_SETTINGS.md](ADMIN_SETTINGS.md) - Detailed admin documentation
- [USER_MANAGEMENT_REVIEW.md](USER_MANAGEMENT_REVIEW.md) - User management

### Database & Integration
- [DATABASE_INTEGRATION_STATUS.md](DATABASE_INTEGRATION_STATUS.md) - Database status
- [SUPABASE_INTEGRATION_REVIEW.md](../SUPABASE_INTEGRATION_REVIEW.md) - Supabase integration
- [SUPABASE_MIGRATION_GUIDE.md](../SUPABASE_MIGRATION_GUIDE.md) - Migration guide

### UI/UX & Performance
- [UI_UX_OVERHAUL.md](UI_UX_OVERHAUL.md) - UI/UX improvements
- [GLASSMORPHISM_GUIDE.md](GLASSMORPHISM_GUIDE.md) - Design system
- [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md) - Performance tips
- [RESPONSIVE_LAYOUT.md](RESPONSIVE_LAYOUT.md) - Responsive design

### Geospatial Features
- [GEOSPATIAL_FEATURES.md](GEOSPATIAL_FEATURES.md) - Geospatial capabilities
- [GEOSPATIAL_QUICKSTART.md](GEOSPATIAL_QUICKSTART.md) - Quick start guide
- [MAPVIEW_INTEGRATION_GUIDE.md](MAPVIEW_INTEGRATION_GUIDE.md) - Map integration
- [LAYER_DRAWER_INTEGRATION.md](LAYER_DRAWER_INTEGRATION.md) - Layer management

### Security
- [Security-Settings.md](Security-Settings.md) - Security configuration
- [Security-Integration-Checklist.md](Security-Integration-Checklist.md) - Security checklist
- [Security-Quick-Fix.md](Security-Quick-Fix.md) - Quick security fixes

### Testing
- [e2e/README.md](../e2e/README.md) - E2E testing guide
- [e2e/QUICK_START.md](../e2e/QUICK_START.md) - Testing quick start
- [e2e/DEBUGGING_GUIDE.md](../e2e/DEBUGGING_GUIDE.md) - Debugging tests

## 🏗️ Project Structure

```
state-track/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Utilities
│   └── integrations/   # External integrations
├── docs/               # Documentation
├── e2e/                # E2E tests
├── scripts/            # Build & utility scripts
└── supabase/           # Database migrations
```

## 🚀 Common Tasks

### Development
```bash
npm run dev              # Start dev server
npm run build           # Production build
npm run typecheck       # Type checking
npm run lint            # Lint code
npm run knip            # Find dead code
```

### Testing
```bash
npm run test            # Run unit tests
npm run e2e             # Run E2E tests
npm run e2e:ui          # E2E with UI
```

### Database
```bash
npm run seed:ciamis     # Seed Ciamis data
npm run health:app      # Check app health
npm run health:storage  # Check storage
```

## 📊 Key Metrics

- **TypeScript**: Strict mode enabled
- **Test Coverage**: Unit + E2E tests
- **Performance**: Optimized Tailwind, lazy loading
- **Security**: RLS policies, input sanitization
- **Accessibility**: WCAG 2.1 AA compliant

## 🔧 Configuration Files

- `vite.config.ts` - Vite configuration
- `tailwind.config.ts` - Tailwind CSS
- `tsconfig.json` - TypeScript
- `knip.json` - Dead code detection
- `playwright.config.ts` - E2E testing

## 📝 Recent Updates

See [ROADMAP.md](../ROADMAP.md) for current status and planned features.

## 🆘 Troubleshooting

See [README.md](../README.md#env-troubleshooting) for common issues.
