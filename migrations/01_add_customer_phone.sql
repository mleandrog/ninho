-- ============================================
-- MIGRAÇÃO 1: Adicionar customer_phone em bags
-- Execute este bloco PRIMEIRO
-- ============================================

ALTER TABLE public.bags ADD COLUMN IF NOT EXISTS customer_phone TEXT;
