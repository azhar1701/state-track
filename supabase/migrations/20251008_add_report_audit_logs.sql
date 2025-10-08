-- Create audit log table for report changes
create table if not exists public.report_logs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  action text not null check (action in ('status_update','bulk_status_update','edit')),
  before jsonb,
  after jsonb,
  actor_id uuid,
  actor_email text,
  created_at timestamptz not null default now()
);

-- Indexes to speed up queries
create index if not exists report_logs_report_id_idx on public.report_logs(report_id);
create index if not exists report_logs_created_at_idx on public.report_logs(created_at desc);

-- Enable RLS and define policies
alter table public.report_logs enable row level security;

-- Allow authenticated users to read logs (adjust as needed)
create policy if not exists "Allow read report logs to authenticated"
  on public.report_logs for select
  to authenticated
  using (true);

-- Allow authenticated users to insert logs (frontend will insert after successful actions)
create policy if not exists "Allow insert report logs to authenticated"
  on public.report_logs for insert
  to authenticated
  with check (true);
