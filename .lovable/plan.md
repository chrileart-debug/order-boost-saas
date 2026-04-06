

## Plano: Reformular Planos (Free/Essential/Pro) e Sidebar por Plano

### Resumo
Atualizar limites, features dos cards, e restringir menus do sidebar conforme o plano do estabelecimento.

---

### 1. Resposta: URLs por Plano

**Plano Gratuito:**
- `/dashboard` (Painel)
- `/dashboard/drivers` (Motoristas)
- `/dashboard/subscription` (Assinatura)
- `/dashboard/settings` (Configurações)

**Plano Essential (tudo do Gratuito +):**
- `/dashboard/orders` (Pedidos)
- `/dashboard/products` (Produtos)
- `/dashboard/logistics` (Logística)
- `/dashboard/coupons` (Cupons)

**Plano Pro (tudo do Essential, com limites maiores)**
- Mesmas URLs do Essential, sem restrições adicionais de rota.

---

### 2. Atualizar `src/lib/planLimits.ts`

Novos limites conforme especificado:

```text
free:
  maxProducts: 0, maxCombos: 0, maxCategories: 0
  maxModifierGroups: 0, maxCoupons: 0
  allowMenu: false, allowOrders: false, allowLogistics: false, allowCoupons: false

essential:
  maxProducts: 10, maxCombos: 5, maxCategories: 5
  maxModifierGroups: 10, maxCoupons: 2
  allowMenu: true, allowOrders: true, allowLogistics: true, allowCoupons: true

pro:
  maxProducts: 30, maxCombos: 30, maxCategories: 15
  maxModifierGroups: 20, maxCoupons: 10
  allowMenu: true, allowOrders: true, allowLogistics: true, allowCoupons: true
```

---

### 3. Sidebar filtrado por plano (`src/components/AppSidebar.tsx`)

- Ler `establishment.plan_name` do contexto.
- Itens restritos ao plano pago (Essential+): Pedidos, Produtos, Logística, Cupons.
- Se `plan_name === "free"`, esconder esses 4 itens do menu.
- Manter: Painel, Motoristas, Assinatura, Configurações para todos.

---

### 4. Atualizar cards de planos em `SelectPlanPage.tsx`

Novas features por card:

**Gratuito:**
- Gestão de Motoristas
- Painel de Vagas e Turnos
- Configurações do Estabelecimento

**Essential (R$ 29,90/mês) -- com trial 7 dias:**
- Até 10 produtos (simples + combos)
- Até 5 combos
- Até 5 categorias
- Até 10 adicionais por item
- Até 2 cupons ativos
- Cardápio Digital ativo
- Gestão de Pedidos
- Suporte em horário comercial

**PRO (R$ 59,90/mês) -- com trial 7 dias:**
- Até 30 produtos
- Combos ilimitados (dentro do limite)
- Até 15 categorias
- Até 20 adicionais por item
- Até 10 cupons ativos
- Suporte VIP prioritário

---

### 5. Atualizar cards em `SubscriptionPage.tsx`

Alinhar as features listadas nos cards com os mesmos textos do `SelectPlanPage`.

---

### 6. Proteção de rotas pagas para plano Free

No `DashboardLayout` ou nas páginas individuais (`OrdersPage`, `ProductsPage`, `LogisticsPage`, `CouponsPage`): se `plan_name === "free"`, renderizar o componente `UpgradeBanner` existente em vez do conteúdo real.

---

### Arquivos Modificados
- `src/lib/planLimits.ts` -- novos campos de limite
- `src/components/AppSidebar.tsx` -- filtro de menu por plano
- `src/pages/auth/SelectPlanPage.tsx` -- features atualizadas
- `src/pages/dashboard/SubscriptionPage.tsx` -- features atualizadas
- `src/pages/dashboard/OrdersPage.tsx` -- guard UpgradeBanner
- `src/pages/dashboard/ProductsPage.tsx` -- guard UpgradeBanner
- `src/pages/dashboard/LogisticsPage.tsx` -- guard UpgradeBanner
- `src/pages/dashboard/CouponsPage.tsx` -- guard UpgradeBanner

