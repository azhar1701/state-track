import { handleApiError } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/services/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  User, Mail, Lock, Waves, Shield, Phone,
  Eye, EyeOff, Loader2, KeyRound, ChevronLeft,
  ShieldCheck, CheckCircle2, AlertCircle,
} from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/features/auth/useAuth";
import { useReportStats } from "@/features/reports/hooks/useReportStats";
import { SystemGuard } from "@/components/common/SystemGuard";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Validation Schemas ────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
  password: z.string().min(6, { message: "Password minimal 6 karakter" }),
});

const signupSchema = z
  .object({
    email: z.string().email({ message: "Email tidak valid" }),
    password: z.string().min(6, { message: "Password minimal 6 karakter" }),
    confirmPassword: z.string(),
    fullName: z.string().min(2, { message: "Nama minimal 2 karakter" }),
    phone: z.string().min(10, { message: "Nomor telepon minimal 10 digit" }),
    nikNip: z.string().min(16, { message: "NIK/NIP minimal 16 karakter" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

// ── Password Strength ─────────────────────────────────────────────────
type StrengthLevel = 0 | 1 | 2 | 3;
const getPasswordStrength = (
  password: string
): { level: StrengthLevel; label: string; color: string } => {
  if (!password) return { level: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { level: 1, label: "Lemah", color: "bg-red-500" };
  if (score === 2) return { level: 2, label: "Cukup", color: "bg-amber-500" };
  return { level: 3, label: "Kuat", color: "bg-emerald-500" };
};

// ── Inline Field Error ────────────────────────────────────────────────
const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-1 text-xs text-destructive mt-1.5"
    >
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {message}
    </motion.p>
  ) : null;

// ── Animated Number Counter ───────────────────────────────────────────
const AnimatedNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }
    const duration = 800;
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(ease * value);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setDisplayValue(value);
      }
    };

    const handle = requestAnimationFrame(update);
    return () => cancelAnimationFrame(handle);
  }, [value]);

  return <>{displayValue.toLocaleString("id-ID")}</>;
};

// ── Hero Stat Card ────────────────────────────────────────────────────
const HeroStatCard = ({
  value,
  label,
  loading = false,
  delay = 0,
}: {
  value: React.ReactNode;
  label: string;
  loading?: boolean;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
    className="flex-1 flex flex-col items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-3 py-3 shadow-lg min-w-0"
  >
    {loading ? (
      <div className="h-7 w-12 bg-white/20 rounded-md animate-pulse my-0.5" />
    ) : (
      <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">{value}</span>
    )}
    <span className="text-[11px] text-white/75 mt-1 text-center font-medium leading-tight truncate max-w-full">
      {label}
    </span>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────
const Auth = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { stats, loading: statsLoading } = useReportStats();

  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
    nikNip: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(isAdmin ? "/admin" : "/", { replace: true });
    }
  }, [authLoading, user, isAdmin, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => emailInputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, [isLogin]);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleTabSwitch = (toLogin: boolean) => {
    setIsLogin(toLogin);
    setFieldErrors({});
    setShowForgotPassword(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormData({ email: formData.email, password: "", confirmPassword: "", fullName: "", phone: "", nikNip: "" });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    const validation = loginSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => { if (err.path[0]) errors[err.path[0] as string] = err.message; });
      setFieldErrors(errors);
      return;
    }
    setLoading(true);
    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("failed to fetch") || msg.includes("network")) {
          toast.error("Tidak dapat terhubung ke server. Periksa koneksi internet.");
        } else if (msg.includes("invalid login credentials")) {
          setFieldErrors({ password: "Email atau password salah" });
        } else {
          toast.error(handleApiError(error, "Terjadi kesalahan saat login"));
        }
        return;
      }
      try {
        const u = signInData.user;
        if (u) {
          const { data: roleData } = await supabase
            .from("user_roles").select("role").eq("user_id", u.id).eq("role", "admin").maybeSingle();
          toast.success("Login berhasil!");
          navigate(roleData?.role === "admin" ? "/admin" : "/");
        }
      } catch {
        toast.success("Login berhasil!");
        navigate("/");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat login");
      logger.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    const validation = signupSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => { if (err.path[0]) errors[err.path[0] as string] = err.message; });
      setFieldErrors(errors);
      toast.error(validation.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: formData.fullName, phone: formData.phone, nik_nip: formData.nikNip },
        },
      });
      if (error) {
        toast.error(
          error.message.includes("already registered")
            ? "Email sudah terdaftar. Silakan login."
            : handleApiError(error, "Terjadi kesalahan saat registrasi")
        );
        return;
      }
      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          { id: data.user.id, full_name: formData.fullName, phone: formData.phone, nik_nip: formData.nikNip },
          { onConflict: "id" }
        );
        if (profileError) logger.warn("Profile creation warning:", profileError);
      }
      toast.success("Registrasi berhasil! Silakan login.");
      setIsLogin(true);
      setFormData({ email: formData.email, password: "", confirmPassword: "", fullName: "", phone: "", nikNip: "" });
    } catch (error) {
      toast.error("Terjadi kesalahan saat registrasi");
      logger.error("Signup error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !z.string().email().safeParse(forgotEmail).success) {
      toast.error("Masukkan alamat email yang valid");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      if (error) throw error;
      toast.success("Tautan reset password telah dikirim ke email Anda");
      setShowForgotPassword(false);
      setForgotEmail("");
    } catch (err) {
      toast.error("Gagal mengirim email reset. Coba lagi.");
      logger.error("Forgot password error:", err);
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(formData.password);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
            <Waves className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Memeriksa sesi...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <SystemGuard>
      <div className="min-h-screen bg-background flex">

        {/* ── Left Hero Panel ──────────────────────────────── */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(216,100%,28%)] via-[hsl(216,100%,38%)] to-[hsl(210,100%,50%)]" />
          <motion.div
            className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, hsl(210,100%,70%), transparent)" }}
            animate={{ scale: [1, 1.15, 1], x: [0, 20, 0], y: [0, -20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-10 right-0 w-80 h-80 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, hsl(45,100%,60%), transparent)" }}
            animate={{ scale: [1, 1.2, 1], x: [0, -15, 0], y: [0, 15, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div
            className="absolute top-1/2 -left-10 w-48 h-48 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, white, transparent)" }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "28px 28px" }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[hsl(216,100%,18%)]/50 to-transparent" />

          <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-center gap-7">
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="flex flex-col items-center gap-5"
            >
              <div className="p-6 bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 shadow-2xl">
                <Waves className="w-16 h-16 text-white/90" />
              </div>
              <div>
                <h1 className="text-5xl font-bold text-white tracking-tight">SIPASDA</h1>
                <p className="text-base text-white/70 mt-2 font-light leading-relaxed">
                  Sistem Informasi Pelaporan<br />Sumber Daya Air
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-center gap-2.5 bg-white/10 border border-white/20 px-5 py-2.5 rounded-full text-white/80 text-sm backdrop-blur-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Pemantauan · Pelaporan · Pengelolaan</span>
            </motion.div>

            {/* Realtime KPI Indicator */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-medium backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span>Capaian Real-Time Sistem</span>
            </motion.div>

            <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
              <HeroStatCard
                value={<AnimatedNumber value={stats.total} />}
                label="Laporan Ditangani"
                loading={statsLoading}
                delay={0.4}
              />
              <HeroStatCard
                value={<AnimatedNumber value={stats.kecamatanCount} />}
                label="Kecamatan Terpantau"
                loading={statsLoading}
                delay={0.5}
              />
              <HeroStatCard
                value={<><AnimatedNumber value={stats.completionRate} />%</>}
                label="Tingkat Selesai"
                loading={statsLoading}
                delay={0.6}
              />
            </div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              className="flex items-center gap-2 text-white/45 text-xs"
            >
              <Shield className="w-3.5 h-3.5" />
              Data terenkripsi & terlindungi penuh
            </motion.p>
          </div>
        </div>

        {/* ── Right Form Panel ────────────────────────────── */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-5 lg:p-12 bg-background">
          <div className="w-full max-w-md">

            {/* Mobile logo */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="lg:hidden flex flex-col items-center mb-4">
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 mb-3">
                <Waves className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">SIPASDA</h1>
              <p className="text-xs text-muted-foreground mt-1 text-center">Sistem Informasi Pelaporan Sumber Daya Air</p>
            </motion.div>

            {/* Mobile Real-Time KPI strip */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:hidden flex items-center justify-between gap-2 py-2 px-3.5 mb-5 rounded-xl bg-card/60 backdrop-blur-md border border-border text-xs text-muted-foreground shadow-xs"
            >
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>{statsLoading ? "..." : stats.total} Laporan</span>
              </div>
              <span className="text-border">|</span>
              <span>{statsLoading ? "..." : stats.kecamatanCount} Kecamatan</span>
              <span className="text-border">|</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {statsLoading ? "..." : `${stats.completionRate}%`} Selesai
              </span>
            </motion.div>

            {/* Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-card/60 backdrop-blur-xl rounded-2xl border border-border/80 p-7 shadow-2xl"
            >
              {/* Tab toggle */}
              <AnimatePresence>
                {!showForgotPassword && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex gap-1.5 mb-6 p-1 bg-muted/60 rounded-xl border border-border/50"
                    role="tablist"
                  >
                    {(["login", "signup"] as const).map((tab) => (
                      <button
                        key={tab} type="button" role="tab"
                        aria-selected={isLogin === (tab === "login")}
                        onClick={() => handleTabSwitch(tab === "login")}
                        className={cn(
                          "flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isLogin === (tab === "login")
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                        )}
                      >
                        {tab === "login" ? "Masuk" : "Daftar"}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Content switcher */}
              <AnimatePresence mode="wait">
                {showForgotPassword ? (
                  <motion.div key="forgot" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
                    <div className="flex items-center gap-3 mb-4">
                      <button type="button" onClick={() => setShowForgotPassword(false)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h2 className="text-xl font-bold text-foreground">Reset Password</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Kami kirimkan tautan pemulihan ke email Anda</p>
                      </div>
                    </div>
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div>
                        <label htmlFor="forgot-email" className="block text-sm font-medium text-muted-foreground mb-1.5">Email Terdaftar</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                          <Input id="forgot-email" type="email" placeholder="nama@email.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} autoFocus className="pl-10 h-11 bg-muted/50 border-border" />
                        </div>
                      </div>
                      <Button type="submit" disabled={loading} className="w-full h-11 font-semibold gap-2">
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</> : <><KeyRound className="w-4 h-4" /> Kirim Tautan Reset</>}
                      </Button>
                    </form>
                  </motion.div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div key={isLogin ? "login-form" : "signup-form"} initial={{ opacity: 0, x: isLogin ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isLogin ? 20 : -20 }} transition={{ duration: 0.22 }}>
                      <div className="mb-5">
                        <h2 className="text-2xl font-bold text-foreground">{isLogin ? "Selamat Datang Kembali" : "Buat Akun Baru"}</h2>
                        <p className="text-sm text-muted-foreground mt-1">{isLogin ? "Masuk untuk melanjutkan ke sistem" : "Lengkapi data diri untuk mendaftar"}</p>
                      </div>

                      <form onSubmit={isLogin ? handleSignIn : handleSignUp} className="space-y-4" noValidate>

                        {!isLogin && (
                          <div>
                            <label htmlFor="auth-fullname" className="block text-sm font-medium text-muted-foreground mb-1.5">Nama Lengkap</label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                              <Input id="auth-fullname" type="text" placeholder="Nama lengkap Anda" value={formData.fullName}
                                onChange={(e) => { setFormData({ ...formData, fullName: e.target.value }); clearFieldError("fullName"); }}
                                className={cn("pl-10 h-11 bg-muted/50 border-border focus-visible:ring-2 focus-visible:ring-ring", fieldErrors.fullName && "border-destructive")} />
                            </div>
                            <AnimatePresence><FieldError message={fieldErrors.fullName} /></AnimatePresence>
                          </div>
                        )}

                        <div>
                          <label htmlFor="auth-email" className="block text-sm font-medium text-muted-foreground mb-1.5">Email</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                            <Input id="auth-email" ref={emailInputRef} type="email" placeholder="nama@email.com" value={formData.email}
                              onChange={(e) => { setFormData({ ...formData, email: e.target.value }); clearFieldError("email"); }}
                              className={cn("pl-10 h-11 bg-muted/50 border-border focus-visible:ring-2 focus-visible:ring-ring", fieldErrors.email && "border-destructive")} />
                          </div>
                          <AnimatePresence><FieldError message={fieldErrors.email} /></AnimatePresence>
                        </div>

                        <div>
                          <label htmlFor="auth-password" className="block text-sm font-medium text-muted-foreground mb-1.5">Password</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                            <Input id="auth-password" type={showPassword ? "text" : "password"} placeholder={isLogin ? "••••••••" : "Minimal 6 karakter"} value={formData.password}
                              onChange={(e) => { setFormData({ ...formData, password: e.target.value }); clearFieldError("password"); }}
                              className={cn("pl-10 pr-11 h-11 bg-muted/50 border-border focus-visible:ring-2 focus-visible:ring-ring", fieldErrors.password && "border-destructive")} />
                            <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <AnimatePresence><FieldError message={fieldErrors.password} /></AnimatePresence>
                          {!isLogin && formData.password && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 space-y-1">
                              <div className="flex gap-1">
                                {([1, 2, 3] as StrengthLevel[]).map((i) => (
                                  <div key={i} className={cn("h-1 flex-1 rounded-full transition-all duration-300", strength.level >= i ? strength.color : "bg-muted")} />
                                ))}
                              </div>
                              <p className={cn("text-xs font-medium", strength.level === 1 && "text-red-500", strength.level === 2 && "text-amber-500", strength.level === 3 && "text-emerald-500")}>
                                Kekuatan: {strength.label}
                              </p>
                            </motion.div>
                          )}
                        </div>

                        {!isLogin && (
                          <div>
                            <label htmlFor="auth-confirm" className="block text-sm font-medium text-muted-foreground mb-1.5">Konfirmasi Password</label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                              <Input id="auth-confirm" type={showConfirmPassword ? "text" : "password"} placeholder="Ulangi password" value={formData.confirmPassword}
                                onChange={(e) => { setFormData({ ...formData, confirmPassword: e.target.value }); clearFieldError("confirmPassword"); }}
                                className={cn("pl-10 pr-11 h-11 bg-muted/50 border-border focus-visible:ring-2 focus-visible:ring-ring",
                                  fieldErrors.confirmPassword && "border-destructive",
                                  !fieldErrors.confirmPassword && formData.confirmPassword && formData.confirmPassword === formData.password && "border-emerald-500/60")} />
                              <button type="button" tabIndex={-1} onClick={() => setShowConfirmPassword((v) => !v)} aria-label="Toggle konfirmasi password"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              {formData.confirmPassword && formData.confirmPassword === formData.password && !fieldErrors.confirmPassword && (
                                <CheckCircle2 className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
                              )}
                            </div>
                            <AnimatePresence><FieldError message={fieldErrors.confirmPassword} /></AnimatePresence>
                          </div>
                        )}

                        {!isLogin && (
                          <div>
                            <label htmlFor="auth-phone" className="block text-sm font-medium text-muted-foreground mb-1.5">Nomor Telepon</label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                              <Input id="auth-phone" type="tel" placeholder="08123456789" value={formData.phone}
                                onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); clearFieldError("phone"); }}
                                className={cn("pl-10 h-11 bg-muted/50 border-border focus-visible:ring-2 focus-visible:ring-ring", fieldErrors.phone && "border-destructive")} />
                            </div>
                            <AnimatePresence><FieldError message={fieldErrors.phone} /></AnimatePresence>
                          </div>
                        )}

                        {!isLogin && (
                          <div>
                            <label htmlFor="auth-niknip" className="block text-sm font-medium text-muted-foreground mb-1.5">NIK / NIP</label>
                            <div className="relative">
                              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                              <Input id="auth-niknip" type="text" inputMode="numeric" placeholder="Nomor Induk Kependudukan / Pegawai" value={formData.nikNip}
                                onChange={(e) => { setFormData({ ...formData, nikNip: e.target.value }); clearFieldError("nikNip"); }}
                                className={cn("pl-10 h-11 bg-muted/50 border-border focus-visible:ring-2 focus-visible:ring-ring", fieldErrors.nikNip && "border-destructive")} />
                            </div>
                            <AnimatePresence><FieldError message={fieldErrors.nikNip} /></AnimatePresence>
                          </div>
                        )}

                        <Button type="submit" disabled={loading} className="w-full h-11 font-semibold shadow-lg shadow-primary/20 gap-2 mt-1">
                          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</> : isLogin ? "Masuk" : "Daftar Sekarang"}
                        </Button>

                        {isLogin && (
                          <button type="button" onClick={() => setShowForgotPassword(true)}
                            className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors py-1">
                            Lupa password? Kirim tautan reset
                          </button>
                        )}
                      </form>
                    </motion.div>
                  </AnimatePresence>
                )}
              </AnimatePresence>

              <div className="mt-5 p-3.5 bg-muted/40 rounded-xl flex items-start gap-2.5 border border-border/50">
                <ShieldCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Data Anda aman dan terenkripsi. Gunakan kredensial resmi untuk mengakses sistem.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </SystemGuard>
  );
};

export default Auth;
