import { Sparkles, Shield, CreditCard, ImageIcon, Clock, CheckCircle, XCircle, Wallet, Upload, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Admin password verified server-side via edge function

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
  const [telegramUser, setTelegramUser] = useState<{ id: number; first_name?: string } | null>(null);
  const [tgLoading, setTgLoading] = useState(true);

  // Telegram data (for Telegram Web App)
  const [tgProfile, setTgProfile] = useState<any>(null);
  const [tgGenerations, setTgGenerations] = useState<Generation[]>([]);
  const [tgPayments, setTgPayments] = useState<Payment[]>([]);
  const [tgTab, setTgTab] = useState<"home" | "history" | "payments">("home");

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
      // Pass initData for server-side validation
      const initData = (tg as any)?.initData || "";
      loadTelegramData(user.id, initData);
    } else {
      setTgLoading(false);
    }
  }, []);

  const loadTelegramData = async (telegramId: number) => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "dpgxzkwmfgvevbssdkai";
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/get-user-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegram_id: telegramId }),
      });
      if (res.ok) {
        const data = await res.json();
        setTgProfile(data.profile);
        setTgGenerations(data.generations || []);
        setTgPayments(data.payments || []);
      }
    } catch (e) {
      console.error("Failed to load user data:", e);
    }
    setTgLoading(false);
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

  if (tgLoading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not Telegram — Partner Workspace
  if (!telegramUser) {
    return (
      <PartnerWorkspace
        showAdminDialog={showAdminDialog}
        setShowAdminDialog={setShowAdminDialog}
        password={password}
        setPassword={setPassword}
        handleAdminAccess={handleAdminAccess}
      />
    );
  }

  // Telegram Web App — Client Workspace
  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-display font-bold text-foreground text-sm">Infografix AI</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              <CreditCard className="h-3 w-3" />
              {tgProfile?.credits_remaining ?? 0}
            </div>
          </div>
        </div>
      </header>

      <div className="shrink-0 flex border-b border-border bg-card">
        {[
          { id: "home" as const, label: "Bosh sahifa", icon: Sparkles },
          { id: "history" as const, label: "Tarix", icon: ImageIcon },
          { id: "payments" as const, label: "To'lovlar", icon: Wallet },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTgTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              tgTab === t.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tgTab === "home" && (
          <div className="p-4 space-y-4">
            <div className="rounded-xl bg-card border border-border p-4 text-center">
              <p className="text-sm text-muted-foreground">Salom,</p>
              <p className="font-display font-bold text-foreground text-lg">
                {tgProfile?.first_name || telegramUser?.first_name || "Foydalanuvchi"} 👋
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-primary font-bold text-lg">{tgProfile?.credits_remaining ?? 0}</span>
                <span className="text-primary/70 text-sm">kredit</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-card border border-border p-3 text-center">
                <p className="text-xl font-bold text-foreground">{tgGenerations.length}</p>
                <p className="text-xs text-muted-foreground">Jami rasmlar</p>
              </div>
              <div className="rounded-xl bg-card border border-border p-3 text-center">
                <p className="text-xl font-bold text-foreground">
                  {tgGenerations.filter(g => g.status === "completed").length}
                </p>
                <p className="text-xs text-muted-foreground">Tayyor</p>
              </div>
            </div>
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

        {tgTab === "history" && (
          <div className="p-4">
            {tgGenerations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Hali rasmlar yo'q</p>
                <p className="text-xs text-muted-foreground mt-1">Botga rasm yuboring</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {tgGenerations.map(g => (
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

        {tgTab === "payments" && (
          <div className="p-4">
            {tgPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wallet className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">To'lovlar yo'q</p>
                <p className="text-xs text-muted-foreground mt-1">Botda /buy buyrug'i bilan kredit sotib oling</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tgPayments.map(p => (
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
    </div>
  );
};

// ==================== Partner Workspace ====================
const PartnerWorkspace = ({
  showAdminDialog, setShowAdminDialog, password, setPassword, handleAdminAccess
}: {
  showAdminDialog: boolean;
  setShowAdminDialog: (v: boolean) => void;
  password: string;
  setPassword: (v: string) => void;
  handleAdminAccess: () => void;
}) => {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [credits, setCredits] = useState<number | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Load partner data
    supabase.from("profiles").select("credits_remaining").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setCredits(data.credits_remaining);
    });
    supabase.from("generations").select("id, result_url, original_url, marketplace, status, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(6)
      .then(({ data }) => { if (data) setGenerations(data); });
  }, [user]);

  if (authLoading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in — show login form
  if (!user) {
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
            <button onClick={() => setShowAdminDialog(true)} className="p-1.5 rounded-md text-muted-foreground/30 hover:text-muted-foreground transition-colors">
              <Shield className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-xs space-y-6">
            <div className="text-center">
              <h1 className="font-display text-2xl font-bold text-foreground mb-1">Hamkor kabineti</h1>
              <p className="text-muted-foreground text-sm">Tizimga kiring</p>
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
        <AdminDialog open={showAdminDialog} onOpenChange={setShowAdminDialog} password={password} setPassword={setPassword} onSubmit={handleAdminAccess} />
      </div>
    );
  }

  // Logged in — full partner workspace
  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-display font-bold text-foreground text-sm">Infografix AI</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              <CreditCard className="h-3 w-3" />
              {credits ?? "..."}
            </div>
            <button onClick={() => setShowAdminDialog(true)} className="p-1.5 rounded-md text-muted-foreground/30 hover:text-muted-foreground transition-colors">
              <Shield className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => signOut()} className="p-1.5 rounded-md text-muted-foreground/50 hover:text-destructive transition-colors">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button className="h-20 flex-col gap-2 bg-primary hover:bg-primary/90" onClick={() => navigate("/generate")}>
            <Upload className="h-6 w-6" />
            <span className="text-sm font-semibold">Rasm yaratish</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate("/balance")}>
            <Wallet className="h-6 w-6" />
            <span className="text-sm font-semibold">Balans to'ldirish</span>
          </Button>
        </div>

        {/* Credits */}
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">Joriy balans</p>
          <p className="font-display text-3xl font-bold text-foreground">{credits ?? "..."}</p>
          <p className="text-xs text-muted-foreground">ta rasm qoldi</p>
        </div>

        {/* Recent generations */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">So'nggi rasmlar</p>
          {generations.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Hali rasmlar yo'q</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {generations.map(g => (
                <div key={g.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="aspect-square bg-muted">
                    {g.result_url ? (
                      <img src={g.result_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-1.5 text-center">
                    <span className="text-[10px] text-muted-foreground">
                      {g.status === "completed" ? "✅" : "⏳"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AdminDialog open={showAdminDialog} onOpenChange={setShowAdminDialog} password={password} setPassword={setPassword} onSubmit={handleAdminAccess} />
    </div>
  );
};

// ==================== Admin Dialog ====================
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
