

## Diagnóstico

O erro `expected valid PKCS#8 data` ocorre porque a função `buildVapidJwt` tenta importar a chave privada VAPID como formato **PKCS#8**, mas chaves VAPID padrão geradas por bibliotecas como `web-push` são chaves brutas de 32 bytes em **base64url** — não PKCS#8.

Existem duas soluções possíveis:

---

## Abordagem recomendada: Corrigir o código da Edge Function

Em vez de exigir uma chave PKCS#8 (que é complexa de gerar e gerenciar), o código deve ser atualizado para importar a chave privada VAPID como **JWK** (JSON Web Key), que é compatível com chaves brutas de 32 bytes.

### Mudança no arquivo `supabase/functions/send-push-notification/index.ts`

Substituir o bloco `buildVapidJwt` (linhas 160-167) que faz `importKey("pkcs8", ...)` por uma conversão da chave bruta de 32 bytes para formato JWK:

```typescript
const rawKey = base64urlDecode(privateKeyB64);

// Convert raw 32-byte private key to JWK format
const jwk = {
  kty: "EC",
  crv: "P-256",
  d: base64urlEncode(rawKey),
  x: "", // will be filled from public key
  y: "",
};

// Extract x, y from the VAPID public key (uncompressed 65-byte format)
const vapidPubBytes = base64urlDecode(Deno.env.get("VAPID_PUBLIC_KEY")!);
jwk.x = base64urlEncode(vapidPubBytes.slice(1, 33));
jwk.y = base64urlEncode(vapidPubBytes.slice(33, 65));

const key = await crypto.subtle.importKey(
  "jwk",
  jwk,
  { name: "ECDSA", namedCurve: "P-256" },
  false,
  ["sign"]
);
```

### O que NÃO muda
- A `VAPID_PUBLIC_KEY` no front-end permanece a mesma
- O secret `VAPID_PRIVATE_KEY` no Supabase precisa ser a chave privada bruta de 32 bytes correspondente, em base64url (formato padrão gerado por `web-push generate-vapid-keys`)

### Ação do usuário
Você precisará garantir que o valor do secret `VAPID_PRIVATE_KEY` no Supabase corresponda ao par da chave pública `BJJouD_IMsDJ3tPMtfKYnfnVUOtFdQD5Fx2SoG0mHxIFI-7ztyyFNQAViB0zO53GbKveyu3zDBh8ogFFyOOz1z8`. Se você gerou o par de chaves com `npx web-push generate-vapid-keys`, use a chave privada gerada junto. Caso contrário, será necessário gerar um novo par.

### Após o deploy
- Testar com `supabase--curl_edge_functions` para confirmar que o erro PKCS#8 desapareceu
- Verificar nos logs se as notificações são enviadas com status 201

