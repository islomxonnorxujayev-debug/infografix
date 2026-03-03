import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, ImageIcon, CreditCard, ArrowLeft, Plus, Minus, Search, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string | null;
  telegram_id: number | null;
  telegram_username: string | null;
  first_name: string | null;
  email: string | null;
  credits_remaining: number;
  plan: string;
  created_at: string;
}

interface Generation {
  id: string;
  user_id: string | null;
  telegram_id: number | null;
  original_url: string | null;
  result_url: string | null;
  marketplace: string | null;
  style_preset: string | null;
  status: string;
  created_at: string;
}

interface PaymentRequest {
  id: string;
  user_id: string | null;
  telegram_id: number | null;
  profile_id: string | null;
  package_name: string;
  credits: number;
  amount: string;
  screenshot_url: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
}

const Admin = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"payments" | "users" | "generations" | "finance">("payments");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    if (tab === "users" || tab === "finance" || tab === "payments") {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (data) setProfiles(data as Profile[]);
    }
    if (tab === "generations") {
      const { data } = await supabase.from("generations").select("*").order("created_at", { ascending: false }).limit(200);
      if (data) setGenerations(data as Generation[]);
    }
    if (tab === "payments") {
      const { data } = await supabase.from("payment_requests").select("*").order("created_at", { ascending: false });
      if (data) setPaymentRequests(data as PaymentRequest[]);
    }
    setLoading(false);
  };

  const getUserDisplay = (req: PaymentRequest) => {
    const profile = profiles.find(p =>
      (req.profile_id && p.id === req.profile_id) ||
      (req.telegram_id && p.telegram_id === req.telegram_id) ||
      (req.user_id && p.user_id === req.user_id)
    );
    if (profile) {
      return profile.first_name || profile.telegram_username
        ? `${profile.first_name || ""} ${profile.telegram_username ? "@" + profile.telegram_username : ""}`.trim()
        : profile.email || profile.id.slice(0, 8);
    }
    return req.telegram_id ? `TG:${req.telegram_id}` : "Noma'lum";
  };

  const getProfileDisplay = (p: Profile) => {
    if (p.first_name || p.telegram_username) {
      return `${p.first_name || ""} ${p.telegram_username ? "@" + p.telegram_username : ""}`.trim();
    }
    return p.email || p.id.slice(0, 8);
  };

  const approvePayment = async (req: PaymentRequest) => {
    const { error } = await supabase
      .from("payment_requests")
      .update({ status: "approved" })
      .eq("id", req.id);
    if (error) { toast.error("Xatolik: " + error.message); return; }

    // Find profile and add credits
    const profile = profiles.find(p =>
      (req.profile_id && p.id === req.profile_id) ||
      (req.telegram_id && p.telegram_id === req.telegram_id)
    );
    if (profile) {
      await supabase
        .from("profiles")
        .update({ credits_remaining: profile.credits_remaining + req.credits })
        .eq("id", profile.id);
    }

    toast.success(`✅ ${req.credits} kredit qo'shildi!`);
    loadData();
  };

  const rejectPayment = async (req: PaymentRequest) => {
    const { error } = await supabase
      .from("payment_requests")
      .update({ status: "rejected" })
      .eq("id", req.id);
    if (error) { toast.error("Xatolik"); return; }
    toast.success("Rad etildi");
    loadData();
  };

  const updateCredits = async (profileId: string, delta: number) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    const newCredits = Math.max(0, profile.credits_remaining + delta);
    const { error } = await supabase.from("profiles").update({ credits_remaining: newCredits }).eq("id", profileId);
    if (error) { toast.error("Xatolik"); return; }
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, credits_remaining: newCredits } : p));
    toast.success(`Kreditlar: ${newCredits}`);
  };

  const filteredProfiles = profiles.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.email || "").toLowerCase().includes(s)
      || (p.first_name || "").toLowerCase().includes(s)
      || (p.telegram_username || "").toLowerCase().includes(s);
  });

  const pendingPayments = paymentRequests.filter(r => r.status === "pending");
  const approvedTotal = paymentRequests.filter(r => r.status === "approved")
    .reduce((s, r) => s + parseInt(r.amount || "0"), 0);

  const tabs = [
    { id: "payments" as const, label: `To'lovlar${pendingPayments.length ? ` (${pendingPayments.length})` : ""}`, icon: CreditCard },
    { id: "users" as const, label: "Foydalanuvchilar", icon: Users },
    { id: "generations" as const, label: "Generatsiyalar", icon: ImageIcon },
    { id: "finance" as const, label: "Moliya", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/login" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Chiqish</span>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-foreground">Admin Panel</span>
          </div>
          <div />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.id ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Payments Tab */}
        {tab === "payments" && (
          <div className="space-y-3">
            {paymentRequests.length === 0 && !loading ? (
              <p className="text-center text-muted-foreground py-12">To'lov so'rovlari yo'q</p>
            ) : (
              paymentRequests.map(req => (
                <div key={req.id} className={`rounded-xl border bg-card p-4 ${
                  req.status === "pending" ? "border-primary/30 bg-primary/5" : "border-border"
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {req.status === "pending" && <Clock className="h-4 w-4 text-primary shrink-0" />}
                        {req.status === "approved" && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                        {req.status === "rejected" && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                        <span className="font-medium text-foreground text-sm">{req.package_name}</span>
                        <span className="text-xs text-muted-foreground">• {parseInt(req.amount).toLocaleString()} so'm</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        👤 {getUserDisplay(req)} • {new Date(req.created_at).toLocaleString()} • {req.credits} kredit
                      </p>
                    </div>

                    {req.screenshot_url && (
                      <a href={req.screenshot_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <img src={req.screenshot_url} alt="Screenshot" className="w-20 h-20 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity" />
                      </a>
                    )}

                    {req.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="gradient-primary border-0" onClick={() => approvePayment(req)}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Tasdiqlash
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => rejectPayment(req)}>
                          <XCircle className="h-4 w-4 mr-1" /> Rad
                        </Button>
                      </div>
                    )}

                    {req.status !== "pending" && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
                        req.status === "approved" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                      }`}>
                        {req.status === "approved" ? "✅ Tasdiqlandi" : "❌ Rad etildi"}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Ism, username yoki email..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                />
              </div>
              <span className="text-sm text-muted-foreground">{filteredProfiles.length} ta</span>
            </div>
            <div className="space-y-2">
              {filteredProfiles.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{getProfileDisplay(p)}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.telegram_id ? `TG: ${p.telegram_id}` : p.email || "—"} • {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                      {p.credits_remaining}
                    </span>
                    <button onClick={() => updateCredits(p.id, 10)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary" title="+10">
                      <Plus className="h-4 w-4" />
                    </button>
                    <button onClick={() => updateCredits(p.id, -10)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="-10">
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generations Tab */}
        {tab === "generations" && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">{generations.length} ta generatsiya</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {generations.map(g => (
                <div key={g.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {g.result_url ? (
                      <img src={g.result_url} alt="Result" className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="p-3 text-xs space-y-1">
                    <p className="text-foreground font-medium truncate">{g.marketplace || "—"}</p>
                    <p className="text-muted-foreground">
                      {g.telegram_id ? `TG: ${g.telegram_id}` : g.user_id?.slice(0, 8) || "—"}
                    </p>
                    <p className={`font-medium ${g.status === "completed" ? "text-primary" : "text-muted-foreground"}`}>{g.status}</p>
                    <p className="text-muted-foreground">{new Date(g.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Finance Tab */}
        {tab === "finance" && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-3xl font-display font-bold text-foreground">{profiles.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Jami foydalanuvchilar</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-3xl font-display font-bold text-primary">{paymentRequests.filter(r => r.status === "approved").length}</p>
                <p className="text-sm text-muted-foreground mt-1">Tasdiqlangan to'lovlar</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-3xl font-display font-bold text-foreground">
                  {approvedTotal.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">so'm</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">Jami daromad</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-display font-bold text-foreground mb-4">Telegram foydalanuvchilar</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-foreground">{profiles.filter(p => p.telegram_id).length}</p>
                  <p className="text-xs text-muted-foreground">Telegram orqali</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-foreground">{profiles.filter(p => !p.telegram_id && p.email).length}</p>
                  <p className="text-xs text-muted-foreground">Web orqali</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
