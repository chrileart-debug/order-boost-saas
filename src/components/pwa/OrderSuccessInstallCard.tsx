import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Smartphone, Share } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";

interface Props {
  storeName: string;
  logoUrl?: string | null;
}

const OrderSuccessInstallCard = ({ storeName, logoUrl }: Props) => {
  const { canInstall, install, isIos } = usePwaInstall();

  if (!canInstall) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
        <div className="relative">
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className="w-16 h-16 rounded-2xl object-cover shadow-md" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-md">
              <span className="text-primary-foreground font-bold text-2xl">{storeName?.[0]}</span>
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Smartphone className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Instale o app de {storeName}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isIos
              ? "Toque no ícone de compartilhar e selecione \"Adicionar à Tela Início\""
              : "Acompanhe seus pedidos futuros com um clique"}
          </p>
        </div>
        {isIos ? (
          <div className="flex items-center gap-2 text-primary">
            <Share className="h-5 w-5" />
            <span className="text-sm font-medium">Compartilhar → Tela Início</span>
          </div>
        ) : (
          <Button onClick={install} className="w-full gap-2" variant="hero">
            <Download className="h-4 w-4" /> Instalar App
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderSuccessInstallCard;
