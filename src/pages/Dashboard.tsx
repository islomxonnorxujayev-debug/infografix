import { Sparkles, Shield, CreditCard, ImageIcon, Clock, CheckCircle, XCircle, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
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
import { toast } from "sonner";

const ADMIN_PASSWORD = "Medik9298";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: { id: number; first_name?: string; username?: string };
        };
        ready?: () => void;
        expand?: () => void;
        MainButton?: any;
      };
    };
  }
}

interface UserProfile {
  first_name: string | null;
  telegram_username: string | null;
  credits_remaining: number;
  plan: string;
}

interface Generation {
  id: string;
  result_url: string | null;
  original_url: string | null;
  marketplace: string | null;
  status: string;
  created_at: string;
}

interface Payment {
  id: string;
  package_name: string;
  credits: number;
  amount: string;
  status: string;
  created_at: string;
}

const Dashboard = () => {
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"home" | "history" | "payments">("home");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [telegramUser, setTelegramUser] = useState<{ id: number; first_name?: string } | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready?.();
      tg.expand?.();
    }
    const user = tg?.initDataUnsafe?.user;
    if (user?.id) {
      setTelegramUser(user);
      loadUserData(user.id);
    } else {
      setLoading(false);
    }
  }, []);

  const loadUserData = async (telegramId: number) => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "dpgxzkwmfgvevbssdkai";
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/get-user-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegram_id: telegramId }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setGenerations(data.generations || []);
        setPayments(data.payments || []);
      }
    } catch (e) {
      console.error("Failed to load user data:", e);
    }
    setLoading(false);
  };

  const handleAdminAccess = () => {
    if (password === ADMIN_PASSWORD) {
      setShowAdminDialog(false);
      setPassword("");
      navigate("/admin");
    } else {
      toast.error("Parol noto'g'ri!");
      setPassword("");
    }
  };

  // Not in Telegram context — Partner workspace
  if (!loading && !telegramUser) {
    return (
      <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
        <header className="shrink-0 border-b border-border bg-card">
          <div className="flex items-center justify-between h-12 px-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-display font-bold text-foreground text-sm">Infografix AI</span>
            </div>
            <button onClick={() => setShowAdminDialog(true)} className="p-1.5 rounded-md text-muted-foreground/30 hover:text-muted-foreground transition-colors">
              <Shield className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Infografix AI</h1>
            <p className="text-muted-foreground text-sm">Mahsulot rasmlarini professional darajada qayta ishlang</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button className="w-full bg-primary hover:bg-primary/90" size="lg" onClick={() => navigate("/generate")}>
              <ImageIcon className="mr-2 h-5 w-5" />
              Rasm yaratish
            </Button>
            <Button variant="outline" className="w-full" size="lg" onClick={() => navigate("/balance")}>
              <CreditCard className="mr-2 h-5 w-5" />
              Balans to'ldirish
            </Button>
          </div>
        </div>
        <AdminDialog open={showAdminDialog} onOpenChange={setShowAdminDialog} password={password} setPassword={setPassword} onSubmit={handleAdminAccess} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Telegram Web App — Client Workspace
  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-display font-bold text-foreground text-sm">Infografix AI</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              <CreditCard className="h-3 w-3" />
              {profile?.credits_remaining ?? 0}
            </div>
            <button onClick={() => setShowAdminDialog(true)} className="p-1.5 rounded-md text-muted-foreground/30 hover:text-muted-foreground transition-colors">
              <Shield className="h-3 w-3" />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="shrink-0 flex border-b border-border bg-card">
        {[
          { id: "home" as const, label: "Bosh sahifa", icon: Sparkles },
          { id: "history" as const, label: "Tarix", icon: ImageIcon },
          { id: "payments" as const, label: "To'lovlar", icon: Wallet },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              tab === t.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "home" && (
          <div className="p-4 space-y-4">
            {/* Welcome */}
            <div className="rounded-xl bg-card border border-border p-4 text-center">
              <p className="text-sm text-muted-foreground">Salom,</p>
              <p className="font-display font-bold text-foreground text-lg">
                {profile?.first_name || telegramUser?.first_name || "Foydalanuvchi"} 👋
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-primary font-bold text-lg">{profile?.credits_remaining ?? 0}</span>
                <span className="text-primary/70 text-sm">kredit</span>
              </div>
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-card border border-border p-3 text-center">
                <p className="text-xl font-bold text-foreground">{generations.length}</p>
                <p className="text-xs text-muted-foreground">Jami rasmlar</p>
              </div>
              <div className="rounded-xl bg-card border border-border p-3 text-center">
                <p className="text-xl font-bold text-foreground">
                  {generations.filter(g => g.status === "completed").length}
                </p>
                <p className="text-xs text-muted-foreground">Tayyor</p>
              </div>
            </div>

            {/* How it works */}
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Qanday ishlaydi?</p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>📸 Botga mahsulot rasmini yuboring</p>
                <p>🤖 AI professional darajada qayta ishlaydi</p>
                <p>✨ Tayyor rasmni oling — 1 kredit</p>
              </div>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="p-4">
            {generations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Hali rasmlar yo'q</p>
                <p className="text-xs text-muted-foreground mt-1">Botga rasm yuboring</p>
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
          </div>
        )}

        {tab === "payments" && (
          <div className="p-4">
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wallet className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">To'lovlar yo'q</p>
                <p className="text-xs text-muted-foreground mt-1">Botda /buy buyrug'i bilan kredit sotib oling</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.package_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {parseInt(p.amount).toLocaleString()} so'm • {new Date(p.created_at).toLocaleDateString("uz-UZ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {p.status === "pending" && <Clock className="h-4 w-4 text-amber-500" />}
                      {p.status === "approved" && <CheckCircle className="h-4 w-4 text-primary" />}
                      {p.status === "rejected" && <XCircle className="h-4 w-4 text-destructive" />}
                      <span className="text-xs font-medium text-foreground">+{p.credits}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Dialog */}
      <AdminDialog open={showAdminDialog} onOpenChange={setShowAdminDialog} password={password} setPassword={setPassword} onSubmit={handleAdminAccess} />
    </div>
  );
};

const AdminDialog = ({ open, onOpenChange, password, setPassword, onSubmit }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  password: string; setPassword: (v: string) => void; onSubmit: () => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-xs">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-primary" />
          Admin kirish
        </DialogTitle>
        <DialogDescription className="text-xs">Parolni kiriting</DialogDescription>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-3">
        <Input type="password" placeholder="Parol" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" size="sm">Kirish</Button>
      </form>
    </DialogContent>
  </Dialog>
);

export default Dashboard;
