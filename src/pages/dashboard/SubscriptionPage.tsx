import { useEffect, useState } from "react";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Crown, Zap, Star } from "lucide-react";

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  next_billing_date: string | null;
}

const plans = [
  {
    id: "essential",
    name: "Essential",
    price: "49,90",
    icon: Zap,
    color: "primary",
    checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=a366933173f3455abddf02656ed7228f",
    features: [
      "Cardápio digital completo",
      "Gestão de pedidos em tempo real",
      "Cupons de desconto",
      "Notificações push",
      "Logística de entrega",
      "Suporte por e-mail",
    ],
  },
  {
    id: "pro",
    name: "PRO",
    price: "99,90",
    icon: Crown,
    color: "warning",
    checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=14d541e5eb6543aaa2ff7514f1fca373",
    popular: true,
    features: [
      "Tudo do Essential",
      "Combos e kits de oferta",
      "Promoções avançadas",
      "Relatórios e analytics",
      "Domínio personalizado",
      "Suporte prioritário via WhatsApp",
    ],
  },
];

const SubscriptionPage = () => {
  const { establishment, loading: estLoading } = useEstablishment();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSub = async () => {
      if (!establishment) return;
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("establishment_id", establishment.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setSubscription(data as Subscription | null);
      setLoading(false);
    };
    fetchSub();
  }, [establishment]);

  const handleCheckout = (plan: typeof plans[0]) => {
    if (!establishment) return;
    const url = `${plan.checkoutUrl}&external_reference=${establishment.id}`;
    window.open(url, "_blank");
  };

  if (estLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-[480px] rounded-2xl" />
          <Skeleton className="h-[480px] rounded-2xl" />
        </div>
      </div>
    );
  }

  const activePlan = subscription?.status === "active" ? subscription.plan_type : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Assinatura</h1>
        <p className="text-muted-foreground mt-1">Escolha o plano ideal para o seu negócio.</p>
      </div>

      {activePlan && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
          <Star className="w-5 h-5 text-primary" />
          <span className="text-sm text-foreground">
            Seu plano atual: <strong className="text-primary uppercase">{activePlan}</strong>
            {subscription?.next_billing_date && (
              <span className="text-muted-foreground ml-2">
                · Próxima cobrança: {new Date(subscription.next_billing_date).toLocaleDateString("pt-BR")}
              </span>
            )}
          </span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isActive = activePlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative border-2 rounded-2xl p-6 flex flex-col transition-all ${
                plan.popular
                  ? "border-primary shadow-lg shadow-primary/10"
                  : "border-border hover:border-primary/30"
              } ${isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold">
                  MAIS POPULAR
                </Badge>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  plan.popular ? "bg-primary/10" : "bg-muted"
                }`}>
                  <Icon className={`w-6 h-6 ${plan.popular ? "text-primary" : "text-foreground"}`} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                  {isActive && (
                    <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">
                      PLANO ATUAL
                    </Badge>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground">R$ {plan.price}</span>
                  <span className="text-muted-foreground text-sm">/mês</span>
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.popular ? "text-primary" : "text-success"}`} />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleCheckout(plan)}
                disabled={isActive}
                className={`w-full h-12 text-base font-semibold ${
                  plan.popular
                    ? ""
                    : "bg-foreground text-background hover:bg-foreground/90"
                }`}
                variant={plan.popular ? "default" : "default"}
              >
                {isActive ? "Plano ativo" : "Assinar agora"}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Pagamento seguro via Mercado Pago. Cancele a qualquer momento.
      </p>
    </div>
  );
};

export default SubscriptionPage;
