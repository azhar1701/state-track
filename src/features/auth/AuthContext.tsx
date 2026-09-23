import { logger } from "@/lib/logger";
import { type ReactNode, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useLocation, useNavigate } from "react-router-dom";

import { supabase, isSupabaseConfigured } from "@/services/client";
import { AuthContext, type AuthContextValue } from "./auth-context";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
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
      logger.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [ADMIN_EMAILS]);

  const signOut = async () => {
    setLoading(true);
    currentUserIdRef.current = null;
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    await supabase.auth.signOut();
    setLoading(false);
    navigate("/", { replace: true });
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'TOKEN_REFRESHED') {
        logger.info('Token refreshed successfully');
        setSession(newSession);
        return;
      }
      if (event === 'SIGNED_OUT') {
        currentUserIdRef.current = null;
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setSession(newSession);
      const nextUser = newSession?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        // If it's the exact same user ID that was already verified, do not set loading=true
        // This prevents tearing down and recreating components on tab switch / window focus
        if (currentUserIdRef.current !== nextUser.id) {
          currentUserIdRef.current = nextUser.id;
          setLoading(true);
          checkAdminStatus(nextUser.id);
        }
      } else {
        currentUserIdRef.current = null;
        setIsAdmin(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (error) {
        logger.error('Session error:', error);
        currentUserIdRef.current = null;
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(initialSession);
      const nextUser = initialSession?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        currentUserIdRef.current = nextUser.id;
        setLoading(true);
        checkAdminStatus(nextUser.id);
      } else {
        currentUserIdRef.current = null;
        setLoading(false);
      }
    }).catch(() => {
      currentUserIdRef.current = null;
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkAdminStatus]);

  // After auth resolved, redirect away from /auth to role-appropriate page (allow landing / access)
  useEffect(() => {
    if (loading) return;
    const path = location.pathname;
    const isAuthPage = path === "/auth";
    if (!user) return; // stay on current page for anonymous until they login
    if (!isAuthPage) return; // don't hijack navigation from landing or other pages
    if (isAdmin) {
      navigate("/admin", { replace: true });
    } else {
      navigate("/map", { replace: true });
    }
  }, [loading, user, isAdmin, navigate, location.pathname]);

  const value: AuthContextValue = {
    user,
    session,
    isAdmin,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
