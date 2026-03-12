import { z } from "zod";
import type { Database } from "@/services/types";

export type ReportStatus = Database["public"]["Enums"]["report_status"];
export type Severity = "ringan" | "sedang" | "berat";
export type Category = string;

export const reportSchema = z.object({
  title: z.string().min(5, { message: "Judul minimal 5 karakter" }).max(100),
  description: z
    .string()
    .min(10, { message: "Deskripsi minimal 10 karakter" })
    .max(2000),
  category: z.string().min(1, "Kategori wajib dipilih"),
  severity: z.enum(["ringan", "sedang", "berat"]),
  incidentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Tanggal tidak valid" })
    .refine(
      (v) => {
        const d = new Date(`${v}T00:00:00`);
        if (Number.isNaN(d.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d.getTime() <= today.getTime();
      },
      { message: "Tanggal kejadian tidak boleh di masa depan" },
    ),
  reporterName: z
    .string()
    .min(3, { message: "Nama minimal 3 karakter" })
    .max(120),
  phone: z
    .string()
    .min(8)
    .max(20)
    .regex(/^\+?[0-9\s-]+$/, { message: "Nomor telepon tidak valid" }),
  kecamatan: z.string().min(1, "Kecamatan wajib dipilih"),
  desa: z.string().min(1, "Desa wajib dipilih"),
});

export type ReportFormData = z.infer<typeof reportSchema>;

export interface LocationData {
  latitude: number;
  longitude: number;
  name?: string;
}

export interface ReportStepProps {
  formData: ReportFormData;
  setFormData: React.Dispatch<React.SetStateAction<ReportFormData>>;
  errors: Partial<Record<keyof ReportFormData, string>>;
  onNext: () => void;
  onBack?: () => void;
}
