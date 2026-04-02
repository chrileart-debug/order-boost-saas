

## Reestruturação: Remoção de LP, Novo Fluxo de Registro e Tabela de Roles

### Sobre o user_role — Decisão de Segurança

Armazenar roles diretamente na tabela `profiles` é um vetor de ataque conhecido (privilege escalation). Como a tabela `profiles` tem RLS permissiva para UPDATE pelo próprio usuário, um usuário malicioso poderia alterar seu `user_role` de `driver` para `owner` via API.

A solução segura é criar uma **tabela separada `user_roles`** com RLS restritiva + uma função `SECURITY DEFINER` para consultas. Isso atende perfeitamente ao seu caso de diferenciar `owner` e `driver` entre projetos.

---

### Migration (Banco de Dados)

```sql
-- 1. Tabela de roles separada (padrão seguro)
CREATE TYPE public.app_role AS ENUM ('owner', 'driver');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Apenas leitura para o próprio usuário
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Inserção apenas via service_role (triggers/edge functions)
-- Nenhuma policy de INSERT para authenticated = só backend insere

-- 2. Função segura para checar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Trigger para atribuir 'owner' automaticamente no signup
CREATE OR REPLACE FUNCTION public.assign_owner_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_assign_owner_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_owner_role();

-- 4. Coluna plan_name na establishments (se não existir)
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS plan_name text NOT NULL DEFAULT 'essential';
```

O trigger em `profiles` garante que todo novo usuário do EPRATO receba `role = 'owner'` automaticamente. Quando o projeto de Motoboys existir, ele usará um trigger diferente para atribuir `'driver'`.

---

### Arquivos Modificados

| Arquivo | Ação |
|---|---|
| `src/pages/Index.tsx` | **Deletar** |
| `src/App.tsx` | Rota `/` aponta para Login; adicionar `/auth/select-plan` e `/auth/register`; remover import Index |
| `src/pages/Login.tsx` | Remover link "Voltar" (agora é home); link de cadastro → `/auth/select-plan` |
| `src/pages/auth/SelectPlanPage.tsx` | **Novo** — Cards Essential (R$29,90) e PRO (R$59,90) com "Começar 7 dias grátis" |
| `src/pages/Signup.tsx` | Refatorar para `/auth/register?plan=X`; guardar plano em sessionStorage |
| `src/pages/Onboarding.tsx` | Em `saveStep1`, incluir `plan_name` e `plan_status: 'trialing'` no insert/update |
| `src/components/ProtectedRoute.tsx` | Redirect de não-autenticados para `/` (já funciona, apenas validar) |

### Fluxo do Usuário

```text
/ (Login)
  └─ "Cadastrar-se" → /auth/select-plan
       └─ Clica plano → /auth/register?plan=essential|pro
            └─ Cria conta → signup + trigger atribui role 'owner'
                 └─ /onboarding → cria establishment com plan_name + plan_status='trialing'
                      └─ /dashboard
```

### SelectPlanPage — Design

- Dois cards lado a lado (desktop) / empilhados (mobile)
- Essential: R$29,90/mês — features básicas
- PRO: R$59,90/mês — badge "Popular", features premium
- Botão: "Começar 7 dias grátis" → redireciona para `/auth/register?plan=X`
- Estilo iFood: fundo cinza claro, cards brancos, sombras suaves, botões na cor primária

### Detalhes Técnicos

- O plano escolhido é passado via query param e salvo em `sessionStorage` para sobreviver ao redirect pós-signup
- O trigger `set_trial_period` existente já define `trial_ends_at = NOW() + 7 days`
- A função `has_role()` poderá ser usada em RLS policies futuras para bloquear drivers do painel admin

