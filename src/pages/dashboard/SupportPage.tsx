import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Package, Puzzle, AlertTriangle, CreditCard, HelpCircle, MessageCircle } from "lucide-react";
import SupportChat from "@/components/support/SupportChat";

const SUBJECTS = [
  {
    label: "Produtos",
    icon: Package,
    subOptions: ["Adicionar produto", "Editar produto", "Excluir produto", "Problema com imagem", "Outro"],
  },
  {
    label: "Adicionais",
    icon: Puzzle,
    subOptions: ["Criar grupo", "Editar adicional", "Remover adicional", "Outro"],
  },
  {
    label: "Problemas Técnicos",
    icon: AlertTriangle,
    subOptions: ["Tela travada", "Erro ao salvar", "Loja não abre", "Notificações", "Outro"],
  },
  {
    label: "Pagamentos",
    icon: CreditCard,
    subOptions: ["Cobrança indevida", "Trocar plano", "Cancelar assinatura", "Outro"],
  },
  {
    label: "Outros",
    icon: HelpCircle,
    subOptions: ["Dúvida geral", "Sugestão", "Outro"],
  },
];

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
}

type TriageStep = "subject" | "sub-option" | "description" | "chat";

export default function SupportPage() {
  const { user } = useAuth();
  const { establishment } = useEstablishment();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Triage state
  const [triageStep, setTriageStep] = useState<TriageStep>("subject");
  const [selectedSubject, setSelectedSubject] = useState<typeof SUBJECTS[0] | null>(null);
  const [selectedSubOption, setSelectedSubOption] = useState("");
  const [description, setDescription] = useState("");

  const fetchTickets = async () => {
    if (!establishment) return;
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("establishment_id", establishment.id)
      .order("updated_at", { ascending: false });
    if (data) setTickets(data as Ticket[]);
  };

  useEffect(() => {
    fetchTickets();
  }, [establishment]);

  const resetTriage = () => {
    setTriageStep("subject");
    setSelectedSubject(null);
    setSelectedSubOption("");
    setDescription("");
    setActiveTicketId(null);
  };

  const handleSelectSubject = (subject: typeof SUBJECTS[0]) => {
    setSelectedSubject(subject);
    setTriageStep("sub-option");
  };

  const handleSelectSubOption = (option: string) => {
    setSelectedSubOption(option);
    setTriageStep("description");
  };

  const handleSubmitTriage = async () => {
    if (!establishment || !user || !selectedSubject) return;
    setLoading(true);

    const fullSubject = `${selectedSubject.label} → ${selectedSubOption}`;

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
      // Send first message with description context
      const introMsg = description.trim()
        ? `📋 **Assunto:** ${selectedSubject.label}\n🔹 **Detalhe:** ${selectedSubOption}\n\n${description.trim()}`
        : `📋 **Assunto:** ${selectedSubject.label}\n🔹 **Detalhe:** ${selectedSubOption}`;

      await supabase.from("support_messages").insert({
        ticket_id: data.id,
        sender_id: user.id,
        sender_name: establishment.name || "Lojista",
        content: introMsg,
      });

      setActiveTicketId(data.id);
      setTriageStep("chat");
      fetchTickets();
    }
    setLoading(false);
  };

  const senderName = establishment?.name || "Lojista";

  // --- Chat view (after triage or clicking existing ticket) ---
  if (activeTicketId && triageStep === "chat") {
    const ticket = tickets.find((t) => t.id === activeTicketId);
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => { resetTriage(); fetchTickets(); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{ticket?.subject || "Suporte"}</h2>
            <p className="text-xs text-muted-foreground">Ticket #{activeTicketId.slice(0, 8)}</p>
          </div>
          {ticket?.status === "open" && (
            <Badge className="ml-auto">Aberto</Badge>
          )}
          {ticket?.status === "closed" && (
            <Badge variant="secondary" className="ml-auto">Fechado</Badge>
          )}
        </div>
        <div className="flex-1 border rounded-lg overflow-hidden bg-card">
          <SupportChat
            ticketId={activeTicketId}
            senderName={senderName}
            isClosed={ticket?.status === "closed"}
          />
        </div>
      </div>
    );
  }

  // --- Triage Step 2: Sub-options ---
  if (triageStep === "sub-option" && selectedSubject) {
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setTriageStep("subject")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{selectedSubject.label}</h1>
            <p className="text-muted-foreground">Qual é o problema específico?</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {selectedSubject.subOptions.map((option) => (
            <Card
              key={option}
              className="cursor-pointer hover:border-primary/50 transition-colors"
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

  // --- Triage Step 3: Description ---
  if (triageStep === "description" && selectedSubject) {
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setTriageStep("sub-option")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {selectedSubject.label} → {selectedSubOption}
            </h1>
            <p className="text-muted-foreground">Descreva brevemente o que aconteceu</p>
          </div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 space-y-4">
          <Textarea
            placeholder="Ex: Tentei adicionar um produto novo mas aparece um erro na tela..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <Button
            className="w-full"
            onClick={handleSubmitTriage}
            disabled={loading}
          >
            {loading ? "Abrindo chamado..." : "Abrir chamado"}
          </Button>
        </div>
      </div>
    );
  }

  // --- Step 1: Subject cards + previous tickets ---
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Suporte</h1>
        <p className="text-muted-foreground">Selecione um assunto ou continue uma conversa</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
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

      {tickets.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Chamados anteriores</h2>
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => { setActiveTicketId(ticket.id); setTriageStep("chat"); }}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ticket.updated_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <Badge variant={ticket.status === "open" ? "default" : "secondary"}>
                  {ticket.status === "open" ? "Aberto" : "Fechado"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
