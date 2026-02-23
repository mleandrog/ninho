const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Iniciando Preparação Final do Deploy...');

const rootDir = path.resolve(__dirname, '..');
const standaloneDir = path.resolve(rootDir, '.next/standalone');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const zipName = `deploy-${timestamp}.zip`;
const zipPath = path.join(process.cwd(), zipName);
const tempZipDir = path.resolve(rootDir, 'temp_deploy');

if (!fs.existsSync(standaloneDir)) {
    console.error('❌ Erro: Pasta .next/standalone não encontrada. Rode "npm run build" primeiro.');
    process.exit(1);
}

// 1. Localizar o diretório que contém o server.js
function findServerDir(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    if (entries.some(e => e.name === 'server.js')) return currentDir;

    for (const entry of entries) {
        if (entry.isDirectory() && !['node_modules', '.next', 'public'].includes(entry.name)) {
            const found = findServerDir(path.join(currentDir, entry.name));
            if (found) return found;
        }
    }
    return null;
}

const serverSourceDir = findServerDir(standaloneDir);
if (!serverSourceDir) {
    console.error('❌ Erro: server.js não encontrado dentro de .next/standalone');
    process.exit(1);
}

console.log(`- Base do servidor encontrada: ${path.relative(standaloneDir, serverSourceDir)}`);

// 2. Criar pasta temporária limpa
if (fs.existsSync(tempZipDir)) fs.rmSync(tempZipDir, { recursive: true, force: true });
fs.mkdirSync(tempZipDir, { recursive: true });

// 3. Copiar TUDO da base do servidor
console.log('- Copiando base do servidor (incluindo .next interno)...');
fs.cpSync(serverSourceDir, tempZipDir, { recursive: true });

// 4. Verificar e garantir arquivos cruciais da build
const internalNextDir = path.join(tempZipDir, '.next');
const buildIdFile = path.join(internalNextDir, 'BUILD_ID');

if (fs.existsSync(buildIdFile)) {
    console.log('✅ BUILD_ID encontrado e copiado.');
} else {
    console.warn('⚠️ AVISO: BUILD_ID não encontrado na pasta .next interna!');
}

// 5. Copiar node_modules da raiz do standalone (dependências compartilhadas)
const sharedNodeModules = path.join(standaloneDir, 'node_modules');
if (fs.existsSync(sharedNodeModules)) {
    console.log('- Mesclando dependências compartilhadas...');
    const targetNodeModules = path.join(tempZipDir, 'node_modules');
    if (!fs.existsSync(targetNodeModules)) fs.mkdirSync(targetNodeModules, { recursive: true });
    fs.cpSync(sharedNodeModules, targetNodeModules, { recursive: true });
}

// 6. Copiar public e static do projeto raiz
console.log('- Copiando assets estáticos (public e static)...');
const publicDir = path.join(rootDir, 'public');
if (fs.existsSync(publicDir)) {
    fs.cpSync(publicDir, path.join(tempZipDir, 'public'), { recursive: true });
}

const staticDir = path.join(rootDir, '.next/static');
const targetStaticDir = path.join(internalNextDir, 'static');
if (fs.existsSync(staticDir)) {
    if (!fs.existsSync(targetStaticDir)) fs.mkdirSync(targetStaticDir, { recursive: true });
    fs.cpSync(staticDir, targetStaticDir, { recursive: true });
    console.log('✅ Static assets copiados para .next/static');
}

// 7. Copiar .env.local
const envFile = path.join(rootDir, '.env.local');
if (fs.existsSync(envFile)) {
    fs.copyFileSync(envFile, path.join(tempZipDir, '.env.local'));
    console.log('✅ .env.local incluído.');
}

// 8. Criar o ZIP usando PowerShell
console.log(`📦 Gerando ${zipName}...`);
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

try {
    const psCommand = `powershell -Command "Get-ChildItem -Path \\"${tempZipDir}\\" -Force | Compress-Archive -DestinationPath \\"${zipPath}\\" -Force"`;
    execSync(psCommand);

    if (fs.existsSync(zipPath)) {
        const stats = fs.statSync(zipPath);
        console.log(`✨ SUCESSO! Arquivo pronto: ${zipPath}`);
        console.log(`📊 Tamanho final: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    } else {
        throw new Error('Arquivo ZIP não foi gerado.');
    }
} catch (e) {
    console.error('❌ Erro crítico ao criar ZIP:', e.message);
    process.exit(1);
}

// 9. Limpeza final
fs.rmSync(tempZipDir, { recursive: true, force: true });

