# Guia de Execução das Migrações SQL

## ⚠️ Importante: Execute na Ordem Correta

As migrações foram divididas em 4 partes para evitar erros de dependência. **Execute uma de cada vez, na ordem abaixo:**

---

## 📋 Ordem de Execução

### 1️⃣ Adicionar Coluna `customer_phone`
**Arquivo:** `migrations/01_add_customer_phone.sql`

```sql
ALTER TABLE public.bags ADD COLUMN IF NOT EXISTS customer_phone TEXT;
```

**O que faz:** Adiciona a coluna `customer_phone` na tabela `bags`

---

### 2️⃣ Criar Tabelas `orders` e `order_items`
**Arquivo:** `migrations/02_create_orders_tables.sql`

**O que faz:** 
- Cria tabela `orders` (pedidos)
- Cria tabela `order_items` (itens do pedido)

---

### 3️⃣ Criar Índices
**Arquivo:** `migrations/03_create_indexes.sql`

**O que faz:** 
- Cria índice em `bags.customer_phone`
- Cria índices em `orders` (customer_phone, status, created_at)
- Cria índice em `order_items.order_id`

---

### 4️⃣ Adicionar Comentários
**Arquivo:** `migrations/04_add_comments.sql`

**O que faz:** Adiciona comentários de documentação nas colunas e tabelas

---

## 🚀 Como Executar no Supabase

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Copie o conteúdo de `01_add_customer_phone.sql`
4. Clique em **Run**
5. ✅ Aguarde confirmação de sucesso
6. Repita os passos 3-5 para os arquivos `02`, `03` e `04` **nesta ordem**

---

## ✅ Verificação

Após executar todas as migrações, execute este comando para verificar:

```sql
-- Verificar se customer_phone existe em bags
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bags' AND column_name = 'customer_phone';

-- Verificar se tabela orders existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'orders';

-- Verificar índices criados
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('bags', 'orders', 'order_items');
```

**Resultado esperado:**
- `customer_phone` aparece como coluna TEXT em `bags`
- Tabela `orders` existe
- 5 índices criados (idx_bags_customer_phone, idx_orders_customer_phone, idx_orders_status, idx_orders_created_at, idx_order_items_order_id)

---

## 🐛 Troubleshooting

### Erro: "column already exists"
✅ **Normal!** O `IF NOT EXISTS` previne erro. Continue para próxima migração.

### Erro: "table already exists"
✅ **Normal!** O `IF NOT EXISTS` previne erro. Continue para próxima migração.

### Erro: "column does not exist" ao criar índice
❌ **Problema!** Você pulou a migração 01 ou 02. Volte e execute na ordem correta.
