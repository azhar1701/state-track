-- Rename column location_name to keterangan in assets and update related functions
alter table if exists public.assets
  rename column location_name to keterangan;

-- Recreate rebuild_assets_geo_layer to emit 'keterangan' property
create or replace function public.rebuild_assets_geo_layer()
returns void
language plpgsql
security definer
as $$
declare
  fc jsonb;
begin
  with feats as (
    select jsonb_build_object(
      'type','Feature',
      'properties', jsonb_build_object(
        'id', a.id,
        'code', a.code,
        'name', a.name,
        'category', a.category,
        'status', a.status,
        'keterangan', a.keterangan
      ),
      'geometry', jsonb_build_object(
        'type','Point',
        'coordinates', jsonb_build_array(a.longitude, a.latitude)
      )
    ) as feature
    from public.assets a
  )
  select jsonb_build_object('type','FeatureCollection','features', coalesce(jsonb_agg(feature), '[]'::jsonb)) into fc from feats;

  insert into public.geo_layers(key, name, geometry_type, data)
  values ('assets','Assets','Point', jsonb_build_object('featureCollection', fc, 'crs','EPSG:4326'))
  on conflict (key) do update set
    name = excluded.name,
    geometry_type = excluded.geometry_type,
    data = excluded.data;
end;
$$;
