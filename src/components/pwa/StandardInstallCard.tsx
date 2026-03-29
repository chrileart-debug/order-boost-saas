import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";

interface Props {
  storeName: string;
  logoUrl?: string | null;
  slug: string;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

const StandardInstallCard = ({ storeName, logoUrl, slug }: Props) => {
  const { canInstall, install, isIos } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const dismissKey = `pwa_dismissed_${slug}`;

  useEffect(() => {
    setDismissed(localStorage.getItem(dismissKey) === "true");
  }, [dismissKey]);

  // Don't render if standalone, dismissed, or can't install
  if (isStandalone() || dismissed || !canInstall) return null;

  const handleDismiss = () => {
    localStorage.setItem(dismissKey, "true");
    setDismissed(true);
  };

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) {
      localStorage.setItem(dismissKey, "true");
      setDismissed(true);
    }
  };

  return (
    <div className="mx-4 md:mx-8 my-3 rounded-xl border border-border bg-card p-3.5 flex items-center gap-3 shadow-sm">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={storeName}
          className="w-12 h-12 rounded-xl object-cover shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold text-xl">
            {storeName?.[0]}
          </span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight truncate">
          Baixe o App de {storeName}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isIos
            ? "Toque em Compartilhar → Tela de Início"
            : "Peça mais rápido na próxima vez!"}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isIos ? (
          <Share className="h-5 w-5 text-primary" />
        ) : (
          <Button
            size="sm"
            onClick={handleInstall}
            className="text-xs h-8 px-3 gap-1"
          >
            <Download className="h-3.5 w-3.5" />
            Instalar
          </Button>
        )}
        <button
          onClick={handleDismiss}
          className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default StandardInstallCard;
