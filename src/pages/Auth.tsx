import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { User, Mail, Lock, Droplets, Waves, Shield } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";

const authSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
  password: z.string().min(6, { message: "Password minimal 6 karakter" }),
  fullName: z.string().min(2, { message: "Nama minimal 2 karakter" }).optional(),
  nik: z.string().optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    nik: "",
  });

  useEffect(() => {
    if (!authLoading && user) {
      navigate(isAdmin ? "/admin" : "/", { replace: true });
    }
  }, [authLoading, user, isAdmin, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error("Supabase belum dikonfigurasi. Hubungi administrator.");
      return;
    }

    setLoading(true);
    try {
      const validation = authSchema.omit({ fullName: true, nik: true }).safeParse(formData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("failed to fetch") || message.includes("network")) {
          toast.error("Tidak dapat terhubung ke server. Periksa koneksi internet.");
        } else if (message.includes("invalid login credentials")) {
          toast.error("Email atau password salah");
        } else {
          toast.error(error.message);
        }
        return;
      }

      try {
        const user = signInData.user;
        if (user) {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle();

          toast.success("Login berhasil!");
          navigate(roleData?.role === "admin" ? "/admin" : "/");
        }
      } catch {
        toast.success("Login berhasil!");
        navigate("/");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat login");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error("Supabase belum dikonfigurasi. Hubungi administrator.");
      return;
    }

    setLoading(true);
    try {
      const validation = authSchema.safeParse(formData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.fullName,
            nik: formData.nik,
          },
        },
      });

      if (error) {
        toast.error(error.message.includes("already registered") ? "Email sudah terdaftar. Silakan login." : error.message);
        return;
      }

      toast.success("Registrasi berhasil! Silakan login.");
      setIsLogin(true);
      setFormData({ email: formData.email, password: "", fullName: "", nik: "" });
    } catch (error) {
      toast.error("Terjadi kesalahan saat registrasi");
      console.error("Signup error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left Hero Section - Desktop Only */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-800 to-cyan-900">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1200')] bg-cover bg-center opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/60 to-slate-900/40" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-center">
          <div className="mb-8 p-4 bg-blue-500/10 backdrop-blur-sm rounded-2xl border border-blue-500/20">
            <Waves className="w-20 h-20 text-blue-400" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">SIPASDA</h1>
          <p className="text-xl text-blue-200 mb-8 max-w-md leading-relaxed">
            Sistem Informasi Pelaporan Sumber Daya Air
          </p>
          <div className="flex items-center gap-3 text-cyan-300">
            <Droplets className="w-5 h-5" />
            <span className="text-sm font-medium">Monitoring • Reporting • Management</span>
          </div>
        </div>
      </div>

      {/* Right Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 mb-4">
              <Waves className="w-12 h-12 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">SIPASDA</h1>
            <p className="text-sm text-slate-400 mt-1">Sistem Informasi Pelaporan Sumber Daya Air</p>
          </div>

          {/* Form Container */}
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-8 shadow-2xl">
            {!isSupabaseConfigured && (
              <div className="mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                Supabase belum dikonfigurasi. Tambahkan .env.local untuk mengaktifkan autentikasi.
              </div>
            )}

            {/* Toggle Buttons */}
            <div className="flex gap-2 mb-8 p-1 bg-slate-800/50 rounded-lg">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  isLogin
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  !isLogin
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Daftar
              </button>
            </div>

            {/* Form Title */}
            <h2 className="text-2xl font-bold text-white mb-6">
              {isLogin ? "Selamat Datang Kembali" : "Buat Akun Baru"}
            </h2>

            {/* Form */}
            <form onSubmit={isLogin ? handleSignIn : handleSignUp} className="space-y-5">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Nama Lengkap</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="Nama lengkap Anda"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                      className="pl-11 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent h-12"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    type="email"
                    placeholder="nama@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="pl-11 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent h-12"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    type="password"
                    placeholder={isLogin ? "••••••••" : "Minimal 6 karakter"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="pl-11 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent h-12"
                  />
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">NIK (Opsional)</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="Nomor Induk Kependudukan"
                      value={formData.nik}
                      onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                      className="pl-11 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent h-12"
                    />
                  </div>
                </div>
              )}

              {isLogin && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="border-slate-600 data-[state=checked]:bg-blue-600"
                    />
                    <label htmlFor="remember" className="text-sm text-slate-400 cursor-pointer">
                      Ingat saya
                    </label>
                  </div>
                  <button type="button" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    Lupa password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium shadow-lg shadow-blue-500/20 transition-all"
              >
                {loading ? "Memproses..." : isLogin ? "Masuk" : "Daftar Sekarang"}
              </Button>
            </form>

            {/* Footer Info */}
            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg flex items-start gap-3 border border-slate-700/50">
              <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-400 leading-relaxed">
                {isLogin
                  ? "Data Anda aman dan terenkripsi. Gunakan kredensial resmi untuk mengakses sistem."
                  : "User pertama yang mendaftar otomatis menjadi admin. Data Anda aman dan terenkripsi."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
