import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";
import {
  FileText,
  Map as MapIcon,
  Users,
  CheckCircle,
  Clock,
  ArrowRight,
  Activity,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/services/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Footer from "@/components/layout/Footer";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import StatusLegend from "@/features/home/StatusLegend";
import CategoryLegend from "@/features/home/CategoryLegend";
import RecentReports from "@/features/home/RecentReports";
import FAQ from "@/features/home/FAQ";
import BottomCTA from "@/features/home/BottomCTA";
import { motion, Variants, useReducedMotion } from "framer-motion";
import { logger } from "@/lib/logger";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const Home = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [stats, setStats] = useState({
    total: 0,
    baru: 0,
    diproses: 0,
    selesai: 0,
  });
  const [chartDays, setChartDays] = useState<7 | 30>(30);
  const [chartDaily, setChartDaily] = useState<
    Array<{ date: string; count: number }>
  >([]);
  const [chartByCategory, setChartByCategory] = useState<
    Array<{ name: string; count: number }>
  >([]);
  const [chartLoading, setChartLoading] = useState(false);

  const fetchChartData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setChartDaily([]);
      setChartByCategory([]);
      return;
    }
    try {
      setChartLoading(true);
      const fromISO = new Date(
        Date.now() - chartDays * 24 * 60 * 60 * 1000,
      ).toISOString();
      const { data, error } = await supabase
        .from("reports")
        .select("created_at, category")
        .gte("created_at", fromISO);
      if (error) throw error;

      const items = (data || []) as Array<{
        created_at: string;
        category: string | null;
      }>;

      // build daily buckets
      const days: Array<{ dateKey: string; label: string; count: number }> = [];
      for (let i = chartDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
        });
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
      logger.warn("Gagal memuat data chart beranda:", e);
    } finally {
      setChartLoading(false);
    }
  }, [chartDays]);

  const fetchStats = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const [totalRes, baruRes, diprosesRes, selesaiRes] = await Promise.all([
      supabase.from("reports").select("id", { count: "exact", head: true }),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "baru"),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "diproses"),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "selesai"),
    ]);

    setStats({
      total: (totalRes.count ?? 0) as number,
      baru: (baruRes.count ?? 0) as number,
      diproses: (diprosesRes.count ?? 0) as number,
      selesai: (selesaiRes.count ?? 0) as number,
    });
  }, [isSupabaseConfigured]);

  useEffect(() => {
    fetchStats();
    fetchChartData();

    if (!isSupabaseConfigured) return;

    // realtime refresh when reports change
    const channel: RealtimeChannel = supabase
      .channel("home-reports-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => {
          fetchStats();
          fetchChartData();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchStats, fetchChartData, isSupabaseConfigured]);

  useEffect(() => {
    fetchChartData();
  }, [chartDays, fetchChartData]);

  // moved above

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-background to-teal-500/5" />
        {!prefersReducedMotion && (
          <>
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/10 rounded-full blur-[100px]"
            />
            <motion.div
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2,
              }}
              className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-teal-500/10 rounded-full blur-[120px]"
            />
          </>
        )}
      </div>

      {/* Hero Section */}
      <section className="container pt-24 pb-16 md:pt-32 md:pb-24 lg:pt-40 lg:pb-32 px-4 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto text-center space-y-8 md:space-y-10"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border-border shadow-sm border-primary/20 text-primary text-sm font-medium mb-4 shadow-float"
          >
            <Activity className="w-4 h-4" />
            <span>Sistem Pemantauan Real-time</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-6xl md:text-8xl lg:text-[10rem] font-black tracking-[-0.04em] text-foreground leading-[0.85]"
          >
            Sistem Informasi <br className="hidden md:block" />
            <span className="text-primary">Pelaporan SDA</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-light"
          >
            Platform profesional untuk pelaporan, pemantauan, dan penanganan
            permasalahan sumber daya air secara real-time.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-8"
          >
            {authLoading ? null : !user ? (
              <Link to="/auth">
                <Button
                  size="lg"
                  className="group gap-3 shadow-xl rounded-2xl py-8 px-10 md:px-12 text-xl font-bold bg-primary hover:bg-primary-hover text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98]"
                >
                  Masuk / Daftar
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/report">
                  <Button
                    size="lg"
                    className="group gap-3 shadow-xl rounded-2xl py-8 px-10 md:px-12 text-xl font-bold bg-primary hover:bg-primary-hover text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98]"
                  >
                    <FileText className="w-6 h-6" />
                    Buat Laporan
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/map">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-3 rounded-2xl py-8 px-10 md:px-12 text-xl font-bold border-2 bg-card border-border shadow-sm hover:bg-muted transition-all active:scale-[0.98]"
                  >
                    <MapIcon className="w-6 h-6" />
                    Lihat Peta
                  </Button>
                </Link>
                {isAdmin && (
                  <Link to="/admin">
                    <Button
                      size="lg"
                      variant="outline"
                      className="gap-3 rounded-2xl py-8 px-10 md:px-12 text-xl font-bold border-2 bg-card border-border shadow-sm hover:bg-muted transition-all active:scale-[0.98]"
                    >
                      Dashboard Admin
                    </Button>
                  </Link>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="container py-12 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto px-4"
        >
          {[
            {
              label: "Total Laporan",
              value: stats.total,
              icon: FileText,
              color: "text-primary",
              bg: "bg-primary/10",
              border: "hover:border-primary/50",
              className:
                "col-span-2 row-span-2 flex flex-col justify-center min-h-[320px]",
              iconScale: "w-12 h-12",
              textScale: "text-7xl md:text-8xl lg:text-[8rem]",
              labelScale: "text-xl md:text-2xl font-semibold",
            },
            {
              label: "Laporan Baru",
              value: stats.baru,
              icon: Clock,
              color: "text-amber-500",
              bg: "bg-amber-500/10",
              border: "hover:border-amber-500/50",
              className: "col-span-2 md:col-span-2",
              iconScale: "w-8 h-8",
              textScale: "text-5xl md:text-6xl",
              labelScale: "text-base md:text-lg font-medium",
            },
            {
              label: "Diproses",
              value: stats.diproses,
              icon: Users,
              color: "text-cyan-500",
              bg: "bg-cyan-500/10",
              border: "hover:border-cyan-500/50",
              className: "col-span-1",
              iconScale: "w-7 h-7",
              textScale: "text-4xl md:text-5xl",
              labelScale: "text-sm md:text-base font-medium",
            },
            {
              label: "Selesai",
              value: stats.selesai,
              icon: CheckCircle,
              color: "text-green-500",
              bg: "bg-green-500/10",
              border: "hover:border-green-500/50",
              className: "col-span-1",
              iconScale: "w-7 h-7",
              textScale: "text-4xl md:text-5xl",
              labelScale: "text-sm md:text-base font-medium",
            },
          ].map((stat, i) => (
            <Card
              key={i}
              variant="glass"
              className={`p-6 md:p-8 rounded-3xl ${stat.border} transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${stat.className}`}
            >
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div
                  className={`p-4 ${stat.bg} rounded-2xl group-hover:scale-110 transition-transform duration-500`}
                >
                  <stat.icon className={`${stat.iconScale} ${stat.color}`} />
                </div>
              </div>
              <div className="space-y-1 md:space-y-2">
                <div
                  className={`font-black tracking-tighter ${stat.color} ${stat.textScale} leading-none`}
                >
                  {stat.value}
                </div>
                <div className={`text-muted-foreground ${stat.labelScale}`}>
                  {stat.label}
                </div>
              </div>
            </Card>
          ))}
        </motion.div>
      </section>

      {/* Charts Section */}
      <section className="container py-16 md:py-24 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="max-w-6xl mx-auto px-4"
        >
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Insight Laporan
            </h2>
            <Select
              value={String(chartDays)}
              onValueChange={(v) => setChartDays(Number(v) as 7 | 30)}
            >
              <SelectTrigger className="w-full sm:w-[160px] bg-card border-border shadow-sm border-white/20 rounded-xl h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Hari Terakhir</SelectItem>
                <SelectItem value="30">30 Hari Terakhir</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <Card
              variant="glass"
              className="p-6 md:p-8 rounded-3xl"
            >
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-foreground">
                  Tren Laporan
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Perkembangan jumlah laporan dalam {chartDays} hari terakhir
                </p>
              </div>
              <div className="relative w-full overflow-hidden">
                {chartDaily.length === 0 ? (
                  chartLoading ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Memuat chart...
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Tidak ada data
                    </div>
                  )
                ) : (
                  <div className="h-64 md:h-72 w-full">
                    <ChartContainer
                      config={{
                        count: {
                          label: "Laporan",
                          color: "hsl(var(--primary))",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartDaily}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorReports"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="hsl(var(--primary))"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="hsl(var(--primary))"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            strokeOpacity={0.1}
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tick={{
                              fontSize: 12,
                              fill: "hsl(var(--muted-foreground))",
                            }}
                            dy={10}
                          />
                          <YAxis
                            allowDecimals={false}
                            tickLine={false}
                            axisLine={false}
                            tick={{
                              fontSize: 12,
                              fill: "hsl(var(--muted-foreground))",
                            }}
                          />
                          <ChartTooltip
                            content={<ChartTooltipContent />}
                            cursor={{
                              stroke: "hsl(var(--primary))",
                              strokeWidth: 1,
                              strokeDasharray: "4 4",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="count"
                            name="Laporan"
                            stroke="hsl(var(--primary))"
                            strokeWidth={4}
                            dot={false}
                            activeDot={{
                              r: 6,
                              fill: "hsl(var(--primary))",
                              stroke: "white",
                              strokeWidth: 2,
                            }}
                            fill="url(#colorReports)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                    <LoadingOverlay show={chartLoading} text="Memuat data..." />
                  </div>
                )}
              </div>
            </Card>

            <Card
              variant="glass"
              className="p-6 md:p-8 rounded-3xl"
            >
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-foreground">
                  Kategori Terbanyak
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Distribusi laporan berdasarkan kategori
                </p>
              </div>
              <div className="relative w-full overflow-hidden">
                {chartByCategory.length === 0 ? (
                  chartLoading ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Memuat chart...
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Tidak ada data
                    </div>
                  )
                ) : (
                  <div className="h-64 md:h-72 w-full">
                    <ChartContainer
                      config={{
                        count: {
                          label: "Jumlah",
                          color: "hsl(var(--primary))",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartByCategory}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            strokeOpacity={0.1}
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            tick={{
                              fontSize: 12,
                              fill: "hsl(var(--muted-foreground))",
                            }}
                            dy={10}
                          />
                          <YAxis
                            allowDecimals={false}
                            tickLine={false}
                            axisLine={false}
                            tick={{
                              fontSize: 12,
                              fill: "hsl(var(--muted-foreground))",
                            }}
                          />
                          <ChartTooltip
                            content={<ChartTooltipContent nameKey="name" />}
                            cursor={{ fill: "hsl(var(--muted)/0.5)" }}
                          />
                          <Bar
                            dataKey="count"
                            name="Jumlah"
                            fill="hsl(var(--primary))"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={50}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                    <LoadingOverlay show={chartLoading} text="Memuat data..." />
                  </div>
                )}
              </div>
            </Card>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container py-16 md:py-24 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="max-w-6xl mx-auto px-4"
        >
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Fitur Unggulan
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Platform yang dirancang untuk memudahkan pelaporan dan pemantauan
              infrastruktur secara komprehensif.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                title: "Laporan Mudah",
                desc: "Buat laporan dengan foto, lokasi GPS, dan deskripsi lengkap dalam hitungan detik.",
                icon: FileText,
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                title: "Peta Interaktif",
                desc: "Lihat semua laporan di peta real-time dengan status dan kategori yang jelas.",
                icon: MapIcon,
                color: "text-cyan-500",
                bg: "bg-cyan-500/10",
              },
              {
                title: "Dashboard Admin",
                desc: "Panel kontrol lengkap untuk mengelola dan memantau semua laporan infrastruktur.",
                icon: Users,
                color: "text-amber-500",
                bg: "bg-amber-500/10",
              },
            ].map((feature, i) => (
              <Card
                key={i}
                variant="glass"
                className="p-8 md:p-10 rounded-3xl hover:border-white/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
              >
                <div
                  className={`p-5 ${feature.bg} rounded-2xl w-fit mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}
                >
                  <feature.icon className={`w-10 h-10 ${feature.color}`} />
                </div>
                <h2 className="text-2xl font-bold mb-4">{feature.title}</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {feature.desc}
                </p>
              </Card>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section className="container py-16 md:py-24 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="max-w-5xl mx-auto px-4"
        >
          <motion.div variants={itemVariants} className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Cara Kerja
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tiga langkah mudah untuk berpartisipasi dalam pemeliharaan
              infrastruktur.
            </p>
          </motion.div>

          <div className="relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-1 bg-gradient-to-r from-primary/20 via-teal-500/20 to-green-500/20 rounded-full" />

            <div className="grid md:grid-cols-3 gap-12 md:gap-8 relative">
              {[
                {
                  step: 1,
                  title: "Daftar & Masuk",
                  desc: "Buat akun gratis untuk mulai membuat laporan",
                  color: "from-primary to-blue-600",
                  shadow: "shadow-primary/30",
                },
                {
                  step: 2,
                  title: "Buat Laporan",
                  desc: "Ambil foto, tandai lokasi, dan kirim laporan",
                  color: "from-teal-500 to-teal-600",
                  shadow: "shadow-teal-500/30",
                },
                {
                  step: 3,
                  title: "Pantau Progress",
                  desc: "Lihat status perbaikan secara real-time di peta",
                  color: "from-green-500 to-green-600",
                  shadow: "shadow-green-500/30",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="text-center space-y-6 relative group"
                >
                  <div
                    className={`mx-auto flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${item.color} text-white text-3xl font-bold shadow-xl ${item.shadow} relative z-10 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500`}
                  >
                    {item.step}
                  </div>
                  <h3 className="text-2xl font-bold">{item.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-[250px] mx-auto">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Information Blocks */}
      <section className="container py-16 md:py-24 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4"
        >
          <motion.div
            variants={itemVariants}
            className="lg:col-span-2 flex flex-col gap-8"
          >
            <RecentReports />
            <CategoryLegend />
          </motion.div>
          <motion.div variants={itemVariants} className="flex flex-col gap-8">
            <StatusLegend />
            <FAQ />
          </motion.div>
        </motion.div>
      </section>

      <BottomCTA />

      <Footer />
    </div>
  );
};

export default Home;
