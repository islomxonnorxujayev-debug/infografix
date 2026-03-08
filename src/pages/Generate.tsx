import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, ArrowLeft, Upload, Settings, Download, Loader2, ImageIcon, User, Package, TreePine, Home, Camera, LayoutGrid, BarChart3, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const modelOptions = [
  { id: "with-model", labelKey: "gen.withModel", descKey: "gen.withModelDesc", icon: User },
  { id: "without-model", labelKey: "gen.withoutModel", descKey: "gen.withoutModelDesc", icon: Package },
];

const sceneOptions = [
  { id: "nature", labelKey: "gen.nature", descKey: "gen.natureDesc", icon: TreePine },
  { id: "lifestyle", labelKey: "gen.lifestyle", descKey: "gen.lifestyleDesc", icon: Home },
  { id: "studio", labelKey: "gen.studio", descKey: "gen.studioDesc", icon: Camera },
  { id: "minimalist", labelKey: "gen.minimalist", descKey: "gen.minimalistDesc", icon: LayoutGrid },
  { id: "infographic", labelKey: "gen.infographic", descKey: "gen.infographicDesc", icon: BarChart3 },
];

const Generate = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultWatermarked, setResultWatermarked] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const steps = [
    { label: t("gen.step.upload"), icon: Upload },
    { label: t("gen.step.settings"), icon: Settings },
    { label: t("gen.step.result"), icon: Download },
  ];

  const previewUrl = useMemo(() => {
    if (uploadedFile) return URL.createObjectURL(uploadedFile);
    return null;
  }, [uploadedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("gen.fileTooLarge"));
        return;
      }
      setUploadedFile(file);
    }
  };

  const startTimers = () => {
    setElapsedSeconds(0);
    setProgress(0);
    timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    progressRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 95;
        const increment = prev < 30 ? 2.5 : prev < 60 ? 1.5 : prev < 80 ? 0.8 : 0.3;
        return Math.min(prev + increment, 95);
      });
    }, 500);
  };

  const stopTimers = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
  };

  useEffect(() => { return () => stopTimers(); }, []);

  const fireConfetti = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => confetti({ particleCount: 50, spread: 100, origin: { y: 0.5 } }), 300);
  };

  const handleProcess = async () => {
    if (!uploadedFile || !user || !selectedModel || !selectedScene) return;
    setProcessing(true);
    setCurrentStep(2);
    setShowComplete(false);
    startTimers();

    try {
      const fileExt = uploadedFile.name.split('.').pop();
      const filePath = `${user.id}/originals/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, uploadedFile, { cacheControl: "3600", upsert: true });

      if (uploadError) throw new Error(`${t("gen.uploadError")}: ${uploadError.message}`);

      const { data: signedData, error: signedError } = await supabase.storage
        .from("product-images")
        .createSignedUrl(filePath, 60 * 30); // 30 min

      if (signedError || !signedData?.signedUrl) throw new Error("Rasm URL yaratishda xatolik");

      const { data: genData, error: genError } = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          original_url: filePath,
          marketplace: `${t(modelOptions.find(m => m.id === selectedModel)?.labelKey || "")} / ${t(sceneOptions.find(s => s.id === selectedScene)?.labelKey || "")}`,
          style_preset: selectedScene,
          enhancements: { model: selectedModel, scene: selectedScene, language: lang },
          status: "processing",
        })
        .select("id")
        .single();

      if (genError) throw genError;
      setGenerationId(genData.id);

      const { data: fnData, error: fnError } = await supabase.functions.invoke("process-image", {
        body: {
          imageUrl: signedData.signedUrl,
          modelType: selectedModel,
          sceneType: selectedScene,
          generationId: genData.id,
          language: lang,
        },
      });

      if (fnError) throw fnError;
      if (fnData?.error) {
        toast.error(fnData.error);
        stopTimers();
        setProcessing(false);
        return;
      }

      stopTimers();
      setProgress(100);
      setResultUrl(fnData.resultUrl);
      setResultWatermarked(fnData.watermarked || false);
      setShowComplete(true);
      fireConfetti();
      toast.success(t("gen.success"));
    } catch (err: any) {
      console.error("Processing error:", err);
      toast.error(err.message || t("gen.processError"));
      stopTimers();
      setCurrentStep(1);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!resultUrl) return;
    try {
      toast.loading(t("gen.downloading") || "Yuklab olinmoqda...", { id: "dl" });

      const match = resultUrl.match(/\/product-images\/(.+)$/);
      const storagePath = match ? match[1].split("?")[0] : "";

      // Get a signed URL with download flag
      let downloadUrl = resultUrl;
      if (storagePath) {
        const { data } = await supabase.storage
          .from("product-images")
          .createSignedUrl(storagePath, 300, { download: true });
        if (data?.signedUrl) downloadUrl = data.signedUrl;
      }

      // Telegram WebApp — open link directly
      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(downloadUrl);
        toast.success("Rasm ochildi. Bosib turing va saqlang.", { id: "dl" });
      } else {
        // Browser: open signed URL with download param
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `infografix-${generationId || Date.now()}.png`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(t("gen.downloaded"), { id: "dl" });
      }
    } catch {
      toast.error(t("gen.downloadError"), { id: "dl" });
    }
  };

  const handleNewImage = () => {
    setUploadedFile(null);
    setResultUrl(null);
    setResultWatermarked(false);
    setGenerationId(null);
    setSelectedModel(null);
    setSelectedScene(null);
    setCurrentStep(0);
    setProgress(0);
    setElapsedSeconds(0);
    setShowComplete(false);
  };

  const canProceedStep1 = selectedModel !== null && selectedScene !== null;

  const selectedSceneLabel = sceneOptions.find(s => s.id === selectedScene)?.labelKey;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between h-14 sm:h-16 px-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm hidden sm:inline">{t("gen.back")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold text-foreground text-sm sm:text-base">{t("gen.newImage")}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-3xl">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 sm:mb-10">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1 sm:gap-2">
              <div className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                i === currentStep
                  ? "gradient-primary text-primary-foreground"
                  : i < currentStep
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                <step.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-4 sm:w-8 h-px ${i < currentStep ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 0: Upload */}
            {currentStep === 0 && (
              <div className="text-center px-2">
                <h2 className="font-display text-xl sm:text-3xl font-bold text-foreground mb-2">{t("gen.uploadTitle")}</h2>
                <p className="text-sm text-muted-foreground mb-6">{t("gen.uploadDesc")}</p>
                <label className="block max-w-sm mx-auto cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-2xl p-6 sm:p-10 hover:border-primary/40 transition-colors bg-card">
                    {uploadedFile && previewUrl ? (
                      <div className="text-center">
                        <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg mb-4 object-contain" />
                        <p className="font-medium text-foreground text-sm">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{(uploadedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="font-medium text-foreground text-sm sm:text-base">{t("gen.uploadBtn")}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t("gen.uploadLabel")}</p>
                      </div>
                    )}
                  </div>
                  <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
                </label>
                {uploadedFile && (
                  <Button
                    size="lg"
                    className="gradient-primary border-0 mt-6 px-8"
                    onClick={() => setCurrentStep(1)}
                  >
                    {t("gen.continue")}
                    <Settings className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Step 1: Options */}
            {currentStep === 1 && (
              <div className="px-2">
                <h2 className="font-display text-xl sm:text-3xl font-bold text-foreground mb-1 text-center">{t("gen.settingsTitle")}</h2>
                <p className="text-sm text-muted-foreground mb-6 sm:mb-8 text-center">{t("gen.settingsDesc")}</p>

                {/* Model selection */}
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-sm font-semibold text-foreground mb-3 text-center">{t("gen.modelType")}</h3>
                  <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                    {modelOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedModel(opt.id)}
                        className={`p-4 sm:p-5 rounded-2xl border text-center transition-all ${
                          selectedModel === opt.id
                            ? "border-primary bg-primary/5 shadow-glow"
                            : "border-border bg-card hover:border-primary/20"
                        }`}
                      >
                        <opt.icon className={`h-6 w-6 mx-auto mb-2 ${selectedModel === opt.id ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="font-display font-bold text-foreground text-sm">{t(opt.labelKey)}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">{t(opt.descKey)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scene selection */}
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-sm font-semibold text-foreground mb-3 text-center">{t("gen.scene")}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                    {sceneOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedScene(opt.id)}
                        className={`p-3 sm:p-4 rounded-2xl border text-center transition-all ${
                          selectedScene === opt.id
                            ? "border-primary bg-primary/5 shadow-glow"
                            : "border-border bg-card hover:border-primary/20"
                        }`}
                      >
                        <opt.icon className={`h-5 w-5 mx-auto mb-1.5 ${selectedScene === opt.id ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="font-display font-bold text-foreground text-xs sm:text-sm">{t(opt.labelKey)}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{t(opt.descKey)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {previewUrl && (
                  <div className="flex justify-center mb-6">
                    <div className="rounded-xl border border-border bg-card p-3 max-w-[160px]">
                      <img src={previewUrl} alt="Your image" className="rounded-lg object-contain max-h-28 mx-auto" />
                      <p className="text-[10px] text-muted-foreground text-center mt-2">{t("gen.yourImage")}</p>
                    </div>
                  </div>
                )}

                {canProceedStep1 && (
                  <div className="text-center">
                    <Button
                      size="lg"
                      className="gradient-primary border-0 px-6 sm:px-10 text-sm sm:text-base"
                      onClick={handleProcess}
                      disabled={processing}
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      {t("gen.generate")}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-3">{t("gen.sizeInfo")}</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Result */}
            {currentStep === 2 && (
              <div className="text-center">
                {processing ? (
                  <div className="py-12 sm:py-16">
                    <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-primary mx-auto mb-4 sm:mb-6 animate-spin" />
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">{t("gen.processing")}</h2>
                    <p className="text-sm text-muted-foreground">{t("gen.processingDesc")}</p>

                    {/* Progress bar with percentage */}
                    <div className="mt-6 max-w-sm mx-auto">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>{elapsedSeconds} {lang === "ru" ? "сек" : "soniya"}</span>
                        <span className="font-semibold text-primary">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-3" />
                    </div>

                    <div className="mt-4 sm:mt-6 max-w-xs mx-auto space-y-1.5 text-left text-xs sm:text-sm text-muted-foreground">
                      <p className={progress > 10 ? "text-primary" : ""}>
                        {progress > 10 ? "✅" : "⏳"} {t("gen.analyzing")}
                      </p>
                      <p className={progress > 30 ? "text-primary" : ""}>
                        {progress > 30 ? "✅" : "⏳"} {selectedSceneLabel ? t(selectedSceneLabel) : ""} {t("gen.creatingBg")}
                      </p>
                      <p className={progress > 60 ? "text-primary" : ""}>
                        {progress > 60 ? "✅" : "⏳"} {selectedModel === "with-model" ? t("gen.addingModel") : t("gen.proComposition")}
                      </p>
                      <p className={progress > 85 ? "text-primary" : ""}>
                        {progress > 85 ? "✅" : "⏳"} {t("gen.resizing")}
                      </p>
                    </div>
                  </div>
                ) : resultUrl ? (
                  <div>
                    {showComplete && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500/10 border border-green-500/30"
                      >
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                        <span className="font-display font-bold text-green-500 text-lg">
                          {lang === "ru" ? "Готово! 🎉" : "Tayyor! 🎉"}
                        </span>
                      </motion.div>
                    )}

                    <h2 className="font-display text-xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-6">{t("gen.done")}</h2>

                    <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card overflow-hidden mb-4 sm:mb-6">
                      <div className="flex flex-col sm:flex-row min-h-[200px] sm:min-h-[300px]">
                        <div className="w-full sm:w-1/2 bg-muted flex items-center justify-center border-b sm:border-b-0 sm:border-r border-border p-3 sm:p-4">
                          {previewUrl ? (
                            <img src={previewUrl} alt="Original" className="max-h-48 sm:max-h-64 object-contain rounded-lg" />
                          ) : (
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                          )}
                        </div>
                        <div className="w-full sm:w-1/2 flex items-center justify-center p-3 sm:p-4 bg-card">
                          <img src={resultUrl} alt="Result" className="max-h-48 sm:max-h-64 object-contain rounded-lg" />
                        </div>
                      </div>
                      <div className="flex border-t border-border text-xs font-medium">
                        <div className="w-1/2 text-center py-2 text-muted-foreground border-r border-border">{t("gen.original")}</div>
                        <div className="w-1/2 text-center py-2 text-primary">{t("gen.aiResult")}</div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Button size="lg" className="gradient-primary border-0 px-6 sm:px-8 w-full sm:w-auto" onClick={handleDownload}>
                        <Download className="mr-2 h-5 w-5" />
                        {t("gen.download")}
                      </Button>
                      <Button size="lg" variant="outline" onClick={handleNewImage} className="w-full sm:w-auto">
                        {t("gen.newImageBtn")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      1080×1440 • {selectedModel && t(modelOptions.find(m => m.id === selectedModel)?.labelKey || "")} • {selectedScene && t(sceneOptions.find(s => s.id === selectedScene)?.labelKey || "")}
                    </p>
                  </div>
                ) : (
                  <div className="py-12 sm:py-16">
                    <p className="text-muted-foreground">{t("gen.error")}</p>
                    <Button variant="outline" className="mt-4" onClick={handleNewImage}>{t("gen.restart")}</Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Generate;
