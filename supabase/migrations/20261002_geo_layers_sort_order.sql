-- Add sort_order column to geo_layers for admin-controlled layer stacking
-- Urutan dari bawah (nilai kecil) ke atas (nilai besar) di map canvas.
-- Default 500: layer baru muncul di atas layer yang sudah ada.
-- Batas Admin: 350, Sawah: 360, Sungai: 370, Layer lain: 375+

alter table public.geo_layers
  add column if not exists sort_order integer not null default 500;

-- Seed default sort_order berdasarkan nama key yang sudah ada
-- (hanya berjalan jika key sudah ada di database)
update public.geo_layers
  set sort_order = case
    when key ilike '%sawah%' or key ilike '%padi%' then 360
    when key ilike '%sungai%' or key ilike '%river%' or key ilike '%drainase%' then 370
    else 375
  end
where sort_order = 500;

-- Index untuk ordering yang efisien
create index if not exists idx_geo_layers_sort_order
  on public.geo_layers(sort_order asc);

comment on column public.geo_layers.sort_order is
  'Urutan layer dari bawah ke atas di map canvas (nilai lebih kecil = lebih bawah). Admin Boundaries = 350, Sawah = 360, Sungai = 370.';
