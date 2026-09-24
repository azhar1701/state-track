import { motion, AnimatePresence } from "framer-motion";
import { useReportFormState } from "./hooks/useReportFormState";
import { IdentificationStep } from "./components/steps/IdentificationStep";
import { DocumentationStep } from "./components/steps/DocumentationStep";
import { LocationStep } from "./components/steps/LocationStep";
import { ReviewStep } from "./components/steps/ReviewStep";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LiveCamera } from "@/components/common/LiveCamera";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useState, useMemo } from "react";

const ReportForm = () => {
  const {
    currentStep,
    setCurrentStep,
    totalSteps,
    formData,
    setFormData,
    errors,
    saveStatus,
    photoFiles,
    photoPreviews,
    handlePhotoChange,
    removePhoto,
    location,
    setLocation,
    handleMapClick,
    getUserLocation,
    gpsAccuracy,
    categories,
    kecamatanList,
    desaList,
    selectedKecamatanId,
    handleKecamatanChange,
    selectedDesaId,
    handleDesaChange,
    loading,
    uploadPercent,
    handleSubmit,
  } = useReportFormState();

  const [showCamera, setShowCamera] = useState(false);

  const stepTitles = [
    "Informasi Masalah",
    "Dokumentasi Foto",
    "Lokasi Kejadian",
    "Tinjau & Kirim",
  ];

  // Validation state & hints per step
  const stepValidation = useMemo(() => {
    switch (currentStep) {
      case 1: {
        const titleValid = formData.title.trim().length >= 5;
        const descValid = formData.description.trim().length >= 10;
        const categoryValid = Boolean(formData.category);
        const valid = titleValid && descValid && categoryValid;
        let hint = "";
        if (!titleValid) hint = "Judul minimal 5 karakter";
        else if (!categoryValid) hint = "Pilih kategori masalah";
        else if (!descValid) hint = "Deskripsi minimal 10 karakter";
        return { valid, hint };
      }
      case 2:
        return { valid: true, hint: "" };
      case 3: {
        const kecValid = Boolean(selectedKecamatanId);
        const desaValid = Boolean(selectedDesaId);
        const locValid = Boolean(location);
        const valid = kecValid && desaValid && locValid;
        let hint = "";
        if (!kecValid) hint = "Pilih kecamatan";
        else if (!desaValid) hint = "Pilih desa/kelurahan";
        else if (!locValid) hint = "Pilih titik lokasi pada peta";
        return { valid, hint };
      }
      case 4:
        return { valid: !loading, hint: "" };
      default:
        return { valid: true, hint: "" };
    }
  }, [
    currentStep,
    formData.title,
    formData.description,
    formData.category,
    selectedKecamatanId,
    selectedDesaId,
    location,
    loading,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-4 pb-24 md:py-8">
      <div className="container max-w-2xl px-3 sm:px-4">
        <Card className="shadow-xl border-border/80 overflow-hidden rounded-2xl bg-card/90 backdrop-blur-md">
          <CardHeader className="pb-3 px-4 sm:px-6 pt-5">
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Langkah {currentStep} dari {totalSteps}
                </span>
                <CardTitle className="text-xl md:text-2xl font-bold text-foreground">
                  {stepTitles[currentStep - 1]}
                </CardTitle>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/80 border border-border text-[10px] font-medium shadow-sm">
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-500" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Draft Tersimpan</span>
                  </>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-full flex-1 transition-all duration-500 rounded-full ${
                    i + 1 <= currentStep ? "bg-primary" : "bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-2 px-4 sm:px-6 pb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {currentStep === 1 && (
                  <IdentificationStep
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    categories={categories}
                  />
                )}

                {currentStep === 2 && (
                  <DocumentationStep
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    photoFiles={photoFiles}
                    photoPreviews={photoPreviews}
                    onPhotoChange={handlePhotoChange}
                    onRemovePhoto={removePhoto}
                    onShowCamera={() => setShowCamera(true)}
                  />
                )}

                {currentStep === 3 && (
                  <LocationStep
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    location={location}
                    setLocation={setLocation}
                    kecamatanList={kecamatanList}
                    desaList={desaList}
                    selectedKecamatanId={selectedKecamatanId}
                    onKecamatanChange={handleKecamatanChange}
                    selectedDesaId={selectedDesaId}
                    onDesaChange={handleDesaChange}
                    onGetUserLocation={getUserLocation}
                    onMapClick={handleMapClick}
                    gpsAccuracy={gpsAccuracy}
                  />
                )}

                {currentStep === 4 && (
                  <ReviewStep
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    location={location}
                    photoPreviews={photoPreviews}
                    loading={loading}
                    uploadPercent={uploadPercent}
                    onSubmit={handleSubmit}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>

          {/* Unified Sticky Action Bar */}
          <div className="sticky bottom-0 z-30 px-4 py-3 sm:px-6 sm:py-3.5 pb-safe bg-card/95 backdrop-blur-md border-t border-border/80 flex items-center justify-between gap-2 sm:gap-4 shadow-float">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              disabled={currentStep === 1 || loading}
              className="h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl btn-haptic gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali</span>
            </Button>

            {/* Validation Hint / Status */}
            <div className="flex-1 flex justify-center text-center px-1 overflow-hidden">
              {stepValidation.hint ? (
                <span className="text-[11px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium line-clamp-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{stepValidation.hint}</span>
                </span>
              ) : (
                <span className="text-[11px] sm:text-xs text-muted-foreground hidden xs:inline">
                  Langkah {currentStep} dari {totalSteps}
                </span>
              )}
            </div>

            {currentStep < totalSteps ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setCurrentStep((prev) => Math.min(totalSteps, prev + 1))}
                disabled={!stepValidation.valid || loading}
                className="h-10 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl btn-haptic shadow-md gap-1"
              >
                <span>Lanjut</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={loading}
                className="h-10 px-5 sm:px-6 text-xs sm:text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground btn-haptic shadow-md gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Laporan</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>

      {showCamera && (
        <LiveCamera
          onCapture={(file) => {
            handlePhotoChange(file);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

export default ReportForm;
