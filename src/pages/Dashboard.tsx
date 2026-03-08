import { Sparkles, Shield, CreditCard, ImageIcon, Clock, Upload, Loader2, Download, Settings, ChevronDown, LogOut, Wand2 } from "lucide-react";
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
        openLink?: (url: string) => void;
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

const showcaseItems = [
  { before: "/images/before-1.jpg", after: "/images/after-1.jpg" },
  { before: "/images/before-2.jpg", after: "/images/after-2.jpg" },
  { before: "/images/before-3.jpg", after: "/images/after-3.jpg" },
];

const Dashboard = () => {
  const { t, lang } = useLanguage();
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
  const [showcaseIndex, setShowcaseIndex] = useState(0);

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

  // Showcase auto-rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setShowcaseIndex((prev) => (prev + 1) % showcaseItems.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    if (!processing) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [processing]);

  // Helper to resolve storage path to signed URL
  const getSignedUrl = async (path: string): Promise<string> => {
    if (!path || path.startsWith("http")) return path;
    const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24);
    return data?.signedUrl || path;
  };

  // Load web user data
  useEffect(() => {
    if (isTelegram || !user) return;
    supabase.from("profiles").select("credits_remaining").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setCredits(data.credits_remaining);
    });
    supabase.from("generations")
      .select("id, result_url, original_url, marketplace, status, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50)
      .then(async ({ data }) => {
        if (!data) return;
        const resolved = await Promise.all(data.map(async (g) => ({
          ...g,
          result_url: g.result_url ? await getSignedUrl(g.result_url) : null,
          original_url: g.original_url ? await getSignedUrl(g.original_url) : null,
        })));
        setGenerations(resolved);
      });
  }, [user, isTelegram]);

  const loadTelegramData = async (telegramId: number, initData: string) => {
    if (!initData) {
      console.error("No Telegram initData - cannot authenticate");
      setTgLoading(false);
      return;
    }
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "dpgxzkwmfgvevbssdkai";
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/get-user-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ init_data: initData }),
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
        toast.error(t("dash.loginError"));
        return;
      }

      const { error } = await signIn(adminEmail, password);
      if (error) {
        toast.error("Admin login: " + error.message);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        toast.error(t("dash.sessionError"));
        await signOut();
        return;
      }

      const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
        _user_id: authData.user.id,
        _role: "admin",
      });

      if (roleError || !isAdmin) {
        await signOut();
        toast.error(t("dash.adminNoAccess"));
        return;
      }

      setShowAdminDialog(false);
      setAdminEmail("");
      setPassword("");
      navigate("/admin");
    } catch {
      toast.error(t("dash.error"));
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
              <h1 className="font-display text-2xl font-bold text-foreground mb-1">{t("dash.login")}</h1>
              <p className="text-muted-foreground text-sm">{t("dash.loginDesc")}</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-3">
              <Input type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
              <Input type="password" placeholder={lang === "ru" ? "Пароль" : "Parol"} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
              <Button className="w-full bg-primary hover:bg-primary/90" type="submit" disabled={loginLoading}>
                {loginLoading ? t("dash.loginLoading") : t("dash.loginBtn")}
              </Button>
            </form>
          </div>
        </div>
        <AdminDialog t={t} lang={lang} open={showAdminDialog} onOpenChange={setShowAdminDialog} adminEmail={adminEmail} setAdminEmail={setAdminEmail} password={password} setPassword={setPassword} onSubmit={handleAdminAccess} />
      </div>
    );
  }

  // ==================== Main Generation UI (both Telegram & Web) ====================

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("dash.onlyImages"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("dash.tooLarge"));
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
      const initData = window.Telegram?.WebApp?.initData || "";
      if (!initData) {
        toast.error(t("dash.tgAuthNotFound"));
        return;
      }

      setProcessing(true);
      try {
        const base64 = await fileToBase64(uploadedFile);
        
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "dpgxzkwmfgvevbssdkai";
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/telegram-generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            init_data: initData,
            image_base64: base64,
            scene_type: sceneType,
            model_type: modelType,
            language: lang,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            toast.error(t("dash.authExpired"));
          } else if (res.status === 429) {
            toast.error(t("dash.aiBusy"));
          } else {
            toast.error(data.error || t("dash.error"));
          }
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
        toast.success(t("dash.imageReady"));
      } catch (err: any) {
        console.error("Telegram generate error:", err);
        toast.error(t("dash.networkError"));
      } finally {
        setProcessing(false);
      }
    } else {
      // Web flow via process-image
      if (!user?.id) {
        toast.error(t("dash.sessionExpired"));
        navigate("/");
        return;
      }

      setProcessing(true);
      let generationId: string | null = null;

      try {
        const fileExt = uploadedFile.name.split('.').pop();
        const filePath = `${user.id}/originals/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, uploadedFile, { cacheControl: "3600", upsert: true });
        if (uploadError) {
          toast.error(t("dash.uploadError") + ": " + uploadError.message);
          return;
        }

        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
        const originalUrl = urlData.publicUrl;
        const { data: signedData } = await supabase.storage.from("product-images").createSignedUrl(filePath, 60 * 30);
        const aiImageUrl = signedData?.signedUrl || originalUrl;

        const { data: genData, error: genError } = await supabase
          .from("generations")
          .insert({
            user_id: user.id,
            original_url: filePath,
            marketplace: `${sceneType} / ${modelType}`,
            style_preset: sceneType,
            enhancements: { model: modelType, scene: sceneType, language: lang },
            status: "processing",
          })
          .select("id")
          .single();

        if (genError) {
          toast.error(t("dash.saveError") + ": " + genError.message);
          return;
        }

        generationId = genData.id;

        const { data: fnData, error: fnError } = await supabase.functions.invoke("process-image", {
          body: {
            imageUrl: aiImageUrl,
            modelType,
            sceneType,
            generationId: genData.id,
            language: lang,
          },
        });

        if (fnError) {
          let errorMessage = t("dash.aiError");
          const responseStatus = fnError.context?.status;

          if (responseStatus === 401) errorMessage = t("dash.relogin");
          if (responseStatus === 402) errorMessage = t("dash.noCreditsBalance");
          if (responseStatus === 429) errorMessage = t("dash.aiBusy");

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

        const { data: profileData } = await supabase.from("profiles").select("credits_remaining").eq("user_id", user.id).single();
        if (profileData) setCredits(profileData.credits_remaining);

        toast.success(t("dash.imageReady"));
      } catch (err: any) {
        if (generationId) {
          await supabase.from("generations").update({ status: "failed" }).eq("id", generationId);
        }
        console.error("Generate error details:", err);
        toast.error(err.message || t("dash.unknownError"));
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

  const extractStoragePath = (url: string): string | null => {
    const match = url.match(/\/product-images\/(.+)$/);
    return match ? match[1] : null;
  };

  const handleDownload = async (url?: string) => {
    const downloadUrl = url || resultUrl;
    if (!downloadUrl) return;

    try {
      toast.loading(t("dash.downloading"), { id: "download" });

      const storagePath = extractStoragePath(downloadUrl);
      let directUrl = downloadUrl;

      if (storagePath) {
        const cleanPath = storagePath.split("?")[0];
        const { data: signedData } = await supabase.storage
          .from("product-images")
          .createSignedUrl(cleanPath, 300, { download: true });
        if (signedData?.signedUrl) {
          directUrl = signedData.signedUrl;
        }
      }

      if (isTelegram && window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(directUrl);
        toast.success(t("dash.downloadTelegram"), { id: "download" });
        return;
      }

      try {
        const response = await fetch(directUrl);
        if (!response.ok) throw new Error("fetch failed");
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `infografix-${Date.now()}.png`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(blobUrl); }, 100);
        toast.success(t("dash.downloaded"), { id: "download" });
      } catch {
        window.open(directUrl, '_blank');
        toast.success(t("dash.downloadNewTab"), { id: "download" });
      }
    } catch {
      toast.error(t("dash.downloadError"), { id: "download" });
    }
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-display font-bold text-foreground text-sm">{t("dash.title")}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/balance")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
            >
              <CreditCard className="h-3 w-3" />
              {credits}
            </button>
            <button
              onClick={() => setShowAdminDialog(true)}
              className="p-1.5 rounded-md text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
            </button>
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
            <p className="font-display font-bold text-foreground text-lg">{t("dash.processing")}</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-mono text-2xl font-bold text-primary">{elapsedSeconds}</span>
              <span className="text-sm text-muted-foreground">{t("dash.seconds")}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{t("dash.processingTime")}</p>
            <div className="mt-4 space-y-1 text-left text-xs text-muted-foreground">
              <p>{elapsedSeconds >= 0 ? "✅" : "⏳"} {t("dash.step.analyzing")}</p>
              <p>{elapsedSeconds >= 5 ? "✅" : "⏳"} {t("dash.step.scene")}</p>
              <p>{elapsedSeconds >= 15 ? "✅" : "⏳"} {t("dash.step.lighting")}</p>
              <p>{elapsedSeconds >= 25 ? "✅" : "⏳"} {t("dash.step.quality")}</p>
            </div>
          </div>
        ) : resultUrl ? (
          <div className="px-4 space-y-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex">
                <div className="w-1/2 border-r border-border bg-muted flex items-center justify-center p-2">
                  {previewUrl && <img src={previewUrl} alt={t("dash.original")} className="max-h-40 object-contain rounded-lg" />}
                </div>
                <div className="w-1/2 flex items-center justify-center p-2">
                  <img src={resultUrl} alt={t("dash.aiResult")} className="max-h-40 object-contain rounded-lg" />
                </div>
              </div>
              <div className="flex border-t border-border text-[10px] font-medium">
                <div className="w-1/2 text-center py-1.5 text-muted-foreground border-r border-border">{t("dash.original")}</div>
                <div className="w-1/2 text-center py-1.5 text-primary">{t("dash.aiResult")}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => handleDownload()}>
                <Download className="mr-2 h-4 w-4" />
                {t("dash.download")}
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                {t("dash.newImage")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-4 space-y-4">
            <div className="text-center">
              <h2 className="font-display text-xl font-bold text-foreground">{t("dash.uploadTitle")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("dash.uploadDesc")}</p>
            </div>

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
                    <p className="font-medium text-foreground text-sm">{t("dash.uploadBtn")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("dash.uploadLabel")}</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>

            {uploadedFile && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t("dash.modelType")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "without-model", label: t("dash.withoutModel"), desc: t("dash.withoutModelDesc") },
                      { value: "with-model", label: t("dash.withModel"), desc: t("dash.withModelDesc") },
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

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t("dash.sceneType")}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "studio", label: "🎬", name: t("dash.studio") },
                      { value: "nature", label: "🌿", name: t("dash.nature") },
                      { value: "lifestyle", label: "🏠", name: t("dash.lifestyle") },
                      { value: "minimalist", label: "⬜", name: t("dash.minimalist") },
                      { value: "infographic", label: "📊", name: t("dash.infographic") },
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

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                  <ImageIcon className="h-3 w-3" />
                  <span>{t("dash.imageSize")}</span>
                </div>

                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={credits <= 0}
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  {credits <= 0 ? t("dash.noCredits") : t("dash.generateBtn")}
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
                  <span className="text-sm font-medium text-foreground">{t("dash.history")}</span>
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
                    <p className="text-xs text-muted-foreground">{t("dash.noImages")}</p>
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
                        <div className="p-2 text-xs space-y-1.5">
                          <p className="text-foreground font-medium truncate">{g.marketplace || "Studio"}</p>
                          <div className="flex items-center justify-between">
                            <span className={g.status === "completed" ? "text-primary" : "text-muted-foreground"}>
                              {g.status === "completed" ? "✅" : "⏳"}
                            </span>
                            <span className="text-muted-foreground">{new Date(g.created_at).toLocaleDateString(lang === "ru" ? "ru-RU" : "uz-UZ")}</span>
                          </div>
                          {g.result_url && g.status === "completed" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(g.result_url!);
                              }}
                              className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition-colors"
                            >
                              <Download className="h-3 w-3" />
                              {t("dash.download")}
                            </button>
                          )}
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

      <AdminDialog t={t} lang={lang} open={showAdminDialog} onOpenChange={setShowAdminDialog} adminEmail={adminEmail} setAdminEmail={setAdminEmail} password={password} setPassword={setPassword} onSubmit={handleAdminAccess} />
    </div>
  );
};

// ==================== Admin Dialog ====================
const AdminDialog = ({ t, lang, open, onOpenChange, adminEmail, setAdminEmail, password, setPassword, onSubmit }: {
  t: (key: string) => string; lang: string;
  open: boolean; onOpenChange: (v: boolean) => void;
  adminEmail: string; setAdminEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void; onSubmit: () => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-xs">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-primary" />
          {t("dash.adminLogin")}
        </DialogTitle>
        <DialogDescription className="text-xs">{t("dash.adminLoginDesc")}</DialogDescription>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-3">
        <Input type="email" placeholder="Admin email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} autoFocus />
        <Input type="password" placeholder={lang === "ru" ? "Пароль" : "Parol"} value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" size="sm">{t("dash.loginBtn")}</Button>
      </form>
    </DialogContent>
  </Dialog>
);

export default Dashboard;
