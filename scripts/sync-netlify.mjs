/**
 * Script de Sincronização Automática AI Studio -> Netlify (PrudenEmpregos.com.br)
 *
 * Publica a pasta `dist/` diretamente na API da Netlify usando variáveis de ambiente
 * seguras (NETLIFY_AUTH_TOKEN e NETLIFY_SITE_ID).
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID || 'cda64c86-bbd4-47f7-8599-65fa92c2cb35';
const NETLIFY_TOKEN = process.env.NETLIFY_AUTH_TOKEN || '';

const isRequired = process.argv.includes('--require');

function walkFiles(dir, baseDir = dir) {
  const results = {};
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(results, walkFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const relPath = '/' + path.relative(baseDir, fullPath).replace(/\\/g, '/');
      const buf = fs.readFileSync(fullPath);
      const sha1 = crypto.createHash('sha1').update(buf).digest('hex');
      results[relPath] = { fullPath, sha1, size: buf.length };
    }
  }
  return results;
}

export async function deployDistToNetlify() {
  if (!NETLIFY_TOKEN) {
    throw new Error('NETLIFY_AUTH_TOKEN não configurado nas variáveis de ambiente (.env).');
  }

  if (!fs.existsSync(DIST_DIR)) {
    throw new Error('Pasta dist/ não encontrada. Execute `vite build` primeiro.');
  }

  // Garante que _redirects exista dentro de dist/ para SPA + Proxy das APIs para o Cloud Run
  const redirectsPath = path.join(DIST_DIR, '_redirects');
  const sharedBackendOrigin =
    process.env.APP_URL || 'https://ais-pre-xxoymionfwyzqrkkm4w3x7-467353303181.us-east1.run.app';
  const redirectsContent = [
    `# Proxy de todas as rotas /api/* do domínio prudenempregos.com.br para o backend ativo`,
    `/api/*  ${sharedBackendOrigin.replace(/\/$/, '')}/api/:splat  200!`,
    `/*      /index.html  200`,
  ].join('\n');
  fs.writeFileSync(redirectsPath, redirectsContent, 'utf8');

  const filesMap = walkFiles(DIST_DIR);
  const fileDigests = {};
  for (const [relPath, info] of Object.entries(filesMap)) {
    fileDigests[relPath] = info.sha1;
  }

  console.log(`[Netlify Sync] Iniciando publicação de ${Object.keys(fileDigests).length} arquivos para PrudenEmpregos...`);

  // 1. Cria o deploy com os hashes SHA1 dos arquivos
  const createRes = await fetch(`https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/deploys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NETLIFY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: fileDigests,
      draft: false,
      title: `Sync automático AI Studio (${new Date().toISOString()})`,
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Falha ao criar deploy na Netlify (${createRes.status}): ${errText}`);
  }

  const deployData = await createRes.json();
  const deployId = deployData.id;
  const requiredHashes = new Set(deployData.required || []);

  console.log(
    `[Netlify Sync] Deploy #${deployId} criado. Arquivos novos/modificados para upload: ${requiredHashes.size}`
  );

  // 2. Faz upload de cada arquivo cujo hash foi solicitado pela Netlify
  for (const [relPath, info] of Object.entries(filesMap)) {
    if (!requiredHashes.has(info.sha1)) continue;

    const fileBuffer = fs.readFileSync(info.fullPath);
    const encodedPath = relPath
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');

    const uploadRes = await fetch(
      `https://api.netlify.com/api/v1/deploys/${deployId}/files${encodedPath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${NETLIFY_TOKEN}`,
          'Content-Type': 'application/octet-stream',
        },
        body: fileBuffer,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Erro ao enviar arquivo ${relPath} (${uploadRes.status}): ${errText}`);
    }
    console.log(`[Netlify Sync] Enviado: ${relPath} (${info.size} bytes)`);
  }

  // 3. Tenta vincular automaticamente o domínio prudenempregos.com.br e provisionar SSL quando disponível na equipe ativa
  try {
    const domainRes = await fetch(`https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${NETLIFY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        custom_domain: 'prudenempregos.com.br',
        domain_aliases: ['www.prudenempregos.com.br'],
      }),
    });
    if (domainRes.ok) {
      await fetch(`https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/ssl`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${NETLIFY_TOKEN}` },
      }).catch(() => {});
      console.log('[Netlify Sync] Domínio prudenempregos.com.br vinculado e SSL solicitado com sucesso.');
    }
  } catch {
    // Ignora se ainda bloqueado pela equipe antiga
  }

  console.log(
    `[Netlify Sync] Publicado com sucesso! URL: ${deployData.ssl_url || 'https://prudenempregos.netlify.app'}`
  );
  return {
    deployId,
    state: deployData.state,
    url: deployData.ssl_url || 'https://prudenempregos.netlify.app',
    customDomain: 'https://prudenempregos.com.br',
    updatedFiles: requiredHashes.size,
    timestamp: new Date().toISOString(),
  };
}

// Se chamado diretamente via CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  deployDistToNetlify().catch((err) => {
    console.error('[Netlify Sync] Aviso durante sincronização:', err.message);
    if (isRequired) {
      process.exit(1);
    }
  });
}
