import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, ImageIcon, CreditCard, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [generations, setGenerations] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch profile credits
    supabase
      .from("profiles")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setCredits(data.credits_remaining);
      });

    // Fetch generations
    supabase
      .from("generations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setGenerations(data);
      });
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="gradient-primary rounded-lg p-1.5">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">MarketModel AI</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <CreditCard className="h-4 w-4" />
              {credits !== null ? `${credits} credits` : "..."}
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" />
              Log out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Create and manage your product images</p>
          </div>
          <Button className="gradient-primary border-0" asChild>
            <Link to="/generate">
              <Plus className="mr-2 h-4 w-4" />
              Create New Image
            </Link>
          </Button>
        </div>

        {generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border bg-card">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">No images yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Create your first professional product image</p>
            <Button className="gradient-primary border-0" asChild>
              <Link to="/generate">
                <Plus className="mr-2 h-4 w-4" />
                Create New Image
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {generations.map((gen) => (
              <div key={gen.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {gen.result_url ? (
                    <img src={gen.result_url} alt="Generated" className="w-full h-full object-cover" />
                  ) : (
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm font-medium text-foreground">{gen.marketplace || "Universal"}</p>
                  <p className="text-xs text-muted-foreground">{gen.style_preset || "Default"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(gen.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
