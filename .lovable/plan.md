

## Limpeza Atômica: Remoção Total de Push + Fix Banner PWA

### 1. Excluir arquivos de Push

| Arquivo | Ação |
|---|---|
| `supabase/functions/send-push-notification/index.ts` | Deletar pasta inteira |
| `src/lib/pushSubscription.ts` | Deletar |
| `src/components/pwa/PushConsentModal.tsx` | Deletar |
| `src/components/pwa/CustomerPushPrompt.tsx` | Deletar |
| `src/components/settings/PushNotificationSettings.tsx` | Deletar |

### 2. Limpar Service Worker (`public/sw-push.js`)

Remover os listeners `push` e `notificationclick`. Manter apenas um arquivo vazio ou com um comentário de placeholder (necessário para o registro do PWA continuar funcionando).

### 3. Limpar `MenuPage.tsx`

- Remover imports: `PushConsentModal`, `shouldShowPushConsent`, `Bell`
- Remover estado `pushModalOpen`, `iosInstructionsOpen`
- Remover variáveis `isStandalone`, `showNotifButton`
- Remover o bloco "Manual install button" (linhas 187-205) — o botão "Adicionar à Tela Inicial"
- Remover o bloco "Manual notification button" (linhas 207-220) — botão "Ativar Notificações"
- Remover o bloco `PushConsentModal` (linhas 376-386)
- Remover o `Dialog` de instruções iOS (linhas 388-404)
- Manter apenas o `MenuInstallBanner` como único elemento de instalação PWA
- Remover imports não usados: `Download`, `Share`, `Dialog*`, `usePwaInstall`

### 4. Limpar `OrderTrackingPage.tsx`

- Remover import de `PushConsentModal` e `shouldShowPushConsent`
- Remover estado `pushModalOpen`
- Remover o bloco de `shouldShowPushConsent()` e `setTimeout` (linhas 60-62)
- Remover o componente `PushConsentModal` do JSX (linhas 217-227)

### 5. Limpar `SettingsPage.tsx`

- Remover import de `PushNotificationSettings` (linha 17)
- Remover estado `pushNotifyStatuses` e seu uso no `useEffect`
- Remover `push_notify_statuses` do payload de save
- Remover o bloco JSX que renderiza `<PushNotificationSettings>` (linhas 260-267)

### 6. Atualizar `MenuInstallBanner` — não renderizar em standalone

No componente `MenuInstallBanner.tsx`, adicionar verificação no início:

```typescript
const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
  || (navigator as any).standalone === true;

if (!canInstall || dismissed || isStandalone) return null;
```

Isso garante que o banner nunca aparece se o app já foi instalado.

### Detalhes técnicos

- A remoção do `push_notify_statuses` do payload de save em `SettingsPage` é segura — a coluna no banco continuará existindo mas não será mais usada pelo front-end.
- O `sw-push.js` será mantido como arquivo vazio/mínimo para não quebrar o registro do SW existente.
- A Edge Function será deletada do código; se houver deploy ativo, será necessário removê-la via `supabase--delete_edge_functions`.

