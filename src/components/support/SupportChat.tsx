import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Lock, Pin, Info } from "lucide-react";
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
  ticketId: string;
  senderName: string;
  isClosed?: boolean;
  allTickets?: TicketMeta[];
}

export default function SupportChat({
  ticketId,
  senderName,
  isClosed = false,
  allTickets,
}: SupportChatProps) {
  const { user } = useAuth();
  type TimelineItem =
    | { type: "separator"; subject: string; date: string }
    | { type: "msg"; msg: Message };

  const [timelineMessages, setTimelineMessages] = useState<TimelineItem[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [rawMessages, setRawMessages] = useState<Message[]>([]);

  const ticketIds = allTickets?.map((t) => t.id) ?? [ticketId];

  // Fetch all messages
  useEffect(() => {
    if (!ticketIds.length) return;

    const fetchAll = async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: true });
      if (data) setRawMessages(data as Message[]);

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

  // Build timeline
  useEffect(() => {
    const ticketMap = new Map<string, TicketMeta>();
    (allTickets ?? []).forEach((t) => ticketMap.set(t.id, t));

    if (!allTickets?.length) {
      setTimelineMessages(rawMessages.map((m) => ({ type: "msg" as const, msg: m })));
      return;
    }

    const timeline: TimelineItem[] = [];
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

  const isSystemMessage = (msg: Message) =>
    msg.sender_name === "Sistema" || msg.content.startsWith("📋");

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-1.5">
          {timelineMessages.map((item, idx) => {
            if (item.type === "separator") {
              return (
                <div key={`sep-${idx}`} className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-border" />
                  <div className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1 text-[11px] text-muted-foreground whitespace-nowrap">
                    <Pin className="h-3 w-3 shrink-0" />
                    <span className="font-medium">{item.subject}</span>
                    <span className="opacity-60">·</span>
                    <span className="opacity-60">{item.date}</span>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>
              );
            }

            const msg = item.msg;
            const isMe = msg.sender_id === user?.id;
            const isSystem = isSystemMessage(msg);

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-1">
                  <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-3 py-1.5 max-w-[85%]">
                    <Info className="h-3 w-3 text-muted-foreground shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn("flex", isMe ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  {!isMe && (
                    <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                      {msg.sender_name}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p
                    className={cn(
                      "text-[10px] mt-0.5 text-right",
                      isMe ? "text-primary-foreground/60" : "text-muted-foreground/60"
                    )}
                  >
                    {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
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
        <div className="border-t p-2.5 flex gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={sending}
            className="text-sm"
          />
          <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
