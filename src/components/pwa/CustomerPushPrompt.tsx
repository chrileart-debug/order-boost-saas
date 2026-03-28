import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { isPushSupported, subscribeToPush } from "@/lib/pushSubscription";
import { useToast } from "@/hooks/use-toast";

interface Props {
  phone: string;
  establishmentId: string;
  storeName: string;
  logoUrl?: string | null;
}

const CustomerPushPrompt = ({ phone, establishmentId, storeName, logoUrl }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!isPushSupported() || subscribed || dismissed) return null;

  const handleSubscribe = async () => {
    setLoading(true);
    const ok = await subscribeToPush({ phone, establishmentId, role: "customer" });
    setSubscribed(ok);
    setLoading(false);
    if (ok) {
      toast({ title: "Notificações ativadas!", description: "Você será avisado sobre atualizações do pedido." });
    } else {
      toast({ title: "Permissão negada", description: "Permita notificações nas configurações do navegador.", variant: "destructive" });
    }
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
      {logoUrl ? (
        <img src={logoUrl} alt={storeName} className="w-10 h-10 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Bell className="h-5 w-5 text-primary-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Receber atualizações do pedido</p>
        <p className="text-xs text-muted-foreground">Saiba quando seu pedido estiver pronto</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" onClick={handleSubscribe} disabled={loading} className="gap-1.5">
          <Bell className="h-3.5 w-3.5" /> {loading ? "..." : "Ativar"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>Não</Button>
      </div>
    </div>
  );
};

export default CustomerPushPrompt;
