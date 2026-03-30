

## Plano: Formulário completo na criação rápida dentro do Combo

### Problema
O formulário de "Criar Produto" dentro do combo está simplificado — falta promoção, complementos vinculados e validação de preço promocional. Deveria ser idêntico ao formulário de produto simples.

### Implementação

**Arquivo: `src/pages/dashboard/ProductsPage.tsx`**

1. **Expandir o estado do `quickForm`** para incluir `is_promo` e `promo_price`:
   - `quickForm` passa a ter: `{ name, description, price, category_id, is_promo, promo_price }`

2. **Adicionar estado `quickLinkedGroupIds`** (`string[]`) para complementos vinculados ao produto criado rapidamente.

3. **Substituir o conteúdo do Sheet de criação rápida** (linhas ~891-921) pelo formulário completo:
   - ImageCropper (já existe)
   - Categoria (já existe)
   - Nome (já existe)
   - Descrição (já existe)
   - Preço (já existe)
   - **Adicionar**: Bloco "Ativar Promoção" com Switch + campo "Preço de Oferta" + validação (preço promo < preço original)
   - **Adicionar**: Seção "Complementos vinculados" com a mesma lista de checkboxes dos grupos existentes (`allGroups`)

4. **Atualizar `quickCreateProduct`** para:
   - Salvar `is_promo` e `promo_price` no insert do produto
   - Após criar o produto, inserir os registros em `product_modifiers` para os grupos selecionados em `quickLinkedGroupIds`

5. **Resetar os novos estados** no `openQuickCreate`: `is_promo: false`, `promo_price: ""`, `quickLinkedGroupIds: []`

### Resultado
Ao clicar "Criar" dentro do combo, abre um Sheet com exatamente as mesmas opções do formulário principal de produto simples (foto, categoria, nome, descrição, preço, promoção, complementos).

