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
  <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Hero Section */}
  <section className="container py-12 md:py-16">
  <div className="max-w-4xl mx-auto text-center space-y-8 px-2 md:px-0">
          <div className="inline-flex p-3 bg-primary/10 rounded-full mb-4">
            <MapPin className="icon-lg text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Lapor Infrastruktur
            <span className="block text-primary mt-2">Dengan Mudah</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Platform pelaporan dan monitoring kondisi infrastruktur publik secara real-time.
            Bersama membangun kota yang lebih baik.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {authLoading ? null : !user ? (
              // Anonymous: only show Login/Signup entry point
              <Link to="/auth">
                <Button size="lg" className="gap-2 shadow-lg rounded-xl py-3 px-6">
                  Masuk / Daftar
                </Button>
              </Link>
            ) : (
              // Authenticated: show actions based on role
              <>
                <Link to="/report">
                  <Button size="lg" className="gap-2 shadow-lg">
                    <FileText className="w-5 h-5" />
                    Buat Laporan
                  </Button>
                </Link>
                <Link to="/map">
                  <Button size="lg" variant="outline" className="gap-2">
                    <MapIcon className="w-5 h-5" />
                    Lihat Peta
                  </Button>
                </Link>
                {isAdmin && (
                  <Link to="/admin">
                    <Button size="lg" variant="outline" className="gap-2">
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
      <section className="container py-10">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
          <Card className="text-center">
            <CardHeader className="pb-3 rounded-xl shadow-md">
              <CardTitle className="text-2xl font-bold text-primary">{stats.total}</CardTitle>
              <CardDescription>Total Laporan</CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center">
            <CardHeader className="pb-3 rounded-xl shadow-md">
              <CardTitle className="text-2xl font-bold text-accent">{stats.baru}</CardTitle>
              <CardDescription>Laporan Baru</CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center">
            <CardHeader className="pb-3 rounded-xl shadow-md">
              <CardTitle className="text-2xl font-bold text-secondary">{stats.diproses}</CardTitle>
              <CardDescription>Diproses</CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center">
            <CardHeader className="pb-3 rounded-xl shadow-md">
              <CardTitle className="text-2xl font-bold text-green-600">{stats.selesai}</CardTitle>
              <CardDescription>Selesai</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Charts Section */}
      <section className="container py-8">
  <div className="max-w-5xl mx-auto px-2 md:px-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Insight Laporan</h2>
            <Select value={String(chartDays)} onValueChange={(v) => setChartDays(Number(v) as 7 | 30)}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 hari</SelectItem>
                <SelectItem value="30">30 hari</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <Card className="rounded-xl shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Tren Laporan ({chartDays} hari)</CardTitle>
              </CardHeader>
              <CardContent>
                {chartDaily.length === 0 ? (
                  chartLoading ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Memuat chart...</div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Tidak ada data</div>
                  )
                ) : (
                  <div className="relative">
                    <ChartContainer
                      config={{ reports: { label: 'Laporan', color: 'hsl(var(--primary))' } }}
                      className="h-56 sm:h-64 md:h-72"
                      withAspect={false}
                    >
                      <LineChart data={chartDaily} margin={{ top: 8, left: 12, right: 12, bottom: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(chartDaily.length/8)-1)} height={52} tickMargin={6} />
                        <YAxis allowDecimals={false} width={32} tickMargin={6} domain={[0, 'dataMax + 1']} tickCount={5} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="count" stroke="var(--color-reports)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ChartContainer>
                    <LoadingOverlay show={chartLoading} text="Memuat data..." />
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Kategori Terbanyak ({chartDays} hari)</CardTitle>
              </CardHeader>
              <CardContent>
                {chartByCategory.length === 0 ? (
                  chartLoading ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Memuat chart...</div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Tidak ada data</div>
                  )
                ) : (
                  <div className="relative">
                    <ChartContainer
                      config={{ count: { label: 'Jumlah', color: 'hsl(var(--primary))' } }}
                      className="h-56 sm:h-64 md:h-72"
                      withAspect={false}
                    >
                        <BarChart data={chartByCategory} margin={{ top: 8, left: 12, right: 12, bottom: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} angle={-30} textAnchor="end" interval={0} height={52} tickMargin={6} />
                        <YAxis allowDecimals={false} width={32} tickMargin={6} domain={[0, 'dataMax + 1']} tickCount={5} />
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                    <LoadingOverlay show={chartLoading} text="Memuat data..." />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-10">
  <div className="max-w-5xl mx-auto px-2 md:px-0">
          <h2 className="text-3xl font-bold text-center mb-8 md:mb-10">Fitur Unggulan</h2>
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 items-stretch">
            <Card className="border-2 hover:border-primary transition-all duration-300 h-full rounded-xl shadow-md">
              <CardHeader>
                <div className="p-2.5 bg-primary/10 rounded-lg w-fit mb-3">
                  <FileText className="icon-lg text-primary" />
                </div>
                <CardTitle>Laporan Mudah</CardTitle>
                <CardDescription>
                  Buat laporan dengan foto, lokasi GPS, dan deskripsi lengkap dalam hitungan detik.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-secondary transition-all duration-300 h-full rounded-xl shadow-md">
              <CardHeader>
                <div className="p-2.5 bg-secondary/10 rounded-lg w-fit mb-3">
                  <MapIcon className="icon-lg text-secondary" />
                </div>
                <CardTitle>Peta Interaktif</CardTitle>
                <CardDescription>
                  Lihat semua laporan di peta real-time dengan status dan kategori yang jelas.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-accent transition-all duration-300 h-full rounded-xl shadow-md">
              <CardHeader>
                <div className="p-2.5 bg-accent/10 rounded-lg w-fit mb-3">
                  <Users className="icon-lg text-accent" />
                </div>
                <CardTitle>Dashboard Admin</CardTitle>
                <CardDescription>
                  Panel kontrol lengkap untuk mengelola dan memantau semua laporan infrastruktur.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container py-10 mb-12">
  <div className="max-w-4xl mx-auto px-2 md:px-0">
          <h2 className="text-3xl font-bold text-center mb-8 md:mb-10">Cara Kerja</h2>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold">Daftar & Masuk</h3>
              <p className="text-muted-foreground">
                Buat akun gratis untuk mulai membuat laporan
              </p>
            </div>
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary text-secondary-foreground text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold">Buat Laporan</h3>
              <p className="text-muted-foreground">
                Ambil foto, tandai lokasi, dan kirim laporan
              </p>
            </div>
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent text-accent-foreground text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold">Pantau Progress</h3>
              <p className="text-muted-foreground">
                Lihat status perbaikan secara real-time di peta
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Information Blocks */}
      <section className="container py-8">
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto px-2 md:px-0">
          <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
            <RecentReports />
            <CategoryLegend />
          </div>
          <div className="flex flex-col gap-6 md:gap-8">
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
