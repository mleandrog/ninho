-- ============================================
-- SCRIPT DE CORREÇÃO E FINALIZAÇÃO
-- Este script verifica e corrige tudo que pode estar faltando
-- ============================================

-- 1. Garantir que customer_phone existe em orders
-- Se a tabela orders já existia antes, ela pode estar sem essa coluna
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 2. Garantir que customer_phone existe em bags
ALTER TABLE public.bags ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- 3. Agora sim, criar os índices (um por um para garantir)
CREATE INDEX IF NOT EXISTS idx_bags_customer_phone ON public.bags(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 4. Adicionar comentários (Opcional, mas bom para documentação)
COMMENT ON COLUMN public.bags.customer_phone IS 'Telefone do cliente (para WhatsApp)';
COMMENT ON COLUMN public.orders.customer_phone IS 'Telefone do cliente (para WhatsApp)';
