-- Notifications for users
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info', -- info|status|system
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='select own notifications'
  ) THEN
    CREATE POLICY "select own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='insert own notifications'
  ) THEN
    CREATE POLICY "insert own notifications" ON public.notifications FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='update own notifications'
  ) THEN
    CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='delete own notifications'
  ) THEN
    CREATE POLICY "delete own notifications" ON public.notifications FOR DELETE USING (user_id = auth.uid());
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_notifications_updated_at ON public.notifications;
CREATE TRIGGER set_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Trigger to create notification on status change in report_logs
CREATE OR REPLACE FUNCTION public.notify_report_owner_on_status()
RETURNS TRIGGER AS $$
DECLARE
  owner UUID;
  to_status TEXT;
  rpt RECORD;
BEGIN
  IF NEW.action IN ('status_update', 'bulk_status_update') THEN
    to_status := COALESCE((NEW.after->>'status'), NULL);
    SELECT * INTO rpt FROM public.reports WHERE id = NEW.report_id;
    IF rpt.user_id IS NOT NULL AND to_status IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, body, type, report_id)
      VALUES (
        rpt.user_id,
        'Status laporan diperbarui',
        'Status laporan Anda berubah menjadi ' || to_status,
        'status',
        NEW.report_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_report_owner_on_status ON public.report_logs;
CREATE TRIGGER trg_notify_report_owner_on_status
AFTER INSERT ON public.report_logs
FOR EACH ROW
EXECUTE FUNCTION public.notify_report_owner_on_status();
