import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";

interface Props {
  storeName: string;
  logoUrl?: string | null;
}

const DISMISSED_KEY = "eprato_menu_install_dismissed";

const MenuInstallBanner = ({ storeName, logoUrl }: Props) => {
  const { canInstall, install, isIos } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISSED_KEY) === "true");
  }, []);

  const isStandalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true);

  if (!canInstall || dismissed || isStandalone) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  return (
    <div className="mx-4 md:mx-8 mt-3 rounded-lg border border-border bg-card p-3 flex items-center gap-3 shadow-sm">
      {logoUrl ? (
        <img src={logoUrl} alt={storeName} className="w-10 h-10 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold text-lg">{storeName?.[0]}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{storeName}</p>
        <p className="text-xs text-muted-foreground">
          {isIos ? "Toque em compartilhar → Tela Início" : "Instale para acesso rápido"}
        </p>
      </div>
      {isIos ? (
        <Share className="h-5 w-5 text-primary shrink-0" />
      ) : (
        <Button size="sm" variant="hero" onClick={install} className="shrink-0 text-xs h-8 px-3">
          Instalar
        </Button>
      )}
      <button onClick={handleDismiss} className="shrink-0 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default MenuInstallBanner;
