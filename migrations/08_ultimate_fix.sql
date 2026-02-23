-- ============================================
-- SCRIPT DE CORREÇÃO TOTAL (ORDERS)
-- ============================================

-- 1. Tabela ORDERS pode estar incompleta
-- Vamos adicionar TODAS as colunas possíveis
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Fix Constraint Status
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'canceled'));


-- 2. Tabela ORDER_ITEMS também
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0;

-- 3. Tabela BAGS
ALTER TABLE public.bags ALTER COLUMN expires_at DROP NOT NULL;
ALTER TABLE public.bags ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0;

--------------------------------------------------
-- 4. Inserir Dados de Teste
--------------------------------------------------
DO $$
DECLARE
    -- >>> SEU TELEFONE AQUI <<<
    v_customer_phone TEXT := '5511999999999'; 
    v_user_id UUID;
    v_product_id BIGINT;
    v_bag_id UUID;
    v_order_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    SELECT id INTO v_product_id FROM public.products LIMIT 1;

    -- Criar SACOLA
    INSERT INTO public.bags (
        customer_id, 
        customer_phone, 
        status, 
        total_amount, 
        created_at,
        expires_at
    )
    VALUES (
        v_user_id, 
        v_customer_phone, 
        'open', 
        100.00, 
        NOW() - INTERVAL '1 day',
        NOW() + INTERVAL '30 days'
    )
    RETURNING id INTO v_bag_id;

    -- Criar item da sacola
    INSERT INTO public.bag_items (bag_id, product_id, quantity)
    VALUES (v_bag_id, v_product_id, 2);

    -- Criar PEDIDO
    INSERT INTO public.orders (
        order_number, 
        customer_id, 
        customer_phone, 
        customer_name, 
        total_amount, 
        status, 
        created_at,
        updated_at
    )
    VALUES (
        'ORD-' || FLOOR(RANDOM() * 100000)::TEXT, -- Gera número aleatório
        v_user_id,
        v_customer_phone,
        'Cliente Teste IA',
        150.00,
        'delivered',
        NOW() - INTERVAL '10 days',
        NOW()
    )
    RETURNING id INTO v_order_id;
    
    INSERT INTO public.order_items (order_id, product_id, product_name, product_price, quantity, subtotal, price_at_purchase)
    VALUES (v_order_id, v_product_id, 'Produto Teste IA', 50.00, 3, 150.00, 50.00);

    RAISE NOTICE 'Dados criados com sucesso! Telefone: %', v_customer_phone;
END $$;
