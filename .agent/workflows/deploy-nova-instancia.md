---
description: Guia completo para criar, configurar e ativar uma nova instância de WhatsApp no Ninho Lar.
---

# 🚀 DEPLOY NOVA INSTÂNCIA - Ninho Lar

Siga este procedimento sempre que precisar trocar de número de WhatsApp ou criar uma instância do zero na Evolution API.

## Passo 1: Criar no Painel da Evolution API
1. Acesse o seu painel de gerenciamento (iContainer ou similar).
2. Clique em **Criar Instância**.
3. Defina um nome (ex: `ninho-lar3`, `ninho-prod`).
4. Garanta que a opção **Habilitar QR Code** esteja marcada.
5. Copie o nome da instância e a **API Key** gerada.

## Passo 2: Atualizar Credenciais no Sistema
1. No VS Code (Local) ou no Servidor, abra o arquivo `.env.local`.
2. Atualize as variáveis:
   ```env
   EVOLUTION_API_KEY=SUA_NOVA_CHAVE_AQUI
   EVOLUTION_INSTANCE_NAME=NOME_DA_INSTANCIA_AQUI
   ```

## Passo 3: Configuração Técnica Automática
Toda nova instância vem "crua". Você precisa ativar o Webhook e as Permissões de Leitura. 
Crie um arquivo temporário `config.js` com o seguinte código e execute-o (`node config.js`):

```javascript
const URL = "https://evolutionapi.vps6735.panel.icontainer.run";
const KEY = "SUA_API_KEY";
const INSTANCE = "NOME_DA_INSTANCIA";
const WEBHOOK_URL = "https://ninhoelar.com.br/api/whatsapp/webhook";

async function setup() {
    // Configura Webhook para receber mensagens
    await fetch(`${URL}/webhook/set/${INSTANCE}`, {
        method: 'POST',
        headers: { "apikey": KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
            webhook: {
                url: WEBHOOK_URL, enabled: true, webhookByEvents: false,
                events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "MESSAGES_UPDATE", "SEND_MESSAGE", "GROUPS_UPSERT"]
            }
        })
    });

    // Ativa leitura de mensagens (Ticks Azuis)
    await fetch(`${URL}/settings/set/${INSTANCE}`, {
        method: 'POST',
        headers: { "apikey": KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ readMessages: true, groupsIgnore: false })
    });
    console.log("Configuração concluída!");
}
setup();
```

## Passo 4: Deploy no Servidor (Obrigatório)
Para que o servidor de produção reconheça as novas chaves:
1. Faça o `git pull`.
2. Rode o build: `npm run build`.
3. **Importante**: Copie o `.env.local` atualizado para a pasta standalone:
   `cp .env.local .next/standalone/.env`
4. Reinicie o PM2: `pm2 restart ninho-lar`.

## Passo 5: Conectar o WhatsApp
1. No site, vá em `/admin/whatsapp` -> aba **Conexão**.
2. Clique em **Conectar**.
3. Escaneie o QR Code.
4. Teste enviando um "Oi" para o bot. Se ficar **azul**, a captura de leads está ativa.

---
> 💡 **Dica do Agent**: Sempre certifique-se de que o novo número é **Administrador** nos grupos das campanhas.
