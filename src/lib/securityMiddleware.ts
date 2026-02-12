import { supabase } from "@/integrations/supabase/client";
import type { SecurityConfig } from "@/hooks/useSecurityConfig";

export const securityMiddleware = {
  async logSecurityEvent(
    userId: string | null,
    eventType: string,
    severity: "info" | "warning" | "critical" = "info",
    details?: Record<string, unknown>
  ) {
    try {
      // Check if table exists first
      const { error: checkError } = await supabase
        .from("security_audit_logs")
        .select("id")
        .limit(1);
      
      if (checkError) {
        console.warn("Security audit logs table not available yet");
        return;
      }

      const ipAddress = await this.getClientIP();
      const userAgent = navigator.userAgent;

      await supabase.rpc("log_security_event", {
        p_user_id: userId,
        p_event_type: eventType,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_details: details || null,
        p_severity: severity,
      });
    } catch (error) {
      console.warn("Failed to log security event", error);
    }
  },

  async recordLoginAttempt(email: string, success: boolean) {
    try {
      // Check if table exists first
      const { error: checkError } = await supabase
        .from("login_attempts")
        .select("id")
        .limit(1);
      
      if (checkError) {
        console.warn("Login attempts table not available yet");
        return;
      }

      const ipAddress = await this.getClientIP();

      await supabase.from("login_attempts").insert({
        email: email.toLowerCase(),
        ip_address: ipAddress,
        success,
        attempted_at: new Date().toISOString(),
      });

      if (success) {
        await this.logSecurityEvent(null, "login", "info", { email });
      } else {
        await this.logSecurityEvent(null, "login_failed", "warning", { email });
      }
    } catch (error) {
      console.warn("Failed to record login attempt", error);
    }
  },

  async checkAccountLocked(email: string, config?: SecurityConfig): Promise<boolean> {
    try {
      // Check if function exists first
      const { error: checkError } = await supabase
        .from("login_attempts")
        .select("id")
        .limit(1);
      
      if (checkError) {
        console.warn("Login attempts table not available yet");
        return false;
      }

      const maxAttempts = config?.authentication.maxLoginAttempts || 5;
      const lockoutMinutes = config?.authentication.lockoutDuration || 15;

      const { data, error } = await supabase.rpc("is_account_locked", {
        user_email: email.toLowerCase(),
        max_attempts: maxAttempts,
        lockout_minutes: lockoutMinutes,
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.warn("Failed to check account lock status", error);
      return false;
    }
  },

  async createSession(userId: string, sessionToken: string, expiresIn: number) {
    try {
      // Check if table exists first
      const { error: checkError } = await supabase
        .from("active_sessions")
        .select("id")
        .limit(1);
      
      if (checkError) {
        console.warn("Active sessions table not available yet");
        return;
      }

      const ipAddress = await this.getClientIP();
      const userAgent = navigator.userAgent;
      const expiresAt = new Date(Date.now() + expiresIn * 60 * 1000).toISOString();

      await supabase.from("active_sessions").insert({
        user_id: userId,
        session_token: sessionToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt,
      });

      await this.logSecurityEvent(userId, "session_created", "info");
    } catch (error) {
      console.warn("Failed to create session record", error);
    }
  },

  async updateSessionActivity(sessionToken: string) {
    try {
      const { error: checkError } = await supabase
        .from("active_sessions")
        .select("id")
        .limit(1);
      
      if (checkError) return;

      await supabase
        .from("active_sessions")
        .update({ last_activity: new Date().toISOString() })
        .eq("session_token", sessionToken);
    } catch (error) {
      console.warn("Failed to update session activity", error);
    }
  },

  async terminateSession(sessionToken: string, userId?: string) {
    try {
      const { error: checkError } = await supabase
        .from("active_sessions")
        .select("id")
        .limit(1);
      
      if (checkError) return;

      await supabase.from("active_sessions").delete().eq("session_token", sessionToken);

      if (userId) {
        await this.logSecurityEvent(userId, "logout", "info");
      }
    } catch (error) {
      console.warn("Failed to terminate session", error);
    }
  },

  async getClientIP(): Promise<string> {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      return data.ip || "unknown";
    } catch {
      return "unknown";
    }
  },

  async validatePasswordStrength(password: string, config?: SecurityConfig): Promise<{ valid: boolean; message?: string }> {
    const minLength = config?.authentication.passwordMinLength || 8;
    const requireStrong = config?.authentication.requireStrongPassword ?? true;

    if (password.length < minLength) {
      return {
        valid: false,
        message: `Password minimal ${minLength} karakter`,
      };
    }

    if (requireStrong) {
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSymbol) {
        return {
          valid: false,
          message: "Password harus mengandung huruf besar, huruf kecil, angka, dan simbol",
        };
      }
    }

    return { valid: true };
  },

  async checkIPWhitelist(config?: SecurityConfig): Promise<boolean> {
    if (!config?.access.ipWhitelist.trim()) return true;

    try {
      const clientIP = await this.getClientIP();
      const allowedIPs = config.access.ipWhitelist
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      return allowedIPs.some((allowed) => {
        if (allowed.includes("/")) {
          const [network] = allowed.split("/");
          return clientIP.startsWith(network.split(".").slice(0, 3).join("."));
        }
        return clientIP === allowed;
      });
    } catch {
      return true;
    }
  },

  async detectSuspiciousActivity(userId: string, activityType: string, details?: Record<string, unknown>) {
    try {
      const { error: checkError } = await supabase
        .from("security_audit_logs")
        .select("id")
        .limit(1);
      
      if (checkError) return false;

      const recentLogs = await supabase
        .from("security_audit_logs")
        .select("event_type, created_at")
        .eq("user_id", userId)
        .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      if (recentLogs.data && recentLogs.data.length > 20) {
        await this.logSecurityEvent(userId, "suspicious_activity", "critical", {
          reason: "High activity rate",
          activity_type: activityType,
          count: recentLogs.data.length,
          ...details,
        });
        return true;
      }

      return false;
    } catch (error) {
      console.warn("Failed to detect suspicious activity", error);
      return false;
    }
  },
};
