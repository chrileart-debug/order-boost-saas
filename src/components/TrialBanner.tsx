import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { Clock, AlertTriangle, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

const TrialBanner = () => {
  const { establishment } = useEstablishment();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!establishment || establishment.plan_status !== "trialing" || !establishment.trial_ends_at) {
    return null;
  }

  const end = new Date(establishment.trial_ends_at);
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) {
    return (
      <div className="w-full px-4 py-3 bg-destructive text-destructive-foreground flex items-center justify-between gap-3 text-sm font-medium">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 shrink-0" />
          <span>Seu período de teste expirou. Assine um plano para continuar usando.</span>
        </div>
        <Button size="sm" variant="secondary" onClick={() => navigate("/dashboard/subscription")} className="shrink-0">
          Assinar Agora
        </Button>
      </div>
    );
  }

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const hours = totalHours % 24;
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let bgClass: string;
  let Icon: typeof Clock;
  let timeText: string;

  if (days > 3) {
    bgClass = "bg-muted text-muted-foreground";
    Icon = Clock;
    timeText = `Você tem ${days} dias de teste grátis restantes.`;
  } else if (days >= 1) {
    bgClass = "bg-orange-500 text-white";
    Icon = AlertTriangle;
    timeText = `Restam apenas ${days} dia${days > 1 ? "s" : ""} de teste grátis!`;
  } else {
    bgClass = "bg-destructive text-destructive-foreground";
    Icon = Flame;
    timeText = `Teste expira em ${hours}h ${minutes}min!`;
  }

  return (
    <div className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-sm font-medium ${bgClass}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 shrink-0" />
        <span>{timeText}</span>
      </div>
      <Button size="sm" variant={days > 3 ? "default" : "secondary"} onClick={() => navigate("/dashboard/subscription")} className="shrink-0">
        Assinar Plano Agora
      </Button>
    </div>
  );
};

export default TrialBanner;
