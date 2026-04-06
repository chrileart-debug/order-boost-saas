import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Package, Truck, CreditCard, AlertTriangle } from "lucide-react";
import SupportChat from "@/components/support/SupportChat";

const SUBJECTS = [
  {
    label: "Produtos",
    icon: Package,
    subOptions: ["Criar Adicionais", "Montar Combos", "Editar/Excluir", "Outros"],
  },
  {
    label: "Logística",
    icon: Truck,
    subOptions: ["Motoboys", "Turnos", "Dúvidas de Entrega"],
  },
  {
    label: "Financeiro",
    icon: CreditCard,
    subOptions: ["Planos/Assinaturas", "Falha de Pagamento"],
  },
  {
    label: "Problemas Técnicos",
    icon: AlertTriangle,
    subOptions: ["Tela travada", "Erro ao salvar", "Loja não abre", "Notificações", "Outro"],
  },
];

interface TicketMeta {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
}

type Step = "loading" | "subject" | "sub-option" | "chat";

export default function SupportPage() {
  const { user } = useAuth();
  const { establishment } = useEstablishment();
  const [allTickets, setAllTickets] = useState<TicketMeta[]>([]);
  const [openTicket, setOpenTicket] = useState<TicketMeta | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [selectedSubject, setSelectedSubject] = useState<(typeof SUBJECTS)[0] | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!establishment) return;
    const { data } = await supabase
      .from("support_tickets")
      .select("id, subject, status, created_at, updated_at")
      .eq("establishment_id", establishment.id)
      .order("created_at", { ascending: true });

    const tickets = (data ?? []) as TicketMeta[];
    setAllTickets(tickets);

    const open = tickets.find((t) => t.status === "open");
    setOpenTicket(open ?? null);

    // If there's an open ticket, go straight to chat
    setStep(open ? "chat" : "subject");
  }, [establishment]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Listen for ticket status changes (admin closes ticket → redirect to triage)
  useEffect(() => {
    if (!establishment) return;
    const channel = supabase
      .channel("support-ticket-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_tickets",
          filter: `establishment_id=eq.${establishment.id}`,
        },
        (payload) => {
          const updated = payload.new as TicketMeta;
          if (updated.status === "closed" && openTicket?.id === updated.id) {
            // Admin closed the ticket — go back to triage
            setOpenTicket(null);
            setStep("subject");
            fetchTickets();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [establishment, openTicket?.id, fetchTickets]);

  const handleSelectSubject = (subject: (typeof SUBJECTS)[0]) => {
    setSelectedSubject(subject);
    setStep("sub-option");
  };

  const handleSelectSubOption = async (option: string) => {
    if (!establishment || !user || !selectedSubject) return;
    setLoading(true);

    const fullSubject = `${selectedSubject.label} → ${option}`;

    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        establishment_id: establishment.id,
        establishment_name: establishment.name,
        plan_name: establishment.plan_name || "free",
        subject: fullSubject,
      })
      .select()
      .single();

    if (data && !error) {
      const newTicket: TicketMeta = {
        id: data.id,
        subject: fullSubject,
        status: "open",
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      setAllTickets((prev) => [...prev, newTicket]);
      setOpenTicket(newTicket);
      setStep("chat");
    }
    setLoading(false);
  };

  const senderName = establishment?.name || "Lojista";

  // --- Loading ---
  if (step === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando suporte...</p>
      </div>
    );
  }

  // --- Chat (timeline) ---
  if (step === "chat" && openTicket) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Suporte EPRATO</h2>
            <p className="text-xs text-muted-foreground">
              {openTicket.subject} · #{openTicket.id.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex-1 border rounded-lg overflow-hidden bg-card">
          <SupportChat
            ticketId={openTicket.id}
            senderName={senderName}
            isClosed={false}
            allTickets={allTickets}
            onTicketClosed={() => {
              setOpenTicket(null);
              setStep("subject");
              fetchTickets();
            }}
          />
        </div>
      </div>
    );
  }

  // --- Sub-options ---
  if (step === "sub-option" && selectedSubject) {
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setStep("subject")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{selectedSubject.label}</h1>
            <p className="text-muted-foreground">Selecione o sub-assunto</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {selectedSubject.subOptions.map((option) => (
            <Card
              key={option}
              className={`cursor-pointer hover:border-primary/50 transition-colors ${loading ? "opacity-50 pointer-events-none" : ""}`}
              onClick={() => handleSelectSubOption(option)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{option}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // --- Step 1: Subject cards ---
  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Suporte</h1>
        <p className="text-muted-foreground">Selecione o assunto do seu chamado</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SUBJECTS.map((subject) => (
          <Card
            key={subject.label}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => handleSelectSubject(subject)}
          >
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
              <subject.icon className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium text-foreground">{subject.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
