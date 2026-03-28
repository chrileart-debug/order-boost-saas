import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Bell, BellOff } from "lucide-react";
import { isPushSupported, subscribeToPush, getExistingSubscription, unsubscribeFromPush } from "@/lib/pushSubscription";
import { useToast } from "@/hooks/use-toast";

const statusOptions = [
  { key: "preparing", label: "Preparando" },
  { key: "shipping", label: "Saiu para entrega" },
  { key: "completed", label: "Entregue" },
];

interface Props {
  establishmentId: string;
  userId: string;
  pushNotifyStatuses: string[];
  onStatusesChange: (statuses: string[]) => void;
}

const PushNotificationSettings = ({ establishmentId, userId, pushNotifyStatuses, onStatusesChange }: Props) => {
  const { toast } = useToast();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const supported = isPushSupported();

  useEffect(() => {
    getExistingSubscription().then((sub) => setSubscribed(!!sub));
  }, []);

  const toggleSubscription = async () => {
    setLoading(true);
    if (subscribed) {
      await unsubscribeFromPush();
      setSubscribed(false);
      toast({ title: "Notificações push desativadas" });
    } else {
      const ok = await subscribeToPush({ userId, establishmentId, role: "owner" });
      setSubscribed(ok);
      if (ok) {
        toast({ title: "Notificações push ativadas!", description: "Você receberá alertas de novos pedidos." });
      } else {
        toast({ title: "Não foi possível ativar", description: "Verifique as permissões do navegador.", variant: "destructive" });
      }
    }
    setLoading(false);
  };

  const toggleStatus = (status: string) => {
    const current = [...pushNotifyStatuses];
    if (current.includes(status)) {
      onStatusesChange(current.filter((s) => s !== status));
    } else {
      onStatusesChange([...current, status]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> Notificações Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Receba notificações push de novos pedidos no seu dispositivo e configure quais atualizações de status serão enviadas para seus clientes.
        </p>

        {/* Owner subscription */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            {subscribed ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
            <div>
              <p className="text-sm font-medium text-foreground">{subscribed ? "Push ativado" : "Push desativado"}</p>
              <p className="text-xs text-muted-foreground">Alertas de novos pedidos neste dispositivo</p>
            </div>
          </div>
          <Button
            size="sm"
            variant={subscribed ? "outline" : "default"}
            onClick={toggleSubscription}
            disabled={loading || !supported}
          >
            {loading ? "..." : subscribed ? "Desativar" : "Ativar"}
          </Button>
        </div>

        {!supported && (
          <p className="text-xs text-destructive">Seu navegador não suporta notificações push.</p>
        )}

        {/* Client notification triggers */}
        <div className="space-y-3 pt-2">
          <Label className="text-sm font-medium">Notificar clientes quando o pedido mudar para:</Label>
          <div className="space-y-2">
            {statusOptions.map((opt) => (
              <div key={opt.key} className="flex items-center gap-2">
                <Checkbox
                  id={`push-${opt.key}`}
                  checked={pushNotifyStatuses.includes(opt.key)}
                  onCheckedChange={() => toggleStatus(opt.key)}
                />
                <Label htmlFor={`push-${opt.key}`} className="text-sm cursor-pointer">{opt.label}</Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PushNotificationSettings;
