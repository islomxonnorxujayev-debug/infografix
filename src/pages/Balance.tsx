import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, Copy, Check, Upload, Loader2, CreditCard, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CARD_NUMBER = "9860 1606 0533 5993";

const packages = [
  { name: "1 ta rasm", credits: 1, price: "4 999", amount: "4999" },
  { name: "10 ta rasm", credits: 10, price: "45 000", amount: "45000", perImage: "4 500", save: "10%" },
  { name: "15 ta rasm", credits: 15, price: "55 000", amount: "55000", perImage: "3 667", save: "27%" },
  { name: "20 ta rasm", credits: 20, price: "65 000", amount: "65000", perImage: "3 250", save: "35%", popular: true },
  { name: "50 ta rasm", credits: 50, price: "149 000", amount: "149000", perImage: "2 980", save: "40%" },
  { name: "100 ta rasm", credits: 100, price: "249 999", amount: "249999", perImage: "2 500", save: "50%" },
];

const Balance = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<typeof packages[0] | null>(null);
  const [copied, setCopied] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("credits_remaining").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setCredits(data.credits_remaining);
    });
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("payment_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setMyRequests(data);
  };

  const copyCard = async () => {
    await navigator.clipboard.writeText(CARD_NUMBER.replace(/\s/g, ""));
    setCopied(true);
    toast.success("Karta raqam nusxalandi");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!user || !selectedPkg || !screenshotFile) return;
    setSubmitting(true);

    try {
      const fileExt = screenshotFile.name.split(".").pop();
      const filePath = `${user.id}/payments/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from("payment-screenshots")
        .upload(filePath, screenshotFile, { cacheControl: "3600", upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("payment-screenshots").getPublicUrl(filePath);

      const { error } = await supabase.from("payment_requests").insert({
        user_id: user.id,
        package_name: selectedPkg.name,
        credits: selectedPkg.credits,
        amount: selectedPkg.amount,
        screenshot_url: urlData.publicUrl,
        status: "pending",
      });

      if (error) throw error;

      toast.success("To'lov so'rovi yuborildi! Admin tasdiqlashini kuting.");
      setSelectedPkg(null);
      setScreenshotFile(null);
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === "approved") return "text-green-600 bg-green-500/10";
    if (s === "rejected") return "text-red-500 bg-red-500/10";
    return "text-yellow-600 bg-yellow-500/10";
  };

  const statusLabel = (s: string) => {
    if (s === "approved") return "✅ Tasdiqlandi";
    if (s === "rejected") return "❌ Rad etildi";
    return "⏳ Kutilmoqda";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold text-foreground">Balans</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            {credits !== null ? `${credits} ta rasm` : "..."}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Current balance */}
        <div className="text-center mb-8">
          <p className="text-muted-foreground text-sm mb-1">Joriy balans</p>
          <p className="font-display text-4xl font-bold text-foreground">{credits ?? "..."}</p>
          <p className="text-muted-foreground text-sm">ta rasm qoldi</p>
        </div>

        {/* Package selection */}
        <h2 className="font-display text-lg font-bold text-foreground mb-3">Paket tanlang</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {packages.map((pkg) => (
            <button
              key={pkg.name}
              onClick={() => { setSelectedPkg(pkg); setScreenshotFile(null); }}
              className={`relative p-4 rounded-xl border text-left transition-all ${
                selectedPkg?.name === pkg.name
                  ? "border-primary bg-primary/5 shadow-glow"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full gradient-primary text-primary-foreground text-[10px] font-semibold">
                  Ommabop
                </span>
              )}
              <p className="font-display font-bold text-foreground text-sm">{pkg.name}</p>
              <p className="font-display text-lg font-bold text-foreground mt-1">{pkg.price} <span className="text-xs font-normal text-muted-foreground">so'm</span></p>
              {pkg.perImage && (
                <p className="text-[10px] text-primary mt-0.5">≈ {pkg.perImage} so'm/rasm</p>
              )}
              {pkg.save && (
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                  -{pkg.save}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Payment form */}
        {selectedPkg && (
          <div className="rounded-xl border border-border bg-card p-5 mb-6 space-y-4">
            <h3 className="font-display font-bold text-foreground">
              {selectedPkg.name} — {selectedPkg.price} so'm
            </h3>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Quyidagi karta raqamga o'tkazing:</p>
              <button
                onClick={copyCard}
                className="flex items-center gap-3 w-full p-3 rounded-lg bg-muted border border-border hover:bg-muted/80 transition-colors"
              >
                <span className="font-mono text-lg font-bold text-foreground tracking-wider flex-1 text-left">
                  {CARD_NUMBER}
                </span>
                {copied ? (
                  <Check className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <Copy className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
              </button>
              <p className="text-xs text-muted-foreground mt-1">👆 Bosib nusxa oling</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">To'lov skrinshoti:</p>
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
                      <span className="text-sm text-muted-foreground">Skrinshot yuklang</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp"
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yuborilmoqda...</>
              ) : (
                "✅ To'lov qildim"
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Admin tasdiqlashidan so'ng kreditlar hisobingizga qo'shiladi
            </p>
          </div>
        )}

        {/* Payment history */}
        {myRequests.length > 0 && (
          <div>
            <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" /> To'lov tarixi
            </h3>
            <div className="space-y-2">
              {myRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <div>
                    <p className="text-sm font-medium text-foreground">{req.package_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString()} • {req.amount} so'm
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
