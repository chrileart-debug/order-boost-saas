

## Plano: Corrigir Badge "Em Serviço" e Automatizar fleet_history

### Problema
1. Motoristas com jobs `completed` continuam com badge "Em Serviço" porque o frontend filtra jobs com `status !== "finalizado"` (string errada) em vez de excluir `completed`/`cancelled`.
2. A tabela `fleet_history` nunca é populada -- nenhum trigger existe para fazer UPSERT quando jobs mudam de status.

### Correções

#### 1. Database Trigger -- Automatizar fleet_history (Migration SQL)

Criar trigger na tabela `jobs` que:
- Quando `status` muda para `contracted`: faz UPSERT em `fleet_history` com `(establishment_id, driver_id, is_active = true)`
- Quando `status` muda para `completed` ou `cancelled`: faz UPDATE em `fleet_history` setando `is_active = false` para aquele par `(establishment_id, driver_id)`

```sql
CREATE OR REPLACE FUNCTION public.sync_fleet_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'contracted' AND NEW.driver_id IS NOT NULL THEN
    INSERT INTO fleet_history (establishment_id, driver_id, is_active, hired_at)
    VALUES (NEW.establishment_id, NEW.driver_id, true, now())
    ON CONFLICT ON CONSTRAINT fleet_history_establishment_driver
    DO UPDATE SET is_active = true, hired_at = now();
  END IF;

  IF NEW.status IN ('completed', 'cancelled') AND NEW.driver_id IS NOT NULL THEN
    UPDATE fleet_history
    SET is_active = false
    WHERE establishment_id = NEW.establishment_id
      AND driver_id = NEW.driver_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_fleet_history
  AFTER INSERT OR UPDATE OF status ON jobs
  FOR EACH ROW EXECUTE FUNCTION sync_fleet_history();
```

Tambem precisa criar uma UNIQUE constraint em `fleet_history(establishment_id, driver_id)` para o ON CONFLICT funcionar:
```sql
ALTER TABLE fleet_history
  ADD CONSTRAINT fleet_history_establishment_driver
  UNIQUE (establishment_id, driver_id);
```

#### 2. Frontend -- Corrigir fetchFleet e Badge (DriversPage.tsx)

**fetchFleet**: Simplificar a lógica para usar `fleet_history` como fonte da verdade. Ainda buscar jobs ativos para determinar quem está "Em Serviço" vs "Disponível":
- Buscar todos os registros de `fleet_history` do estabelecimento
- Buscar jobs do estabelecimento com status IN (`contracted`, `ending`) para saber quem está ativo agora
- Badge "Em Serviço": somente se o motorista tem job com status `contracted` ou `ending`
- Badge "Histórico": se `fleet_history.is_active = false`
- Badge "Disponível": se `fleet_history.is_active = true` mas sem job ativo

**Mudança no `source`**: Renomear/ajustar o campo `source` do FleetMember para refletir o status real do job vinculado (`"active_shift"` | `"available"` | `"history"`).

**Correção do filtro**: Substituir `j.status !== "finalizado"` por `["contracted", "ending"].includes(j.status)` para filtrar apenas jobs realmente ativos.

### Arquivos Modificados
- Nova migration SQL (trigger + constraint)
- `src/pages/dashboard/DriversPage.tsx` (fetchFleet + badge rendering)

### Detalhes Técnicos
- O trigger usa SECURITY DEFINER para bypassar RLS
- A constraint UNIQUE garante idempotência do UPSERT
- O realtime listener existente em `job_applications` continua funcionando; adicionamos refresh no listener de `jobs` também

