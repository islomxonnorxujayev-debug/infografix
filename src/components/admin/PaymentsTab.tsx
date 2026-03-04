import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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

interface PaymentsTabProps {
  paymentRequests: PaymentRequest[];
  profiles: Profile[];
  onApprove: (req: PaymentRequest) => void;
  onReject: (req: PaymentRequest) => void;
  loading: boolean;
}

const getUserDisplay = (req: PaymentRequest, profiles: Profile[]) => {
  const profile = profiles.find(p =>
    (req.profile_id && p.id === req.profile_id) ||
    (req.telegram_id && p.telegram_id === req.telegram_id) ||
    (req.user_id && p.user_id === req.user_id)
  );
  if (profile) {
    return profile.first_name || profile.telegram_username
      ? `${profile.first_name || ""} ${profile.telegram_username ? "@" + profile.telegram_username : ""}`.trim()
      : profile.email || profile.id.slice(0, 8);
  }
  return req.telegram_id ? `TG:${req.telegram_id}` : "Noma'lum";
};

const statusConfig = {
  pending: { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", label: "Kutilmoqda" },
  approved: { icon: CheckCircle, color: "text-primary", bg: "bg-primary/10", label: "✅ Tasdiqlandi" },
  rejected: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "❌ Rad etildi" },
};

const PaymentsTab = ({ paymentRequests, profiles, onApprove, onReject, loading }: PaymentsTabProps) => {
  const pending = paymentRequests.filter(r => r.status === "pending");
  const history = paymentRequests.filter(r => r.status !== "pending");
  const [screenshotUrls, setScreenshotUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const resolveScreenshotUrls = async () => {
      const entries = await Promise.all(paymentRequests.map(async (req) => {
        const ref = req.screenshot_url;
        if (!ref) return [req.id, ""] as const;
        if (ref.startsWith("http://") || ref.startsWith("https://")) return [req.id, ref] as const;

        const path = ref.replace(/^payment-screenshots\//, "");
        const { data, error } = await supabase.storage
          .from("payment-screenshots")
          .createSignedUrl(path, 60 * 60);

        if (error || !data?.signedUrl) return [req.id, ""] as const;
        return [req.id, data.signedUrl] as const;
      }));

      setScreenshotUrls(Object.fromEntries(entries.filter(([, url]) => !!url)));
    };

    resolveScreenshotUrls();
  }, [paymentRequests]);

  if (!loading && paymentRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <CreditCard className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-display font-semibold text-foreground mb-1">To'lov so'rovlari yo'q</h3>
        <p className="text-sm text-muted-foreground">Yangi so'rovlar bu yerda ko'rinadi</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">{pending.length} ta kutilmoqda</h3>
          </div>
          <div className="space-y-3">
            {pending.map(req => (
              <PaymentCard key={req.id} req={req} profiles={profiles} onApprove={onApprove} onReject={onReject} />
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Tarix</h3>
          <div className="space-y-2">
            {history.map(req => (
              <PaymentCard key={req.id} req={req} profiles={profiles} onApprove={onApprove} onReject={onReject} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PaymentCard = ({
  req, profiles, onApprove, onReject
}: {
  req: PaymentRequest; profiles: Profile[];
  onApprove: (r: PaymentRequest) => void; onReject: (r: PaymentRequest) => void;
}) => {
  const status = statusConfig[req.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className={`rounded-xl border bg-card p-4 transition-all ${
      req.status === "pending" ? "border-amber-500/30 shadow-sm" : "border-border"
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Screenshot */}
        {req.screenshot_url && (
          <a href={req.screenshot_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <img
              src={req.screenshot_url}
              alt="Screenshot"
              className="w-full sm:w-16 sm:h-16 h-40 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity"
            />
          </a>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusIcon className={`h-4 w-4 ${status.color} shrink-0`} />
            <span className="font-semibold text-foreground text-sm">{req.package_name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {parseInt(req.amount).toLocaleString()} so'm
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {getUserDisplay(req, profiles)} • {req.credits} kredit • {new Date(req.created_at).toLocaleString("uz-UZ")}
          </p>
        </div>

        {/* Actions */}
        {req.status === "pending" ? (
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={() => onApprove(req)} className="bg-primary hover:bg-primary/90">
              <CheckCircle className="h-4 w-4 mr-1" /> Tasdiqlash
            </Button>
            <Button size="sm" variant="outline" onClick={() => onReject(req)} className="text-destructive border-destructive/30 hover:bg-destructive/5">
              <XCircle className="h-4 w-4 mr-1" /> Rad
            </Button>
          </div>
        ) : (
          <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${status.bg} ${status.color}`}>
            {status.label}
          </span>
        )}
      </div>
    </div>
  );
};

export default PaymentsTab;
