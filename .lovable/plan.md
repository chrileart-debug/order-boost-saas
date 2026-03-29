

## Correções Definitivas: PWA, Push e Navegação

### 1. Fix start_url + Redirecionamento Standalone

**`src/lib/dynamicManifest.ts`** — Adicionar `?source=pwa` ao `start_url`:
```
start_url: getPublicStorePath(establishment.slug) + '?source=pwa'
```

**`src/pages/OrderTrackingPage.tsx`** — Adicionar `useEffect` que detecta modo standalone e redireciona para o cardápio:
```typescript
useEffect(() => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isOrderPage = window.location.pathname.startsWith('/pedido/');
  if (isStandalone && isOrderPage && establishment?.slug) {
    // Redireciona para o cardápio da loja após carregar dados
    navigate(`/${establishment.slug}`);
  }
}, [establishment]);
```
Nota: o redirecionamento só ocorre na **abertura fria** do PWA (quando o Android abre o app na URL do pedido antigo). Se o usuário navegar manualmente para `/pedido/x`, não redireciona (verificar via `sessionStorage` flag).

### 2. Modal de Push no MenuPage (Standalone)

**`src/pages/MenuPage.tsx`**:
- Importar `PushConsentModal` e `shouldShowPushConsent`
- Adicionar estado `pushModalOpen`
- No `useEffect` de carregamento, após dados do establishment: se `isStandalone()` e `shouldShowPushConsent()`, abrir modal com delay de 3s
- Adicionar botão fixo "Ativar Notificações" no footer do cardápio (visível apenas em standalone e quando `Notification.permission !== 'granted'`), que abre o modal manualmente
- O botão usa ícone `Bell` e texto discreto

### 3. Deduplicação de Push na Edge Function

**`supabase/functions/send-push-notification/index.ts`**:
- Antes do loop `for (const sub of subs)`, filtrar endpoints duplicados:
```typescript
const uniqueSubs = [...new Map((subs || []).map(s => [s.endpoint, s])).values()];
```
- Usar `uniqueSubs` no loop em vez de `subs`

### 4. Botão Manual de Instalação PWA

**`src/pages/MenuPage.tsx`**:
- Adicionar botão "Adicionar à Tela Inicial" no header/info da loja (abaixo do banner existente)
- Visível quando `canInstall` é true OU quando o app NÃO está standalone
- Se `canInstall` e não iOS: chamar `install()`
- Se iOS ou prompt indisponível: abrir Dialog com instruções visuais ("Toque no ícone de compartilhar → Adicionar à Tela de Início")
- O `MenuInstallBanner` existente continua funcionando como smart banner no primeiro acesso; o botão manual fica sempre acessível na seção de info da loja

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/lib/dynamicManifest.ts` | `?source=pwa` no start_url |
| `src/pages/OrderTrackingPage.tsx` | Redirect standalone + flag de sessão |
| `src/pages/MenuPage.tsx` | Modal push em standalone + botão manual notificações + botão manual instalar |
| `supabase/functions/send-push-notification/index.ts` | Dedup por endpoint |
| `src/components/pwa/PushConsentModal.tsx` | Sem mudanças (já funcional) |

