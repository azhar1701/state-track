-- Keep geo_layers key='assets' in sync with assets table changes
-- This migration creates a function to rebuild the FeatureCollection and a trigger on assets

create or replace function public.rebuild_assets_geo_layer()
returns void
language plpgsql
security definer
as $$
declare
  fc jsonb;
begin
  -- Build FeatureCollection from current assets
  with feats as (
    select jsonb_build_object(
      'type','Feature',
      'properties', jsonb_build_object(
        'id', a.id,
        'code', a.code,
        'name', a.name,
        'category', a.category,
        'status', a.status,
        'location_name', a.location_name
      ),
      'geometry', jsonb_build_object(
        'type','Point',
        'coordinates', jsonb_build_array(a.longitude, a.latitude)
      )
    ) as feature
    from public.assets a
  )
  select jsonb_build_object('type','FeatureCollection','features', coalesce(jsonb_agg(feature), '[]'::jsonb)) into fc from feats;

  -- Upsert into geo_layers as wrapped object with CRS
  insert into public.geo_layers(key, name, geometry_type, data)
  values ('assets','Assets','Point', jsonb_build_object('featureCollection', fc, 'crs','EPSG:4326'))
  on conflict (key) do update set
    name = excluded.name,
    geometry_type = excluded.geometry_type,
    data = excluded.data;
end;
$$;

-- Trigger function to call rebuild on change
create or replace function public.assets_geo_layer_trigger()
returns trigger
language plpgsql
as $$
begin
  perform public.rebuild_assets_geo_layer();
  return null;
end;
$$;

-- Drop existing trigger if present
drop trigger if exists trg_assets_geo_layer on public.assets;

-- Create trigger on insert/update/delete
create trigger trg_assets_geo_layer
after insert or update or delete on public.assets
for each statement
execute function public.assets_geo_layer_trigger();
