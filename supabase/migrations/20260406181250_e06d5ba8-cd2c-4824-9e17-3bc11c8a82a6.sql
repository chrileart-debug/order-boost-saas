
-- Create FAQ table
CREATE TABLE public.faq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read FAQs
CREATE POLICY "Anyone can view faq_items"
  ON public.faq_items FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only support admin can manage
CREATE POLICY "Admin can manage faq_items"
  ON public.faq_items FOR ALL
  TO authenticated
  USING (is_support_admin())
  WITH CHECK (is_support_admin());

-- Seed initial data
INSERT INTO public.faq_items (question, answer, category) VALUES
  ('Como cadastro um novo produto?', 'Acesse o menu "Produtos", clique em "Adicionar Produto", preencha nome, descrição, preço e imagem, depois clique em "Salvar".', 'Produtos'),
  ('Posso criar combos com meus produtos?', 'Sim! Ao editar um produto, você pode vincular outros itens como "combo". O cliente verá o combo com preço especial no cardápio.', 'Produtos'),
  ('Como edito ou excluo um produto?', 'Na lista de produtos, clique no ícone de edição (lápis) para alterar ou no ícone de lixeira para excluir. A alteração é refletida imediatamente no cardápio.', 'Produtos'),
  ('Como configuro o frete da minha loja?', 'Acesse "Logística" no menu lateral. Lá você pode definir zonas de entrega por distância (km) ou faixa de CEP, com valores personalizados para cada zona.', 'Frete'),
  ('Posso oferecer frete grátis?', 'Sim! Basta criar uma regra de entrega com valor R$ 0,00. Você pode limitar por distância ou faixa de CEP específica.', 'Frete'),
  ('Como crio um cupom de desconto?', 'Acesse "Cupons" no menu lateral, clique em "Novo Cupom", defina o código, tipo (porcentagem ou valor fixo), valor e pedido mínimo. Ative-o e compartilhe com seus clientes.', 'Cupons'),
  ('Quantos cupons posso ter ativos?', 'O limite depende do seu plano: Essential permite até 5 cupons ativos e Pro permite até 10 cupons ativos simultaneamente.', 'Cupons'),
  ('Como altero meu plano ou assinatura?', 'Acesse "Assinatura" no menu lateral. Lá você verá seu plano atual e poderá fazer upgrade ou gerenciar seu método de pagamento.', 'Financeiro'),
  ('O que acontece quando meu período de teste acaba?', 'Após o trial de 7 dias, seu cardápio digital continua funcionando no plano Gratuito com funcionalidades limitadas. Para desbloquear todos os recursos, assine o plano Essential ou Pro.', 'Financeiro');
