

## Plano: Segurança por Header + Mapeamento robusto do Webhook Asaas

### O que muda

**1. Validação de token no header**
- Logo após o check de método POST, ler `req.headers.get("asaas-access-token")`
- Comparar com `Deno.env.get("ASAAS_WEBHOOK_TOKEN")`
- Se não bater, retornar 401 Unauthorized imediatamente

**2. Mapeamento de externalReference simplificado**
- Usar a ordem pedida: `body.payment?.externalReference || body.subscription?.externalReference || body.externalReference`
- Remover `body.checkout?.externalReference` (desnecessário)

**3. Log de validação**
- Adicionar `console.log("Webhook validado para o restaurante:", establishmentId)` após identificar o ID

**4. Lógica de eventos (sem mudança estrutural)**
- PAYMENT_CONFIRMED / PAYMENT_RECEIVED → status `active` (já implementado)
- PAYMENT_OVERDUE → status `overdue` (já implementado)
- SUBSCRIPTION_DELETED / SUBSCRIPTION_INACTIVE → status `inactive` (mantido)

### Arquivo editado
- `supabase/functions/asaas-webhook/index.ts`

### Detalhes técnicos

Bloco de validação inserido após linha 19:

```typescript
const webhookToken = req.headers.get("asaas-access-token");
const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

if (!expectedToken || webhookToken !== expectedToken) {
  console.error("Webhook token inválido ou ausente");
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: corsHeaders,
  });
}
```

ExternalReference atualizado para:
```typescript
const externalReference =
  payment?.externalReference ||
  subData?.externalReference ||
  body.externalReference;
```

Após deploy, a função será testada com `supabase--curl_edge_functions` para confirmar que rejeita requests sem token.

