-- Geo layers storage (admin-managed custom layers)
create table if not exists public.geo_layers (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  geometry_type text check (geometry_type in ('Point','LineString','Polygon','MultiPoint','MultiLineString','MultiPolygon','GeometryCollection')),
  data jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.geo_layers enable row level security;

-- RLS policies: read for all authenticated; write by admins only (assuming role claim 'is_admin'=true)
create policy geo_layers_read on public.geo_layers for select using (auth.role() = 'authenticated');
create policy geo_layers_insert on public.geo_layers for insert with check ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean is true);
create policy geo_layers_update on public.geo_layers for update using ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean is true);
create policy geo_layers_delete on public.geo_layers for delete using ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean is true);

create index if not exists idx_geo_layers_key on public.geo_layers(key);
create index if not exists idx_geo_layers_geomtype on public.geo_layers(geometry_type);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_geo_layers
before update on public.geo_layers
for each row execute function public.set_updated_at();
