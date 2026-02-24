-- Tabelas adicionais para o Sistema Ninho (PRD)

-- 1. Grupos WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    group_jid TEXT NOT NULL UNIQUE, -- ID do grupo no WhatsApp (ex: 123456789@g.us)
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Configurações WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword TEXT NOT NULL DEFAULT 'NINHO', -- Palavra-chave para entrar na fila
    rules_message TEXT, -- Mensagem de regras enviada antes dos produtos
    default_interval_seconds INTEGER DEFAULT 30, -- Intervalo padrão entre disparos
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Campanhas de Disparo
CREATE TABLE IF NOT EXISTS public.whatsapp_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT, -- Nome da campanha
    category_id BIGINT REFERENCES public.categories(id),
    group_ids UUID[] NOT NULL, -- Array de IDs dos grupos selecionados
    interval_seconds INTEGER DEFAULT 30,
    status TEXT DEFAULT 'pending', -- pending, running, completed, stopped, scheduled
    products_sent INTEGER DEFAULT 0,
    total_products INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    initial_message TEXT,
    initial_message_interval INTEGER DEFAULT 10,
    rules_message TEXT,
    rules_interval INTEGER DEFAULT 10,
    final_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 4. Fila de Prioridade para WhatsApp
CREATE TABLE IF NOT EXISTS public.priority_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id BIGINT REFERENCES public.products(id),
    campaign_id UUID REFERENCES public.whatsapp_campaigns(id),
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    keyword_used TEXT,
    status TEXT DEFAULT 'waiting', -- waiting, processing, paid, expired
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 5. Sistema de Sacolas (Bags)
CREATE TABLE IF NOT EXISTS public.bags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES auth.users(id),
    customer_phone TEXT, -- Telefone do cliente (para vincular via WhatsApp)
    status TEXT DEFAULT 'open', -- open, closed, abandoned
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    total_amount DECIMAL(10,2) DEFAULT 0
);

-- 6. Itens da Sacola
CREATE TABLE IF NOT EXISTS public.bag_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bag_id UUID REFERENCES public.bags(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES public.products(id),
    quantity INTEGER DEFAULT 1,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Entregadores
CREATE TABLE IF NOT EXISTS public.delivery_persons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    current_lat DECIMAL(9,6),
    current_lng DECIMAL(9,6),
    area_coverage TEXT
);

-- Adicionar colunas necessárias em produtos se não existirem
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available'; -- available, in_bag, sold
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS whatsapp_exclusive BOOLEAN DEFAULT false; -- Se true, produto só vai pra loja após campanha
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS whatsapp_campaign_completed BOOLEAN DEFAULT false; -- Se já passou por campanha
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS available_in_store BOOLEAN DEFAULT true; -- Se está visível na loja online

-- Inserir configuração padrão se não existir
INSERT INTO public.whatsapp_settings (keyword, rules_message, default_interval_seconds)
SELECT 'NINHO', 
       '🧸 *BEM-VINDO AO NINHO LAR!*\n\nRegras da campanha:\n✨ Digite a palavra-chave para entrar na fila\n⏰ Você terá 15 minutos para confirmar\n💳 Link de pagamento expira em 1 hora\n\nBoa sorte!',
       30
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_settings);
