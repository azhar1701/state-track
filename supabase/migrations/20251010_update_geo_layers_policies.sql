-- Ensure admins (based on user_roles table) can manage geo_layers via RLS

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  );
$$;

-- Replace insert/update/delete policies to use public.is_admin()
drop policy if exists geo_layers_insert on public.geo_layers;
drop policy if exists geo_layers_update on public.geo_layers;
drop policy if exists geo_layers_delete on public.geo_layers;

create policy geo_layers_insert on public.geo_layers
for insert
with check (public.is_admin());

create policy geo_layers_update on public.geo_layers
for update
using (public.is_admin());

create policy geo_layers_delete on public.geo_layers
for delete
using (public.is_admin());

-- Keep the read policy as-is (authenticated users can read)
-- If needed, uncomment/adjust:
-- drop policy if exists geo_layers_read on public.geo_layers;
-- create policy geo_layers_read on public.geo_layers for select using (auth.role() = 'authenticated');
