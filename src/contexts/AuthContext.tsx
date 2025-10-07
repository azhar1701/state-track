import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { AuthContext, type AuthContextValue } from "./auth-context";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  // Optional fallback: allowlist admin emails via env var (comma-separated)
  const ADMIN_EMAILS = useMemo(() => {
    const raw = import.meta.env.VITE_ADMIN_EMAILS as string | undefined;
    return (
      raw
        ?.split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean) ?? []
    );
  }, []);

  // Auth state subscription and initial session load handled after defining checkAdminStatus

  const checkAdminStatus = useCallback(async (userId: string) => {
    try {
      if (!isSupabaseConfigured) {
        setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (!error && data) {
        setIsAdmin(true);
      } else {
        // Fallback: check allowlisted emails if role read failed or not found
        try {
          const { data: userRes } = await supabase.auth.getUser();
          const email = userRes.user?.email?.toLowerCase();
          if (email && ADMIN_EMAILS.includes(email)) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch {
          setIsAdmin(false);
        }
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [ADMIN_EMAILS]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    navigate("/auth");
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setLoading(true);
        setTimeout(() => {
          checkAdminStatus(session.user!.id);
        }, 0);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setLoading(true);
        checkAdminStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAdminStatus]);

  const value: AuthContextValue = {
    user,
    session,
    isAdmin,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
