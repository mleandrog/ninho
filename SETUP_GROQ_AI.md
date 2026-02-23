# Guia de Configuração - Integração Groq AI

## 📋 Pré-requisitos

- [x] Conta na Groq (https://console.groq.com)
- [ ] API Key da Groq
- [ ] Instância do Evolution API criada
- [ ] Migração do banco de dados executada

---

## 🔧 Passo 1: Configurar GROQ_API_KEY

1. Acesse https://console.groq.com/keys
2. Clique em "Create API Key"
3. Copie a chave gerada (começa com `gsk_...`)
4. Abra o arquivo `.env.local` e adicione:

```env
GROQ_API_KEY=gsk_sua_chave_aqui
```

5. Reinicie o servidor de desenvolvimento:

```bash
npm run dev
```

---

## 🗄️ Passo 2: Executar Migração do Banco

Execute o arquivo `supabase_migration_ai_whatsapp.sql` no Supabase:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo do arquivo `supabase_migration_ai_whatsapp.sql`
4. Clique em **Run**

**O que essa migração faz:**
- Adiciona campo `customer_phone` na tabela `bags`
- Cria tabela `orders` (pedidos)
- Cria tabela `order_items` (itens do pedido)
- Adiciona índices para performance

---

## 📱 Passo 3: Configurar Evolution API

### 3.1 Criar Instância

Se ainda não criou, crie uma instância no Evolution:

```bash
POST https://seu-evolution-api.com/instance/create
{
  "instanceName": "ninho-lar",
  "token": "sua_api_key_aqui"
}
```

### 3.2 Configurar Webhook

Configure o webhook para receber mensagens:

```bash
POST https://seu-evolution-api.com/webhook/set/ninho-lar
{
  "url": "https://seu-dominio.com/api/webhooks/whatsapp",
  "webhook_by_events": true,
  "events": [
    "messages.upsert"
  ]
}
```

### 3.3 Atualizar .env.local

Adicione as configurações do Evolution:

```env
EVOLUTION_API_URL=https://seu-evolution-api.com
EVOLUTION_API_KEY=sua_api_key_aqui
EVOLUTION_INSTANCE_NAME=ninho-lar
```

---

## ✅ Passo 4: Testar a Integração

### Teste 1: Endpoint de Chat (Local)

Use Postman, Thunder Client ou curl:

```bash
POST http://localhost:3000/api/ai/chat
Content-Type: application/json

{
  "phone": "5511999999999",
  "message": "Tenho alguma sacola pendente?"
}
```

**Resposta esperada:**
```json
{
  "reply": "Olá! 👋 Consultei aqui e você não tem sacolas pendentes no momento...",
  "metadata": {
    "function_called": "getCustomerBags",
    "data": []
  }
}
```

### Teste 2: WhatsApp Real

1. Envie uma mensagem para o número conectado no Evolution
2. Teste as seguintes perguntas:
   - "Tenho alguma sacola pendente?"
   - "Qual foi meu último pedido?"
   - "Quantos pedidos eu já fiz?"

**Tempo de resposta esperado:** 2-4 segundos

---

## 🐛 Troubleshooting

### Erro: "GROQ_API_KEY não configurada"
- Verifique se adicionou a chave no `.env.local`
- Reinicie o servidor (`npm run dev`)

### Erro: "Unauthorized" no webhook
- Verifique se `EVOLUTION_API_KEY` está correta
- Confirme que o webhook está configurado com a mesma chave

### IA não responde no WhatsApp
- Verifique logs do Evolution API
- Confirme que o webhook está ativo
- Teste o endpoint `/api/ai/chat` diretamente

### Respostas vazias ou incorretas
- Verifique se a migração do banco foi executada
- Confirme que existem dados de teste (sacolas/pedidos)
- Verifique logs no console do Next.js

---

## 📊 Monitoramento

### Logs do Next.js
```bash
npm run dev
```

Observe mensagens como:
- `Erro no chat AI:` → Problema na IA
- `Erro no webhook WhatsApp:` → Problema no webhook

### Logs do Groq
Acesse https://console.groq.com/logs para ver:
- Requisições feitas
- Tokens consumidos
- Erros de API

---

## 🚀 Próximos Passos

Após validar que está funcionando:

1. [ ] Criar dados de teste (sacolas e pedidos)
2. [ ] Testar com clientes reais
3. [ ] Monitorar uso de tokens da Groq
4. [ ] Implementar fila de prioridade (fase 2)
5. [ ] Adicionar geração de links de pagamento via IA
