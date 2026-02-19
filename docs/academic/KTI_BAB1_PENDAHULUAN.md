# RANCANG BANGUN SISTEM INFORMASI GEOGRAFIS PELAPORAN KERUSAKAN INFRASTRUKTUR SUMBER DAYA AIR BERBASIS WEB MOBILE MENGGUNAKAN REACTJS DAN LEAFLET

---

## BAB I: PENDAHULUAN

### 1.1 Latar Belakang

Indonesia sebagai negara kepulauan dengan curah hujan tinggi menghadapi tantangan besar dalam pengelolaan sumber daya air dan infrastruktur terkait. Berdasarkan data Badan Nasional Penanggulangan Bencana (BNPB), pada tahun 2023 terjadi lebih dari 3.000 kejadian bencana hidrometeorologi yang meliputi banjir, tanah longsor, dan kerusakan infrastruktur irigasi. Kondisi ini menuntut sistem pelaporan dan monitoring yang cepat, akurat, dan terintegrasi untuk mendukung pengambilan keputusan dalam penanganan darurat maupun pemeliharaan preventif.

Sistem pelaporan konvensional yang masih mengandalkan metode manual melalui telepon, surat, atau kunjungan langsung ke kantor instansi terkait memiliki sejumlah keterbatasan signifikan. Pertama, waktu respons yang lambat karena proses administrasi yang panjang dan birokratis. Kedua, akurasi data lokasi yang rendah akibat deskripsi verbal yang tidak presisi. Ketiga, kesulitan dalam dokumentasi visual yang memadai untuk verifikasi kondisi lapangan. Keempat, tidak adanya basis data terpusat yang memungkinkan analisis spasial dan temporal untuk perencanaan jangka panjang.

Perkembangan teknologi informasi dan komunikasi, khususnya dalam bidang Geographic Information System (GIS) dan aplikasi web mobile, membuka peluang transformasi digital dalam sistem pelaporan infrastruktur. Penetrasi smartphone di Indonesia yang mencapai 89% dari total populasi (We Are Social, 2023) menjadi fondasi kuat untuk implementasi sistem pelaporan berbasis lokasi yang dapat diakses oleh masyarakat luas. Teknologi web modern seperti Progressive Web Application (PWA) memungkinkan pengembangan aplikasi yang responsif, dapat diakses lintas platform, dan bahkan berfungsi dalam kondisi offline—aspek krusial mengingat masih banyak wilayah di Indonesia dengan konektivitas internet terbatas.

Sistem Informasi Pelaporan Sumber Daya Air (SIPASDA) dikembangkan sebagai solusi komprehensif untuk mengatasi permasalahan tersebut. Sistem ini mengintegrasikan teknologi pemetaan interaktif berbasis Leaflet, framework ReactJS untuk antarmuka pengguna yang responsif, dan Supabase sebagai backend real-time untuk memastikan sinkronisasi data yang cepat dan andal. Pendekatan berbasis web mobile dipilih untuk memaksimalkan aksesibilitas tanpa memerlukan instalasi aplikasi native, sehingga mengurangi hambatan adopsi oleh pengguna.

Penelitian ini berfokus pada perancangan dan implementasi sistem yang tidak hanya memfasilitasi pelaporan oleh masyarakat, tetapi juga menyediakan dashboard administratif dengan kemampuan analisis geospasial untuk mendukung pengambilan keputusan berbasis data. Fitur-fitur seperti clustering marker untuk visualisasi kepadatan laporan, heatmap untuk analisis distribusi spasial, dan tools pengukuran untuk estimasi kerusakan menjadi nilai tambah yang membedakan sistem ini dari solusi konvensional.

### 1.2 Rumusan Masalah

Berdasarkan latar belakang yang telah diuraikan, penelitian ini merumuskan permasalahan sebagai berikut:

1. Bagaimana merancang arsitektur sistem informasi geografis yang responsif dan dapat diakses melalui berbagai perangkat mobile untuk pelaporan kerusakan infrastruktur sumber daya air?

2. Bagaimana mengimplementasikan sistem pelaporan berbasis lokasi yang akurat dengan memanfaatkan teknologi GPS dan geocoding untuk memastikan presisi data spasial?

3. Bagaimana membangun mekanisme penyimpanan dan sinkronisasi data real-time yang andal untuk mendukung kolaborasi antara pelapor dan administrator?

4. Bagaimana mengintegrasikan fitur visualisasi geospasial interaktif yang memungkinkan analisis distribusi dan kepadatan laporan untuk mendukung prioritas penanganan?

5. Bagaimana mengoptimalkan performa aplikasi web mobile agar tetap responsif dengan ukuran bundle minimal dan waktu loading yang cepat, terutama pada koneksi internet terbatas?

6. Bagaimana memastikan keamanan data dan privasi pengguna dalam sistem yang dapat diakses secara publik?

### 1.3 Batasan Masalah

Untuk memfokuskan ruang lingkup penelitian, ditetapkan batasan masalah sebagai berikut:

1. Sistem dikembangkan sebagai aplikasi web berbasis Progressive Web Application (PWA) yang dapat diakses melalui browser modern (Chrome, Firefox, Safari, Edge versi terbaru).

2. Cakupan geografis implementasi awal difokuskan pada wilayah Kabupaten Ciamis, Jawa Barat, dengan kemungkinan ekspansi ke wilayah lain.

3. Kategori pelaporan mencakup kerusakan jalan, jembatan, irigasi, sungai, dan infrastruktur terkait sumber daya air lainnya.

4. Sistem menggunakan data peta dasar dari OpenStreetMap dan tidak mengembangkan tile server sendiri.

5. Autentikasi pengguna menggunakan sistem email/password melalui Supabase Auth tanpa integrasi Single Sign-On (SSO) eksternal.

6. Analisis geospasial terbatas pada operasi dasar seperti buffering, clustering, heatmap, dan pengukuran jarak/luas.

7. Sistem tidak mencakup integrasi dengan sistem legacy atau ERP yang sudah ada di instansi pemerintah.

### 1.4 Tujuan Penelitian

Penelitian ini bertujuan untuk:

1. **Tujuan Umum:**
   Mengembangkan sistem informasi geografis berbasis web mobile yang memfasilitasi pelaporan kerusakan infrastruktur sumber daya air secara real-time dengan akurasi lokasi tinggi dan dokumentasi visual yang memadai.

2. **Tujuan Khusus:**
   
   a. Merancang arsitektur sistem berbasis fitur (*feature-based architecture*) yang modular, scalable, dan mudah dimaintain untuk mendukung pengembangan berkelanjutan.
   
   b. Mengimplementasikan antarmuka pengguna yang responsif dan intuitif menggunakan ReactJS dan Tailwind CSS dengan pendekatan mobile-first design.
   
   c. Mengintegrasikan pustaka pemetaan Leaflet dengan fitur interaktif seperti marker clustering, heatmap visualization, dan drawing tools untuk analisis spasial.
   
   d. Membangun sistem backend real-time menggunakan Supabase yang mendukung autentikasi, penyimpanan data terstruktur dengan PostgreSQL, dan storage untuk media foto.
   
   e. Mengimplementasikan mekanisme offline-first dengan IndexedDB dan Service Worker untuk memastikan sistem tetap dapat digunakan pada kondisi konektivitas terbatas.
   
   f. Mengoptimalkan performa aplikasi melalui teknik lazy loading, code splitting, dan caching strategy untuk mencapai skor Lighthouse minimal 90/100.
   
   g. Menerapkan Row Level Security (RLS) pada database untuk memastikan keamanan data dan kontrol akses yang granular.
   
   h. Mengembangkan dashboard administratif dengan fitur filtering, bulk operations, export data (CSV/PDF), dan visualisasi statistik untuk mendukung pengambilan keputusan.

### 1.5 Manfaat Penelitian

Penelitian ini diharapkan memberikan manfaat sebagai berikut:

1. **Manfaat Teoritis:**
   
   a. Memberikan kontribusi pada pengembangan ilmu pengetahuan di bidang Sistem Informasi Geografis, khususnya dalam implementasi web-based GIS untuk aplikasi pelaporan publik.
   
   b. Menyediakan referensi akademis tentang penerapan arsitektur berbasis fitur (*feature-based architecture*) dalam pengembangan aplikasi web skala menengah.
   
   c. Mendemonstrasikan integrasi teknologi modern (ReactJS, Leaflet, Supabase) dalam konteks aplikasi pemerintahan dan pelayanan publik.

2. **Manfaat Praktis:**
   
   a. **Bagi Masyarakat:**
      - Menyediakan kanal pelaporan yang mudah diakses, cepat, dan tidak memerlukan kunjungan fisik ke kantor instansi.
      - Meningkatkan partisipasi masyarakat dalam pengawasan dan pemeliharaan infrastruktur publik.
      - Memberikan transparansi dalam proses penanganan laporan melalui sistem tracking status.
   
   b. **Bagi Pemerintah/Instansi Terkait:**
      - Mempercepat waktu respons dalam penanganan kerusakan infrastruktur dari rata-rata 3-5 hari menjadi kurang dari 24 jam.
      - Menyediakan basis data terpusat dengan informasi spasial yang akurat untuk perencanaan pemeliharaan preventif.
      - Memfasilitasi analisis tren kerusakan berdasarkan lokasi, waktu, dan kategori untuk alokasi anggaran yang lebih efektif.
      - Mengurangi biaya operasional survei lapangan melalui dokumentasi foto dan koordinat GPS yang presisi.
   
   c. **Bagi Pengembang/Peneliti:**
      - Menyediakan studi kasus implementasi Progressive Web Application dengan fitur offline-first.
      - Memberikan contoh praktis optimasi performa web application melalui lazy loading dan code splitting.
      - Mendemonstrasikan penerapan best practices dalam keamanan aplikasi web (XSS prevention, RLS, CSP).

3. **Manfaat Ekonomis:**
   
   a. Mengurangi biaya administrasi dan operasional sistem pelaporan manual yang memerlukan tenaga kerja intensif.
   
   b. Meminimalkan kerugian ekonomi akibat keterlambatan penanganan kerusakan infrastruktur yang dapat berdampak pada aktivitas ekonomi masyarakat.
   
   c. Mengoptimalkan alokasi anggaran pemeliharaan infrastruktur melalui data historis dan analisis prediktif.

### 1.6 Sistematika Penulisan

Penulisan karya tulis ilmiah ini disusun dengan sistematika sebagai berikut:

**BAB I: PENDAHULUAN**
Bab ini menguraikan latar belakang penelitian, rumusan masalah, batasan masalah, tujuan penelitian, manfaat penelitian, dan sistematika penulisan.

**BAB II: LANDASAN TEORI**
Bab ini membahas teori-teori yang menjadi dasar penelitian, meliputi konsep Geographic Information System (GIS), teknologi web modern (ReactJS, Vite), pustaka pemetaan Leaflet, Backend-as-a-Service (Supabase), Progressive Web Application (PWA), dan metodologi pengembangan perangkat lunak.

**BAB III: METODOLOGI PENELITIAN**
Bab ini menjelaskan metode penelitian yang digunakan, arsitektur sistem, desain database, perancangan antarmuka pengguna, dan alur kerja pengembangan aplikasi.

**BAB IV: HASIL DAN PEMBAHASAN**
Bab ini menyajikan hasil implementasi sistem, pembahasan fitur-fitur utama, hasil pengujian fungsional dan non-fungsional, serta analisis performa sistem.

**BAB V: KESIMPULAN DAN SARAN**
Bab ini berisi kesimpulan dari hasil penelitian dan saran untuk pengembangan lebih lanjut.

---

**Catatan:** Dokumen ini merupakan bagian dari Karya Tulis Ilmiah lengkap yang terdiri dari 5 bab. Untuk bab-bab selanjutnya, silakan merujuk pada file terpisah.
