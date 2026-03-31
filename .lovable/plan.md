
Objetivo
- Tratar `establishments.plan_status` como cadeado definitivo do status.
- Permitir upgrade sem contaminar a assinatura ativa até o webhook confirmar.

Diagnóstico encontrado
- O problema principal não é mais o Asaas: os logs mostram que o checkout está sendo criado e o link está vindo corretamente.
- O estado se perde porque `create-asaas-checkout` ainda faz `upsert` em `subscriptions` com `status: "pending"` e `plan_type` do novo plano. Como existe unicidade por `establishment_id`, isso sobrescreve a assinatura confirmada.
- No frontend, `SubscriptionPage` mistura fontes de verdade (`establishment.plan_status` + `subscription.status/plan_type`) e ainda bloqueia qualquer clique quando `plan_status === "active"`, o que trava upgrade e favorece efeito “ioiô”.
- O refetch pós-retorno só acontece em `status=success`; em `cancel`, `expired` ou volta manual para a aba, a tela pode continuar com dados stale.
- O `asaas-webhook` ainda precisa proteger downgrade indevido: hoje eventos de inatividade podem derrubar o assinante sem validar se pertencem à assinatura ativa atual.

Plano de implementação

1. Edge Function `create-asaas-checkout`
- Ler `establishments` + `subscriptions` antes de qualquer write.
- Aplicar estas regras:
  - `active` + mesmo plano => retorna `alreadyActive`;
  - `active` + plano diferente/superior => permite upgrade;
  - nunca alterar `establishments.plan_status` nesta função;
  - nunca sobrescrever `subscriptions.status` para `pending` se a assinatura atual já estiver `active`.
- No fluxo de upgrade, gerar o novo checkout e atualizar apenas:
  - `current_checkout_url`
  - `current_checkout_id`
  - `checkout_expires_at`
- Manter `subscriptions` intacta durante upgrade, para preservar o plano confirmado até o webhook.
- Melhorar logs com: status atual, plano atual, plano solicitado e decisão tomada.

2. Webhook `asaas-webhook`
- Manter o webhook como único ponto autorizado a mudar `plan_status`.
- Em `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED`:
  - ativar `plan_status = "active"`
  - atualizar `subscriptions` com o plano confirmado
  - sincronizar `asaas_customer_id`, `asaas_subscription_id` e `next_billing_date`
- Em `PAYMENT_OVERDUE`:
  - marcar `overdue`
- Em `SUBSCRIPTION_DELETED` / `SUBSCRIPTION_INACTIVE`:
  - só degradar se o evento corresponder à assinatura ativa salva em `establishments.asaas_subscription_id`
  - ignorar evento órfão/cancelado de upgrade em aberto

3. Frontend `SubscriptionPage`
- Remover o bloqueio genérico que hoje impede checkout quando `plan_status === "active"`.
- Usar `establishment.plan_status` como fonte principal da tela:
  - se o banco diz `active`, a UI sempre mostra “Plano Ativo”
  - `subscription` fica só para detalhes do plano confirmado
- Manter a lógica visual:
  - plano atual => botão desabilitado “Plano Atual”
  - plano inferior => sem ação
  - plano superior => botão “Fazer Upgrade” com loading real
- Remover qualquer comportamento otimista que sugira “pendente” só por causa do clique.

4. Refetch pós-retorno do Asaas
- Forçar refetch de estabelecimento + assinatura + pagamentos ao voltar com:
  - `status=success`
  - `status=cancel`
  - `status=expired`
- Limpar a querystring só depois do refresh.
- Adicionar revalidação ao voltar foco/visibilidade da aba na página de assinatura, para cobrir o caso em que o usuário fecha ou abandona o checkout e retorna manualmente.

5. Validação final
- Essential ativo inicia upgrade para PRO e cancela: continua ativo no banco e na UI.
- Essential ativo inicia upgrade para PRO e paga: continua no plano antigo até o webhook; depois vira PRO.
- Usuário volta da aba do Asaas sem pagar: a página refaz a leitura do banco e mantém o estado real.
- Mesmo plano continua bloqueado; downgrade continua sem botão.

Detalhes técnicos
- Arquivos: `supabase/functions/create-asaas-checkout/index.ts`, `supabase/functions/asaas-webhook/index.ts`, `src/pages/dashboard/SubscriptionPage.tsx` e, se necessário para refetch global, `src/components/EstablishmentProvider.tsx`.
- Ponto crítico atual: o `upsert` de `subscriptions` com `status: "pending"` durante upgrade e a UI baseada parcialmente em `subscription.status/plan_type`.
- Para este ajuste, não vejo migração obrigatória: o problema está na regra de escrita e na prioridade errada entre banco, função e frontend.
