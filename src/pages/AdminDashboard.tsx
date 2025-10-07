import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Clock, CheckCircle, Loader2 } from "lucide-react";

interface Report {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  location_name: string | null;
  severity?: 'ringan' | 'sedang' | 'berat' | null;
  kecamatan?: string | null;
  desa?: string | null;
}

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Akses ditolak");
      navigate("/");
      return;
    }
    if (user && isAdmin) {
      fetchReports();
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select("id,title,category,status,created_at,location_name,severity,kecamatan,desa")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReports(data as Report[]);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    const { error } = await supabase
      .from("reports")
      .update({ status: newStatus as "baru" | "diproses" | "selesai" })
      .eq("id", id);

    if (error) {
      toast.error("Gagal update status");
    } else {
      toast.success("Status berhasil diupdate");
      fetchReports();
    }
    setUpdatingId(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = {
    total: reports.length,
    baru: reports.filter((r) => r.status === "baru").length,
    diproses: reports.filter((r) => r.status === "diproses").length,
    selesai: reports.filter((r) => r.status === "selesai").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/5 via-background to-primary/5 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard Admin</h1>
          <p className="text-muted-foreground">Kelola semua laporan infrastruktur</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Total Laporan</CardTitle>
              <div className="text-3xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                {stats.total}
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Baru</CardTitle>
              <div className="text-3xl font-bold flex items-center gap-2">
                <Clock className="w-6 h-6 text-accent" />
                {stats.baru}
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Diproses</CardTitle>
              <div className="text-3xl font-bold flex items-center gap-2">
                <Loader2 className="w-6 h-6 text-secondary" />
                {stats.diproses}
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Selesai</CardTitle>
              <div className="text-3xl font-bold flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                {stats.selesai}
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle>Semua Laporan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg">
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold">{report.title}</h3>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">{report.category}</Badge>
                      {report.severity && <Badge variant="secondary">{report.severity}</Badge>}
                      {report.location_name && <span>📍 {report.location_name}</span>}
                      {(report.kecamatan || report.desa) && (
                        <span>🗺️ {[report.desa, report.kecamatan].filter(Boolean).join(', ')}</span>
                      )}
                      <span>{new Date(report.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select
                      value={report.status}
                      onValueChange={(value) => updateStatus(report.id, value)}
                      disabled={updatingId === report.id}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baru">Baru</SelectItem>
                        <SelectItem value="diproses">Diproses</SelectItem>
                        <SelectItem value="selesai">Selesai</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
