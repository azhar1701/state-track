-- Security Settings Migration
-- Adds tables for security audit logs, session management, and login attempts tracking

-- Create security_audit_logs table for comprehensive security event logging
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'login', 'logout', 'login_failed', 'password_change', 'mfa_enabled', 'mfa_disabled', 'permission_change', 'suspicious_activity'
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_severity ON security_audit_logs(severity);

-- Create login_attempts table for tracking failed login attempts
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  success BOOLEAN DEFAULT false,
  attempted_at TIMESTAMPTZ DEFAULT now(),
  locked_until TIMESTAMPTZ
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at DESC);

-- Create active_sessions table for session management
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_activity TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires_at ON active_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_active_sessions_session_token ON active_sessions(session_token);

-- RLS Policies for security_audit_logs (admin only)
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all security audit logs"
  ON security_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "System can insert security audit logs"
  ON security_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for login_attempts (admin only)
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all login attempts"
  ON login_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "System can insert login attempts"
  ON login_attempts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- RLS Policies for active_sessions
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON active_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin can view all sessions"
  ON active_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "System can manage sessions"
  ON active_sessions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to clean up old audit logs based on retention policy
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM security_audit_logs
  WHERE created_at < now() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM active_sessions
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if account is locked due to failed login attempts
CREATE OR REPLACE FUNCTION is_account_locked(user_email TEXT, max_attempts INTEGER DEFAULT 5, lockout_minutes INTEGER DEFAULT 15)
RETURNS BOOLEAN AS $$
DECLARE
  recent_failures INTEGER;
  locked_until_time TIMESTAMPTZ;
BEGIN
  -- Check if there's an active lockout
  SELECT locked_until INTO locked_until_time
  FROM login_attempts
  WHERE email = user_email
    AND locked_until IS NOT NULL
    AND locked_until > now()
  ORDER BY attempted_at DESC
  LIMIT 1;
  
  IF locked_until_time IS NOT NULL THEN
    RETURN true;
  END IF;
  
  -- Count recent failed attempts (within lockout window)
  SELECT COUNT(*) INTO recent_failures
  FROM login_attempts
  WHERE email = user_email
    AND success = false
    AND attempted_at > now() - (lockout_minutes || ' minutes')::INTERVAL;
  
  RETURN recent_failures >= max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO security_audit_logs (user_id, event_type, ip_address, user_agent, details, severity)
  VALUES (p_user_id, p_event_type, p_ip_address, p_user_agent, p_details, p_severity)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION is_account_locked(TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_security_event(UUID, TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated;

-- Add comment
COMMENT ON TABLE security_audit_logs IS 'Comprehensive security event logging for authentication, authorization, and suspicious activities';
COMMENT ON TABLE login_attempts IS 'Tracks login attempts for rate limiting and account lockout functionality';
COMMENT ON TABLE active_sessions IS 'Manages active user sessions with expiration and activity tracking';
