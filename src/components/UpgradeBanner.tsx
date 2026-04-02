import { useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeBannerProps {
  message?: string;
  className?: string;
}

const UpgradeBanner = ({ message = "Esta funcionalidade está disponível no Plano PRO.", className = "" }: UpgradeBannerProps) => {
  const navigate = useNavigate();

  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center gap-4 ${className}`}>
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Crown className="w-8 h-8 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">Recurso do Plano PRO</h3>
        <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      </div>
      <Button onClick={() => navigate("/dashboard/subscription")} className="gap-2">
        <Crown className="w-4 h-4" /> Mudar para o Plano PRO
      </Button>
    </div>
  );
};

export default UpgradeBanner;
