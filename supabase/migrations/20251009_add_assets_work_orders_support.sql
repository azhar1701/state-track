-- Assets table
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  category text not null check (category in ('jalan','jembatan','irigasi','drainase','sungai','lainnya')),
  latitude double precision not null,
  longitude double precision not null,
  location_name text,
  status text not null default 'aktif' check (status in ('aktif','nonaktif','rusak')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Work orders table
create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  asset_id uuid references public.assets(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  status text not null default 'baru' check (status in ('baru','dalam_proses','selesai','ditutup')),
  priority text not null default 'sedang' check (priority in ('rendah','sedang','tinggi','kritikal')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Support tickets (Help Center)
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.assets enable row level security;
alter table public.work_orders enable row level security;
alter table public.support_tickets enable row level security;

-- Simple policies: authenticated can read all; owners can insert/update their own where sensible
create policy assets_read on public.assets for select using (auth.role() = 'anon' or auth.role() = 'authenticated');
create policy assets_write on public.assets for insert with check (auth.role() = 'authenticated');
create policy assets_update on public.assets for update using (auth.role() = 'authenticated');

create policy wo_read on public.work_orders for select using (auth.role() = 'authenticated');
create policy wo_insert on public.work_orders for insert with check (auth.uid() = created_by);
create policy wo_update_self on public.work_orders for update using (auth.uid() = created_by or auth.uid() = assigned_to);

create policy st_read on public.support_tickets for select using (auth.uid() = user_id);
create policy st_insert on public.support_tickets for insert with check (auth.uid() = user_id);
create policy st_update on public.support_tickets for update using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_assets_category on public.assets(category);
create index if not exists idx_assets_status on public.assets(status);
create index if not exists idx_assets_location on public.assets(latitude, longitude);

create index if not exists idx_wo_status on public.work_orders(status);
create index if not exists idx_wo_priority on public.work_orders(priority);
create index if not exists idx_wo_assigned_to on public.work_orders(assigned_to);
create index if not exists idx_wo_asset_id on public.work_orders(asset_id);

create index if not exists idx_st_user on public.support_tickets(user_id);
create index if not exists idx_st_status on public.support_tickets(status);

-- updated_at trigger function (reuse if exists)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_assets
before update on public.assets
for each row execute function public.set_updated_at();

create trigger set_updated_at_work_orders
before update on public.work_orders
for each row execute function public.set_updated_at();

create trigger set_updated_at_support_tickets
before update on public.support_tickets
for each row execute function public.set_updated_at();

-- Notifications on work order assignment/status changes
create or replace function public.notify_work_order_changes()
returns trigger as $$
begin
  -- on insert: notify creator and assignee (if set)
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, title, body, type, report_id)
    values (new.created_by, 'Work Order dibuat', new.title, 'work_order', null);
    if new.assigned_to is not null then
      insert into public.notifications (user_id, title, body, type, report_id)
      values (new.assigned_to, 'Work Order ditugaskan', new.title, 'work_order', null);
    end if;
    return new;
  end if;

  -- on update: status or assignee changes
  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.notifications (user_id, title, body, type, report_id)
      values (new.created_by, 'Status WO berubah', 'Status: ' || new.status || ' - ' || coalesce(new.title,''), 'work_order', null);
      if new.assigned_to is not null then
        insert into public.notifications (user_id, title, body, type, report_id)
        values (new.assigned_to, 'Status WO berubah', 'Status: ' || new.status || ' - ' || coalesce(new.title,''), 'work_order', null);
      end if;
    end if;
    if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then
      insert into public.notifications (user_id, title, body, type, report_id)
      values (new.assigned_to, 'Work Order ditugaskan', new.title, 'work_order', null);
    end if;
    return new;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_notify_wo_changes
after insert or update on public.work_orders
for each row execute function public.notify_work_order_changes();
