# Configuração de Domínio (Ninho Lar)

Baseado no seu painel **ICP** e no **Cloudflare**, siga estes passos:

## 1. Configuração no Cloudflare (`ninhoelar.com.br`)
1. Acesse o Cloudflare do domínio `ninhoelar.com.br`.
2. Vá em **DNS** -> **Records**.
3. Adicione os registros seguindo o padrão do seu outro site (`mayago`):
   - **Tipo A**: Nome `@`, Conteúdo `216.22.5.130`, Proxy `Ativado` (Nuvem laranja).
   - **Tipo A**: Nome `*`, Conteúdo `216.22.5.130`, Proxy `Ativado`.
   - **Tipo CNAME**: Nome `www`, Conteúdo `ninhoelar.com.br`, Proxy `Ativado`.

## 2. Configuração no Painel ICP (Ubuntu)
Como você já tem o domínio listado no seu painel ICP (conforme o print):
1. No Painel ICP, vá em **Web** -> **Domínios**.
2. Clique em **Configuração** ao lado do domínio `www.ninhoelar.c...`.
3. Procure a aba **Proxy Reverso** (ou similar).
4. Configure para redirecionar o tráfego do domínio para a porta onde o Next.js está rodando (provavelmente `http://127.0.0.1:3000`).

## 3. Ativar SSL
No Painel ICP:
1. Vá na aba **SSL** (abaixo de Domínios no menu lateral).
2. Selecione o domínio `ninhoelar.com.br` e clique para gerar o certificado (Let's Encrypt).
3. No Cloudflare, garanta que em **SSL/TLS** o modo esteja como **Full (Strict)**.

---
## 4. Próximo Passo: Webhook
Assim que o site estiver abrindo em `https://ninhoelar.com.br`:
1. Entre no admin do sistema -> **WhatsApp** -> **Conexão**.
2. Clique no botão **Configurar Webhook**. O sistema vai registrar automaticamente a URL final.

