import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Crown, Zap, Loader2, CreditCard, Receipt, XCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  next_billing_date: string | null;
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  gateway_transaction_id: string | null;
}

const plans = [
  {
    id: "essential",
    name: "Essential",
    price: "29,90",
    value: 29.9,
    tier: 1,
    icon: Zap,
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
    price: "49,90",
    value: 49.9,
    tier: 2,
    icon: Crown,
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
  const { establishment, loading: estLoading, refresh: refreshEstablishment } = useEstablishment();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchSubscriptionData = useCallback(async () => {
    if (!establishment) return;
    const [subRes, payRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("*")
        .eq("establishment_id", establishment.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("*")
        .eq("establishment_id", establishment.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setSubscription(subRes.data as Subscription | null);
    setPayments((payRes.data as Payment[]) || []);
    setLoading(false);
  }, [establishment]);

  // Handle return from Asaas checkout (all statuses)
  useEffect(() => {
    const status = searchParams.get("status");
    if (status) {
      // Always refresh on ANY return status
      refreshEstablishment();
      fetchSubscriptionData();
      setSearchParams({}, { replace: true });
      if (status === "success") {
        toast.success("Pagamento processado! Seu plano será ativado em instantes.");
      }
    }
  }, [searchParams, refreshEstablishment, setSearchParams, fetchSubscriptionData]);

  // Refetch on tab/window focus
  useEffect(() => {
    const onFocus = () => {
      refreshEstablishment();
      fetchSubscriptionData();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onFocus();
    });
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refreshEstablishment, fetchSubscriptionData]);

  // Initial fetch
  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const handleCheckout = async (plan: (typeof plans)[0]) => {
    if (!establishment?.id) {
      toast.error("Estabelecimento inválido.");
      return;
    }
    setCheckoutLoading(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-asaas-checkout", {
        body: { establishmentId: establishment.id, planType: plan.id, originUrl: window.location.origin },
      });
      if (error) {
        toast.error("Erro ao gerar link de pagamento.");
        return;
      }
      const payload = typeof data === "string" ? JSON.parse(data) : data;
      if (payload?.alreadyActive) {
        toast.info("Você já possui este plano ativo!");
        await refreshEstablishment();
        return;
      }
      if (payload?.checkoutUrl) {
        window.location.href = payload.checkoutUrl;
      } else {
        toast.error("Link de pagamento não disponível.");
      }
    } catch {
      toast.error("Erro inesperado.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  // SOURCE OF TRUTH: establishment.plan_status from the database
  const isActive = establishment?.plan_status === "active";
  // For plan details, use the confirmed subscription (only when active)
  const activePlan = isActive ? (subscription?.plan_type || "essential") : null;

  const nextBillingDate = subscription?.next_billing_date
    ? new Date(subscription.next_billing_date)
    : subscription?.created_at
      ? new Date(new Date(subscription.created_at).getTime() + 30 * 24 * 60 * 60 * 1000)
      : null;

  if (estLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 px-4 py-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-[100px] rounded-xl" />
        <Skeleton className="h-[60px] rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-[280px] rounded-xl" />
          <Skeleton className="h-[280px] rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Plan cards ──
  const renderPlanCards = () => (
    <div className="grid gap-4 sm:grid-cols-2">
      {plans.map((plan) => {
        const Icon = plan.icon;
        const currentTier = plans.find((p) => p.id === activePlan)?.tier ?? 0;
        const isCurrent = activePlan === plan.id;
        const isUpgrade = isActive && !isCurrent && plan.tier > currentTier;
        const isDowngrade = isActive && !isCurrent && plan.tier < currentTier;

        return (
          <Card
            key={plan.id}
            className={`relative transition-all ${
              isCurrent
                ? "border-primary ring-2 ring-primary/20 shadow-md"
                : plan.popular
                  ? "border-primary/40 shadow-sm"
                  : "border-border"
            }`}
          >
            {isCurrent && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] px-3 border-0">
                SEU PLANO
              </Badge>
            )}
            {!isCurrent && plan.popular && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-3 border-0">
                MAIS POPULAR
              </Badge>
            )}
            <CardHeader className="pb-3 pt-5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isCurrent ? "bg-emerald-500/10" : plan.popular ? "bg-primary/10" : "bg-muted"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isCurrent ? "text-emerald-600" : plan.popular ? "text-primary" : "text-foreground"}`} />
                </div>
                <div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-extrabold text-foreground">R$ {plan.price}</span>
                    <span className="text-muted-foreground text-xs">/mês</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button disabled className="w-full h-11 font-semibold" variant="outline">
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Plano Atual
                </Button>
              ) : isDowngrade ? (
                <p className="text-center text-xs text-muted-foreground py-2">Plano inferior ao atual</p>
              ) : isUpgrade ? (
                <Button
                  onClick={() => handleCheckout(plan)}
                  disabled={checkoutLoading === plan.id}
                  className="w-full h-11 font-semibold"
                >
                  {checkoutLoading === plan.id ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando link...</>
                  ) : (
                    `Fazer Upgrade para ${plan.name}`
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => handleCheckout(plan)}
                  disabled={checkoutLoading === plan.id}
                  className="w-full h-11 font-semibold"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {checkoutLoading === plan.id ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando link...</>
                  ) : (
                    "Assinar agora"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  // ── No active plan ──
  if (!isActive) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 px-4 py-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assinatura</h1>
          <p className="text-muted-foreground text-sm mt-1">Escolha o plano ideal para o seu negócio.</p>
        </div>
        {renderPlanCards()}
        <p className="text-center text-xs text-muted-foreground">
          Pagamento seguro via Asaas. Cancele a qualquer momento.
        </p>
      </div>
    );
  }

  // ── Active plan — Tabs ──
  return (
    <div className="max-w-2xl mx-auto space-y-5 px-4 py-2">
      <h1 className="text-2xl font-bold text-foreground">Assinatura</h1>

      <Tabs defaultValue="plan" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="plan">Minha Assinatura</TabsTrigger>
          <TabsTrigger value="history">Histórico de Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-5 mt-4">
          <Card className="bg-card">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Def = plans.find((p) => p.id === activePlan);
                    return Def ? (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Def.icon className="w-5 h-5 text-primary" />
                      </div>
                    ) : null;
                  })()}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Plano atual</p>
                    <p className="text-lg font-bold text-foreground capitalize">{activePlan}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15">
                  Ativo
                </Badge>
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Valor mensal</span>
                  <span className="font-semibold text-foreground">
                    R$ {activePlan === "pro" ? "49,90" : "29,90"}
                  </span>
                </div>
                {nextBillingDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Próxima cobrança</span>
                    <span className="font-medium text-foreground">
                      {nextBillingDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Método de pagamento</p>
                  <p className="text-sm font-medium text-foreground">Cartão de crédito •••• 7667</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                Alterar
              </Button>
            </CardContent>
          </Card>

          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Planos disponíveis</p>
            {renderPlanCards()}
          </div>

          <div className="pt-1 text-center">
            <Button variant="ghost" className="text-muted-foreground text-xs hover:text-destructive">
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Cancelar assinatura
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {payments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Receipt className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma fatura encontrada.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {new Date(p.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        R$ {p.amount.toFixed(2).replace(".", ",")} · Cartão •••• 7667
                      </p>
                    </div>
                    <Badge
                      className={
                        p.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {p.status === "approved" ? "Pago" : p.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SubscriptionPage;
