import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, FileText, Map as MapIcon, Users, CheckCircle, Clock } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Footer from "@/components/Footer";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import StatusLegend from "@/components/home/StatusLegend";
import CategoryLegend from "@/components/home/CategoryLegend";
import RecentReports from "@/components/home/RecentReports";
import FAQ from "@/components/home/FAQ";
import BottomCTA from "@/components/home/BottomCTA";

const Home = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    baru: 0,
    diproses: 0,
    selesai: 0,
  });
  const [chartDays, setChartDays] = useState<7 | 30>(30);
  const [chartDaily, setChartDaily] = useState<Array<{ date: string; count: number }>>([]);
  const [chartByCategory, setChartByCategory] = useState<Array<{ name: string; count: number }>>([]);
  const [chartLoading, setChartLoading] = useState(false);

  const fetchChartData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setChartDaily([]);
      setChartByCategory([]);
      return;
    }
    try {
      setChartLoading(true);
      const fromISO = new Date(Date.now() - chartDays * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("reports")
        .select("created_at, category")
        .gte("created_at", fromISO);
      if (error) throw error;

      const items = (data || []) as Array<{ created_at: string; category: string | null }>;

      // build daily buckets
      const days: Array<{ dateKey: string; label: string; count: number }> = [];
      for (let i = chartDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" });
        days.push({ dateKey, label, count: 0 });
      }
      const dayMap = new Map(days.map((x) => [x.dateKey, x] as const));
      for (const it of items) {
        const d = new Date(it.created_at);
        if (isNaN(d.getTime())) continue;
        d.setHours(0, 0, 0, 0);
        const key = d.toISOString().slice(0, 10);
        const bucket = dayMap.get(key);
        if (bucket) bucket.count += 1;
      }
      setChartDaily(days.map((x) => ({ date: x.label, count: x.count })));

      // build category counts (top 6)
      const catCount = new Map<string, number>();
      for (const it of items) {
        const name = it.category || "Lainnya";
        catCount.set(name, (catCount.get(name) || 0) + 1);
      }
      const catArr = Array.from(catCount.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      setChartByCategory(catArr);
    } catch (e) {
      // fail silently on landing page charts
      console.warn("Gagal memuat data chart beranda:", e);
    } finally {
      setChartLoading(false);
    }
  }, [chartDays]);

  useEffect(() => {
    fetchStats();
    fetchChartData();

    if (!isSupabaseConfigured) return;

    // realtime refresh when reports change
    const channel: RealtimeChannel = supabase
      .channel("home-reports-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        fetchStats();
        fetchChartData();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchChartData]);

  useEffect(() => {
    fetchChartData();
  }, [chartDays, fetchChartData]);

  const fetchStats = async () => {
    if (!isSupabaseConfigured) return;
    const [totalRes, baruRes, diprosesRes, selesaiRes] = await Promise.all([
      supabase.from("reports").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "baru"),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "diproses"),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "selesai"),
    ]);

    setStats({
      total: (totalRes.count ?? 0) as number,
      baru: (baruRes.count ?? 0) as number,
      diproses: (diprosesRes.count ?? 0) as number,
      selesai: (selesaiRes.count ?? 0) as number,
    });
  };

  // moved above

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-background to-teal-500/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Hero Section */}
      <section className="container py-20 md:py-28">
        <div className="max-w-4xl mx-auto text-center space-y-8 px-4">
          <div className="inline-flex p-4 bg-gradient-to-br from-blue-500/20 to-teal-500/20 backdrop-blur-sm rounded-2xl mb-2 shadow-lg border border-white/10 animate-[page-enter_0.6s_ease-out]">
            <MapPin className="w-12 h-12 text-blue-500" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-teal-500 bg-clip-text text-transparent animate-[page-enter_0.8s_ease-out]">
            Sistem Informasi Pelaporan SDA
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-[page-enter_1s_ease-out]">
            Aplikasi berbasis web yang dirancang untuk memudahkan pelaporan, pemantauan, dan penanganan permasalahan terkait sumber daya air (SDA).
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 animate-[page-enter_1.2s_ease-out]">
            {authLoading ? null : !user ? (
              <Link to="/auth">
                <Button size="lg" className="gap-2 shadow-xl rounded-xl py-6 px-8 text-base bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 transition-all hover:shadow-blue-500/50 hover:scale-105">
                  Masuk / Daftar
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/report">
                  <Button size="lg" className="gap-2 shadow-xl rounded-xl py-6 px-8 text-base bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 transition-all hover:shadow-blue-500/50 hover:scale-105">
                    <FileText className="w-5 h-5" />
                    Buat Laporan
                  </Button>
                </Link>
                <Link to="/map">
                  <Button size="lg" variant="outline" className="gap-2 rounded-xl py-6 px-8 text-base border-2 hover:bg-white/5 hover:scale-105 transition-all">
                    <MapIcon className="w-5 h-5" />
                    Lihat Peta
                  </Button>
                </Link>
                {isAdmin && (
                  <Link to="/admin">
                    <Button size="lg" variant="outline" className="gap-2 rounded-xl py-6 px-8 text-base border-2 hover:bg-white/5 hover:scale-105 transition-all">
                      Dashboard Admin
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto px-4">
          <div className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-4xl font-bold text-blue-500">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Laporan</div>
            </div>
          </div>
          <div className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-amber-500/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-4xl font-bold text-amber-500">{stats.baru}</div>
              <div className="text-sm text-muted-foreground">Laporan Baru</div>
            </div>
          </div>
          <div className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <Users className="w-8 h-8 text-cyan-500" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-4xl font-bold text-cyan-500">{stats.diproses}</div>
              <div className="text-sm text-muted-foreground">Diproses</div>
            </div>
          </div>
          <div className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-green-500/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-4xl font-bold text-green-500">{stats.selesai}</div>
              <div className="text-sm text-muted-foreground">Selesai</div>
            </div>
          </div>
        </div>
      </section>

      {/* Charts Section */}
      <section className="container py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Insight Laporan</h2>
            <Select value={String(chartDays)} onValueChange={(v) => setChartDays(Number(v) as 7 | 30)}>
              <SelectTrigger className="w-[140px] bg-white/5 backdrop-blur-md border-white/10 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 hari</SelectItem>
                <SelectItem value="30">30 hari</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-muted-foreground">Tren Laporan ({chartDays} hari)</h3>
              </div>
              <div>
                {chartDaily.length === 0 ? (
                  chartLoading ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">Memuat chart...</div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">Tidak ada data</div>
                  )
                ) : (
                  <div className="relative">
                    <ChartContainer
                      config={{ reports: { label: 'Laporan', color: 'hsl(215 70% 55%)' } }}
                      className="h-64 md:h-72"
                      withAspect={false}
                    >
                      <LineChart data={chartDaily} margin={{ top: 8, left: 12, right: 12, bottom: 12 }}>
                        <defs>
                          <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(215 70% 55%)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(215 70% 55%)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(chartDaily.length/8)-1)} height={52} tickMargin={6} />
                        <YAxis allowDecimals={false} width={32} tickMargin={6} domain={[0, 'dataMax + 1']} tickCount={5} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="count" stroke="hsl(215 70% 55%)" strokeWidth={3} dot={false} fill="url(#colorReports)" />
                      </LineChart>
                    </ChartContainer>
                    <LoadingOverlay show={chartLoading} text="Memuat data..." />
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-muted-foreground">Kategori Terbanyak ({chartDays} hari)</h3>
              </div>
              <div>
                {chartByCategory.length === 0 ? (
                  chartLoading ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">Memuat chart...</div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">Tidak ada data</div>
                  )
                ) : (
                  <div className="relative">
                    <ChartContainer
                      config={{ count: { label: 'Jumlah', color: 'hsl(142 65% 50%)' } }}
                      className="h-64 md:h-72"
                      withAspect={false}
                    >
                      <BarChart data={chartByCategory} margin={{ top: 8, left: 12, right: 12, bottom: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} angle={-30} textAnchor="end" interval={0} height={52} tickMargin={6} />
                        <YAxis allowDecimals={false} width={32} tickMargin={6} domain={[0, 'dataMax + 1']} tickCount={5} />
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <Bar dataKey="count" fill="hsl(142 65% 50%)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                    <LoadingOverlay show={chartLoading} text="Memuat data..." />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Fitur Unggulan</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-blue-500/40 hover:scale-105 transition-all duration-300 hover:shadow-2xl">
              <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
                <FileText className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Laporan Mudah</h3>
              <p className="text-muted-foreground leading-relaxed">
                Buat laporan dengan foto, lokasi GPS, dan deskripsi lengkap dalam hitungan detik.
              </p>
            </div>

            <div className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-teal-500/40 hover:scale-105 transition-all duration-300 hover:shadow-2xl">
              <div className="p-4 bg-gradient-to-br from-teal-500/20 to-teal-600/20 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
                <MapIcon className="w-10 h-10 text-teal-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Peta Interaktif</h3>
              <p className="text-muted-foreground leading-relaxed">
                Lihat semua laporan di peta real-time dengan status dan kategori yang jelas.
              </p>
            </div>

            <div className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-amber-500/40 hover:scale-105 transition-all duration-300 hover:shadow-2xl">
              <div className="p-4 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-10 h-10 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Dashboard Admin</h3>
              <p className="text-muted-foreground leading-relaxed">
                Panel kontrol lengkap untuk mengelola dan memantau semua laporan infrastruktur.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Cara Kerja</h2>
          <div className="relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-teal-500 to-green-500 opacity-30" style={{ top: '2rem' }} />
            
            <div className="grid md:grid-cols-3 gap-12 relative">
              <div className="text-center space-y-6 relative">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-2xl font-bold shadow-xl shadow-blue-500/50 relative z-10">
                  1
                </div>
                <h3 className="text-2xl font-bold">Daftar & Masuk</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Buat akun gratis untuk mulai membuat laporan
                </p>
              </div>
              <div className="text-center space-y-6 relative">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white text-2xl font-bold shadow-xl shadow-teal-500/50 relative z-10">
                  2
                </div>
                <h3 className="text-2xl font-bold">Buat Laporan</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Ambil foto, tandai lokasi, dan kirim laporan
                </p>
              </div>
              <div className="text-center space-y-6 relative">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white text-2xl font-bold shadow-xl shadow-green-500/50 relative z-10">
                  3
                </div>
                <h3 className="text-2xl font-bold">Pantau Progress</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Lihat status perbaikan secara real-time di peta
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Information Blocks */}
      <section className="container py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
          <div className="lg:col-span-2 flex flex-col gap-8">
            <RecentReports />
            <CategoryLegend />
          </div>
          <div className="flex flex-col gap-8">
            <StatusLegend />
            <FAQ />
          </div>
        </div>
      </section>

      <BottomCTA />

      <Footer />
    </div>
  );
};

export default Home;
