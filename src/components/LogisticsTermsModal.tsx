import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck } from "lucide-react";

const TERMS = [
  "O EPRATO é uma ferramenta de software para criação de cardápios digitais.",
  "A funcionalidade de conexão com motoristas é uma cortesia tecnológica para facilitar o contato entre as partes.",
  "O EPRATO NÃO se responsabiliza por: atrasos, faltas de motoristas, conduta dos entregadores, avarias em mercadorias ou falta de disponibilidade de profissionais na região.",
  "Não há vínculo empregatício entre o EPRATO e os motoristas; eles são profissionais autônomos.",
  "O lojista é o único responsável pela contratação e negociação direta com o entregador.",
];

export default function LogisticsTermsModal() {
  const { establishment, refresh } = useEstablishment();
  const { toast } = useToast();
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    if (!establishment) return;
    setAccepting(true);
    const { error } = await supabase
      .from("establishments")
      .update({ accepted_logistics_terms: true } as any)
      .eq("id", establishment.id);

    if (error) {
      toast({ title: "Erro ao aceitar termos", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Termos aceitos com sucesso!" });
      await refresh();
    }
    setAccepting(false);
  };

  return (
    <AlertDialog open>
      <AlertDialogContent
        className="max-w-lg"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <AlertDialogTitle className="text-lg">
              Termo de Intermediação e Isenção de Responsabilidade
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            Para acessar as funcionalidades de Motoristas e Logística, você precisa ler e aceitar os termos abaixo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[50vh] pr-3">
          <ol className="list-decimal list-inside space-y-3 text-sm text-foreground mt-2">
            {TERMS.map((term, i) => (
              <li key={i} className="leading-relaxed">{term}</li>
            ))}
          </ol>
        </ScrollArea>

        <Button onClick={handleAccept} disabled={accepting} className="w-full mt-4">
          {accepting ? "Processando..." : "Li e concordo com os termos"}
        </Button>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { TERMS };
