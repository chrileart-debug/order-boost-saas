import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Crown, Zap, Gift } from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Gratuito",
    price: "0",
    icon: Gift,
    popular: false,
    trial: false,
    features: [
      "Gestão de Motoristas",
      "Painel de Vagas e Turnos",
      "Configurações do Estabelecimento",
    ],
  },
  {
    id: "essential",
    name: "Essential",
    price: "29,90",
    icon: Zap,
    popular: false,
    trial: true,
    features: [
      "Até 10 produtos (simples + combos)",
      "Até 5 combos",
      "Até 5 categorias",
      "Até 10 adicionais por item",
      "Até 2 cupons ativos",
      "Cardápio Digital ativo",
      "Gestão de Pedidos",
      "Suporte em horário comercial",
    ],
  },
  {
    id: "pro",
    name: "PRO",
    price: "59,90",
    icon: Crown,
    popular: true,
    trial: true,
    features: [
      "Até 30 produtos",
      "Combos ilimitados (dentro do limite)",
      "Até 15 categorias",
      "Até 20 adicionais por item",
      "Até 10 cupons ativos",
      "Suporte VIP prioritário",
    ],
  },
];

const SelectPlanPage = () => {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <div className="container max-w-5xl mx-auto px-4 py-8 flex-1 flex flex-col">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao login
        </Link>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground">Escolha seu plano</h1>
          <p className="text-muted-foreground mt-2">
            Comece grátis ou teste os planos pagos por 7 dias sem compromisso.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto w-full">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-card rounded-2xl border p-8 flex flex-col transition-shadow hover:shadow-lg ${
                plan.popular
                  ? "border-primary shadow-md ring-2 ring-primary/20"
                  : "border-border shadow-sm"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1 rounded-full">
                  Popular
                </span>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <plan.icon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
              </div>

              <div className="mb-6">
                {plan.price === "0" ? (
                  <span className="text-3xl font-extrabold text-foreground">Grátis</span>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold text-foreground">R$ {plan.price}</span>
                    <span className="text-muted-foreground text-sm">/mês</span>
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button asChild size="lg" className="w-full" variant={plan.popular ? "default" : "outline"}>
                <Link to={`/auth/register?plan=${plan.id}`}>
                  {plan.trial ? "Começar 7 dias grátis" : "Começar grátis"}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelectPlanPage;
