import { Sparkles, Shield, CreditCard, ImageIcon, Clock, Upload, Loader2, Download, Settings, ChevronDown, LogOut } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: { id: number; first_name?: string; username?: string };
        };
        ready?: () => void;
        expand?: () => void;
        initData?: string;
        MainButton?: any;
      };
    };
  }
}

interface Generation {
  id: string;
  result_url: string | null;
  original_url: string | null;
  marketplace: string | null;
  status: string;
  created_at: string;
}

const Dashboard = () => {
  const { t } = useLanguage();
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const navigate = useNavigate();

  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");

  // Telegram state
  const [telegramUser, setTelegramUser] = useState<{ id: number; first_name?: string } | null>(null);
  const [tgLoading, setTgLoading] = useState(true);
  const [tgProfile, setTgProfile] = useState<any>(null);

  // Shared state
  const [credits, setCredits] = useState<number>(0);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Generate state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelType, setModelType] = useState<"with-model" | "without-model">("without-model");
  const [sceneType, setSceneType] = useState<string>("studio");

  // Login state (for non-Telegram)
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const previewUrl = useMemo(() => {
    if (uploadedFile) return URL.createObjectURL(uploadedFile);
    return null;
  }, [uploadedFile]);

  const isTelegram = !!telegramUser;

  // Detect Telegram
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready?.();
      tg.expand?.();
    }
    const tgUser = tg?.initDataUnsafe?.user;
    if (tgUser?.id) {
      setTelegramUser(tgUser);
      const initData = tg?.initData || "";
      loadTelegramData(tgUser.id, initData);
    } else {
      setTgLoading(false);
    }
  }, []);

  // Timer for processing
  useEffect(() => {
    if (!processing) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [processing]);

  // Load web user data
  useEffect(() => {
    if (isTelegram || !user) return;
    supabase.from("profiles").select("credits_remaining").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setCredits(data.credits_remaining);
    });
    supabase.from("generations")
      .select("id, result_url, original_url, marketplace, status, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setGenerations(data); });
  }, [user, isTelegram]);

  const loadTelegramData = async (telegramId: number, initData: string) => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "dpgxzkwmfgvevbssdkai";
      const body: any = { telegram_id: telegramId };
      if (initData) body.init_data = initData;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/get-user-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setTgProfile(data.profile);
        setCredits(data.profile?.credits_remaining ?? 0);
        setGenerations(data.generations || []);
      }
    } catch (e) {
      console.error("Failed to load user data:", e);
    }
    setTgLoading(false);
  };

  const handleAdminAccess = async () => {
    try {
      if (!adminEmail || !password) {
        toast.error("Email va parol kiriting");
        return;
      }

      const { error } = await signIn(adminEmail, password);
      if (error) {
        toast.error("Admin login xatoligi: " + error.message);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        toast.error("Sessiya tekshirib bo'lmadi");
        await signOut();
        return;
      }

      const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
        _user_id: authData.user.id,
        _role: "admin",
      });

      if (roleError || !isAdmin) {
        await signOut();
        toast.error("Admin ruxsati yo'q");
        return;
      }

      setShowAdminDialog(false);
      setAdminEmail("");
      setPassword("");
      navigate("/admin");
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  // Loading
  if (tgLoading || (!isTelegram && authLoading)) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not Telegram & not logged in — login
  if (!isTelegram && !user) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginLoading(true);
      const { error } = await signIn(loginEmail, loginPassword);
      setLoginLoading(false);
      if (error) toast.error(error.message);
    };

    return (
      <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
        <header className="shrink-0 border-b border-border bg-card">
          <div className="flex items-center justify-between h-12 px-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-display font-bold text-foreground text-sm">Infografix AI</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAdminDialog(true)} className="p-1.5 rounded-md text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                <Shield className="h-3.5 w-3.5" />
              </button>
              <LanguageSwitcher />
            </div>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-xs space-y-6">
            <div className="text-center">
              <h1 className="font-display text-2xl font-bold text-foreground mb-1">Tizimga kirish</h1>
              <p className="text-muted-foreground text-sm">Email va parolingizni kiriting</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-3">
              <Input type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
              <Input type="password" placeholder="Parol" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
              <Button className="w-full bg-primary hover:bg-primary/90" type="submit" disabled={loginLoading}>
                {loginLoading ? "Kirish..." : "Kirish"}
              </Button>
            </form>
          </div>
        </div>
        <AdminDialog open={showAdminDialog} onOpenChange={setShowAdminDialog} adminEmail={adminEmail} setAdminEmail={setAdminEmail} password={password} setPassword={setPassword} onSubmit={handleAdminAccess} />
      </div>
    );
  }

  // ==================== Main Generation UI (both Telegram & Web) ====================

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes("png")) {
      toast.error("Faqat PNG formatdagi rasm qabul qilinadi");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Rasm juda katta (max 10MB)");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploadedFile(file);
    setResultUrl(null);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleGenerate = async () => {
    if (!uploadedFile || credits <= 0) return;

    if (isTelegram) {
      // Telegram flow
      setProcessing(true);
      try {
        const base64 = await fileToBase64(uploadedFile);
        const initData = window.Telegram?.WebApp?.initData || "";
        console.log("Telegram generate: initData length=", initData.length, "telegramId=", telegramUser?.id);
        
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "dpgxzkwmfgvevbssdkai";
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/telegram-generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            init_data: initData,
            telegram_id: telegramUser?.id,
            image_base64: base64,
            scene_type: sceneType,
            model_type: modelType,
          }),
        });
        const data = await res.json();
        console.log("Telegram generate response:", res.status, data);
        if (!res.ok) {
          toast.error(data.error || "Xatolik yuz berdi");
          return;
        }
        setResultUrl(data.resultUrl);
        setCredits(data.creditsRemaining);
        setGenerations(prev => [{
          id: data.generationId,
          result_url: data.resultUrl,
          original_url: data.originalUrl,
          marketplace: "Web App / Studio",
          status: "completed",
          created_at: new Date().toISOString(),
        }, ...prev]);
        toast.success("Rasm tayyor! ✨");
      } catch (err: any) {
        console.error("Telegram generate error:", err);
        toast.error(err.message || "Xatolik yuz berdi");
      } finally {
        setProcessing(false);
      }
    } else {
      // Web flow via process-image
      if (!user?.id) {
        toast.error("Sessiya tugagan. Qayta kiring.");
        navigate("/");
        return;
      }

      setProcessing(true);
      let generationId: string | null = null;

      try {
        const fileExt = uploadedFile.name.split('.').pop();
        const filePath = `${user.id}/originals/${crypto.randomUUID()}.${fileExt}`;

        console.log("Step 1: Uploading to storage...");
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, uploadedFile, { cacheControl: "3600", upsert: true });
        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          toast.error("Rasmni yuklashda xatolik: " + uploadError.message);
          return;
        }

        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
        console.log("Step 2: Creating generation record...");

        const { data: genData, error: genError } = await supabase
          .from("generations")
          .insert({
            user_id: user.id,
            original_url: urlData.publicUrl,
            marketplace: `${sceneType} / ${modelType}`,
            style_preset: sceneType,
            enhancements: { model: modelType, scene: sceneType },
            status: "processing",
          })
          .select("id")
          .single();

        if (genError) {
          console.error("Generation insert error:", genError);
          toast.error("Ma'lumot saqlashda xatolik: " + genError.message);
          return;
        }

        generationId = genData.id;

        console.log("Step 3: Calling AI process-image...");
        const { data: fnData, error: fnError } = await supabase.functions.invoke("process-image", {
          body: {
            imageUrl: urlData.publicUrl,
            modelType: modelType,
            sceneType: sceneType,
            generationId: genData.id,
          },
        });

        if (fnError) {
          console.error("Function invoke error:", fnError);

          let errorMessage = "AI xizmati bilan bog'lanishda xatolik yuz berdi";
          const responseStatus = fnError.context?.status;

          if (responseStatus === 401) errorMessage = "Tizimga qayta kiring va yana urinib ko'ring";
          if (responseStatus === 402) errorMessage = "Kredit tugagan. Balansni to'ldiring";
          if (responseStatus === 429) errorMessage = "AI tizimi band. 1-2 daqiqadan keyin qayta urinib ko'ring";

          try {
            const errorBody = await fnError.context?.json?.();
            if (errorBody?.error) errorMessage = errorBody.error;
          } catch {
            // ignore parse errors
          }

          if (generationId) {
            await supabase.from("generations").update({ status: "failed" }).eq("id", generationId);
          }

          toast.error(errorMessage);
          return;
        }

        if (fnData?.error) {
          if (generationId) {
            await supabase.from("generations").update({ status: "failed" }).eq("id", generationId);
          }
          toast.error(fnData.error);
          return;
        }

        setResultUrl(fnData.resultUrl);
        setGenerations(prev => [{
          id: genData.id,
          result_url: fnData.resultUrl,
          original_url: urlData.publicUrl,
          marketplace: "Web App / Studio",
          status: "completed",
          created_at: new Date().toISOString(),
        }, ...prev]);

        // Reload credits
        const { data: profileData } = await supabase.from("profiles").select("credits_remaining").eq("user_id", user.id).single();
        if (profileData) setCredits(profileData.credits_remaining);

        toast.success("Rasm tayyor! ✨");
      } catch (err: any) {
        if (generationId) {
          await supabase.from("generations").update({ status: "failed" }).eq("id", generationId);
        }
        console.error("Generate error details:", err);
        toast.error(err.message || "Noma'lum xatolik yuz berdi. Qayta urinib ko'ring.");
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setResultUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = async () => {
    if (!resultUrl) return;
    try {
      const response = await fetch(resultUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `infografix-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Yuklab olishda xatolik");
    }
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-display font-bold text-foreground text-sm">Yangi rasm</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Credits - clickable to balance */}
            <button
              onClick={() => navigate("/balance")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
            >
              <CreditCard className="h-3 w-3" />
              {credits}
            </button>
            {/* Admin icon */}
            <button
              onClick={() => setShowAdminDialog(true)}
              className="p-1.5 rounded-md text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
            </button>
            {/* Logout for web users */}
            {!isTelegram && user && (
              <button onClick={() => signOut()} className="p-1.5 rounded-md text-muted-foreground/40 hover:text-destructive transition-colors">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-4 px-4">
          {[
            { icon: Upload, active: !resultUrl && !processing },
            { icon: Settings, active: false },
            { icon: Download, active: !!resultUrl },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${
                step.active
                  ? "gradient-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}>
                <step.icon className="h-4 w-4" />
              </div>
              {i < 2 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Content */}
        {processing ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="font-display font-bold text-foreground text-lg">Qayta ishlanmoqda...</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-mono text-2xl font-bold text-primary">{elapsedSeconds}</span>
              <span className="text-sm text-muted-foreground">soniya</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Odatda 30-60 soniya davom etadi</p>
            <div className="mt-4 space-y-1 text-left text-xs text-muted-foreground">
              <p>{elapsedSeconds >= 0 ? "✅" : "⏳"} Rasm tahlil qilinmoqda</p>
              <p>{elapsedSeconds >= 5 ? "✅" : "⏳"} Sahna yaratilmoqda</p>
              <p>{elapsedSeconds >= 15 ? "✅" : "⏳"} Professional yoritish qo'shilmoqda</p>
              <p>{elapsedSeconds >= 25 ? "✅" : "⏳"} Sifat tekshirilmoqda</p>
            </div>
          </div>
        ) : resultUrl ? (
          <div className="px-4 space-y-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex">
                <div className="w-1/2 border-r border-border bg-muted flex items-center justify-center p-2">
                  {previewUrl && <img src={previewUrl} alt="Original" className="max-h-40 object-contain rounded-lg" />}
                </div>
                <div className="w-1/2 flex items-center justify-center p-2">
                  <img src={resultUrl} alt="Natija" className="max-h-40 object-contain rounded-lg" />
                </div>
              </div>
              <div className="flex border-t border-border text-[10px] font-medium">
                <div className="w-1/2 text-center py-1.5 text-muted-foreground border-r border-border">Asl rasm</div>
                <div className="w-1/2 text-center py-1.5 text-primary">AI natija</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Yuklab olish
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                Yangi rasm
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-4 space-y-4">
            {/* Title */}
            <div className="text-center">
              <h2 className="font-display text-xl font-bold text-foreground">Mahsulot rasmini yuklang</h2>
              <p className="text-sm text-muted-foreground mt-1">Faqat PNG format — 10MB gacha</p>
            </div>

            {/* Upload area */}
            <label className="block cursor-pointer">
              <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                uploadedFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 bg-card"
              }`}>
                {uploadedFile && previewUrl ? (
                  <div>
                    <img src={previewUrl} alt="Preview" className="max-h-40 mx-auto rounded-lg mb-3 object-contain" />
                    <p className="font-medium text-foreground text-sm">{uploadedFile.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{(uploadedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium text-foreground text-sm">Bosing yoki rasmni tashlang</p>
                    <p className="text-xs text-muted-foreground mt-1">Mahsulot surati</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".png,image/png"
                onChange={handleFileChange}
              />
            </label>

            {/* Options - only show after file uploaded */}
            {uploadedFile && (
              <div className="space-y-3">
                {/* Model type */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Model turi</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "without-model", label: "📦 Modelsiz", desc: "Faqat mahsulot" },
                      { value: "with-model", label: "🧑 Modelli", desc: "Model bilan" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setModelType(opt.value)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          modelType === opt.value
                            ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                            : "border-border bg-card hover:border-primary/30"
                        }`}
                      >
                        <p className="text-sm font-medium text-foreground">{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scene type */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Sahna turi</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "studio", label: "🎬", name: "Studiya" },
                      { value: "nature", label: "🌿", name: "Tabiat" },
                      { value: "lifestyle", label: "🏠", name: "Lifestyle" },
                      { value: "minimalist", label: "⬜", name: "Minimalist" },
                      { value: "infographic", label: "📊", name: "Infografika" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSceneType(opt.value)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          sceneType === opt.value
                            ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                            : "border-border bg-card hover:border-primary/30"
                        }`}
                      >
                        <p className="text-lg">{opt.label}</p>
                        <p className="text-[10px] font-medium text-foreground">{opt.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fixed size info */}
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                  <ImageIcon className="h-3 w-3" />
                  <span>Rasm o'lchami: 1080 × 1440 px (3:4)</span>
                </div>

                {/* Generate button */}
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={credits <= 0}
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  {credits <= 0 ? "Kredit tugadi" : "Rasm yaratish (1 kredit)"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Collapsible History */}
        {!processing && (
          <div className="px-4 py-4">
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Tarix</span>
                  {generations.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                      {generations.length}
                    </span>
                  )}
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${historyOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                {generations.length === 0 ? (
                  <div className="flex flex-col items-center py-6 text-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">Hali rasmlar yo'q</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {generations.map(g => (
                      <div key={g.id} className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="aspect-square bg-muted">
                          {g.result_url ? (
                            <img src={g.result_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Sparkles className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="p-2 text-xs">
                          <p className="text-foreground font-medium truncate">{g.marketplace || "Studio"}</p>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className={g.status === "completed" ? "text-primary" : "text-muted-foreground"}>
                              {g.status === "completed" ? "✅" : "⏳"}
                            </span>
                            <span className="text-muted-foreground">{new Date(g.created_at).toLocaleDateString("uz-UZ")}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>

      <AdminDialog open={showAdminDialog} onOpenChange={setShowAdminDialog} adminEmail={adminEmail} setAdminEmail={setAdminEmail} password={password} setPassword={setPassword} onSubmit={handleAdminAccess} />
    </div>
  );
};

// ==================== Admin Dialog ====================
const AdminDialog = ({ open, onOpenChange, adminEmail, setAdminEmail, password, setPassword, onSubmit }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  adminEmail: string; setAdminEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void; onSubmit: () => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-xs">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-primary" />
          Admin kirish
        </DialogTitle>
        <DialogDescription className="text-xs">Admin email va parolni kiriting</DialogDescription>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-3">
        <Input type="email" placeholder="Admin email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} autoFocus />
        <Input type="password" placeholder="Parol" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" size="sm">Kirish</Button>
      </form>
    </DialogContent>
  </Dialog>
);

export default Dashboard;