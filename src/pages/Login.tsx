import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signOut, user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || adminLoading) return;
    if (user && isAdmin) navigate("/admin");
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    }
  };

  // If logged in but not admin
  if (user && !adminLoading && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="gradient-primary rounded-lg p-2 w-fit mx-auto mb-4">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground mb-2">Ruxsat yo'q</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Bu panel faqat adminlar uchun. Agar siz foydalanuvchi bo'lsangiz, Telegram bot orqali ishlang.
          </p>
          <Button variant="outline" onClick={() => signOut()}>Chiqish</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="gradient-primary rounded-lg p-1.5">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">Infografix AI</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Admin kirish</h1>
          <p className="text-muted-foreground text-sm mt-1">Admin panel uchun tizimga kiring</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="admin@infografix.uz" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Parol</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button className="w-full gradient-primary border-0" type="submit" disabled={loading || authLoading}>
            {loading ? "Kirish..." : "Kirish"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Foydalanuvchilar uchun — Telegram bot orqali ishlang
        </p>
      </div>
    </div>
  );
};

export default Login;
