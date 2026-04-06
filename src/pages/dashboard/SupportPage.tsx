import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Puzzle, AlertTriangle, CreditCard, HelpCircle, MessageCircle } from "lucide-react";
import SupportChat from "@/components/support/SupportChat";

const SUBJECTS = [
  { label: "Produtos", icon: Package },
  { label: "Adicionais", icon: Puzzle },
  { label: "Problemas Técnicos", icon: AlertTriangle },
  { label: "Pagamentos", icon: CreditCard },
  { label: "Outros", icon: HelpCircle },
];

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function SupportPage() {
  const { user } = useAuth();
  const { establishment } = useEstablishment();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleNewTicket = async (subject: string) => {
    if (!establishment || !user) return;
    setLoading(true);

    // Check for existing open ticket with same subject
    const existing = tickets.find((t) => t.subject === subject && t.status === "open");
    if (existing) {
      setActiveTicketId(existing.id);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        establishment_id: establishment.id,
        establishment_name: establishment.name,
        plan_name: establishment.plan_name || "free",
        subject,
      })
      .select()
      .single();

    if (data && !error) {
      setActiveTicketId(data.id);
      fetchTickets();
    }
    setLoading(false);
  };

  const senderName = establishment?.name || "Lojista";

  if (activeTicketId) {
    const ticket = tickets.find((t) => t.id === activeTicketId);
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => { setActiveTicketId(null); fetchTickets(); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{ticket?.subject || "Suporte"}</h2>
            <p className="text-xs text-muted-foreground">Ticket #{activeTicketId.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex-1 border rounded-lg overflow-hidden bg-card">
          <SupportChat ticketId={activeTicketId} senderName={senderName} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Suporte</h1>
        <p className="text-muted-foreground">Selecione um assunto ou continue uma conversa</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {SUBJECTS.map(({ label, icon: Icon }) => (
          <Card
            key={label}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => handleNewTicket(label)}
          >
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
              <Icon className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium text-foreground">{label}</span>
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
              onClick={() => setActiveTicketId(ticket.id)}
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
