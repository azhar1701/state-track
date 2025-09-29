import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, FileText, Map, Users, CheckCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Home = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    baru: 0,
    diproses: 0,
    selesai: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data } = await supabase.from("reports").select("status");
    
    if (data) {
      setStats({
        total: data.length,
        baru: data.filter((r) => r.status === "baru").length,
        diproses: data.filter((r) => r.status === "diproses").length,
        selesai: data.filter((r) => r.status === "selesai").length,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex p-4 bg-primary/10 rounded-full mb-4">
            <MapPin className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Lapor Infrastruktur
            <span className="block text-primary mt-2">Dengan Mudah</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Platform pelaporan dan monitoring kondisi infrastruktur publik secara real-time.
            Bersama membangun kota yang lebih baik.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {user ? (
              <>
                <Link to="/report">
                  <Button size="lg" className="gap-2 shadow-lg">
                    <FileText className="w-5 h-5" />
                    Buat Laporan
                  </Button>
                </Link>
                <Link to="/map">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Map className="w-5 h-5" />
                    Lihat Peta
                  </Button>
                </Link>
              </>
            ) : (
              <Link to="/auth">
                <Button size="lg" className="gap-2 shadow-lg">
                  Mulai Sekarang
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <Card className="text-center">
            <CardHeader className="pb-3">
              <CardTitle className="text-3xl font-bold text-primary">{stats.total}</CardTitle>
              <CardDescription>Total Laporan</CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center">
            <CardHeader className="pb-3">
              <CardTitle className="text-3xl font-bold text-accent">{stats.baru}</CardTitle>
              <CardDescription>Laporan Baru</CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center">
            <CardHeader className="pb-3">
              <CardTitle className="text-3xl font-bold text-secondary">{stats.diproses}</CardTitle>
              <CardDescription>Diproses</CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center">
            <CardHeader className="pb-3">
              <CardTitle className="text-3xl font-bold text-green-600">{stats.selesai}</CardTitle>
              <CardDescription>Selesai</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Fitur Unggulan</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-2 hover:border-primary transition-all duration-300">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>Laporan Mudah</CardTitle>
                <CardDescription>
                  Buat laporan dengan foto, lokasi GPS, dan deskripsi lengkap dalam hitungan detik.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-secondary transition-all duration-300">
              <CardHeader>
                <div className="p-3 bg-secondary/10 rounded-lg w-fit mb-4">
                  <Map className="w-8 h-8 text-secondary" />
                </div>
                <CardTitle>Peta Interaktif</CardTitle>
                <CardDescription>
                  Lihat semua laporan di peta real-time dengan status dan kategori yang jelas.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-accent transition-all duration-300">
              <CardHeader>
                <div className="p-3 bg-accent/10 rounded-lg w-fit mb-4">
                  <Users className="w-8 h-8 text-accent" />
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
      <section className="container mx-auto px-4 py-12 mb-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Cara Kerja</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold">Daftar & Masuk</h3>
              <p className="text-muted-foreground">
                Buat akun gratis untuk mulai membuat laporan
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary text-secondary-foreground text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold">Buat Laporan</h3>
              <p className="text-muted-foreground">
                Ambil foto, tandai lokasi, dan kirim laporan
              </p>
            </div>
            <div className="text-center space-y-4">
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
    </div>
  );
};

export default Home;
