import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, Copy, Check, Upload, Loader2, CreditCard, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { toast } from "sonner";

const CARD_NUMBER = "9860 1606 0533 5993";
const CARD_HOLDER = "Islomxon Norxujayev";

const packages = [
  { nameKey: "1", credits: 1, price: "4 999", amount: "4999" },
  { nameKey: "10", credits: 10, price: "45 000", amount: "45000", perImage: "4 500", save: "10%" },
  { nameKey: "15", credits: 15, price: "55 000", amount: "55000", perImage: "3 667", save: "27%" },
  { nameKey: "20", credits: 20, price: "65 000", amount: "65000", perImage: "3 250", save: "35%", popular: true },
  { nameKey: "50", credits: 50, price: "149 000", amount: "149000", perImage: "2 980", save: "40%" },
  { nameKey: "100", credits: 100, price: "249 999", amount: "249999", perImage: "2 500", save: "50%" },
];

const Balance = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [credits, setCredits] = useState<number | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<typeof packages[0] | null>(null);
  const [copied, setCopied] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [telegramUser, setTelegramUser] = useState<{ id: number; first_name?: string } | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;
    if (tgUser?.id) {
      setTelegramUser(tgUser);
      loadTelegramProfile(tgUser.id);
    }
  }, []);

  const isTelegram = !!telegramUser;

  const loadTelegramProfile = async (telegramId: number) => {
    const initData = window.Telegram?.WebApp?.initData || "";
    if (!initData) return;
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "dpgxzkwmfgvevbssdkai";
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/get-user-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ init_data: initData }),
      });
      if (res.ok) {
        const data = await res.json();
        setCredits(data.profile?.credits_remaining ?? 0);
        setMyRequests(data.payments || []);
      }
    } catch (e) {
      console.error("Failed to load telegram profile:", e);
    }
  };

  useEffect(() => {
    if (isTelegram || !user) return;
    supabase.from("profiles").select("credits_remaining").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setCredits(data.credits_remaining);
    });
    loadRequests();
  }, [user, isTelegram]);

  const loadRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("payment_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setMyRequests(data);
  };

  const pkgName = (pkg: typeof packages[0]) => {
    const imgWord = lang === "ru" ? "изобр." : "ta rasm";
    return `${pkg.nameKey} ${imgWord}`;
  };

  const copyCard = async () => {
    try {
      await navigator.clipboard.writeText(CARD_NUMBER.replace(/\s/g, ""));
      setCopied(true);
      toast.success(t("bal.cardCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info(t("bal.card") + ": " + CARD_NUMBER.replace(/\s/g, ""));
    }
  };

  const handleSubmit = async () => {
    if (!selectedPkg || !screenshotFile) return;
    if (!isTelegram && !user) {
      toast.error(t("bal.loginRequired"));
      return;
    }
    setSubmitting(true);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "dpgxzkwmfgvevbssdkai";
      
      if (isTelegram) {
        const base64 = await fileToBase64(screenshotFile);
        const initData = window.Telegram?.WebApp?.initData || "";
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/submit-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            init_data: initData,
            package_name: pkgName(selectedPkg),
            credits: selectedPkg.credits,
            amount: selectedPkg.amount,
            screenshot_base64: base64,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("bal.error"));
        toast.success(t("bal.submitted"));
        setSelectedPkg(null);
        setScreenshotFile(null);
        if (telegramUser?.id) loadTelegramProfile(telegramUser.id);
      } else {
        const fileExt = screenshotFile.name.split(".").pop();
        const filePath = `${user!.id}/payments/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from("payment-screenshots")
          .upload(filePath, screenshotFile, { cacheControl: "3600", upsert: true });

        if (uploadErr) throw uploadErr;

        const { error } = await supabase.from("payment_requests").insert({
          user_id: user!.id,
          package_name: pkgName(selectedPkg),
          credits: selectedPkg.credits,
          amount: selectedPkg.amount,
          screenshot_url: `payment-screenshots/${filePath}`,
          status: "pending",
        });

        if (error) throw error;

        toast.success(t("bal.submitted"));
        setSelectedPkg(null);
        setScreenshotFile(null);
        loadRequests();
      }
    } catch (err: any) {
      toast.error(err.message || t("bal.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const statusColor = (s: string) => {
    if (s === "approved") return "text-green-600 bg-green-500/10";
    if (s === "rejected") return "text-red-500 bg-red-500/10";
    return "text-yellow-600 bg-yellow-500/10";
  };

  const statusLabel = (s: string) => {
    if (s === "approved") return t("bal.approved");
    if (s === "rejected") return t("bal.rejected");
    return t("bal.pending");
  };

  if (!isTelegram && !user) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("bal.loginRequired")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">{t("bal.dashboard")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold text-foreground">{t("bal.title")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              {credits !== null ? `${credits} ${t("bal.images")}` : "..."}
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="text-center mb-8">
          <p className="text-muted-foreground text-sm mb-1">{t("bal.currentBalance")}</p>
          <p className="font-display text-4xl font-bold text-foreground">{credits ?? "..."}</p>
          <p className="text-muted-foreground text-sm">{t("bal.imagesLeft")}</p>
        </div>

        <h2 className="font-display text-lg font-bold text-foreground mb-3">{t("bal.selectPackage")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {packages.map((pkg) => (
            <button
              key={pkg.nameKey}
              onClick={() => { setSelectedPkg(pkg); setScreenshotFile(null); }}
              className={`relative p-4 rounded-xl border text-left transition-all ${
                selectedPkg?.nameKey === pkg.nameKey
                  ? "border-primary bg-primary/5 shadow-glow"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full gradient-primary text-primary-foreground text-[10px] font-semibold">
                  {t("bal.popular")}
                </span>
              )}
              <p className="font-display font-bold text-foreground text-sm">{pkgName(pkg)}</p>
              <p className="font-display text-lg font-bold text-foreground mt-1">{pkg.price} <span className="text-xs font-normal text-muted-foreground">{t("bal.sum")}</span></p>
              {pkg.perImage && (
                <p className="text-[10px] text-primary mt-0.5">≈ {pkg.perImage} {t("bal.perImage")}</p>
              )}
              {pkg.save && (
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                  -{pkg.save}
                </span>
              )}
            </button>
          ))}
        </div>

        {selectedPkg && (
          <div className="rounded-xl border border-border bg-card p-5 mb-6 space-y-4">
            <h3 className="font-display font-bold text-foreground">
              {pkgName(selectedPkg)} — {selectedPkg.price} {t("bal.sum")}
            </h3>

            <div>
              <p className="text-sm text-muted-foreground mb-2">{t("bal.transferTo")}</p>
              <button
                onClick={copyCard}
                className="flex items-center gap-3 w-full p-3 rounded-lg bg-muted border border-border hover:bg-muted/80 transition-colors"
              >
                <div className="flex-1 text-left">
                  <span className="font-mono text-lg font-bold text-foreground tracking-wider block">
                    {CARD_NUMBER}
                  </span>
                  <span className="text-xs text-muted-foreground">{CARD_HOLDER}</span>
                </div>
                {copied ? (
                  <Check className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <Copy className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
              </button>
              <p className="text-xs text-muted-foreground mt-1">👆 {t("bal.copyCard")}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">{t("bal.screenshot")}</p>
              <label className="block cursor-pointer">
                <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  screenshotFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                }`}>
                  {screenshotFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <Check className="h-5 w-5 text-primary" />
                      <span className="text-sm text-foreground font-medium">{screenshotFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t("bal.uploadScreenshot")}</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && setScreenshotFile(e.target.files[0])}
                />
              </label>
            </div>

            <Button
              className="w-full gradient-primary border-0"
              size="lg"
              disabled={!screenshotFile || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("bal.submitting")}</>
              ) : (
                t("bal.submitPayment")
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {t("bal.adminNote")}
            </p>
          </div>
        )}

        {myRequests.length > 0 && (
          <div>
            <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" /> {t("bal.history")}
            </h3>
            <div className="space-y-2">
              {myRequests.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <div>
                    <p className="text-sm font-medium text-foreground">{req.package_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString(lang === "ru" ? "ru-RU" : "uz-UZ")} • {req.amount} {t("bal.sum")}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(req.status)}`}>
                    {statusLabel(req.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Balance;
