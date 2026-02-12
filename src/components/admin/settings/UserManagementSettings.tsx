import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, UserCog, Activity, Shield, Loader2, RefreshCcw, Search, Mail, Phone, Calendar, Ban, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type UserRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  nik_nip: string | null;
  created_at: string;
  role: "admin" | "user";
  email?: string;
  report_count?: number;
};

type ActivityLog = {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  created_at: string;
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("id-ID");
  } catch {
    return "-";
  }
};

export const UserManagementSettings = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, nik_nip, email, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Profiles error:", profilesError);
        throw profilesError;
      }

      const { data: roles } = await supabase.from("user_roles").select("user_id, role");

      const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));

      // Get report counts
      const { data: reports } = await supabase.from("reports").select("user_id");
      const reportCounts: Record<string, number> = {};
      reports?.forEach((r) => {
        reportCounts[r.user_id] = (reportCounts[r.user_id] || 0) + 1;
      });

      const userList: UserRow[] = (profiles ?? []).map((profile) => ({
        id: profile.id,
        full_name: profile.full_name,
        phone: profile.phone,
        nik_nip: profile.nik_nip,
        created_at: profile.created_at,
        role: adminIds.has(profile.id) ? "admin" : "user",
        email: profile.email,
        report_count: reportCounts[profile.id] || 0,
      }));

      setUsers(userList);
    } catch (error) {
      console.error("Failed to load users", error);
      toast.error("Gagal memuat pengguna");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const loadActivities = useCallback(async () => {
    if (!isAdmin) return;
    setActivityLoading(true);
    try {
      const { data, error } = await supabase
        .from("report_logs")
        .select("id, actor_id, actor_email, action, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const activityList: ActivityLog[] = (data ?? []).map((log) => ({
        id: log.id,
        user_id: log.actor_id || "",
        user_email: log.actor_email || "System",
        action: log.action,
        created_at: log.created_at,
      }));

      setActivities(activityList);
    } catch (error) {
      console.error("Failed to load activities", error);
      toast.error("Gagal memuat aktivitas");
    } finally {
      setActivityLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadUsers();
    loadActivities();
  }, [loadUsers, loadActivities]);

  const handleRoleChange = async (userId: string, newRole: "admin" | "user") => {
    if (!isAdmin) return;
    setUpdatingUserId(userId);
    try {
      if (newRole === "admin") {
        const { error } = await supabase
          .from("user_roles")
          .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) throw error;
      }
      toast.success("Role pengguna berhasil diperbarui");
      await loadUsers();
    } catch (error) {
      console.error("Failed to update role", error);
      toast.error("Gagal memperbarui role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    users: users.filter((u) => u.role === "user").length,
    activeToday: 0,
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="h-5 w-5 text-primary" />
              Manajemen Pengguna
            </CardTitle>
            <CardDescription className="mt-1.5">
              Kelola pengguna, role, dan aktivitas sistem
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">{stats.total} Total</Badge>
            <Badge variant="outline">{stats.admins} Admin</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm py-2">
              <UserCog className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pengguna</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 text-xs sm:text-sm py-2">
              <Activity className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Aktivitas</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-1.5 text-xs sm:text-sm py-2">
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Izin</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, email, atau telepon..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Role</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={loadUsers} disabled={loading} variant="outline" size="icon">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 border">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total Pengguna</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 border">
                <div className="text-2xl font-bold text-blue-600">{stats.admins}</div>
                <div className="text-xs text-muted-foreground">Administrator</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 border">
                <div className="text-2xl font-bold text-green-600">{stats.users}</div>
                <div className="text-xs text-muted-foreground">User Biasa</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 border">
                <div className="text-2xl font-bold text-orange-600">{stats.activeToday}</div>
                <div className="text-xs text-muted-foreground">Aktif Hari Ini</div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Tidak ada pengguna ditemukan</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pengguna</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>NIK/NIP</TableHead>
                      <TableHead>Laporan</TableHead>
                      <TableHead>Terdaftar</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserCog className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{user.full_name || "-"}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {user.phone || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Shield className="h-3 w-3" />
                            {user.nik_nip || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.report_count || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(user.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role === "admin" ? "Admin" : "User"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleRoleChange(user.id, value as "admin" | "user")}
                            disabled={updatingUserId === user.id}
                          >
                            <SelectTrigger className="w-[110px] h-8 text-xs ml-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Log Aktivitas Pengguna</h4>
              </div>
              <Button onClick={loadActivities} disabled={activityLoading} variant="outline" size="sm">
                {activityLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                Refresh
              </Button>
            </div>

            {activityLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Belum ada aktivitas</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pengguna</TableHead>
                      <TableHead>Aksi</TableHead>
                      <TableHead>Waktu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{activity.user_email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{activity.action}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(activity.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Izin & Hak Akses</h4>
              </div>

              <div className="space-y-3">
                <div className="bg-muted/30 rounded-lg p-4 border">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium mb-1">Administrator</div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Akses penuh ke semua fitur</li>
                        <li>• Kelola pengguna dan role</li>
                        <li>• Kelola laporan dan geo layer</li>
                        <li>• Akses pengaturan sistem</li>
                        <li>• Lihat audit log dan backup</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 border">
                  <div className="flex items-start gap-3">
                    <Ban className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium mb-1">User Biasa</div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Buat dan lihat laporan sendiri</li>
                        <li>• Lihat peta dan layer publik</li>
                        <li>• Edit profil sendiri</li>
                        <li>• Tidak bisa akses admin panel</li>
                        <li>• Tidak bisa kelola pengguna lain</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-xs text-blue-900 dark:text-blue-100">
                    <strong>Catatan:</strong> Perubahan role akan berlaku segera. User yang di-promote
                    menjadi admin akan mendapat akses penuh ke admin panel.
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
