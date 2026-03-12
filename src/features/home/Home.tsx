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
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/services/client";
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
} from "recharts";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Footer from "@/components/layout/Footer";
import FAQ from "@/features/home/FAQ";
import BottomCTA from "@/features/home/BottomCTA";
import RecentReports from "@/features/home/RecentReports";
import { motion, Variants, useReducedMotion } from "framer-motion";
import { logger } from "@/lib/logger";
import { SystemGuard } from "@/components/common/SystemGuard";
import { StatSkeleton, ChartSkeleton } from "@/components/common/Skeletons";

// Modular Components & Constants
import HeroStats from "./components/HeroStats";
import LiveMarquee from "./components/LiveMarquee";
import StatsGrid from "./components/StatsGrid";
import FeatureGrid from "./components/FeatureGrid";
import ProcessFlow from "./components/ProcessFlow";
import { FEATURE_LIST, HOW_IT_WORKS_STEPS } from "@/lib/content-constants";
import { Card } from "@/components/ui/card";

/* ------------------------------------------------------------------ */
/*  Animation Variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 20 },
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
  const [statsLoading, setStatsLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [marqueeItems, setMarqueeItems] = useState<string[]>([]);

  /* ---------- Data fetching ---------- */

  const fetchChartData = useCallback(async () => {
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

      // build category counts
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
      logger.warn("Gagal memuat data chart beranda:", e);
    } finally {
      setChartLoading(false);
    }
  }, [chartDays]);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
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
    } catch (err) {
      logger.error("Stats fetch error:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchMarquee = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("reports")
        .select("title, category, kecamatan, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (data && data.length > 0) {
        setMarqueeItems(
          (data as Array<{ title: string; category?: string; kecamatan?: string }>).map(
            (r) => {
              const loc = r.kecamatan ? ` · ${r.kecamatan}` : "";
              const cat = r.category ? ` [${r.category}]` : "";
              return `${r.title}${cat}${loc}`;
            },
          ),
        );
      }
    } catch {
      // fail silently
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchChartData();
    fetchMarquee();

    let channel: RealtimeChannel;
    try {
      channel = supabase
        .channel("home-reports-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reports" },
          () => {
            fetchStats();
            fetchChartData();
            fetchMarquee();
          },
        )
        .subscribe();
    } catch (e) {
      logger.warn("Realtime error:", e);
    }

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [fetchStats, fetchChartData, fetchMarquee]);

  useEffect(() => {
    fetchChartData();
  }, [chartDays, fetchChartData]);

  /* ---------- Stat card configs ---------- */

  const statCards = [
    {
      label: "Total Laporan",
      value: stats.total,
      icon: FileText,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Laporan Baru",
      value: stats.baru,
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Diproses",
      value: stats.diproses,
      icon: Users,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
    {
      label: "Selesai",
      value: stats.selesai,
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* ============ Background Mesh ============ */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        {!prefersReducedMotion && (
          <>
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.35, 0.2] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[-15%] left-[-10%] w-[50vw] h-[50vw] bg-primary/8 rounded-full blur-[100px]"
            />
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 3,
              }}
              className="absolute bottom-[-15%] right-[-10%] w-[55vw] h-[55vw] bg-accent/8 rounded-full blur-[120px]"
            />
          </>
        )}
      </div>

      {/* ============ HERO — Split Layout ============ */}
      <section className="container pt-20 pb-8 md:pt-28 md:pb-16 lg:pt-36 lg:pb-20 px-4 relative z-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 md:space-y-8 text-center lg:text-left"
          >
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-primary text-sm font-medium shadow-float"
            >
              <Activity className="w-4 h-4" />
              <span>Sistem Pemantauan Real-time</span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-[-0.03em] text-foreground leading-[0.9]"
            >
              Sistem Informasi{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Pelaporan SDA
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              Platform profesional untuk pelaporan, pemantauan, dan penanganan
              permasalahan sumber daya air secara real-time.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2"
            >
              {authLoading ? null : !user ? (
                <Link to="/auth">
                  <Button
                    size="lg"
                    className="group gap-2.5 shadow-xl rounded-2xl py-7 px-8 text-lg font-bold bg-primary hover:bg-primary-hover text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-2xl active:scale-[0.98]"
                  >
                    Masuk / Daftar
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/report">
                    <Button
                      size="lg"
                      className="group gap-2.5 shadow-xl rounded-2xl py-7 px-8 text-lg font-bold bg-primary hover:bg-primary-hover text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-2xl active:scale-[0.98]"
                    >
                      <FileText className="w-5 h-5" />
                      Buat Laporan
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/map">
                    <Button
                      size="lg"
                      variant="outline"
                      className="gap-2.5 rounded-2xl py-7 px-8 text-lg font-bold border-2 bg-card border-border shadow-sm hover:bg-muted transition-all active:scale-[0.98]"
                    >
                      <MapIcon className="w-5 h-5" />
                      Lihat Peta
                    </Button>
                  </Link>
                  {isAdmin && (
                    <Link to="/admin">
                      <Button
                        size="lg"
                        variant="outline"
                        className="gap-2.5 rounded-2xl py-7 px-8 text-lg font-bold border-2 bg-card border-border shadow-sm hover:bg-muted transition-all active:scale-[0.98]"
                      >
                        Dashboard Admin
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>

          {/* Right: Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block"
          >
            <SystemGuard>
              <HeroStats stats={stats} />
            </SystemGuard>
          </motion.div>
        </div>
      </section>

      {/* ============ Live Marquee Feed ============ */}
      <section className="container relative z-10 px-4">
        <div className="max-w-7xl mx-auto">
          <LiveMarquee items={marqueeItems} />
        </div>
      </section>

      {/* ============ Bento Grid — Stats + Charts ============ */}
      <section className="container py-12 md:py-20 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
          className="max-w-7xl mx-auto px-4"
        >
          <motion.div variants={itemVariants} className="mb-10 md:mb-14">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
              Ringkasan & Insight
            </h2>
            <p className="text-muted-foreground mt-2 text-base md:text-lg max-w-2xl">
              Data laporan infrastruktur secara real-time dari seluruh wilayah.
            </p>
          </motion.div>

          {/* Symmetrical Stats Grid */}
          <div className="space-y-5">
            <SystemGuard>
              {statsLoading ? (
                <StatSkeleton />
              ) : (
                <StatsGrid stats={statCards} variants={itemVariants} />
              )}
            </SystemGuard>

            {/* Row 2: 2 equal charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">

              {/* Line chart — Tren Laporan */}
              <motion.div variants={itemVariants}>
                <Card variant="glass" className="p-5 md:p-6 rounded-2xl h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Tren Laporan</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {chartDays} hari terakhir
                      </p>
                    </div>
                    <Select
                      value={String(chartDays)}
                      onValueChange={(v) => setChartDays(Number(v) as 7 | 30)}
                    >
                      <SelectTrigger className="w-[120px] bg-card border-border rounded-lg h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 Hari</SelectItem>
                        <SelectItem value="30">30 Hari</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative w-full overflow-hidden">
                    <div className="h-48 md:h-56 w-full">
                      <SystemGuard mode="overlay">
                        {chartLoading ? (
                          <ChartSkeleton />
                        ) : (
                          <ChartContainer
                            config={{
                              count: {
                                label: "Laporan",
                                color: "hsl(var(--primary))",
                              },
                            }}
                            className="h-full w-full"
                          >
                            <LineChart
                              data={chartDaily}
                              margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient
                                  id="colorReports"
                                  x1="0" y1="0" x2="0" y2="1"
                                >
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                strokeOpacity={0.08}
                                vertical={false}
                              />
                              <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                dy={8}
                              />
                              <YAxis
                                allowDecimals={false}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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
                                strokeWidth={3}
                                dot={false}
                                activeDot={{
                                  r: 5,
                                  fill: "hsl(var(--primary))",
                                  stroke: "white",
                                  strokeWidth: 2,
                                }}
                                fill="url(#colorReports)"
                              />
                            </LineChart>
                          </ChartContainer>
                        )}
                      </SystemGuard>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Bar chart — Kategori */}
              <motion.div variants={itemVariants}>
                <Card variant="glass" className="p-5 md:p-6 rounded-2xl h-full">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-foreground">
                      Kategori Terbanyak
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Distribusi laporan berdasarkan kategori
                    </p>
                  </div>
                  <div className="relative w-full overflow-hidden">
                    {chartByCategory.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                        {chartLoading ? "Memuat chart..." : "Tidak ada data"}
                      </div>
                    ) : (
                      <div className="h-48 md:h-56 w-full">
                        <SystemGuard mode="overlay">
                          {chartLoading ? (
                            <ChartSkeleton />
                          ) : (
                            <ChartContainer
                              config={{
                                count: {
                                  label: "Jumlah",
                                  color: "hsl(var(--primary))",
                                },
                              }}
                              className="h-full w-full"
                            >
                              <BarChart
                                data={chartByCategory}
                                margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  strokeOpacity={0.08}
                                  vertical={false}
                                />
                                <XAxis
                                  dataKey="name"
                                  tickLine={false}
                                  axisLine={false}
                                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                  dy={8}
                                />
                                <YAxis
                                  allowDecimals={false}
                                  tickLine={false}
                                  axisLine={false}
                                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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
                                  maxBarSize={40}
                                />
                              </BarChart>
                            </ChartContainer>
                          )}
                        </SystemGuard>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ============ Features Section ============ */}
      <section className="container py-12 md:py-20 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
          className="max-w-7xl mx-auto px-4"
        >
          <motion.div variants={itemVariants} className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3">
              Fitur Unggulan
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Dirancang untuk memudahkan pelaporan dan pemantauan infrastruktur
              secara komprehensif.
            </p>
          </motion.div>

          <FeatureGrid features={FEATURE_LIST} variants={itemVariants} />
        </motion.div>
      </section>

      {/* ============ How It Works — Interactive Steps ============ */}
      <section className="container py-12 md:py-20 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
          className="max-w-5xl mx-auto px-4"
        >
          <motion.div variants={itemVariants} className="text-center mb-14 md:mb-18">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3">
              Cara Kerja
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Tiga langkah mudah untuk berpartisipasi dalam pemeliharaan
              infrastruktur.
            </p>
          </motion.div>

          <ProcessFlow steps={HOW_IT_WORKS_STEPS} variants={itemVariants} />
        </motion.div>
      </section>

      {/* ============ Recent Reports + FAQ ============ */}
      <section className="container py-12 md:py-20 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8 max-w-7xl mx-auto px-4"
        >
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <RecentReports />
          </motion.div>
          <motion.div variants={itemVariants} className="lg:col-span-2">
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
