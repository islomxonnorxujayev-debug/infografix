import { Users, CreditCard, TrendingUp, MessageCircle, Globe } from "lucide-react";

interface Profile {
  id: string;
  telegram_id: number | null;
  email: string | null;
  credits_remaining: number;
}

interface PaymentRequest {
  amount: string;
  status: string;
  credits: number;
}

interface FinanceTabProps {
  profiles: Profile[];
  paymentRequests: PaymentRequest[];
}

const FinanceTab = ({ profiles, paymentRequests }: FinanceTabProps) => {
  const approvedPayments = paymentRequests.filter(r => r.status === "approved");
  const approvedTotal = approvedPayments.reduce((s, r) => s + parseInt(r.amount || "0"), 0);
  const totalCredits = approvedPayments.reduce((s, r) => s + r.credits, 0);
  const telegramUsers = profiles.filter(p => p.telegram_id).length;
  const webUsers = profiles.filter(p => !p.telegram_id && p.email).length;

  const stats = [
    {
      label: "Jami foydalanuvchilar",
      value: profiles.length,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Tasdiqlangan to'lovlar",
      value: approvedPayments.length,
      icon: CreditCard,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Jami daromad",
      value: `${approvedTotal.toLocaleString()} so'm`,
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
    {
      label: "Sotilgan kreditlar",
      value: totalCredits,
      icon: CreditCard,
      color: "text-violet-600",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`h-4.5 w-4.5 ${s.color}`} />
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* User Sources */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-display font-bold text-foreground mb-4">Foydalanuvchi manbalari</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{telegramUsers}</p>
              <p className="text-xs text-muted-foreground">Telegram</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{webUsers}</p>
              <p className="text-xs text-muted-foreground">Web</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceTab;
