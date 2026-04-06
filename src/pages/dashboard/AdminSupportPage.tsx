import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, XCircle } from "lucide-react";
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
  const [selectedEstablishment, setSelectedEstablishment] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const isAdmin = user?.email === "chrileart@gmail.com";

  // All tickets for the selected establishment (for timeline)
  const [estTickets, setEstTickets] = useState<Ticket[]>([]);
  const openTicket = estTickets.find((t) => t.status === "open");

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setTickets(data as Ticket[]);
  };

  useEffect(() => {
    if (isAdmin) fetchTickets();
  }, [isAdmin]);

  // When selecting an establishment, load all its tickets for timeline
  useEffect(() => {
    if (!selectedEstablishment) {
      setEstTickets([]);
      return;
    }
    const est = tickets.filter((t) => t.establishment_id === selectedEstablishment);
    // Sort ascending for timeline
    est.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    setEstTickets(est);
  }, [selectedEstablishment, tickets]);

  const handleCloseTicket = async (ticketId: string) => {
    if (!user) return;
    await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      sender_id: user.id,
      sender_name: "Sistema",
      content: "O suporte foi encerrado pelo administrador. 🙏",
    });
    // Mark all messages in this ticket as read
    await supabase
      .from("support_messages")
      .update({ is_read: true })
      .eq("ticket_id", ticketId)
      .eq("is_read", false);
    await supabase.from("support_tickets").update({ status: "closed" }).eq("id", ticketId);
    await fetchTickets();
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Acesso restrito.</p>
      </div>
    );
  }

  // --- Timeline chat view for a specific store ---
  if (selectedEstablishment && estTickets.length > 0) {
    const storeName = estTickets[0]?.establishment_name ?? "Loja";
    const planName = estTickets[0]?.plan_name ?? "free";

    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedEstablishment(null);
                fetchTickets();
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{storeName}</h2>
              <p className="text-xs text-muted-foreground">
                Plano: {planName} · {estTickets.length} chamado(s)
                {openTicket && ` · Aberto: ${openTicket.subject}`}
              </p>
            </div>
          </div>
          {openTicket && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => handleCloseTicket(openTicket.id)}
            >
              <XCircle className="h-4 w-4" />
              Encerrar Atendimento
            </Button>
          )}
        </div>
        <div className="flex-1 border rounded-lg overflow-hidden bg-card">
          <SupportChat
            ticketId={openTicket?.id ?? estTickets[estTickets.length - 1].id}
            senderName="Suporte EPRATO"
            isClosed={!openTicket}
            allTickets={estTickets.map((t) => ({
              id: t.id,
              subject: t.subject,
              status: t.status,
              created_at: t.created_at,
            }))}
          />
        </div>
      </div>
    );
  }

  // --- Store list ---
  // Group tickets by establishment
  const storeMap = new Map<string, { name: string; plan: string; tickets: Ticket[] }>();
  for (const t of tickets) {
    if (!storeMap.has(t.establishment_id)) {
      storeMap.set(t.establishment_id, {
        name: t.establishment_name,
        plan: t.plan_name,
        tickets: [],
      });
    }
    storeMap.get(t.establishment_id)!.tickets.push(t);
  }

  const stores = Array.from(storeMap.entries()).map(([id, data]) => {
    const openT = data.tickets.find((t) => t.status === "open");
    return { id, name: data.name, plan: data.plan, openTicket: openT, totalTickets: data.tickets.length };
  });

  // Filter
  const filteredStores =
    statusFilter === "all"
      ? stores
      : statusFilter === "open"
        ? stores.filter((s) => s.openTicket)
        : stores.filter((s) => !s.openTicket);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suporte — Admin</h1>
          <p className="text-muted-foreground">{stores.length} loja(s) atendida(s)</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="open">Com Aberto</SelectItem>
            <SelectItem value="closed">Sem Aberto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredStores.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Nenhuma loja encontrada.</p>
      )}

      <div className="space-y-3">
        {filteredStores.map((store) => (
          <Card
            key={store.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setSelectedEstablishment(store.id)}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{store.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Plano {store.plan} · {store.totalTickets} chamado(s)
                  </p>
                  {store.openTicket && (
                    <p className="text-xs text-primary font-medium mt-0.5">
                      🔴 {store.openTicket.subject}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={store.openTicket ? "default" : "secondary"}>
                {store.openTicket ? "Aberto" : "Histórico"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
