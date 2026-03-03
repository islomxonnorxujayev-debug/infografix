import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, ImageIcon, CreditCard, Settings, ArrowLeft, Plus, Minus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  credits_remaining: number;
  plan: string;
  created_at: string;
}

interface Generation {
  id: string;
  user_id: string;
  original_url: string | null;
  result_url: string | null;
  marketplace: string | null;
  style_preset: string | null;
  status: string;
  created_at: string;
}

const Admin = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab] = useState<"users" | "generations" | "finance" | "plans">("users");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    if (tab === "users" || tab === "finance" || tab === "plans") {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (data) setProfiles(data);
    }
    if (tab === "generations") {
      const { data } = await supabase.from("generations").select("*").order("created_at", { ascending: false }).limit(200);
      if (data) setGenerations(data);
    }
    setLoading(false);
  };

  const updateCredits = async (userId: string, delta: number) => {
    const profile = profiles.find(p => p.user_id === userId);
    if (!profile) return;
    const newCredits = Math.max(0, profile.credits_remaining + delta);
    const { error } = await supabase.from("profiles").update({ credits_remaining: newCredits }).eq("user_id", userId);
    if (error) { toast.error("Xatolik"); return; }
    setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, credits_remaining: newCredits } : p));
    toast.success(`Kreditlar: ${newCredits}`);
  };

  const updatePlan = async (userId: string, plan: string) => {
    const planCredits: Record<string, number> = { free: 3, basic: 50, pro: 999, premium: 999 };
    const { error } = await supabase.from("profiles").update({ plan, credits_remaining: planCredits[plan] || 3 }).eq("user_id", userId);
    if (error) { toast.error("Xatolik"); return; }
    setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, plan, credits_remaining: planCredits[plan] || 3 } : p));
    toast.success(`Tarif: ${plan}`);
  };

  const filteredProfiles = profiles.filter(p =>
    !search || (p.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalCreditsUsed = profiles.reduce((sum, p) => {
    const initial: Record<string, number> = { free: 3, basic: 50, pro: 999, premium: 999 };
    return sum + Math.max(0, (initial[p.plan] || 3) - p.credits_remaining);
  }, 0);

  const tabs = [
    { id: "users" as const, label: "Foydalanuvchilar", icon: Users },
    { id: "generations" as const, label: "Generatsiyalar", icon: ImageIcon },
    { id: "finance" as const, label: "Moliya", icon: CreditCard },
    { id: "plans" as const, label: "Tariflar", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-foreground">Admin Panel</span>
          </div>
          <div />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Tabs */}
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

        {/* Users Tab */}
        {tab === "users" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Email bo'yicha qidirish..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                />
              </div>
              <span className="text-sm text-muted-foreground">{filteredProfiles.length} foydalanuvchi</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tarif</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kreditlar</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sana</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map(p => (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/50">
                      <td className="px-4 py-3 text-foreground">{p.email || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.plan === "premium" ? "bg-primary/10 text-primary" :
                          p.plan === "pro" ? "bg-accent/10 text-accent" :
                          p.plan === "basic" ? "bg-secondary text-secondary-foreground" :
                          "bg-muted text-muted-foreground"
                        }`}>{p.plan}</span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{p.credits_remaining}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateCredits(p.user_id, 10)} className="p-1 rounded hover:bg-primary/10 text-primary" title="+10 kredit">
                            <Plus className="h-4 w-4" />
                          </button>
                          <button onClick={() => updateCredits(p.user_id, -10)} className="p-1 rounded hover:bg-destructive/10 text-destructive" title="-10 kredit">
                            <Minus className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    <p className="text-muted-foreground">User: {g.user_id.slice(0, 8)}...</p>
                    <p className={`font-medium ${g.status === "completed" ? "text-accent" : "text-muted-foreground"}`}>{g.status}</p>
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
                <p className="text-3xl font-display font-bold text-primary">{totalCreditsUsed}</p>
                <p className="text-sm text-muted-foreground mt-1">Ishlatilgan kreditlar</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-3xl font-display font-bold text-accent">{profiles.filter(p => p.plan !== "free").length}</p>
                <p className="text-sm text-muted-foreground mt-1">Pullik foydalanuvchilar</p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-display font-bold text-foreground mb-4">Tariflar bo'yicha taqsimot</h3>
              {["free", "basic", "pro", "premium"].map(plan => {
                const count = profiles.filter(p => p.plan === plan).length;
                const pct = profiles.length ? Math.round(count / profiles.length * 100) : 0;
                return (
                  <div key={plan} className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-medium text-foreground w-20 capitalize">{plan}</span>
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full gradient-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground w-16 text-right">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Plans Tab */}
        {tab === "plans" && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">Foydalanuvchi tarifini o'zgartiring</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joriy tarif</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">O'zgartirish</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(p => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-3 text-foreground">{p.email || "—"}</td>
                      <td className="px-4 py-3 capitalize text-foreground">{p.plan}</td>
                      <td className="px-4 py-3">
                        <select
                          value={p.plan}
                          onChange={e => updatePlan(p.user_id, e.target.value)}
                          className="px-2 py-1 rounded border border-input bg-card text-foreground text-sm"
                        >
                          <option value="free">Free</option>
                          <option value="basic">Basic</option>
                          <option value="pro">Pro</option>
                          <option value="premium">Premium</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
