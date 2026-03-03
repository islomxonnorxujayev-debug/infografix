import { Sparkles, Shield, Send } from "lucide-react";
import { useState } from "react";
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
const BOT_LINK = "https://t.me/infografixuz_bot";

const Dashboard = () => {
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleAdminAccess = () => {
    if (password === ADMIN_PASSWORD) {
      setShowAdminDialog(false);
      setPassword("");
      navigate("/login");
    } else {
      toast.error("Parol noto'g'ri!");
      setPassword("");
    }
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-display font-bold text-foreground text-sm">Infografix AI</span>
          </div>
          <button
            onClick={() => setShowAdminDialog(true)}
            className="p-1.5 rounded-md text-muted-foreground/30 hover:text-muted-foreground transition-colors"
          >
            <Shield className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Content — centered, no scroll */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            Infografix AI
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Mahsulot rasmlarini professional darajada tayyorlash
          </p>
        </div>

        <a href={BOT_LINK} target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="bg-primary hover:bg-primary/90 gap-2 rounded-xl px-8">
            <Send className="h-4 w-4" />
            Botni ochish
          </Button>
        </a>

        <div className="flex gap-6 text-center text-xs text-muted-foreground">
          <div><span className="block text-lg mb-0.5">📸</span>Yuboring</div>
          <div><span className="block text-lg mb-0.5">🤖</span>AI ishlaydi</div>
          <div><span className="block text-lg mb-0.5">✨</span>Natija</div>
        </div>
      </div>

      {/* Admin Dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              Admin kirish
            </DialogTitle>
            <DialogDescription className="text-xs">
              Parolni kiriting
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAdminAccess(); }} className="space-y-3">
            <Input type="password" placeholder="Parol" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" size="sm">Kirish</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
