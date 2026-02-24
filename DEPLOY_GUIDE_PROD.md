# 🚀 Guia de Deploy Padronizado - Ninho Lar

## Sequência Correta de Deploy (Git → Servidor)

> ⚠️ **Siga TODOS os passos em ordem. Pular qualquer um causa tela branca ou CSS quebrado.**

```bash
# 1. Entrar na pasta do projeto
cd /etc/icontainer/apps/openresty/openresty/www/sites/ninhoelar.com.br/index

# 2. Puxar o código mais recente
git pull origin main

# 3. Apagar o build antigo (OBRIGATÓRIO — evita cache de chunks)
rm -rf .next

# 4. Instalar dependências e buildar
npm install
npm run build

# 5. ⚠️ OBRIGATÓRIO — Copiar arquivos estáticos para o Standalone (sem isso = CSS quebrado!)
cp .env.local .next/standalone/.env
cp -rf public .next/standalone/public
cp -rf .next/static .next/standalone/.next/static

# 6. Recriar o processo PM2 (use delete + start, não restart)
pm2 delete ninho-lar
pm2 start .next/standalone/server.js --name ninho-lar
pm2 save
```

---

## ⚠️ Problemas Comuns e Soluções

### 🔴 Tela em Branco / CSS Quebrado
Os arquivos estáticos não foram copiados para o standalone. Rode:
```bash
cd /etc/icontainer/apps/openresty/openresty/www/sites/ninhoelar.com.br/index
cp -rf .next/static .next/standalone/.next/static
cp -rf public .next/standalone/public
cp .env.local .next/standalone/.env
pm2 restart ninho-lar
```

### 🔴 EADDRINUSE: address already in use :3000
Outro processo PM2 está ocupando a porta 3000. Identifique e mate:
```bash
pm2 list
pm2 delete <nome-do-processo-antigo>
pm2 restart ninho-lar
```

### 🔴 Alterações não Refletem no Browser
1. Hard refresh: `Ctrl + Shift + R`
2. Se persistir, o build não foi limpo. Rode o `rm -rf .next` e refaça o deploy completo.

### 🔴 Site não abre / erro 502
```bash
pm2 logs ninho-lar --lines 30 --nostream
ss -tlnp | grep 3000
```

---

## 🛡️ Opção Alternativa: Deploy via ZIP (Caso o build falhe por falta de RAM)

1. **No seu computador:** `npm run build:prod` → gera `deploy-XXXX.zip`
2. **Suba o ZIP** para a pasta do projeto no servidor
3. **No servidor:**
```bash
rm -rf * .next
unzip -o deploy-[nome].zip
cp -rf public .next/standalone/
cp -rf .next/static .next/standalone/.next/static
pm2 delete ninho-lar
pm2 start .next/standalone/server.js --name ninho-lar
pm2 save
```

---

## 📋 Dicas Rápidas

- **Logs:** `pm2 logs ninho-lar`
- **Status:** `pm2 list`
- **Cache do Nginx:** `openresty -s reload` ou `nginx -s reload`
- **Limpeza:** Apague `.zip` antigos periodicamente
