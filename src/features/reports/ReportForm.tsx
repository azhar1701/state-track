import { motion, AnimatePresence } from "framer-motion";
import { useReportFormState } from "./hooks/useReportFormState";
import { IdentificationStep } from "./components/steps/IdentificationStep";
import { DocumentationStep } from "./components/steps/DocumentationStep";
import { LocationStep } from "./components/steps/LocationStep";
import { ReviewStep } from "./components/steps/ReviewStep";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveCamera } from "@/components/common/LiveCamera";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const ReportForm = () => {
  const {
    currentStep, setCurrentStep, totalSteps,
    formData, setFormData, errors, saveStatus,
    photoFiles, photoPreviews, handlePhotoChange, removePhoto, isAnalyzing, runAIAnalysis,
    location, setLocation, handleMapClick, getUserLocation,
    categories, kecamatanList, desaList, selectedKecamatanId, handleKecamatanChange, selectedDesaId, handleDesaChange,
    loading, uploadPercent, handleSubmit
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
                  className={`h-full flex-1 transition-all duration-500 rounded-full ${
                    i + 1 <= currentStep ? 'bg-primary' : 'bg-muted-foreground/20'
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
                    onNext={() => {}}
                    onBack={() => setCurrentStep(3)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
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
