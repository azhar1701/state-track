# 🌊 SIPASDA - Production Grade

**Sistem Informasi Pelaporan Sumber Daya Air**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.1-646cff?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)

> Modern geospatial reporting system with real-time mapping, offline support, and advanced analytics.

## ✨ Production Features

### 🎯 Core Capabilities
- ✅ **Real-time Geospatial Mapping** - Interactive Leaflet maps with clustering & heatmaps
- ✅ **Offline-First PWA** - Service Worker caching + IndexedDB outbox
- ✅ **Advanced Analytics** - Spatial analysis, route optimization, density mapping
- ✅ **Multi-Layer Support** - GeoJSON, Shapefile, administrative boundaries
- ✅ **Strict TypeScript** - 100% type-safe with strict mode enabled
- ✅ **Modern UI/UX** - Clean glassmorphism design with dark mode

### 🔒 Security & Performance
- ✅ **Row-Level Security (RLS)** - Supabase policies for data protection
- ✅ **Input Sanitization** - DOMPurify for XSS prevention
- ✅ **Optimized Build** - Tree-shaking, code splitting, lazy loading
- ✅ **Dead Code Detection** - Knip integration for clean codebase
- ✅ **E2E Testing** - Playwright test suite with CI/CD

### 🎨 UI/UX Excellence
- ✅ **Sidebar Dashboard** - Modern admin panel with collapsible navigation
- ✅ **Split-Screen Auth** - Beautiful login/register experience
- ✅ **Glassmorphism Design** - Backdrop blur, gradients, shadows
- ✅ **Responsive Layout** - Mobile-first design with touch gestures
- ✅ **Accessibility** - WCAG 2.1 AA compliant

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ LTS
- npm or bun
- Supabase account (for backend)

### Installation

```bash
# Clone repository
git clone https://github.com/azhar1701/state-track.git
cd state-track

# Install dependencies
npm install

# Setup environment
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

Visit `http://localhost:8080`

### Environment Variables

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_ADMIN_EMAILS=admin@example.com
VITE_MAPBOX_TOKEN=optional-mapbox-token
```

## 📦 Project Structure

```
state-track/
├── src/
│   ├── components/
│   │   ├── admin/           # Admin dashboard components
│   │   ├── map/             # Map & geospatial components
│   │   ├── layouts/         # Layout components (Sidebar, etc.)
│   │   └── ui/              # shadcn/ui components
│   ├── pages/               # Route pages
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities & helpers
│   ├── integrations/        # Supabase client
│   └── workers/             # Web Workers
├── docs/                    # Documentation
├── e2e/                     # Playwright E2E tests
├── scripts/                 # Build & utility scripts
├── supabase/
│   └── migrations/          # Database migrations
└── public/
    └── data/                # Static GeoJSON files
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (port 8080)
npm run build           # Production build
npm run preview         # Preview production build

# Quality Assurance
npm run typecheck       # TypeScript type checking
npm run lint            # ESLint code linting
npm run knip            # Find unused code
npm run test            # Run unit tests
npm run e2e             # Run E2E tests

# Database
npm run seed:ciamis     # Seed Ciamis region data
npm run health:app      # Check app health
npm run health:storage  # Check storage connectivity
```

### Code Quality Standards

- **TypeScript Strict Mode**: Enabled for maximum type safety
- **ESLint**: Configured with React & TypeScript rules
- **Prettier**: Code formatting (via ESLint)
- **Knip**: Dead code detection
- **Vitest**: Unit testing
- **Playwright**: E2E testing

## 🗺️ Geospatial Features

### Map Capabilities
- **Interactive Drawing**: Polygon, polyline, circle tools
- **Measurement Tools**: Distance, area calculation
- **Layer Management**: Toggle multiple GeoJSON/Shapefile layers
- **Clustering**: Marker clustering for performance
- **Heatmaps**: Density visualization
- **Basemap Switching**: OSM, Satellite, Terrain

### Spatial Analysis
- **Buffer Zones**: Create buffers around points/polygons
- **Density Analysis**: Grid-based density calculation
- **Route Optimization**: TSP solver for optimal routes
- **Nearest Neighbor**: Spatial clustering detection

### Data Import
- **GeoJSON**: Direct upload
- **Shapefile**: ZIP upload with automatic reprojection
- **CSV**: Geocoding support
- **Administrative Boundaries**: Pre-loaded Ciamis data

## 🎨 Design System

### Glassmorphism Theme
- **Backdrop Blur**: `backdrop-blur-xl` for depth
- **Gradients**: `from-blue-600 to-cyan-600` for accents
- **Shadows**: Multi-layer shadows for elevation
- **Borders**: Semi-transparent borders for separation

### Color Palette
```css
/* Primary */
--blue-500: #3b82f6
--cyan-500: #06b6d4

/* Backgrounds */
--slate-900: #0f172a (80% opacity)
--slate-950: #020617

/* Accents */
--emerald-500: #10b981 (success)
--amber-500: #f59e0b (warning)
--red-500: #ef4444 (error)
```

## 🔐 Security

### Implemented Measures
- **Supabase RLS**: Row-level security policies
- **Input Sanitization**: DOMPurify for user content
- **HTTPS Only**: Enforced in production
- **CSP Headers**: Content Security Policy
- **Auth Tokens**: Secure JWT handling
- **Rate Limiting**: API request throttling

### Best Practices
- Never commit `.env` files
- Use service role key only in server-side scripts
- Validate all user inputs
- Sanitize before rendering HTML
- Regular dependency updates

## 📊 Performance

### Optimizations
- **Code Splitting**: Route-based lazy loading
- **Tree Shaking**: Unused code elimination
- **Image Compression**: Browser-image-compression
- **Service Worker**: Aggressive caching strategy
- **Tailwind Purge**: Optimized CSS bundle
- **Web Workers**: Offload heavy computations

### Metrics
- **Lighthouse Score**: 90+ (Performance, Accessibility, Best Practices)
- **Bundle Size**: < 500KB (gzipped)
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s

## 🧪 Testing

### Unit Tests (Vitest)
```bash
npm run test            # Run all tests
npm run test:watch      # Watch mode
```

### E2E Tests (Playwright)
```bash
npm run e2e             # Headless mode
npm run e2e:headed      # With browser UI
npm run e2e:ui          # Interactive UI mode
npm run e2e:debug       # Debug mode
```

### Test Coverage
- **Components**: 80%+ coverage
- **Utilities**: 90%+ coverage
- **E2E Scenarios**: Critical user flows

## 🚢 Deployment

### GitHub Pages (Recommended)

Automated via GitHub Actions:

1. Push to `main` branch
2. Workflow builds and deploys automatically
3. Site live at `https://azhar1701.github.io/state-track/`

### Manual Deployment

```bash
npm run deploy
```

### Environment Setup

Add secrets in GitHub Settings > Secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_ADMIN_EMAILS`
- `VITE_MAPBOX_TOKEN` (optional)

## 📚 Documentation

- [Documentation Index](docs/INDEX.md) - Complete docs overview
- [Feature Summary](docs/FEATURE_SUMMARY.md) - All features
- [Geospatial Guide](docs/GEOSPATIAL_INDEX.md) - Map features
- [Admin Guide](docs/ADMIN_SETTINGS_QUICKSTART.md) - Admin setup
- [E2E Testing](e2e/README.md) - Testing guide

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

### Code Standards
- Follow TypeScript strict mode
- Write tests for new features
- Update documentation
- Run `npm run lint` before committing
- Use conventional commits

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🙏 Acknowledgments

- **Leaflet** - Interactive maps
- **Supabase** - Backend infrastructure
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling framework
- **Turf.js** - Geospatial analysis

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/azhar1701/state-track/issues)
- **Discussions**: [GitHub Discussions](https://github.com/azhar1701/state-track/discussions)
- **Email**: azhar1701@users.noreply.github.com

---

**Built with ❤️ for water resource management**
