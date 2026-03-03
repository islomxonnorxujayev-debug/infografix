import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, ArrowRight, Upload, Store, Palette, Sliders, Eye, Download, Check, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const steps = [
  { label: "Upload", icon: Upload },
  { label: "Format", icon: Store },
  { label: "Style", icon: Palette },
  { label: "Enhance", icon: Sliders },
  { label: "Preview", icon: Eye },
  { label: "Export", icon: Download },
];

const marketplaces = [
  { name: "Uzum Market", ratio: "3:4", size: "1080×1440" },
  { name: "Wildberries", ratio: "1:1", size: "1000×1000" },
  { name: "Ozon", ratio: "3:4", size: "Auto" },
  { name: "Universal", ratio: "1:1", size: "Square" },
  { name: "Amazon", ratio: "4:5", size: "Auto" },
];

const styles = [
  { name: "Clean White Studio", desc: "Bright, clean, minimal background" },
  { name: "Premium Dark Luxury", desc: "Dark backdrop, dramatic lighting" },
  { name: "Soft Ecommerce Shadow", desc: "Gentle drop shadow, warm tones" },
  { name: "Lifestyle Minimal", desc: "Clean and airy lifestyle look" },
  { name: "Glossy Commercial", desc: "High-gloss, reflective surface" },
  { name: "High-Contrast Sales", desc: "Bold, attention-grabbing contrast" },
];

const enhancements = [
  "Improve lighting naturally",
  "Sharpen details",
  "Add realistic ground shadow",
  "Enhance product texture",
  "Remove imperfections",
  "Color correction",
  "AI upscale to 4K",
  "Smart background blur",
  "Add subtle reflection",
];

const Generate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedMarketplace, setSelectedMarketplace] = useState<number | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<number | null>(null);
  const [activeEnhancements, setActiveEnhancements] = useState<Record<string, boolean>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (uploadedFile) return URL.createObjectURL(uploadedFile);
    return null;
  }, [uploadedFile]);

  const toggleEnhancement = (name: string) => {
    setActiveEnhancements((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const canProceed = () => {
    if (currentStep === 0) return !!uploadedFile;
    if (currentStep === 1) return selectedMarketplace !== null;
    if (currentStep === 2) return selectedStyle !== null;
    if (currentStep === 3) return true;
    if (currentStep === 4) return !!resultUrl;
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setUploadedFile(e.target.files[0]);
  };

  const handleProcess = async () => {
    if (!uploadedFile || !user) return;
    setProcessing(true);

    try {
      // 1. Upload original to storage
      const fileExt = uploadedFile.name.split('.').pop();
      const filePath = `${user.id}/originals/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, uploadedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setOriginalUrl(urlData.publicUrl);

      // 2. Create generation record
      const { data: genData, error: genError } = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          original_url: urlData.publicUrl,
          marketplace: selectedMarketplace !== null ? marketplaces[selectedMarketplace].name : "Universal",
          style_preset: selectedStyle !== null ? styles[selectedStyle].name : "Clean White Studio",
          enhancements: activeEnhancements,
          status: "processing",
        })
        .select("id")
        .single();

      if (genError) throw genError;
      setGenerationId(genData.id);

      // 3. Call edge function
      const { data: fnData, error: fnError } = await supabase.functions.invoke("process-image", {
        body: {
          imageUrl: urlData.publicUrl,
          marketplace: selectedMarketplace !== null ? marketplaces[selectedMarketplace].name : "Universal",
          stylePreset: selectedStyle !== null ? styles[selectedStyle].name : "Clean White Studio",
          enhancements: activeEnhancements,
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
      toast.success("Image processed successfully!");
      // Move to preview step
      setCurrentStep(4);
    } catch (err: any) {
      console.error("Processing error:", err);
      toast.error(err.message || "Failed to process image");
    } finally {
      setProcessing(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 3) {
      // When leaving enhancements, start processing
      handleProcess();
    } else {
      setCurrentStep((s) => Math.min(steps.length - 1, s + 1));
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
      a.download = `marketmodel-${generationId || "image"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Image downloaded!");
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold text-foreground">New Image</span>
          </div>
          <div />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 mb-10">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <button
                onClick={() => i < currentStep && !processing && setCurrentStep(i)}
                disabled={processing}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  i === currentStep
                    ? "gradient-primary text-primary-foreground"
                    : i < currentStep
                    ? "bg-primary/10 text-primary cursor-pointer"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < currentStep ? <Check className="h-3 w-3" /> : <step.icon className="h-3 w-3" />}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={`w-6 h-px mx-1 ${i < currentStep ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Processing overlay */}
        {processing && (
          <div className="text-center py-20">
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Processing Your Image</h2>
            <p className="text-muted-foreground">Our AI is enhancing your product photo. This may take 15-30 seconds...</p>
          </div>
        )}

        {/* Step content */}
        {!processing && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Step 0: Upload */}
              {currentStep === 0 && (
                <div className="text-center">
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">Upload Product Image</h2>
                  <p className="text-muted-foreground mb-8">JPG, PNG, or WEBP — up to 20MB</p>
                  <label className="block max-w-md mx-auto cursor-pointer">
                    <div className="border-2 border-dashed border-border rounded-2xl p-10 hover:border-primary/40 transition-colors bg-card">
                      {uploadedFile && previewUrl ? (
                        <div className="text-center">
                          <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg mb-4 object-contain" />
                          <p className="font-medium text-foreground">{uploadedFile.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">{(uploadedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                      ) : (
                        <div>
                          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="font-medium text-foreground">Click or drag to upload</p>
                          <p className="text-sm text-muted-foreground mt-1">Your product photo</p>
                        </div>
                      )}
                    </div>
                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
                  </label>
                </div>
              )}

              {/* Step 1: Format */}
              {currentStep === 1 && (
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">Select Marketplace</h2>
                  <p className="text-muted-foreground mb-8 text-center">We'll auto-adjust canvas size and composition</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                    {marketplaces.map((mp, i) => (
                      <button
                        key={mp.name}
                        onClick={() => setSelectedMarketplace(i)}
                        className={`p-5 rounded-2xl border text-center transition-all ${
                          selectedMarketplace === i
                            ? "border-primary bg-primary/5 shadow-glow"
                            : "border-border bg-card hover:border-primary/20"
                        }`}
                      >
                        <div className="font-display font-bold text-lg text-foreground">{mp.ratio}</div>
                        <div className="font-medium text-sm text-foreground mt-1">{mp.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{mp.size}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Style */}
              {currentStep === 2 && (
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">Choose Style Preset</h2>
                  <p className="text-muted-foreground mb-8 text-center">Set the mood for your product image</p>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
                    {styles.map((style, i) => (
                      <button
                        key={style.name}
                        onClick={() => setSelectedStyle(i)}
                        className={`p-5 rounded-2xl border text-left transition-all ${
                          selectedStyle === i
                            ? "border-primary bg-primary/5 shadow-glow"
                            : "border-border bg-card hover:border-primary/20"
                        }`}
                      >
                        <div className="w-full h-20 rounded-lg bg-muted mb-3" />
                        <div className="font-display font-semibold text-sm text-foreground">{style.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{style.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Enhancements */}
              {currentStep === 3 && (
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">Enhancement Options</h2>
                  <p className="text-muted-foreground mb-8 text-center">Fine-tune your image processing</p>
                  <div className="max-w-md mx-auto space-y-4">
                    {enhancements.map((name) => (
                      <div key={name} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                        <Label className="cursor-pointer text-sm font-medium text-foreground">{name}</Label>
                        <Switch checked={!!activeEnhancements[name]} onCheckedChange={() => toggleEnhancement(name)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Preview */}
              {currentStep === 4 && (
                <div className="text-center">
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">Preview</h2>
                  <p className="text-muted-foreground mb-8">Compare before and after</p>
                  <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="flex min-h-[320px]">
                      <div className="w-1/2 bg-muted flex items-center justify-center border-r border-border p-4">
                        {previewUrl ? (
                          <img src={previewUrl} alt="Original" className="max-h-72 object-contain rounded-lg" />
                        ) : (
                          <div className="text-center">
                            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                            <span className="text-sm text-muted-foreground">Original</span>
                          </div>
                        )}
                      </div>
                      <div className="w-1/2 flex items-center justify-center p-4">
                        {resultUrl ? (
                          <img src={resultUrl} alt="Enhanced" className="max-h-72 object-contain rounded-lg" />
                        ) : (
                          <div className="text-center">
                            <Sparkles className="h-10 w-10 text-primary mx-auto mb-2" />
                            <span className="text-sm text-foreground font-medium">Enhanced</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex border-t border-border">
                      <div className="w-1/2 text-center py-2 text-xs font-medium text-muted-foreground border-r border-border">Original</div>
                      <div className="w-1/2 text-center py-2 text-xs font-medium text-primary">AI Enhanced</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Export */}
              {currentStep === 5 && (
                <div className="text-center">
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">Export</h2>
                  <p className="text-muted-foreground mb-8">Your image is ready for download</p>
                  <div className="max-w-sm mx-auto p-8 rounded-2xl bg-card border border-border">
                    {resultUrl && (
                      <img src={resultUrl} alt="Result" className="max-h-48 mx-auto rounded-lg mb-6 object-contain" />
                    )}
                    <div className="w-16 h-16 rounded-2xl gradient-primary mx-auto mb-4 flex items-center justify-center">
                      <Download className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground mb-1">High Resolution PNG</h3>
                    <p className="text-sm text-muted-foreground mb-1">300 DPI • Marketplace optimized</p>
                    <p className="text-xs text-muted-foreground mb-6">
                      {selectedMarketplace !== null ? marketplaces[selectedMarketplace].name : "Universal"} format
                    </p>
                    <Button className="w-full gradient-primary border-0" onClick={handleDownload} disabled={!resultUrl}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Image
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Navigation */}
        {!processing && (
          <div className="flex items-center justify-between mt-10 max-w-2xl mx-auto">
            <Button
              variant="outline"
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button
                className="gradient-primary border-0"
                onClick={handleNext}
                disabled={!canProceed()}
              >
                {currentStep === 3 ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Image
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button className="gradient-primary border-0" asChild>
                <Link to="/dashboard">
                  Finish
                  <Check className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Generate;
