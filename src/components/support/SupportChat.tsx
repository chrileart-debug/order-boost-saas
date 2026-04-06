import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Lock, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface TicketMeta {
  id: string;
  subject: string;
  status: string;
  created_at: string;
}

interface SupportChatProps {
  /** Current active (open) ticket id */
  ticketId: string;
  senderName: string;
  isClosed?: boolean;
  /** All tickets for this establishment, ordered by created_at ASC for timeline */
  allTickets?: TicketMeta[];
}

export default function SupportChat({
  ticketId,
  senderName,
  isClosed = false,
  allTickets,
}: SupportChatProps) {
  const { user } = useAuth();
  const [timelineMessages, setTimelineMessages] = useState<
    { type: "separator"; subject: string; date: string } | { type: "msg"; msg: Message }
  >([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [rawMessages, setRawMessages] = useState<Message[]>([]);

  // Collect all ticket ids for timeline
  const ticketIds = allTickets?.map((t) => t.id) ?? [ticketId];

  // Fetch all messages for all tickets
  useEffect(() => {
    if (!ticketIds.length) return;

    const fetchAll = async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: true });
      if (data) setRawMessages(data as Message[]);

      // Mark unread
      if (user) {
        await supabase
          .from("support_messages")
          .update({ is_read: true })
          .in("ticket_id", ticketIds)
          .neq("sender_id", user.id)
          .eq("is_read", false);
      }
    };
    fetchAll();

    // Realtime for current open ticket
    const channel = supabase
      .channel(`support-timeline-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setRawMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (user && msg.sender_id !== user.id) {
            supabase
              .from("support_messages")
              .update({ is_read: true })
              .eq("id", msg.id)
              .then(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, user, allTickets?.length]);

  // Build timeline with separators
  useEffect(() => {
    const ticketMap = new Map<string, TicketMeta>();
    (allTickets ?? []).forEach((t) => ticketMap.set(t.id, t));

    // If no allTickets provided, just show messages without separators
    if (!allTickets?.length) {
      setTimelineMessages(rawMessages.map((m) => ({ type: "msg" as const, msg: m })));
      return;
    }

    const timeline: typeof timelineMessages = [];
    let currentTicketId: string | null = null;

    for (const msg of rawMessages) {
      if (msg.ticket_id !== currentTicketId) {
        currentTicketId = msg.ticket_id;
        const meta = ticketMap.get(msg.ticket_id);
        if (meta) {
          timeline.push({
            type: "separator",
            subject: meta.subject,
            date: new Date(meta.created_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }),
          });
        }
      }
      timeline.push({ type: "msg", msg });
    }

    setTimelineMessages(timeline);
  }, [rawMessages, allTickets]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timelineMessages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending || isClosed) return;
    setSending(true);
    const { error } = await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      sender_id: user.id,
      sender_name: senderName,
      content: newMessage.trim(),
    });
    if (!error) setNewMessage("");
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {timelineMessages.map((item, idx) => {
            if (item.type === "separator") {
              return (
                <div key={`sep-${idx}`} className="flex items-center gap-2 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <div className="flex items-center gap-1.5 bg-muted/70 rounded-full px-3 py-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Pin className="h-3 w-3" />
                    <span>{item.subject}</span>
                    <span>·</span>
                    <span>{item.date}</span>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>
              );
            }

            const msg = item.msg;
            const isMe = msg.sender_id === user?.id;
            const isSystem = msg.sender_name === "Sistema";

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  isSystem ? "justify-center" : isMe ? "justify-end" : "justify-start"
                )}
              >
                {isSystem ? (
                  <div className="bg-muted/50 rounded-lg px-4 py-2 text-xs text-muted-foreground italic">
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}
                  >
                    {!isMe && (
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {msg.sender_name}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={cn(
                        "text-[10px] mt-1",
                        isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}
                    >
                      {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      {isClosed ? (
        <div className="border-t p-3 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Lock className="h-4 w-4" />
          <span>Este chamado foi encerrado</span>
        </div>
      ) : (
        <div className="border-t p-3 flex gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={sending}
          />
          <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
