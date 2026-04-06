import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SupportChat from "@/components/support/SupportChat";

interface Ticket {
  id: string;
  establishment_id: string;
  establishment_name: string;
  plan_name: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function AdminSupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("open");

  const isAdmin = user?.email === "chrileart@gmail.com";

  const fetchTickets = async () => {
    let query = supabase
      .from("support_tickets")
      .select("*")
      .order("updated_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    if (data) setTickets(data as Ticket[]);
  };

  useEffect(() => {
    if (isAdmin) fetchTickets();
  }, [isAdmin, statusFilter]);

  const handleCloseTicket = async (ticketId: string) => {
    // Send system goodbye message
    if (user) {
      await supabase.from("support_messages").insert({
        ticket_id: ticketId,
        sender_id: user.id,
        sender_name: "Sistema",
        content: "Muito obrigado, o suporte encerrou. 🙏",
      });
    }
    await supabase.from("support_tickets").update({ status: "closed" }).eq("id", ticketId);
    fetchTickets();
    // Update local ticket status for immediate UI feedback
    setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: "closed" } : t));
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Acesso restrito.</p>
      </div>
    );
  }

  if (activeTicketId) {
    const ticket = tickets.find((t) => t.id === activeTicketId);
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setActiveTicketId(null); fetchTickets(); }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {ticket?.establishment_name} — {ticket?.subject}
              </h2>
              <p className="text-xs text-muted-foreground">
                Plano: {ticket?.plan_name} · #{activeTicketId.slice(0, 8)}
              </p>
            </div>
          </div>
          {ticket?.status === "open" && (
            <Button variant="outline" size="sm" onClick={() => handleCloseTicket(activeTicketId)}>
              Fechar chamado
            </Button>
          )}
        </div>
        <div className="flex-1 border rounded-lg overflow-hidden bg-card">
          <SupportChat
            ticketId={activeTicketId}
            senderName="Suporte EPRATO"
            isClosed={ticket?.status === "closed"}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suporte — Admin</h1>
          <p className="text-muted-foreground">{tickets.length} chamado(s)</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="closed">Fechados</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tickets.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Nenhum chamado encontrado.</p>
      )}

      <div className="space-y-3">
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
                  <p className="font-medium text-foreground">{ticket.establishment_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {ticket.subject} · Plano {ticket.plan_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(ticket.updated_at).toLocaleDateString("pt-BR", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
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
    </div>
  );
}
