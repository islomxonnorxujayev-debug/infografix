import { Search, Plus, Minus, Users } from "lucide-react";
import { useState } from "react";

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

interface UsersTabProps {
  profiles: Profile[];
  onUpdateCredits: (profileId: string, delta: number) => void;
}

const getProfileDisplay = (p: Profile) => {
  if (p.first_name || p.telegram_username) {
    return `${p.first_name || ""} ${p.telegram_username ? "@" + p.telegram_username : ""}`.trim();
  }
  return p.email || p.id.slice(0, 8);
};

const UsersTab = ({ profiles, onUpdateCredits }: UsersTabProps) => {
  const [search, setSearch] = useState("");

  const filtered = profiles.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.email || "").toLowerCase().includes(s)
      || (p.first_name || "").toLowerCase().includes(s)
      || (p.telegram_username || "").toLowerCase().includes(s)
      || String(p.telegram_id || "").includes(s);
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Qidirish..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="font-medium">{filtered.length}</span>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {(p.first_name || p.email || "?")[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{getProfileDisplay(p)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.telegram_id ? `TG: ${p.telegram_id}` : p.email || "—"} • {new Date(p.created_at).toLocaleDateString("uz-UZ")}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-3">
              <button
                onClick={() => onUpdateCredits(p.id, -10)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="-10"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[40px] text-center px-2 py-1 rounded-lg bg-primary/10 text-primary text-sm font-bold tabular-nums">
                {p.credits_remaining}
              </span>
              <button
                onClick={() => onUpdateCredits(p.id, 10)}
                className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                title="+10"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsersTab;
