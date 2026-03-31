
Diagnóstico encontrado:

- O erro atual não é no salvamento do banco; ele acontece antes. Nos logs da Edge Function aparece:
  `Asaas checkout creation error: {"errors":[{"code":"invalid_object","description":"O campo cancelUrl deve ser informado."}]}`
- Ou seja: o Asaas está rejeitando o payload do `/v3/checkouts`, então a função retorna `502` antes de executar o `update` em `establishments`.
- Também há um detalhe de rota: hoje o callback usa `/dashboard/assinatura`, mas a aplicação só possui a rota `/dashboard/subscription`.
- Existe ainda um risco no código atual: ele salva `checkoutData.url || ""`. Se o Asaas responder sem `url`, o banco pode acabar com string vazia, que foi exatamente o sintoma observado em um registro.

Plano de correção:

1. Ajustar o payload do `create-asaas-checkout`
- Manter o endpoint `POST /v3/checkouts`
- Manter `billingTypes: ["CREDIT_CARD"]`
- Manter `chargeTypes: ["RECURRENT"]`
- Completar o objeto `callback` com:
  - `successUrl`
  - `cancelUrl`
  - opcionalmente `expiredUrl`
- Usar URLs válidas do app, por exemplo:
  - `/dashboard/subscription?status=success`
  - `/dashboard/subscription?status=cancel`
  - `/dashboard/subscription?status=expired`

2. Corrigir a extração e persistência da URL
- Ler a resposta completa do Asaas
- Extrair `checkoutData.url`
- Fazer log explícito do valor recebido
- Validar que a URL existe antes de salvar
- Se vier vazia/undefined, retornar erro controlado e não gravar `""` no banco

3. Fortalecer o update no banco
- Atualizar `current_checkout_url`, `checkout_expires_at` e `current_checkout_id` somente após checkout válido
- Verificar erro do `update` no Supabase e logar caso falhe
- Evitar persistir estado parcial

4. Ajustar a lógica de reuso
- Reutilizar checkout apenas se:
  - `current_checkout_url` existir de verdade
  - `checkout_expires_at` ainda estiver no futuro
- Ignorar registros antigos com URL vazia

5. Corrigir a experiência do frontend
- Manter `window.location.href = data.checkoutUrl`
- Opcionalmente, ler o `status` da query string em `SubscriptionPage` para exibir feedback quando o usuário voltar do Asaas

6. Validação final
- Testar novo clique em “Assinar agora”
- Confirmar nos logs que o Asaas respondeu sem erro
- Confirmar no banco que `current_checkout_url` foi preenchido
- Confirmar que o retorno do checkout usa a rota correta `/dashboard/subscription`

Detalhes técnicos:
- Arquivo principal: `supabase/functions/create-asaas-checkout/index.ts`
- Ajuste complementar: `src/pages/dashboard/SubscriptionPage.tsx`
- Evidência principal do problema: ausência de `callback.cancelUrl`
- Problema secundário: rota hardcoded incorreta (`/dashboard/assinatura`)
