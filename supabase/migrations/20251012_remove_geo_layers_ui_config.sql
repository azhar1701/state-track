-- Remove UI popup config for geo_layers and adjust policies if necessary
-- This migration removes the 'ui' configuration nested inside geo_layers.data JSONB.

begin;

-- For rows where data is an object containing 'ui', drop that key preserving others
update public.geo_layers
set data = (
  case
    when jsonb_typeof(data) = 'object' and data ? 'ui' then (data - 'ui')
    else data
  end
)::jsonb;

commit;
