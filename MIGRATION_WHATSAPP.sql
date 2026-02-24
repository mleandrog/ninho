# Migração de Banco de Dados - WhatsApp Campaigns

Adição das colunas necessárias para agendamento e mensagens customizadas por campanha.

## Proposed SQL Changes

Rode o seguinte código no **SQL Editor** do seu painel Supabase:

```sql
-- Adicionar colunas faltantes na tabela whatsapp_campaigns
ALTER TABLE public.whatsapp_campaigns 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS initial_message TEXT,
ADD COLUMN IF NOT EXISTS initial_message_interval INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS rules_message TEXT,
ADD COLUMN IF NOT EXISTS rules_interval INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS final_message TEXT;

-- Atualizar comentários das colunas para referência
COMMENT ON COLUMN public.whatsapp_campaigns.status IS 'pending, running, completed, stopped, scheduled';
COMMENT ON COLUMN public.whatsapp_campaigns.name IS 'Nome amigável da campanha';
```
