-- Seed full list of Kecamatan in Kabupaten Ciamis (upsert by name)
-- Source: official administrative divisions (provide real dataset if available)

DO $$
DECLARE
  kecamatan_names TEXT[] := ARRAY[
    'Banjarsari',
    'Banjaranyar',
    'Baregbeg',
    'Ciamis',
    'Cidolog',
    'Cihaurbeuti',
    'Cijeungjing',
    'Cikoneng',
    'Cimaragas',
    'Cipaku',
    'Cisaga',
    'Jatinagara',
    'Kawali',
    'Lakbok',
    'Lumbung',
    'Pamarican',
    'Panawangan',
    'Panjalu',
    'Panumbangan',
    'Purwadadi',
    'Rajadesa',
    'Rancah',
    'Sadananya',
    'Sindangkasih',
    'Sukadana',
    'Sukamantri',
    'Tambaksari'
  ];
  k TEXT;
BEGIN
  FOREACH k IN ARRAY kecamatan_names LOOP
    INSERT INTO public.kecamatan(name)
    VALUES (k)
    ON CONFLICT (name) DO NOTHING;
  END LOOP;
END $$;
