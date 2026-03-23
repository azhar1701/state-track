import { motion, AnimatePresence } from "framer-motion";
import { useReportFormState } from "./hooks/useReportFormState";
import { IdentificationStep } from "./components/steps/IdentificationStep";
import { DocumentationStep } from "./components/steps/DocumentationStep";
import { LocationStep } from "./components/steps/LocationStep";
import { ReviewStep } from "./components/steps/ReviewStep";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveCamera } from "@/components/common/LiveCamera";
import { Loader2, Sparkles } from "lucide-react";
import { AISpinner } from "@/components/ui/ai-spinner";
import { useState } from "react";

const ReportForm = () => {
  const {
    currentStep, setCurrentStep, totalSteps,
    formData, setFormData, errors, saveStatus,
    photoFiles, photoPreviews, handlePhotoChange, removePhoto, isAnalyzing, runAIAnalysis,
    location, setLocation, handleMapClick, getUserLocation,
    categories, kecamatanList, desaList, selectedKecamatanId, handleKecamatanChange, selectedDesaId, handleDesaChange,
    loading, uploadPercent, handleSubmit,
    isDeduplicating
  } = useReportFormState();

  const [showCamera, setShowCamera] = useState(false);

  const stepTitles = [
    "Informasi Masalah",
    "Dokumentasi Foto",
    "Lokasi Kejadian",
    "Tinjau & Kirim"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-4 md:py-8">
      <div className="container max-w-2xl px-4">
        <Card className="shadow-xl border-none overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  Langkah {currentStep} dari {totalSteps}
                </span>
                <CardTitle className="text-xl md:text-2xl font-bold">
                  {stepTitles[currentStep - 1]}
                </CardTitle>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background border text-[10px] font-medium">
                {saveStatus === 'saving' ? (
                  <><Loader2 className="w-2.5 h-2.5 animate-spin text-amber-500" /><span>Autosave...</span></>
                ) : (
                  <><div className="w-1.5 h-1.5 rounded-full bg-green-500" /><span>Draft Tersimpan</span></>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-full flex-1 transition-all duration-500 rounded-full ${i + 1 <= currentStep ? 'bg-primary' : 'bg-muted-foreground/20'
                    }`}
                />
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {currentStep === 1 && (
                  <IdentificationStep
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    categories={categories}
                    isAnalyzing={isAnalyzing}
                    onSuggestAI={() => photoFiles[0] && runAIAnalysis(photoFiles[0])}
                    hasPhotos={photoFiles.length > 0}
                    onNext={() => setCurrentStep(2)}
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
                    onNext={() => setCurrentStep(3)}
                    onBack={() => setCurrentStep(1)}
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
                    onNext={() => setCurrentStep(4)}
                    onBack={() => setCurrentStep(2)}
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
                    onNext={() => { }}
                    onBack={() => setCurrentStep(3)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {isDeduplicating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-background/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <div className="max-w-md w-full bg-card border-none shadow-2xl rounded-3xl p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-indigo-500/10" />
              <div className="relative z-10 space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-500/20 blur-xl animate-pulse rounded-full" />
                    <Sparkles className="h-12 w-12 text-purple-500 relative z-20 animate-bounce" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Analisis Duplikasi AI
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Menghubungkan ke jaringan neural untuk memeriksa laporan serupa di area Anda...
                  </p>
                </div>
                <AISpinner size={32} text="Menghitung vektor semantik..." className="text-purple-600" />
                <div className="pt-4 flex justify-center gap-1.5">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                      className="h-1.5 w-1.5 rounded-full bg-purple-500"
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
