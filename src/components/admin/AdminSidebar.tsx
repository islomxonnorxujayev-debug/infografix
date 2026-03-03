import { CreditCard, Users, ImageIcon, BarChart3, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminTab = "payments" | "users" | "generations" | "finance";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  pendingCount: number;
  onLogout: () => void;
}

const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: "payments", label: "To'lovlar", icon: CreditCard },
  { id: "users", label: "Foydalanuvchilar", icon: Users },
  { id: "generations", label: "Generatsiyalar", icon: ImageIcon },
  { id: "finance", label: "Moliya", icon: BarChart3 },
];

const AdminSidebar = ({ activeTab, onTabChange, pendingCount, onLogout }: AdminSidebarProps) => {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 border-r border-border bg-card">
        <div className="flex items-center gap-2.5 px-6 h-16 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-display font-bold text-foreground text-lg">Infografix</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === t.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <t.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{t.label}</span>
              {t.id === "payments" && pendingCount > 0 && (
                <span className={cn(
                  "min-w-5 h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center",
                  activeTab === t.id
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-destructive text-destructive-foreground"
                )}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
        <div className="grid grid-cols-4 h-16">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors relative",
                activeTab === t.id
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <t.icon className="h-5 w-5" />
                {t.id === "payments" && pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[64px]">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};

export default AdminSidebar;
