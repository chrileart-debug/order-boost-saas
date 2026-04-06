

## Plano: Sheet de Detalhes da Vaga (read-only / editável para rascunho)

### Problema
Atualmente, clicar em uma vaga que não é rascunho mostra um toast de erro "Edição bloqueada". Vagas publicadas (open, contracted, ending, completed) não mostram nenhuma informação ao clicar. O lojista não consegue visualizar os detalhes de suas vagas.

### Solução
Ao clicar em qualquer card de vaga, abrir um Sheet (direita para esquerda) com os detalhes da vaga. Se o status for `draft`, mostrar o formulário de edição existente. Se for qualquer outro status, mostrar uma visualização read-only com todas as informações formatadas.

### Implementação

**Arquivo: `src/pages/dashboard/DriversPage.tsx`**

1. **Novo state**: Adicionar `viewingJob` (Job | null) para controlar o Sheet de visualização read-only.

2. **Modificar `openJobSheet`**: Remover o toast de erro. Se o job for draft, abrir o sheet de edição (comportamento atual). Se não for draft, setar `viewingJob` com os dados do job.

3. **Tornar todos os cards clicáveis**: Remover a condição `j.status === "draft"` do `onClick` e do `cursor-pointer`. Todos os cards terão `cursor-pointer` e chamarão `openJobSheet(j)`.

4. **Novo Sheet read-only**: Adicionar um Sheet controlado por `viewingJob` que exibe:
   - Título da vaga
   - Badge de status
   - Tipo de veículo (ícone + label)
   - Turno (Integral/Meio Período/Noturno)
   - Horário (início – fim)
   - Data
   - Tipo de contratação (Freelancer/Fixo)
   - Tipo e valor do pagamento (R$ X.XX)
   - Bônus (se houver)
   - Extensão (se houver)
   - Layout clean com `bg-muted/50 rounded-lg` consistente com os outros Sheets

### Detalhes Técnicos
- Reutilizar helpers existentes: `jobStatusLabel`, `jobStatusVariant`, `vehicleIcon`, `vehicleLabel`, `formatTime`
- O Sheet read-only não terá botões de salvar/publicar
- A lógica do `openJobSheet` será bifurcada: draft → sheet de edição, outros → sheet de visualização

