import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, LayoutDashboard } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";

const DISMISSED_KEY = "admin_pwa_dismissed";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

const AdminInstallCard = () => {
  const { canInstall, install, isIos } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
  }, []);

  if (isStandalone() || dismissed || !canInstall) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) {
      localStorage.setItem(DISMISSED_KEY, "true");
      setDismissed(true);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 shadow-sm">
      <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
        <LayoutDashboard className="h-6 w-6 text-primary-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">
          Instalar Gestor EPRATO
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isIos
            ? "Toque em Compartilhar → Tela de Início"
            : "Gerencie seus pedidos e estoque direto pelo aplicativo."}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {!isIos && (
          <Button size="sm" onClick={handleInstall} className="text-xs h-8 px-3 gap-1">
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

export default AdminInstallCard;
