# 🚀 Guia de Deploy Padronizado - Ninho Lar

Agora que estabilizamos o ambiente, você tem duas opções de deploy. Escolha a que preferir:

---

## Opção 1: Deploy via ZIP (Standalone) - Mais Seguro 🛡️
*Ideal para servidores com pouca memória, pois a build é feita no seu computador.*

1. **No seu VS Code:**
   ```bash
   npm run build:prod
   ```
2. **Suba o arquivo:** Pegue o `deploy-202X-XX.zip` gerado e suba para `/etc/icontainer/apps/openresty/openresty/www/sites/ninhoelar.com.br/index`.
3. **No Terminal do Servidor:**
   ```bash
   rm -rf * .next
   unzip -o deploy-[nome].zip
   pm2 restart ninho-lar
   ```

---

## Opção 2: Deploy Direto via Git (Push & Pull) - Mais Rápido ⚡
*Ideal para pequenas alterações sem precisar baixar/subir arquivos.*

### 1. No seu Computador (Uma única vez)
Garanta que suas alterações estão no GitHub:
```bash
git add .
git commit -m "Deploy: Atualização do sistema"
git push origin main
```

### 2. No Servidor (Via SSH ou Terminal do Painel)
Entre na pasta do projeto e siga esta sequência:

```bash
# 1. Entrar na pasta
cd /etc/icontainer/apps/openresty/openresty/www/sites/ninhoelar.com.br/index

# 2. SE DER ERRO DE "not a git repository", rode este COMANDO DE RESGATE:
git init
git remote add origin https://github.com/mleandrog/ninho.git
git fetch origin
git reset --hard origin/main

# 3. Puxar código novo (se já for um repositório Git)
git pull origin main

# 4. Instalar dependências e buildar
npm install
npm run build

# 5. Reiniciar o processo
pm2 restart ninho-lar
```

> [!IMPORTANT]
> Se a `npm run build` falhar no servidor por falta de memória (RAM), use a **Opção 1 (ZIP)**. A opção ZIP é a "prova de balas" porque o servidor só precisa rodar o arquivo pronto.

---

## � Dicas de Manutenção

- **Cache do Navegador:** Se não ver a mudança, teste `https://ninhoelar.com.br/admin/whatsapp?cache=off`.
- **Logs de Erro:** Se o site não abrir, use `pm2 logs ninho-lar` para ver o que está acontecendo.
- **Limpeza:** Periodicamente, apague os arquivos `.zip` antigos da pasta para não ocupar espaço no servidor.
