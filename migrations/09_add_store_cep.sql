-- Adicionar coluna store_cep na tabela whatsapp_settings
ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS store_cep TEXT;

-- Comentário para referência
COMMENT ON COLUMN public.whatsapp_settings.store_cep IS 'CEP de origem para cálculos de logística e referência da loja';
