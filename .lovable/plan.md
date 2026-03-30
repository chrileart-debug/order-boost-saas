

## Plano: Badge "COMBO" na lista de produtos do Admin

### Problema
Na lista de produtos do dashboard, não há indicação visual de quais produtos são combos e quais são simples.

### Solução
Adicionar um badge "COMBO" nos cards de produto, similar ao badge "OFERTA" já existente, identificando automaticamente os produtos que possuem registros na tabela `combo_items`.

### Implementação

**Arquivo: `src/pages/dashboard/ProductsPage.tsx`**

1. **Novo estado** para armazenar IDs de produtos que são combos:
   - `const [comboProductIds, setComboProductIds] = useState<Set<string>>(new Set())`

2. **Fetch dos combos** junto com o carregamento de produtos (na função `fetchAll`):
   - Consultar `combo_items` filtrando pelos IDs dos produtos carregados
   - Extrair os `parent_product_id` distintos e salvar no `Set`

3. **Badge visual** no card de produto (ao lado do badge OFERTA já existente):
   - Exibir `<Badge className="... bg-primary">COMBO</Badge>` sobre a imagem quando `comboProductIds.has(prod.id)`
   - Posicionar abaixo do badge OFERTA quando ambos existirem (OFERTA top-left, COMBO bottom-left)

4. **Atualizar o Set** quando um produto combo for criado, editado ou deletado para manter a lista sincronizada.

