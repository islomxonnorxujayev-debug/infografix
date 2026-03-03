import { Sparkles, ImageIcon } from "lucide-react";

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

interface GenerationsTabProps {
  generations: Generation[];
  loading: boolean;
}

const GenerationsTab = ({ generations, loading }: GenerationsTabProps) => {
  if (!loading && generations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-display font-semibold text-foreground mb-1">Generatsiyalar yo'q</h3>
        <p className="text-sm text-muted-foreground">Foydalanuvchilar rasm yaratganda bu yerda ko'rinadi</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">{generations.length} ta generatsiya</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {generations.map(g => (
          <div key={g.id} className="rounded-xl border border-border bg-card overflow-hidden group hover:border-primary/20 transition-colors">
            <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
              {g.result_url ? (
                <img src={g.result_url} alt="Result" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="p-2.5 text-xs space-y-0.5">
              <p className="text-foreground font-medium truncate">{g.marketplace || "—"}</p>
              <p className="text-muted-foreground truncate">
                {g.telegram_id ? `TG: ${g.telegram_id}` : g.user_id?.slice(0, 8) || "—"}
              </p>
              <div className="flex items-center justify-between">
                <span className={`font-medium ${g.status === "completed" ? "text-primary" : "text-muted-foreground"}`}>
                  {g.status === "completed" ? "✅" : "⏳"} {g.status}
                </span>
                <span className="text-muted-foreground">{new Date(g.created_at).toLocaleDateString("uz-UZ")}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GenerationsTab;
