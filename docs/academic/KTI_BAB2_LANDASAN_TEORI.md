# BAB II: LANDASAN TEORI

## 2.1 Sistem Informasi Geografis (Geographic Information System)

### 2.1.1 Definisi dan Konsep GIS

Sistem Informasi Geografis (SIG) atau Geographic Information System (GIS) adalah sistem berbasis komputer yang dirancang untuk mengumpulkan, menyimpan, memanipulasi, menganalisis, dan menampilkan data yang memiliki referensi geografis atau spasial (Longley et al., 2015). GIS mengintegrasikan operasi database umum seperti query dan analisis statistik dengan visualisasi dan analisis geografis yang unik melalui peta.

Menurut Aronoff (1989), GIS memiliki empat komponen utama:
1. **Hardware**: Perangkat keras komputer untuk menyimpan dan memproses data geografis
2. **Software**: Program aplikasi yang menyediakan fungsi dan tools untuk manipulasi data spasial
3. **Data**: Data geografis dan data atribut terkait yang terorganisir dalam database
4. **Brainware**: Pengguna yang mengoperasikan sistem dan menginterpretasikan hasil analisis

### 2.1.2 Web-Based GIS

Web-Based GIS atau WebGIS adalah implementasi GIS yang dapat diakses melalui internet menggunakan web browser tanpa memerlukan instalasi software khusus di sisi klien (Peng & Tsou, 2003). WebGIS memiliki beberapa keunggulan dibandingkan desktop GIS tradisional:

1. **Aksesibilitas**: Dapat diakses dari mana saja dengan koneksi internet
2. **Platform Independence**: Berjalan di berbagai sistem operasi (Windows, macOS, Linux, Android, iOS)
3. **Biaya Rendah**: Tidak memerlukan lisensi software mahal untuk setiap pengguna
4. **Update Terpusat**: Pembaruan sistem dilakukan di server tanpa perlu update di setiap klien
5. **Kolaborasi**: Memfasilitasi sharing data dan kolaborasi antar pengguna secara real-time

Arsitektur WebGIS umumnya mengikuti model client-server dengan tiga tier:
- **Presentation Tier**: Web browser yang menampilkan peta dan antarmuka pengguna
- **Application Tier**: Web server yang memproses request dan business logic
- **Data Tier**: Database server yang menyimpan data spasial dan atribut

### 2.1.3 Komponen Data Spasial

Data spasial dalam GIS terdiri dari dua komponen utama:

1. **Data Geometri**: Representasi bentuk dan lokasi objek geografis
   - **Point**: Koordinat tunggal (latitude, longitude) untuk lokasi titik
   - **Line**: Serangkaian koordinat yang membentuk garis atau polyline
   - **Polygon**: Area tertutup yang dibentuk oleh serangkaian koordinat

2. **Data Atribut**: Informasi deskriptif tentang objek geografis
   - Nama, kategori, status, tanggal, dan metadata lainnya
   - Disimpan dalam format tabular yang terhubung dengan geometri

## 2.2 ReactJS sebagai Framework Frontend

### 2.2.1 Konsep dan Arsitektur ReactJS

ReactJS adalah pustaka JavaScript open-source yang dikembangkan oleh Facebook (sekarang Meta) untuk membangun antarmuka pengguna yang interaktif dan efisien (Facebook Inc., 2023). React menggunakan pendekatan component-based architecture di mana UI dipecah menjadi komponen-komponen kecil yang reusable dan independent.

Prinsip utama ReactJS:

1. **Declarative**: Developer mendeskripsikan "apa" yang ingin ditampilkan, bukan "bagaimana" menampilkannya
2. **Component-Based**: UI dibangun dari komponen yang dapat dikomposisi
3. **Learn Once, Write Anywhere**: Dapat digunakan untuk web, mobile (React Native), dan desktop
4. **Virtual DOM**: Representasi in-memory dari DOM yang memungkinkan update efisien

### 2.2.2 Virtual DOM dan Reconciliation

Virtual DOM adalah konsep kunci yang membuat React sangat efisien. Ketika state aplikasi berubah, React:

1. Membuat representasi virtual dari UI baru
2. Membandingkan dengan virtual DOM sebelumnya (diffing algorithm)
3. Menghitung perubahan minimal yang diperlukan
4. Mengupdate hanya bagian DOM yang berubah (reconciliation)

Proses ini jauh lebih cepat daripada memanipulasi DOM secara langsung karena operasi DOM adalah operasi yang mahal secara komputasi.

### 2.2.3 React Hooks

React Hooks (diperkenalkan di React 16.8) adalah fungsi yang memungkinkan penggunaan state dan lifecycle features dalam functional components. Hooks utama yang digunakan dalam penelitian ini:

- **useState**: Mengelola state lokal komponen
- **useEffect**: Menjalankan side effects (API calls, subscriptions)
- **useMemo**: Memoization untuk optimasi performa
- **useCallback**: Memoization untuk fungsi callback
- **useContext**: Mengakses context untuk state management global

### 2.2.4 Keunggulan ReactJS untuk Aplikasi GIS

ReactJS dipilih untuk pengembangan SIPASDA karena beberapa keunggulan:

1. **Performa Tinggi**: Virtual DOM memastikan rendering yang efisien bahkan dengan ribuan marker di peta
2. **Ekosistem Kaya**: Tersedia banyak library pendukung seperti React-Leaflet untuk integrasi pemetaan
3. **Developer Experience**: Hot Module Replacement (HMR) mempercepat development cycle
4. **Community Support**: Dokumentasi lengkap dan komunitas developer yang besar
5. **Type Safety**: Integrasi sempurna dengan TypeScript untuk mengurangi bug

## 2.3 Vite sebagai Build Tool

### 2.3.1 Konsep dan Arsitektur Vite

Vite adalah build tool generasi baru yang dikembangkan oleh Evan You (creator Vue.js) yang memanfaatkan native ES modules di browser modern (Vite Team, 2023). Vite menawarkan pengalaman development yang jauh lebih cepat dibandingkan bundler tradisional seperti Webpack atau Create React App.

Arsitektur Vite terdiri dari dua bagian:

1. **Development Server**: Menggunakan native ESM untuk serving code tanpa bundling
2. **Build Command**: Menggunakan Rollup untuk production build yang optimal

### 2.3.2 Keunggulan Vite

Perbandingan performa Vite vs Create React App:

| Metrik | Create React App | Vite | Peningkatan |
|--------|------------------|------|-------------|
| Cold Start | 15-30 detik | 1-2 detik | 10-15x |
| Hot Module Replacement | 2-5 detik | <100ms | 20-50x |
| Production Build | 60-90 detik | 20-30 detik | 3x |

Keunggulan utama Vite:
- **Instant Server Start**: Server development langsung siap tanpa bundling
- **Lightning Fast HMR**: Update instan tanpa reload halaman
- **Optimized Build**: Tree-shaking dan code-splitting otomatis
- **Rich Features**: TypeScript, JSX, CSS pre-processors out-of-the-box

## 2.4 Leaflet sebagai Pustaka Pemetaan

### 2.4.1 Konsep dan Fitur Leaflet

Leaflet adalah pustaka JavaScript open-source untuk peta interaktif yang mobile-friendly (Agafonkin, 2023). Dengan ukuran hanya 42 KB, Leaflet menjadi pilihan populer untuk WebGIS karena ringan namun powerful.

Fitur utama Leaflet:
- **Layers**: Tile layers, marker layers, vector layers (GeoJSON)
- **Controls**: Zoom, attribution, scale, layers control
- **Interaction**: Pan, zoom, popup, tooltip
- **Events**: Click, drag, zoom events untuk interaktivitas
- **Plugins**: Ekosistem plugin yang luas (clustering, heatmap, drawing)

### 2.4.2 Tile Layers dan Koordinat

Leaflet menggunakan sistem tile-based mapping di mana peta dibagi menjadi tile berukuran 256x256 pixel. Sistem koordinat yang digunakan:

- **Geographic Coordinates**: Latitude/Longitude dalam WGS84 (EPSG:4326)
- **Projected Coordinates**: Web Mercator (EPSG:3857) untuk rendering tile
- **Zoom Levels**: Level 0 (seluruh dunia) hingga 18-20 (detail jalan)

### 2.4.3 React-Leaflet Integration

React-Leaflet adalah wrapper React untuk Leaflet yang menyediakan komponen deklaratif:

```typescript
<MapContainer center={[-7.325, 108.353]} zoom={13}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <Marker position={[-7.325, 108.353]}>
    <Popup>Lokasi Laporan</Popup>
  </Marker>
</MapContainer>
```

### 2.4.4 Plugin Leaflet yang Digunakan

1. **Leaflet.markercluster**: Mengelompokkan marker yang berdekatan untuk menghindari clutter
2. **Leaflet.heat**: Visualisasi heatmap untuk analisis kepadatan
3. **Leaflet-geoman**: Tools untuk menggambar dan mengedit geometri
4. **Turf.js**: Library untuk analisis geospasial (buffer, intersection, distance)

## 2.5 Supabase sebagai Backend-as-a-Service

### 2.5.1 Konsep BaaS dan Supabase

Backend-as-a-Service (BaaS) adalah model cloud computing yang menyediakan infrastruktur backend siap pakai sehingga developer dapat fokus pada frontend development (Supabase Inc., 2023). Supabase adalah open-source alternative untuk Firebase yang dibangun di atas PostgreSQL.

Komponen Supabase:
1. **Database**: PostgreSQL dengan extension PostGIS untuk data geospasial
2. **Authentication**: JWT-based auth dengan berbagai provider
3. **Storage**: S3-compatible object storage untuk file/media
4. **Realtime**: WebSocket subscriptions untuk data real-time
5. **Edge Functions**: Serverless functions untuk custom logic

### 2.5.2 PostgreSQL dan PostGIS

PostgreSQL adalah relational database open-source yang powerful dan extensible. PostGIS adalah extension yang menambahkan support untuk objek geografis:

- **Geometry Types**: Point, LineString, Polygon, MultiPoint, dll
- **Spatial Functions**: ST_Distance, ST_Buffer, ST_Intersects, dll
- **Spatial Indexes**: GIST index untuk query spasial yang cepat

Contoh query spasial:
```sql
-- Mencari laporan dalam radius 5km dari titik
SELECT * FROM reports 
WHERE ST_DWithin(
  ST_MakePoint(longitude, latitude)::geography,
  ST_MakePoint(108.353, -7.325)::geography,
  5000
);
```

### 2.5.3 Row Level Security (RLS)

RLS adalah fitur PostgreSQL yang memungkinkan kontrol akses di level baris data. Setiap query secara otomatis difilter berdasarkan policy yang didefinisikan:

```sql
CREATE POLICY "Users can view all reports"
  ON reports FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

RLS memastikan keamanan data tanpa perlu implementasi authorization logic di aplikasi.

### 2.5.4 Realtime Subscriptions

Supabase Realtime menggunakan PostgreSQL's logical replication untuk broadcast perubahan database ke klien melalui WebSocket:

```typescript
const channel = supabase
  .channel('reports-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'reports'
  }, (payload) => {
    console.log('Change received!', payload);
  })
  .subscribe();
```

Fitur ini memungkinkan dashboard admin menerima update laporan baru secara instan tanpa polling.

## 2.6 Progressive Web Application (PWA)

### 2.6.1 Konsep dan Karakteristik PWA

Progressive Web Application adalah aplikasi web yang menggunakan teknologi modern untuk memberikan pengalaman seperti aplikasi native (Google, 2023). PWA memiliki karakteristik:

1. **Progressive**: Berfungsi untuk semua pengguna, terlepas dari browser
2. **Responsive**: Menyesuaikan dengan berbagai ukuran layar
3. **Connectivity Independent**: Berfungsi offline atau pada jaringan lambat
4. **App-like**: Terasa seperti aplikasi native dengan navigasi dan interaksi
5. **Fresh**: Selalu up-to-date berkat service worker
6. **Safe**: Disajikan via HTTPS untuk mencegah snooping
7. **Discoverable**: Dapat ditemukan melalui search engine
8. **Installable**: Dapat ditambahkan ke home screen tanpa app store

### 2.6.2 Service Worker

Service Worker adalah script JavaScript yang berjalan di background, terpisah dari halaman web, yang memungkinkan fitur-fitur seperti:

- **Offline Functionality**: Caching assets dan data untuk akses offline
- **Background Sync**: Sinkronisasi data ketika koneksi kembali tersedia
- **Push Notifications**: Notifikasi bahkan ketika aplikasi tidak dibuka
- **Intercepting Network Requests**: Strategi caching yang fleksibel

### 2.6.3 Caching Strategies

Workbox (library dari Google) menyediakan berbagai strategi caching:

1. **Cache First**: Cek cache dulu, fallback ke network (untuk assets statis)
2. **Network First**: Coba network dulu, fallback ke cache (untuk data dinamis)
3. **Stale While Revalidate**: Gunakan cache sambil update di background
4. **Network Only**: Selalu dari network (untuk data sensitif)
5. **Cache Only**: Selalu dari cache (untuk offline-only content)

### 2.6.4 IndexedDB untuk Storage Lokal

IndexedDB adalah database NoSQL di browser untuk menyimpan data terstruktur dalam jumlah besar. Dalam SIPASDA, IndexedDB digunakan untuk:

- Menyimpan laporan yang dibuat saat offline
- Caching data peta dan layer GeoJSON
- Menyimpan foto yang belum terupload
- Queue untuk background sync

## 2.7 TypeScript untuk Type Safety

### 2.7.1 Konsep TypeScript

TypeScript adalah superset dari JavaScript yang menambahkan static typing (Microsoft, 2023). TypeScript dikompilasi menjadi JavaScript biasa yang dapat dijalankan di browser atau Node.js.

Keunggulan TypeScript:
- **Early Error Detection**: Menangkap bug saat development, bukan runtime
- **Better IDE Support**: Autocomplete, refactoring, navigation yang lebih baik
- **Self-Documenting Code**: Type annotations sebagai dokumentasi
- **Safer Refactoring**: Compiler memastikan perubahan tidak break code

### 2.7.2 Type System untuk GIS Data

Contoh type definitions untuk data geospasial:

```typescript
interface Report {
  id: string;
  title: string;
  description: string;
  category: 'jalan' | 'jembatan' | 'irigasi' | 'sungai' | 'lainnya';
  status: 'baru' | 'diproses' | 'selesai';
  severity: 'ringan' | 'sedang' | 'berat';
  latitude: number;
  longitude: number;
  location_name: string | null;
  photo_urls: string[];
  created_at: string;
}

type GeoJSONFeature = {
  type: 'Feature';
  geometry: Point | LineString | Polygon;
  properties: Record<string, unknown>;
};
```

Type system memastikan data yang dikirim ke API dan diterima dari database sesuai dengan skema yang diharapkan.

## 2.8 Metodologi Pengembangan Perangkat Lunak

### 2.8.1 Agile Development

Agile adalah metodologi pengembangan software yang iteratif dan incremental, menekankan pada kolaborasi, fleksibilitas, dan delivery cepat (Beck et al., 2001). Prinsip Agile yang diterapkan:

1. **Iterative Development**: Pengembangan dalam sprint 1-2 minggu
2. **Continuous Integration**: Integrasi dan testing otomatis
3. **User Feedback**: Validasi fitur dengan pengguna secara berkala
4. **Adaptive Planning**: Penyesuaian prioritas berdasarkan feedback

### 2.8.2 Feature-Based Architecture

Feature-Based Architecture adalah pendekatan organisasi kode di mana file dikelompokkan berdasarkan fitur bisnis, bukan tipe teknis (Martin, 2017). Struktur:

```
src/features/
├── auth/          # Semua kode terkait autentikasi
├── map/           # Semua kode terkait peta
├── reports/       # Semua kode terkait laporan
└── admin/         # Semua kode terkait admin
```

Keunggulan:
- **High Cohesion**: Kode yang related berada di satu tempat
- **Low Coupling**: Fitur independen satu sama lain
- **Easy Navigation**: Developer langsung tahu di mana mencari kode
- **Scalability**: Mudah menambah fitur baru tanpa mengubah struktur

### 2.8.3 Test-Driven Development (TDD)

TDD adalah praktik di mana test ditulis sebelum kode implementasi (Beck, 2003). Siklus TDD:

1. **Red**: Tulis test yang gagal
2. **Green**: Tulis kode minimal untuk pass test
3. **Refactor**: Improve kode tanpa mengubah behavior

Dalam penelitian ini, TDD diterapkan untuk:
- Unit testing utility functions (validation, formatting)
- Integration testing API calls
- E2E testing user flows dengan Playwright

---

**Referensi:**

- Agafonkin, V. (2023). Leaflet Documentation. https://leafletjs.com/
- Aronoff, S. (1989). Geographic Information Systems: A Management Perspective. WDL Publications.
- Beck, K. (2003). Test-Driven Development: By Example. Addison-Wesley.
- Beck, K., et al. (2001). Manifesto for Agile Software Development. https://agilemanifesto.org/
- Facebook Inc. (2023). React Documentation. https://react.dev/
- Google. (2023). Progressive Web Apps. https://web.dev/progressive-web-apps/
- Longley, P. A., et al. (2015). Geographic Information Science and Systems. 4th Edition. Wiley.
- Martin, R. C. (2017). Clean Architecture. Prentice Hall.
- Microsoft. (2023). TypeScript Documentation. https://www.typescriptlang.org/
- Peng, Z. R., & Tsou, M. H. (2003). Internet GIS. John Wiley & Sons.
- Supabase Inc. (2023). Supabase Documentation. https://supabase.com/docs
- Vite Team. (2023). Vite Documentation. https://vitejs.dev/
