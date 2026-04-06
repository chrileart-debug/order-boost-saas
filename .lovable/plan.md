

## Plano: Termo de Intermediação e Isenção de Responsabilidade

### Resumo
Adicionar camada de segurança jurídica: coluna no banco, modal obrigatório antes de acessar Motoristas/Logística, e página de consulta do termo.

---

### 1. Migração de Banco de Dados

Adicionar coluna `accepted_logistics_terms` (boolean, default false) na tabela `establishments`.

```sql
ALTER TABLE establishments
ADD COLUMN accepted_logistics_terms boolean NOT NULL DEFAULT false;
```

---

### 2. Componente `LogisticsTermsModal`

Novo arquivo: `src/components/LogisticsTermsModal.tsx`

- Dialog/AlertDialog inescapável (`onInteractOutside` bloqueado, sem botão X)
- Título: "Termo de Intermediação e Isenção de Responsabilidade"
- Exibe os 5 pontos do termo em lista numerada
- Botão único: "Li e concordo com os termos"
- Ao clicar: faz `update` em `establishments` setando `accepted_logistics_terms = true`, depois chama `refresh()` do EstablishmentProvider

---

### 3. Guard nas páginas DriversPage e LogisticsPage

Em ambas as páginas, no topo do render:
- Ler `establishment.accepted_logistics_terms` do contexto
- Se `false` ou `undefined`: renderizar o `LogisticsTermsModal` aberto + conteúdo com blur/overlay bloqueando interação
- Se `true`: renderizar normalmente

---

### 4. Página "Termos e Responsabilidades"

Novo arquivo: `src/pages/dashboard/TermsPage.tsx`
- Exibe o texto completo do termo de forma estática e organizada (Card com lista numerada)
- Apenas leitura, sem ações

---

### 5. Sidebar e Rotas

**AppSidebar.tsx**: Adicionar item "Termos" com ícone `FileText` (ou `ScrollText`) antes de "Configurações", visível para todos os planos.

**App.tsx**: Adicionar rota `/dashboard/terms` → `TermsPage` dentro do layout do dashboard.

---

### Arquivos Modificados
- **Migração SQL**: nova coluna `accepted_logistics_terms`
- `src/components/LogisticsTermsModal.tsx` — novo componente
- `src/pages/dashboard/TermsPage.tsx` — nova página
- `src/pages/dashboard/DriversPage.tsx` — guard com modal + blur
- `src/pages/dashboard/LogisticsPage.tsx` — guard com modal + blur
- `src/components/AppSidebar.tsx` — novo item "Termos"
- `src/App.tsx` — nova rota `/dashboard/terms`

