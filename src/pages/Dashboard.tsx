import { Sparkles, ImageIcon, Shield, Send } from "lucide-react";
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="font-display font-bold text-foreground">Infografix AI</span>
          </div>
          <button
            onClick={() => setShowAdminDialog(true)}
            className="p-2 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors"
            title="Admin"
          >
            <Shield className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <ImageIcon className="h-10 w-10 text-primary" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground text-center mb-3">
          Infografix AI
        </h1>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          Mahsulot rasmlarini professional darajada tayyorlash uchun Telegram botimizdan foydalaning
        </p>
        <a
          href="https://t.me/infografix_bot"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="lg" className="bg-primary hover:bg-primary/90 gap-2">
            <Send className="h-5 w-5" />
            Telegram botni ochish
          </Button>
        </a>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full">
          <div className="text-center p-4 rounded-xl bg-card border border-border">
            <p className="text-2xl font-bold text-foreground">📸</p>
            <p className="text-xs text-muted-foreground mt-1">Rasm yuboring</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-card border border-border">
            <p className="text-2xl font-bold text-foreground">🤖</p>
            <p className="text-xs text-muted-foreground mt-1">AI qayta ishlaydi</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-card border border-border">
            <p className="text-2xl font-bold text-foreground">✨</p>
            <p className="text-xs text-muted-foreground mt-1">Professional natija</p>
          </div>
        </div>
      </div>

      {/* Admin Password Dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Admin kirish
            </DialogTitle>
            <DialogDescription>
              Admin paneliga kirish uchun parolni kiriting
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAdminAccess();
            }}
            className="space-y-4"
          >
            <Input
              type="password"
              placeholder="Parol"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              Kirish
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
