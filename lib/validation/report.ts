import { z } from "zod";

export const reportSchema = z.object({
  title: z
    .string({ required_error: "Judul wajib diisi" })
    .min(5, { message: "Judul minimal 5 karakter" })
    .max(100, { message: "Judul maksimal 100 karakter" }),
  description: z
    .string({ required_error: "Deskripsi wajib diisi" })
    .min(10, { message: "Deskripsi minimal 10 karakter" })
    .max(2000, { message: "Deskripsi maksimal 2000 karakter" }),
  category: z.enum(["jalan", "jembatan", "irigasi", "drainase", "sungai", "lainnya"], {
    required_error: "Kategori wajib dipilih",
  }),
  severity: z.enum(["ringan", "sedang", "berat"], {
    required_error: "Tingkat keparahan wajib dipilih",
  }),
  damageLevel: z
    .number({ required_error: "Tingkat kerusakan wajib diisi" })
    .int({ message: "Tingkat kerusakan harus bilangan bulat" })
    .min(1, { message: "Minimal 1" })
    .max(5, { message: "Maksimal 5" }),
  reporterName: z
    .string({ required_error: "Nama pelapor wajib diisi" })
    .min(3, { message: "Nama minimal 3 karakter" })
    .max(120, { message: "Nama terlalu panjang" }),
  phone: z
    .string({ required_error: "Nomor telepon wajib diisi" })
    .min(8, { message: "Nomor telepon minimal 8 digit" })
    .max(20, { message: "Nomor telepon maksimal 20 digit" })
    .regex(/^\+?[0-9\s-]+$/, { message: "Nomor telepon tidak valid" }),
  kecamatan: z
    .string({ required_error: "Kecamatan wajib diisi" })
    .min(2, { message: "Nama kecamatan minimal 2 karakter" })
    .max(120, { message: "Nama kecamatan terlalu panjang" }),
  desa: z
    .string({ required_error: "Desa/Kelurahan wajib diisi" })
    .min(2, { message: "Nama desa minimal 2 karakter" })
    .max(120, { message: "Nama desa terlalu panjang" }),
  location: z.object({
    latitude: z.number({ required_error: "Latitude wajib diisi" }),
    longitude: z.number({ required_error: "Longitude wajib diisi" }),
  }),
  basemap: z.enum(["osm", "satellite"], {
    required_error: "Pilihan basemap wajib dipilih",
  }),
});

export type ReportFormValues = z.infer<typeof reportSchema>;
