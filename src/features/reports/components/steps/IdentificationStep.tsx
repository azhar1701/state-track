import { motion, AnimatePresence } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ReportStepProps, Severity } from "../../types";

interface IdentificationStepProps extends ReportStepProps {
  categories: Array<{ value: string; label: string }>;
}

export const IdentificationStep = ({
  formData,
  setFormData,
  errors,
  onNext,
  categories,
}: IdentificationStepProps) => {
  const isValid = formData.title.length >= 5 && formData.description.length >= 10 && formData.category;

  return (
    <div className="space-y-6 fade-in">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-semibold">Judul Laporan *</Label>
        <Input
          id="title"
          placeholder="Contoh: Sungai Cileueur meluap"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="h-10 text-sm"
        />
        <AnimatePresence>
          {errors.title && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="text-xs text-red-600">
              {errors.title}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-semibold">Kategori *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger id="category" className="h-10 text-sm">
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-xs text-red-600">{errors.category}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="severity" className="text-sm font-semibold">Tingkat Keparahan *</Label>
          <Select
            value={formData.severity}
            onValueChange={(v) => setFormData({ ...formData, severity: v as Severity })}
          >
            <SelectTrigger id="severity" className="h-10 text-sm">
              <SelectValue placeholder="Pilih tingkat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ringan">Ringan</SelectItem>
              <SelectItem value="sedang">Sedang</SelectItem>
              <SelectItem value="berat">Berat</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-semibold">Deskripsi *</Label>
        <Textarea
          id="description"
          placeholder="Jelaskan masalah secara detail..."
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="text-sm"
        />
        <AnimatePresence>
          {errors.description && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="text-xs text-red-600">
              {errors.description}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="w-full sm:w-32"
        >
          Lanjut
        </Button>
      </div>
    </div>
  );
};

