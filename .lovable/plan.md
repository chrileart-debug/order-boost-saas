

## Plano: Padronizar UI com Drawers e Ajustar Frotas Ativas

### Contexto
A página DriversPage usa Dialogs (modais centrais). O pedido é migrar tudo para Drawers (slide-over da direita), adicionar FAB para criação de vagas, permitir edição de vagas, mostrar motoristas com status "contracted" na frota, e exibir avaliações/comentários de outros estabelecimentos no perfil do motorista.

### Alterações

#### 1. Migrar todos os modais para Sheet/Drawer (slide-over direita)
- Substituir os dois `Dialog` existentes (perfil do motorista interessado e criação de vaga) por componentes `Sheet` com `side="right"`
- Usar animação suave nativa do Sheet (já configurada com slide-in/out)

#### 2. Aba Minha Frota - Motoristas ativos em tempo real
- Atualizar `fetchFleet` para também buscar motoristas cujas `job_applications` tenham `status = 'contracted'` nas vagas do estabelecimento, além dos que já estão em `fleet_history`
- Unificar a listagem removendo duplicatas por `driver_id`
- Ao clicar em um motorista da frota, abrir um Sheet com perfil completo contendo:
  - Foto grande, veículo, bag, CNH
  - Sub-abas internas (Tabs): **Avaliações** e **Comentários**
  - Buscar dados da tabela `establishment_reviews` filtrando por `driver_id` para exibir rating médio (gráfico de barras simples com distribuição 1-5 estrelas) e comentários de outros estabelecimentos

#### 3. Aba Minhas Vagas - FAB e Edição
- Remover o botão "Nova Vaga" do topo
- Adicionar FAB (botão redondo flutuante) no canto inferior direito com ícone `+`
- FAB abre o Sheet de criação de vaga
- Tornar os cards de vagas clicáveis para abrir o mesmo Sheet em modo edição (preencher formulário com dados existentes, salvar com `update` ao invés de `insert`)

#### 4. Perfil do Motorista na Frota (Sheet completo)
- Criar estado para `selectedFleetMember`
- Sheet com:
  - Avatar grande (h-24 w-24)
  - Nome, veículo, bag, entregas
  - Tabs internas: "Avaliações" com gráfico de barras de distribuição de notas e média, "Comentários" listando `establishment_reviews.comment` com nome do estabelecimento e data

### Detalhes Técnicos

**Arquivo modificado:** `src/pages/dashboard/DriversPage.tsx`

**Novos imports:** `Sheet, SheetContent, SheetHeader, SheetTitle` de `@/components/ui/sheet`

**Novos estados:**
- `selectedFleetMember: FleetMember | null`
- `editingJob: Job | null` (para modo edição)
- `reviews: Review[]` (avaliações do motorista selecionado)

**Query de avaliações:**
```sql
SELECT er.rating, er.comment, er.created_at, e.name as establishment_name
FROM establishment_reviews er
JOIN establishments e ON e.id = er.establishment_id
WHERE er.driver_id = :driver_id
```

**Query ampliada de frota:** Além de `fleet_history`, buscar `job_applications` com `status = 'contracted'` nas vagas do estabelecimento e unir os dois conjuntos.

**FAB CSS:** `fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg`

**Edição de vaga:** Reutilizar o formulário do Sheet, populando `jobForm` com os dados da vaga selecionada. Ao salvar, usar `.update()` se `editingJob` existir, `.insert()` caso contrário.

