# SIPASDA - Sistem Informasi Pelaporan SDA

[![Build Status](https://github.com/azhar1701/state-track/actions/workflows/deploy-gh-pages.yml/badge.svg)](https://github.com/azhar1701/state-track/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)

> Platform pelaporan dan monitoring kondisi infrastruktur publik secara real-time dengan peta interaktif, analisis geospasial, dan dashboard admin.

[🚀 Live Demo](https://azhar1701.github.io/state-track/) | [📖 Documentation](docs/INDEX.md) | [🗺️ Roadmap](ROADMAP.md)

---

## ✨ Features

- 🗺️ **Interactive Map** - Leaflet-based mapping with clustering, heatmaps, and multi-layer support
- 📊 **Geospatial Analysis** - Buffer zones, density analysis, route optimization, spatial queries
- 📱 **Progressive Web App** - Offline support, installable, background sync
- 🔐 **Secure Authentication** - Supabase Auth with role-based access control
- 📸 **Photo Upload** - Multi-photo reports with compression and cloud storage
- 📈 **Admin Dashboard** - Analytics, filtering, CSV/map export, user management
- 🎨 **Modern UI/UX** - Glassmorphism design, dark mode, responsive mobile-first
- ♿ **Accessible** - WCAG 2.1 AA compliant with keyboard navigation

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript 5
- **Build Tool:** Vite 7 (SWC)
- **Styling:** Tailwind CSS 3 + shadcn/ui
- **Routing:** React Router v6
- **State:** React Context + Hooks

### Backend & Services
- **BaaS:** Supabase (Auth, PostgreSQL, Storage)
- **Maps:** Leaflet + React Leaflet
- **Geospatial:** @turf/turf, proj4, shpjs
- **PWA:** vite-plugin-pwa + Workbox

### Quality & Testing
- **Testing:** Vitest + Playwright
- **Linting:** ESLint 9 + typescript-eslint
- **Type Safety:** TypeScript strict mode
- **Dead Code:** Knip

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account (for backend services)

### Installation

```bash
# Clone repository
git clone https://github.com/azhar1701/state-track.git
cd state-track

# Install dependencies
npm install

# Setup environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

### Environment Variables

Create `.env.local` in project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_ADMIN_EMAILS=admin@example.com
VITE_MAPBOX_TOKEN=optional-mapbox-token
```

### Development

```bash
# Start development server (port 8080)
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm run test
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to GitHub Pages
npm run deploy
```

## 📖 Documentation

Comprehensive documentation is available in the [`docs/`](docs/) folder:

- **[Getting Started](docs/INDEX.md)** - Complete documentation index
- **[Quick Reference](docs/QUICK_REFERENCE.md)** - UI/UX patterns and components
- **[Feature Summary](docs/FEATURE_SUMMARY.md)** - Complete feature list
- **[Geospatial Features](docs/GEOSPATIAL_FEATURES.md)** - Advanced mapping capabilities
- **[Admin Settings](docs/ADMIN_SETTINGS.md)** - Admin configuration guide
- **[Security Settings](docs/Security-Settings.md)** - Security configuration

### Guides
- [Setup Guide](docs/guides/SETUP_GUIDE.md)
- [Supabase Migration Guide](docs/guides/SUPABASE_MIGRATION_GUIDE.md)
- [E2E Testing Guide](e2e/README.md)

## 🗺️ Project Structure

```
state-track/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── common/       # Shared components
│   │   ├── layout/       # Layout components
│   │   └── ui/           # shadcn/ui components
│   ├── features/         # Feature modules
│   │   ├── admin/        # Admin dashboard
│   │   ├── auth/         # Authentication
│   │   ├── geodata/      # Geospatial data management
│   │   ├── home/         # Home page
│   │   ├── map/          # Map features
│   │   └── reports/      # Report management
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and helpers
│   ├── services/         # API services
│   ├── views/            # Page views
│   ├── App.tsx           # Root component
│   ├── main.tsx          # Entry point
│   └── sw.ts             # Service worker
├── public/               # Static assets
│   └── data/             # GeoJSON data files
├── supabase/             # Database migrations
│   ├── migrations/       # SQL migration files
│   └── seed/             # Seed data
├── docs/                 # Documentation
├── e2e/                  # E2E tests
├── scripts/              # Build & utility scripts
└── README.md             # This file
```

## 🧪 Testing

```bash
# Unit tests
npm run test
npm run test:watch

# E2E tests
npm run e2e
npm run e2e:ui          # With Playwright UI
npm run e2e:headed      # With browser visible
npm run e2e:debug       # Debug mode

# Type checking
npm run typecheck
npm run typecheck:test

# Dead code detection
npm run knip
```

## 📦 Database Setup

Apply migrations in `supabase/migrations/` via Supabase Dashboard or CLI:

```bash
# Health checks
npm run health:app
npm run health:storage

# Seed Ciamis region data
npm run seed:ciamis
```

Required tables: `reports`, `profiles`, `user_roles`, `kecamatan`, `desa`, `geo_layers`

See [Supabase Migration Guide](docs/guides/SUPABASE_MIGRATION_GUIDE.md) for details.

## 🌐 Deployment

### GitHub Pages (Recommended)

Automatic deployment via GitHub Actions on push to `main`:

1. Set repository secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
2. Enable GitHub Pages with source: GitHub Actions
3. Push to `main` branch

Manual deployment:
```bash
npm run deploy
```

### Other Platforms

- **Vercel:** Use `vercel.json` configuration
- **Netlify:** Build command: `npm run build`, publish directory: `dist`
- **Custom:** Serve `dist/` folder after `npm run build`

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) - Backend as a Service
- [Leaflet](https://leafletjs.com/) - Interactive maps
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
- [Vite](https://vitejs.dev/) - Build tool

## 📞 Support

- 📧 Email: [azhar1701@github.com](mailto:azhar1701@github.com)
- 🐛 Issues: [GitHub Issues](https://github.com/azhar1701/state-track/issues)
- 📖 Docs: [Documentation](docs/INDEX.md)

---

**Made with ❤️ using React + TypeScript + Supabase**
