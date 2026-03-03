import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, Upload, Settings, Download, Loader2, ImageIcon, User, Package, TreePine, Home, Camera, LayoutGrid, BarChart3, Languages } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const steps = [
  { label: "Yuklash", icon: Upload },
  { label: "Sozlash", icon: Settings },
  { label: "Natija", icon: Download },
];

const modelOptions = [
  { id: "with-model", label: "Modelli", description: "Inson model bilan", icon: User },
  { id: "without-model", label: "Modelsiz", description: "Faqat mahsulot", icon: Package },
];

const sceneOptions = [
  { id: "nature", label: "Tabiat", description: "Tabiat fonida", icon: TreePine },
  { id: "lifestyle", label: "Lifestyle", description: "Hayotiy muhit", icon: Home },
  { id: "studio", label: "Studia", description: "Professional studia", icon: Camera },
  { id: "minimalist", label: "Minimalist", description: "Oddiy va toza", icon: LayoutGrid },
  { id: "infographic", label: "Infografika", description: "Ma'lumotli dizayn", icon: BarChart3 },
];

const languageOptions = [
  { id: "uz", label: "O'zbekcha", flag: "🇺🇿" },
  { id: "ru", label: "Русский", flag: "🇷🇺" },
];

const Generate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("uz");

  const previewUrl = useMemo(() => {
    if (uploadedFile) return URL.createObjectURL(uploadedFile);
    return null;
  }, [uploadedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Fayl hajmi 5MB dan kichik bo'lishi kerak");
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleProcess = async () => {
    if (!uploadedFile || !user || !selectedModel || !selectedScene) return;
    setProcessing(true);
    setCurrentStep(2);

    try {
      const fileExt = uploadedFile.name.split('.').pop();
      const filePath = `${user.id}/originals/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, uploadedFile, { cacheControl: "3600", upsert: true });

      if (uploadError) throw new Error(`Yuklashda xatolik: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      const modelLabel = modelOptions.find(m => m.id === selectedModel)?.label || "";
      const sceneLabel = sceneOptions.find(s => s.id === selectedScene)?.label || "";

      const { data: genData, error: genError } = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          original_url: urlData.publicUrl,
          marketplace: `${modelLabel} / ${sceneLabel}`,
          style_preset: selectedScene,
          enhancements: { model: selectedModel, scene: selectedScene },
          status: "processing",
        })
        .select("id")
        .single();

      if (genError) throw genError;
      setGenerationId(genData.id);

      const { data: fnData, error: fnError } = await supabase.functions.invoke("process-image", {
        body: {
          imageUrl: urlData.publicUrl,
          modelType: selectedModel,
          sceneType: selectedScene,
          generationId: genData.id,
          language: selectedLanguage,
        },
      });

      if (fnError) throw fnError;
      if (fnData?.error) {
        toast.error(fnData.error);
        setProcessing(false);
        return;
      }

      setResultUrl(fnData.resultUrl);
      toast.success("Rasm muvaffaqiyatli tayyorlandi!");
    } catch (err: any) {
      console.error("Processing error:", err);
      toast.error(err.message || "Rasmni qayta ishlashda xatolik");
      setCurrentStep(1);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!resultUrl) return;
    try {
      const response = await fetch(resultUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `product-${generationId || "image"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Rasm yuklandi!");
    } catch {
      toast.error("Yuklashda xatolik");
    }
  };

  const handleNewImage = () => {
    setUploadedFile(null);
    setResultUrl(null);
    setGenerationId(null);
    setSelectedModel(null);
    setSelectedScene(null);
    setSelectedLanguage("uz");
    setCurrentStep(0);
  };

  const canProceedStep1 = selectedModel !== null && selectedScene !== null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between h-14 sm:h-16 px-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm hidden sm:inline">Ortga</span>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold text-foreground text-sm sm:text-base">Yangi rasm</span>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-3xl">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 sm:mb-10">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1 sm:gap-2">
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
                <h2 className="font-display text-xl sm:text-3xl font-bold text-foreground mb-2">Mahsulot rasmini yuklang</h2>
                <p className="text-sm text-muted-foreground mb-6">JPG, PNG yoki WEBP — 5MB gacha</p>
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
                        <p className="font-medium text-foreground text-sm sm:text-base">Bosing yoki rasmni tashlang</p>
                        <p className="text-xs text-muted-foreground mt-1">Mahsulot surati</p>
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
                    Davom etish
                    <Settings className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Step 1: Options */}
            {currentStep === 1 && (
              <div className="px-2">
                <h2 className="font-display text-xl sm:text-3xl font-bold text-foreground mb-1 text-center">Sozlamalarni tanlang</h2>
                <p className="text-sm text-muted-foreground mb-6 sm:mb-8 text-center">
                  AI tanlangan sozlamalarga qarab premium rasm yaratadi
                </p>

                {/* Model selection */}
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-sm font-semibold text-foreground mb-3 text-center">👤 Model turi</h3>
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
                        <div className="font-display font-bold text-foreground text-sm">{opt.label}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">{opt.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scene selection */}
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-sm font-semibold text-foreground mb-3 text-center">🎬 Holat / Fon</h3>
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
                        <div className="font-display font-bold text-foreground text-xs sm:text-sm">{opt.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{opt.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language selection */}
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-sm font-semibold text-foreground mb-3 text-center">🌐 Matn tili</h3>
                  <div className="flex gap-3 justify-center max-w-xs mx-auto">
                    {languageOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedLanguage(opt.id)}
                        className={`flex-1 p-3 sm:p-4 rounded-2xl border text-center transition-all ${
                          selectedLanguage === opt.id
                            ? "border-primary bg-primary/5 shadow-glow"
                            : "border-border bg-card hover:border-primary/20"
                        }`}
                      >
                        <span className="text-2xl block mb-1">{opt.flag}</span>
                        <div className="font-display font-bold text-foreground text-xs sm:text-sm">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {previewUrl && (
                  <div className="flex justify-center mb-6">
                    <div className="rounded-xl border border-border bg-card p-3 max-w-[160px]">
                      <img src={previewUrl} alt="Your image" className="rounded-lg object-contain max-h-28 mx-auto" />
                      <p className="text-[10px] text-muted-foreground text-center mt-2">Sizning rasmingiz</p>
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
                      AI bilan tayyorlash
                    </Button>
                    <p className="text-xs text-muted-foreground mt-3">
                      📐 1080×1440 • ⚡ Professional sifat
                    </p>
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
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">AI rasmni tayyorlamoqda...</h2>
                    <p className="text-sm text-muted-foreground">Professional rasm tayyorlanmoqda. 15-30 soniya kuting.</p>
                    <div className="mt-4 sm:mt-6 max-w-xs mx-auto space-y-1.5 text-left text-xs sm:text-sm text-muted-foreground">
                      <p>✅ Mahsulot tahlil qilinmoqda</p>
                      <p>✅ {selectedScene === "nature" ? "Tabiat foni" : selectedScene === "lifestyle" ? "Lifestyle muhit" : selectedScene === "studio" ? "Studia foni" : selectedScene === "infographic" ? "Infografika" : "Minimalist fon"} yaratilmoqda</p>
                      <p>✅ {selectedModel === "with-model" ? "Model qo'shilmoqda" : "Professional kompozitsiya"}</p>
                      <p>✅ 1080×1440 o'lchamga moslashtirilmoqda</p>
                    </div>
                  </div>
                ) : resultUrl ? (
                  <div>
                    <h2 className="font-display text-xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-6">Tayyor! 🎉</h2>

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
                        <div className="w-1/2 text-center py-2 text-muted-foreground border-r border-border">Asl rasm</div>
                        <div className="w-1/2 text-center py-2 text-primary">AI natijasi</div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Button size="lg" className="gradient-primary border-0 px-6 sm:px-8 w-full sm:w-auto" onClick={handleDownload}>
                        <Download className="mr-2 h-5 w-5" />
                        Yuklab olish
                      </Button>
                      <Button size="lg" variant="outline" onClick={handleNewImage} className="w-full sm:w-auto">
                        Yangi rasm
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      1080×1440 • {modelOptions.find(m => m.id === selectedModel)?.label} • {sceneOptions.find(s => s.id === selectedScene)?.label}
                    </p>
                  </div>
                ) : (
                  <div className="py-12 sm:py-16">
                    <p className="text-muted-foreground">Xatolik yuz berdi. Qayta urinib ko'ring.</p>
                    <Button variant="outline" className="mt-4" onClick={handleNewImage}>Qayta boshlash</Button>
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
