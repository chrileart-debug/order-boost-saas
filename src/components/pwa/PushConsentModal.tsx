import { useState } from "react";
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

const PREF_KEY = "push_preference";

export function shouldShowPushConsent(): boolean {
  if (!isPushSupported()) return false;
  if (typeof Notification !== "undefined" && Notification.permission === "granted") return false;
  if (typeof Notification !== "undefined" && Notification.permission === "denied") return false;
  const pref = localStorage.getItem(PREF_KEY);
  if (pref === "accepted" || pref === "denied") return false;
  return true;
}

const PushConsentModal = ({ open, onOpenChange, phone, establishmentId, storeName, logoUrl }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    const ok = await subscribeToPush({ phone, establishmentId, role: "customer" });
    setLoading(false);
    localStorage.setItem(PREF_KEY, "accepted");
    if (ok) {
      toast({ title: "Notificações ativadas!", description: "Você será avisado sobre atualizações do pedido." });
    } else {
      toast({ title: "Permissão negada", description: "Permita notificações nas configurações do navegador.", variant: "destructive" });
    }
    onOpenChange(false);
  };

  const handleDeny = () => {
    localStorage.setItem(PREF_KEY, "denied");
    onOpenChange(false);
  };

  const handleClose = () => {
    // User closed via X — don't persist, ask again next order
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
        <DialogHeader className="items-center text-center space-y-3">
          <div className="mx-auto">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="w-14 h-14 rounded-xl object-cover shadow-md" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <Bell className="h-7 w-7 text-primary-foreground" />
              </div>
            )}
          </div>
          <DialogTitle className="text-base font-semibold">Deseja receber avisos em tempo real?</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Saiba na hora quando seu pedido em <strong>{storeName}</strong> mudar de status — sem precisar ficar atualizando a página.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col pt-2">
          <Button onClick={handleAccept} disabled={loading} className="w-full gap-2 h-11">
            <Bell className="h-4 w-4" /> {loading ? "Ativando..." : "Sim, me avise"}
          </Button>
          <Button onClick={handleDeny} variant="ghost" className="w-full gap-2 text-muted-foreground h-10">
            <BellOff className="h-4 w-4" /> Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PushConsentModal;
