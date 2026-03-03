import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, Upload, Store, Download, Loader2, ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const steps = [
  { label: "Yuklash", icon: Upload },
  { label: "Marketplace", icon: Store },
  { label: "Natija", icon: Download },
];

const marketplaces = [
  { name: "Uzum Market", ratio: "3:4", size: "1080×1440", emoji: "🛒" },
  { name: "Wildberries", ratio: "1:1", size: "1000×1000", emoji: "🟣" },
  { name: "Ozon", ratio: "3:4", size: "1080×1440", emoji: "🔵" },
  { name: "Amazon", ratio: "4:5", size: "1600×2000", emoji: "📦" },
  { name: "Universal", ratio: "1:1", size: "1080×1080", emoji: "🌐" },
];

const Generate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedMarketplace, setSelectedMarketplace] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);

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
    if (!uploadedFile || !user || selectedMarketplace === null) return;
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

      const mp = marketplaces[selectedMarketplace];

      const { data: genData, error: genError } = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          original_url: urlData.publicUrl,
          marketplace: mp.name,
          style_preset: "Professional Studio",
          enhancements: {},
          status: "processing",
        })
        .select("id")
        .single();

      if (genError) throw genError;
      setGenerationId(genData.id);

      const { data: fnData, error: fnError } = await supabase.functions.invoke("process-image", {
        body: {
          imageUrl: urlData.publicUrl,
          marketplace: mp.name,
          marketplaceRatio: mp.ratio,
          marketplaceSize: mp.size,
          generationId: genData.id,
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
      a.download = `marketplace-${generationId || "image"}.png`;
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
    setSelectedMarketplace(null);
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Ortga</span>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold text-foreground">Yangi rasm</span>
          </div>
          <div />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-3xl">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8 sm:mb-10">
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
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">Mahsulot rasmini yuklang</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">JPG, PNG yoki WEBP — 5MB gacha</p>
                <label className="block max-w-sm sm:max-w-md mx-auto cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-2xl p-6 sm:p-10 hover:border-primary/40 transition-colors bg-card">
                    {uploadedFile && previewUrl ? (
                      <div className="text-center">
                        <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg mb-4 object-contain" />
                        <p className="font-medium text-foreground">{uploadedFile.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{(uploadedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="font-medium text-foreground">Bosing yoki rasmni tashlang</p>
                        <p className="text-sm text-muted-foreground mt-1">Mahsulot surati</p>
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
                    <Store className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Step 1: Marketplace */}
            {currentStep === 1 && (
              <div className="px-2">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2 text-center">Marketplace tanlang</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 text-center">
                  AI mahsulot kategoriyasiga qarab professional reklama rasm yaratadi
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
                  {marketplaces.map((mp, i) => (
                    <button
                      key={mp.name}
                      onClick={() => setSelectedMarketplace(i)}
                      className={`p-4 sm:p-6 rounded-2xl border text-center transition-all ${
                        selectedMarketplace === i
                          ? "border-primary bg-primary/5 shadow-glow"
                          : "border-border bg-card hover:border-primary/20"
                      }`}
                    >
                      <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{mp.emoji}</div>
                      <div className="font-display font-bold text-foreground text-sm sm:text-base">{mp.name}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">{mp.ratio} • {mp.size}</div>
                    </button>
                  ))}
                </div>

                {/* Preview of selected image */}
                {previewUrl && (
                  <div className="mt-8 flex justify-center">
                    <div className="rounded-xl border border-border bg-card p-3 max-w-[200px]">
                      <img src={previewUrl} alt="Your image" className="rounded-lg object-contain max-h-32 mx-auto" />
                      <p className="text-xs text-muted-foreground text-center mt-2">Sizning rasmingiz</p>
                    </div>
                  </div>
                )}

                {selectedMarketplace !== null && (
                  <div className="text-center mt-8">
                    <Button
                      size="lg"
                      className="gradient-primary border-0 px-10"
                      onClick={handleProcess}
                      disabled={processing}
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      AI bilan tayyorlash
                    </Button>
                    <p className="text-xs text-muted-foreground mt-3">
                      ⚡ Fon olib tashlash • Professional yorug'lik • Soya • Marketplace optimizatsiya
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Result */}
            {currentStep === 2 && (
              <div className="text-center">
                {processing ? (
                  <div className="py-16">
                    <Loader2 className="h-16 w-16 text-primary mx-auto mb-6 animate-spin" />
                    <h2 className="font-display text-2xl font-bold text-foreground mb-2">AI rasmni tayyorlamoqda...</h2>
                    <p className="text-muted-foreground">Professional rasm tayyorlanmoqda. 15-30 soniya kuting.</p>
                    <div className="mt-6 max-w-xs mx-auto space-y-2 text-left text-sm text-muted-foreground">
                      <p>✅ Fon olib tashlanmoqda</p>
                      <p>✅ Professional yorug'lik qo'shilmoqda</p>
                      <p>✅ Tabiiy soya yaratilmoqda</p>
                      <p>✅ Marketplace o'lchamiga moslashtirilmoqda</p>
                    </div>
                  </div>
                ) : resultUrl ? (
                  <div>
                    <h2 className="font-display text-3xl font-bold text-foreground mb-6">Tayyor! 🎉</h2>

                    {/* Before / After */}
                    <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card overflow-hidden mb-6">
                      <div className="flex min-h-[300px]">
                        <div className="w-1/2 bg-muted flex items-center justify-center border-r border-border p-4">
                          {previewUrl ? (
                            <img src={previewUrl} alt="Original" className="max-h-64 object-contain rounded-lg" />
                          ) : (
                            <ImageIcon className="h-16 w-16 text-muted-foreground" />
                          )}
                        </div>
                        <div className="w-1/2 flex items-center justify-center p-4 bg-card">
                          <img src={resultUrl} alt="Result" className="max-h-64 object-contain rounded-lg" />
                        </div>
                      </div>
                      <div className="flex border-t border-border text-xs font-medium">
                        <div className="w-1/2 text-center py-2 text-muted-foreground border-r border-border">Asl rasm</div>
                        <div className="w-1/2 text-center py-2 text-primary">AI natijasi</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      <Button size="lg" className="gradient-primary border-0 px-8" onClick={handleDownload}>
                        <Download className="mr-2 h-5 w-5" />
                        Yuklab olish
                      </Button>
                      <Button size="lg" variant="outline" onClick={handleNewImage}>
                        Yangi rasm
                      </Button>
                    </div>
                    {selectedMarketplace !== null && (
                      <p className="text-sm text-muted-foreground mt-4">
                        {marketplaces[selectedMarketplace].name} uchun optimallashtirilgan • {marketplaces[selectedMarketplace].ratio} • {marketplaces[selectedMarketplace].size}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-16">
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
