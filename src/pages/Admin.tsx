import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AdminSidebar, { type AdminTab } from "@/components/admin/AdminSidebar";
import PaymentsTab from "@/components/admin/PaymentsTab";
import UsersTab from "@/components/admin/UsersTab";
import GenerationsTab from "@/components/admin/GenerationsTab";
import FinanceTab from "@/components/admin/FinanceTab";
import { Sparkles, LogOut } from "lucide-react";

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
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("payments");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
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
      if (data) {
        // Resolve storage paths to signed URLs
        const resolved = await Promise.all((data as Generation[]).map(async (g) => {
          const resolve = async (path: string | null) => {
            if (!path || path.startsWith("http")) return path;
            const { data: sd } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60);
            return sd?.signedUrl || path;
          };
          return { ...g, result_url: await resolve(g.result_url), original_url: await resolve(g.original_url) };
        }));
        setGenerations(resolved);
      }
    }
    if (tab === "payments") {
      const { data } = await supabase.from("payment_requests").select("*").order("created_at", { ascending: false });
      if (data) setPaymentRequests(data as PaymentRequest[]);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const approvePayment = async (req: PaymentRequest) => {
    const { data, error } = await supabase.rpc("approve_payment", {
      _payment_id: req.id,
    });
    if (error) { toast.error("Xatolik: " + error.message); return; }
    const result = data as { success: boolean; error?: string; credits_added?: number; new_balance?: number };
    if (!result.success) {
      toast.error(result.error || "Xatolik");
      return;
    }
    toast.success(`✅ ${result.credits_added} kredit qo'shildi! Balans: ${result.new_balance}`);
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

  const pendingCount = paymentRequests.filter(r => r.status === "pending").length;

  const tabTitles: Record<AdminTab, string> = {
    payments: "To'lovlar",
    users: "Foydalanuvchilar",
    generations: "Generatsiyalar",
    finance: "Moliya",
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar
        activeTab={tab}
        onTabChange={setTab}
        pendingCount={pendingCount}
        onLogout={handleLogout}
      />

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-display font-bold text-foreground">{tabTitles[tab]}</span>
        </div>
        <button onClick={handleLogout} className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen pb-20 md:pb-0">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 border-b border-border bg-card/50">
          <h1 className="text-xl font-display font-bold text-foreground">{tabTitles[tab]}</h1>
          <button onClick={loadData} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Yangilash
          </button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {tab === "payments" && (
            <PaymentsTab
              paymentRequests={paymentRequests}
              profiles={profiles}
              onApprove={approvePayment}
              onReject={rejectPayment}
              loading={loading}
            />
          )}
          {tab === "users" && <UsersTab profiles={profiles} onUpdateCredits={updateCredits} />}
          {tab === "generations" && <GenerationsTab generations={generations} loading={loading} />}
          {tab === "finance" && <FinanceTab profiles={profiles} paymentRequests={paymentRequests} />}

          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Admin;
