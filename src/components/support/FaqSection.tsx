import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, HelpCircle } from "lucide-react";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export default function FaqSection() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("faq_items")
      .select("id, question, answer, category")
      .order("category")
      .then(({ data }) => setItems((data as FaqItem[]) ?? []));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.question.toLowerCase().includes(q) ||
        i.answer.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }, [items, search]);

  const grouped = useMemo(() => {
    const map: Record<string, FaqItem[]> = {};
    filtered.forEach((i) => {
      if (!map[i.category]) map[i.category] = [];
      map[i.category].push(i);
    });
    return map;
  }, [filtered]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-primary shrink-0" />
        <h2 className="text-lg font-semibold text-foreground">Dúvidas Comuns</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar dúvida..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Não encontrou o que procurava? Selecione um assunto acima para falar com nosso suporte.
        </p>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {cat}
            </p>
            <Accordion type="single" collapsible className="border rounded-lg">
              {catItems.map((item) => (
                <AccordionItem key={item.id} value={item.id} className="px-4">
                  <AccordionTrigger className="text-sm text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))
      )}
    </div>
  );
}
