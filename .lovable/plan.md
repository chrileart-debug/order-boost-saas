

## Plano: Centro de Suporte EPRATO (Chat em Tempo Real)

### Resumo
Criar sistema de suporte com chat em tempo real via Supabase Realtime, permitindo lojistas abrirem chamados por assunto e o admin (chrileart@gmail.com) gerenciar todos os chamados.

---

### 1. Banco de Dados (2 tabelas + migração)

**Tabela `support_tickets`:**
- `id` uuid PK
- `establishment_id` uuid NOT NULL
- `establishment_name` text NOT NULL
- `plan_name` text NOT NULL
- `subject` text NOT NULL (Produtos, Adicionais, Problemas Técnicos, Pagamentos, Outros)
- `status` text DEFAULT 'open' (open, closed)
- `created_at` timestamptz DEFAULT now()
- `updated_at` timestamptz DEFAULT now()

**Tabela `support_messages`:**
- `id` uuid PK
- `ticket_id` uuid NOT NULL
- `sender_id` uuid NOT NULL
- `sender_name` text NOT NULL
- `content` text NOT NULL
- `is_read` boolean DEFAULT false
- `created_at` timestamptz DEFAULT now()

**RLS:**
- Lojistas: SELECT/INSERT nos próprios tickets (via establishment owner_id) e mensagens dos seus tickets
- Admin (chrileart@gmail.com): SELECT/INSERT/UPDATE em todos os tickets e mensagens, usando `auth.uid()` do admin

**Realtime:** Habilitar realtime em `support_messages` para updates em tempo real.

---

### 2. Página do Lojista (`src/pages/dashboard/SupportPage.tsx`)

**Estado inicial:** Grid de 5 cards clicáveis (Produtos, Adicionais, Problemas Técnicos, Pagamentos, Outros) + lista de tickets anteriores abertos.

**Ao selecionar assunto:**
- Cria ticket no banco com `establishment_id`, `establishment_name`, `plan_name`, `subject`
- Abre interface de chat (ScrollArea com mensagens + input na parte inferior)
- Usa `supabase.channel()` para escutar novas mensagens em tempo real

**Ao clicar em ticket existente:** Abre o chat daquele ticket.

---

### 3. Dashboard Admin (`src/pages/dashboard/AdminSupportPage.tsx`)

- Verificação: só renderiza se `user.email === 'chrileart@gmail.com'`
- Lista todos os tickets agrupados/filtráveis por loja e status
- Mostra: nome da loja, plano, assunto, data, status
- Ao clicar: abre o mesmo componente de chat para responder

---

### 4. Componente de Chat (`src/components/support/SupportChat.tsx`)

- Recebe `ticketId` como prop
- Carrega mensagens existentes via SELECT
- Subscribe no canal realtime `support_messages` filtrado por `ticket_id`
- Input + botão enviar na parte inferior
- Mensagens do usuário à direita (bolha azul), mensagens do admin à esquerda (bolha cinza)
- Marca mensagens como lidas ao abrir

---

### 5. Badge de Notificação no Sidebar

- No `AppSidebar.tsx`, adicionar item "Suporte" com ícone `Headphones` (ou `MessageCircle`)
- Query de contagem: mensagens não lidas onde `sender_id != user.id` nos tickets do establishment
- Para admin: mensagens não lidas em qualquer ticket
- Exibir badge vermelho com contagem ao lado do texto "Suporte"
- Usar subscribe realtime para atualizar contagem sem polling

---

### 6. Rotas

- `/dashboard/support` → `SupportPage` (lojista)
- `/dashboard/admin-support` → `AdminSupportPage` (admin only)
- Rota admin-support visível no sidebar apenas para chrileart@gmail.com

---

### Arquivos

| Ação | Arquivo |
|------|---------|
| Migração | Nova migração SQL (2 tabelas, RLS, realtime) |
| Novo | `src/pages/dashboard/SupportPage.tsx` |
| Novo | `src/pages/dashboard/AdminSupportPage.tsx` |
| Novo | `src/components/support/SupportChat.tsx` |
| Editar | `src/components/AppSidebar.tsx` (item Suporte + badge + admin-support) |
| Editar | `src/App.tsx` (2 novas rotas) |

