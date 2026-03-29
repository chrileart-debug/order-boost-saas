import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  const [showInstructions, setShowInstructions] = useState(false);
  const dismissKey = `pwa_dismissed_${slug}`;

  useEffect(() => {
    setDismissed(localStorage.getItem(dismissKey) === "true");
  }, [dismissKey]);

  // Hide only if standalone or explicitly dismissed
  if (isStandalone() || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(dismissKey, "true");
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (isIos) {
      setShowInstructions(true);
      return;
    }
    // Try native prompt first
    const accepted = await install();
    if (accepted) {
      localStorage.setItem(dismissKey, "true");
      setDismissed(true);
    } else if (!canInstall) {
      // Native prompt not available — show manual instructions
      setShowInstructions(true);
    }
  };

  return (
    <>
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
          <Button
            size="sm"
            onClick={handleInstall}
            className="text-xs h-8 px-3 gap-1"
          >
            <Download className="h-3.5 w-3.5" />
            Instalar
          </Button>
          <button
            onClick={handleDismiss}
            className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Instalar {storeName}</DialogTitle>
            <DialogDescription>
              Siga os passos abaixo para baixar o aplicativo:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {isIos ? (
              <ol className="list-decimal list-inside space-y-2 text-sm text-foreground">
                <li>Toque no ícone de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) na barra inferior do Safari</li>
                <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
                <li>Toque em <strong>"Adicionar"</strong> para confirmar</li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-2 text-sm text-foreground">
                <li>Toque no <strong>menu do navegador</strong> (ícone ⋮ no canto superior direito)</li>
                <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong></li>
                <li>Confirme tocando em <strong>"Instalar"</strong></li>
              </ol>
            )}
            <p className="text-xs text-muted-foreground">
              O aplicativo abrirá em tela cheia, como um app nativo, sem a barra de pesquisa do navegador.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StandardInstallCard;
