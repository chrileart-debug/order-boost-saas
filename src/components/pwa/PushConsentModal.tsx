import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { isPushSupported, subscribeToPush } from "@/lib/pushSubscription";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  establishmentId: string;
  storeName: string;
  logoUrl?: string | null;
}

const ACCEPTED_KEY = "push_consent_accepted";
const DENIED_KEY = "push_consent_denied";

export function shouldShowPushConsent(): boolean {
  if (!isPushSupported()) return false;
  if (typeof Notification !== "undefined" && Notification.permission === "granted") return false;
  if (typeof Notification !== "undefined" && Notification.permission === "denied") return false;
  if (localStorage.getItem(ACCEPTED_KEY) === "true") return false;
  if (localStorage.getItem(DENIED_KEY) === "true") return false;
  return true;
}

const PushConsentModal = ({ open, onOpenChange, phone, establishmentId, storeName, logoUrl }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    const ok = await subscribeToPush({ phone, establishmentId, role: "customer" });
    setLoading(false);
    if (ok) {
      localStorage.setItem(ACCEPTED_KEY, "true");
      toast({ title: "Notificações ativadas!", description: "Você será avisado sobre atualizações do pedido." });
    } else {
      toast({ title: "Permissão negada", description: "Permita notificações nas configurações do navegador.", variant: "destructive" });
    }
    onOpenChange(false);
  };

  const handleDeny = () => {
    localStorage.setItem(DENIED_KEY, "true");
    onOpenChange(false);
  };

  const handleClose = () => {
    // User closed via X — don't persist, ask again next order
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-3">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="w-16 h-16 rounded-2xl object-cover shadow-md" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-md">
                <Bell className="h-8 w-8 text-primary-foreground" />
              </div>
            )}
          </div>
          <DialogTitle className="text-lg">Ativar notificações?</DialogTitle>
          <DialogDescription className="text-sm">
            Receba avisos em tempo real quando seu pedido em <strong>{storeName}</strong> mudar de status — sem precisar ficar atualizando a página.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleAccept} disabled={loading} className="w-full gap-2">
            <Bell className="h-4 w-4" /> {loading ? "Ativando..." : "Sim, ativar notificações"}
          </Button>
          <Button onClick={handleDeny} variant="ghost" className="w-full gap-2 text-muted-foreground">
            <BellOff className="h-4 w-4" /> Não, obrigado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PushConsentModal;
