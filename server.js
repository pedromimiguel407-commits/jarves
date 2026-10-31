#!/usr/bin/env node
'use strict';
/*
  JARVES Gateway — servidor próprio (Node 18+, sem dependências)
  • Serve o site (index.html, script.js, ...)
  • Expõe uma API compatível com OpenAI:  /v1/chat/completions, /v1/models, /v1/health
  • Emite e valida as API keys PRÓPRIAS do JARVES (formato jv-xxxxxxxx...)
  • A chave do provedor de IA (z.ai, Groq, OpenRouter...) fica SÓ no servidor (.env), nunca no navegador

  Uso:   node server.js          (depois abra http://localhost:3000)
         node server.js --new-key [nome]   (gera uma nova API key e sai)
         node server.js --list-keys
         node server.js --revoke jv-abcd1234   (revoga pelo prefixo)
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const zlib = require('zlib');

const ROOT = __dirname;

// ---------- .env mínimo ----------
try {
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/).forEach(l => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch {}

const env = (k, d = '') => (process.env[k] ?? d);
const CFG = {
  port: +env('PORT', 3000),
  host: env('HOST', '::'),
  adminToken: env('ADMIN_TOKEN'),
  rate: +env('RATE_LIMIT_PER_MIN', 12),
  timeout: +env('UPSTREAM_TIMEOUT_MS', 20000),
  maxTok: +env('MAX_TOKENS_DEFAULT', 6000),
  corsOrigin: env('CORS_ORIGIN', '*'),
  freeFallback: env('DISABLE_FREE_FALLBACK') !== '1',
  freeMode: env('FREE_MODE', '1') !== '0',
  publicSignup: env('PUBLIC_SIGNUP', env('FREE_MODE', '1') !== '0' ? '1' : '0') === '1',
  keyTtlMs: 24 * 60 * 60 * 1000, // fallback; a chave vence no próximo reset diário
  maxBody: 64 * 1024 * 1024,
  googleClientId: env('GOOGLE_CLIENT_ID'),
  pollinationsAllowInFree: env('POLLINATIONS_ALLOW_IN_FREE_MODE') === '1',
};

// Pollinations oficial: exige chave secreta do servidor (sk_...). A chave nunca vai ao navegador.
const POLLINATIONS = {
  key: env('POLLINATIONS_API_KEY'),
  base: env('POLLINATIONS_BASE_URL', 'https://gen.pollinations.ai').replace(/\/$/, ''),
  textModel: env('POLLINATIONS_TEXT_MODEL', 'openai/gpt-5.4-nano'),
  imageModel: env('POLLINATIONS_IMAGE_MODEL', 'black-forest-labs/flux.1-schnell'),
  timeout: Math.max(10000, +env('POLLINATIONS_TIMEOUT_MS', 120000)),
};

// Provedores (em ordem de tentativa). Só entram os que têm chave.

// ---------- motor local Ollama (sem chave de provedor) ----------
const OLLAMA = {
  enabled: env('OLLAMA_ENABLED', '1') !== '0',
  url: env('OLLAMA_URL', 'http://127.0.0.1:11434').replace(/\/$/, ''),
  model: env('OLLAMA_MODEL', 'qwen2.5:1.5b'),
  timeout: +env('OLLAMA_TIMEOUT_MS', 120000),
  connectTimeout: +env('OLLAMA_CONNECT_TIMEOUT_MS', 1200),
};
const LOCAL_SESSIONS = new Map();
const localFetch = async (route, options={}) => {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), OLLAMA.timeout);
  try { return await fetch(OLLAMA.url + route, {...options, signal: ac.signal}); }
  finally { clearTimeout(timer); }
};
async function ollamaStatus() {
  if (!OLLAMA.enabled) return {enabled:false, online:false, model:OLLAMA.model, reason:'Motor local desativado'};
  try {
    const r=await localFetch('/api/tags');
    if (!r.ok) return {enabled:true,online:false,model:OLLAMA.model,reason:`Ollama HTTP ${r.status}`};
    const j=await r.json(), models=(j.models||[]).map(x=>x.name);
    return {enabled:true,online:true,model:OLLAMA.model,installed:models,modelReady:models.some(x=>x===OLLAMA.model || x.startsWith(OLLAMA.model+':'))};
  } catch(e) { return {enabled:true,online:false,model:OLLAMA.model,reason:e.name==='AbortError'?'Timeout':'Ollama não respondeu'}; }
}
function localAuth(req,res) {
  const header=req.headers.authorization||'';
  const supplied=header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (header && !supplied) { send(res,401,oaErr('Cabeçalho Authorization inválido.','authentication_error')); return false; }
  if (supplied && !findKey(supplied)) { send(res,401,oaErr('Chave JARVIS inválida ou expirada.','authentication_error')); return false; }
  if (!supplied && !CFG.freeMode) { send(res,401,oaErr('Autenticação necessária.','authentication_error')); return false; }
  return true;
}
async function localChat(req,res) {
  if (!localAuth(req,res)) return;
  const wait=limited('local:'+String(req.socket.remoteAddress||'unknown'));
  if(wait) return send(res,429,oaErr(`Limite atingido. Tente novamente em ${wait}s.`,'rate_limit_error'),{'Retry-After':String(wait)});
  let body; try { body=JSON.parse(await readBody(req)); } catch { return send(res,400,oaErr('JSON inválido.')); }
  const messages=Array.isArray(body.messages)?body.messages:[];
  if(!messages.length) return send(res,400,oaErr('Informe messages.'));
  // Nunca compartilhe o histórico entre visitantes sem um identificador explícito.
  const session=String(body.session_id||body.conversation_id||crypto.randomBytes(16).toString('hex')).slice(0,100);
  if (LOCAL_SESSIONS.size > 2000) LOCAL_SESSIONS.delete(LOCAL_SESSIONS.keys().next().value);
  const prior=LOCAL_SESSIONS.get(session)||[];
  const combined=[...prior,...messages].slice(-30);
  let r; try { r=await localFetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    model:String(body.model||OLLAMA.model),messages:combined,stream:false,
    options:{num_predict:Math.min(Math.max(Number(body.max_tokens)||700,1),2048),temperature:0.7}
  })}); } catch { return send(res,503,oaErr('Ollama indisponível. Inicie o Ollama e confirme a instalação do modelo.','local_engine_unavailable')); }
  if(!r.ok) return send(res,502,oaErr(`Ollama respondeu HTTP ${r.status}. Verifique se o modelo está instalado com: ollama pull ${OLLAMA.model}`,'local_engine_error'));
  const j=await r.json(), answer=j.message?.content||'';
  LOCAL_SESSIONS.set(session,[...combined,{role:'assistant',content:answer}].slice(-30));
  METRICS.requests++;
  return send(res,200,{id:'chatcmpl-local-'+Date.now(),object:'chat.completion',created:Math.floor(Date.now()/1000),model:j.model||OLLAMA.model,choices:[{index:0,message:{role:'assistant',content:answer},finish_reason:'stop'}],usage:{prompt_tokens:j.prompt_eval_count||0,completion_tokens:j.eval_count||0,total_tokens:(j.prompt_eval_count||0)+(j.eval_count||0)},engine:'ollama-local'});
}

const UPSTREAMS = [];
// Ollama local é tentado primeiro quando disponível; não exige API key e tem timeout curto
// para que uma instalação ausente não atrase muito o fallback online gratuito.
if (OLLAMA.enabled) UPSTREAMS.push({
  name: 'ollama-local', url: OLLAMA.url + '/v1', key: '',
  models: [OLLAMA.model], free: true, local: true,
});

if (env('UPSTREAM_KEY')) UPSTREAMS.push({
  name: 'principal',
  url: env('UPSTREAM_URL', 'https://api.z.ai/api/paas/v4').replace(/\/$/, ''),
  key: env('UPSTREAM_KEY'),
  models: [env('UPSTREAM_MODEL', 'glm-4.5-flash'), ...env('UPSTREAM_MODEL_FALLBACK').split(',').map(s => s.trim()).filter(Boolean)],
});
if (env('UPSTREAM2_KEY')) UPSTREAMS.push({
  name: 'reserva',
  url: env('UPSTREAM2_URL', 'https://api.groq.com/openai/v1').replace(/\/$/, ''),
  key: env('UPSTREAM2_KEY'),
  models: [env('UPSTREAM2_MODEL', 'llama-3.3-70b-versatile')],
});
if (env('UPSTREAM3_KEY')) UPSTREAMS.push({
  name: 'reserva-2', url: env('UPSTREAM3_URL', 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
  key: env('UPSTREAM3_KEY'), models: [env('UPSTREAM3_MODEL', 'openai/gpt-4o-mini')],
});
if (env('UPSTREAM4_KEY')) UPSTREAMS.push({
  name: 'reserva-3', url: env('UPSTREAM4_URL', 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/$/, ''),
  key: env('UPSTREAM4_KEY'), models: [env('UPSTREAM4_MODEL', 'gemini-2.0-flash')],
});
if (POLLINATIONS.key) UPSTREAMS.push({
  name: 'pollinations-external', url: POLLINATIONS.base + '/v1', key: POLLINATIONS.key,
  models: [POLLINATIONS.textModel], free: false, externalKey: true,
});

// FREE_MODE é o padrão: não encaminha chamadas para provedores que possam cobrar.
if (CFG.freeMode) {
  for (let i = UPSTREAMS.length - 1; i >= 0; i--) {
    const up = UPSTREAMS[i];
    if (!up.free && !(up.externalKey && CFG.pollinationsAllowInFree)) UPSTREAMS.splice(i, 1);
  }
}

// ---------- armazenamento das keys (só o hash SHA-256 é guardado) ----------
const KEYFILE = env('KEYS_FILE', path.join(ROOT, 'keys.json'));
try { fs.mkdirSync(path.dirname(KEYFILE), { recursive: true }); } catch {}
// O ciclo gratuito usa o horário de Brasília (America/Sao_Paulo): reinicia diariamente às 01:00.
function brazilDayStamp(now = Date.now()) {
  const d = new Date(now - 4 * 60 * 60 * 1000); // desloca o início do dia para 01:00 local
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function nextBrazilReset(now = Date.now()) {
  const local = new Date(now - 3 * 60 * 60 * 1000);
  let target = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 4, 0, 0); // 01:00 BRT = 04:00 UTC
  if (target <= now) target += 86400000;
  return new Date(target);
}
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
let KEYS = [];
try { KEYS = JSON.parse(fs.readFileSync(KEYFILE, 'utf8')); } catch { KEYS = []; }
// Migração: chaves antigas recebem uma validade de 24h a partir da primeira inicialização desta versão.
let keysMigrated = false;
for (const item of KEYS) {
  if (!item.expiresAt) { item.expiresAt = nextBrazilReset().toISOString(); keysMigrated = true; }
  if (item.dailyReset !== brazilDayStamp()) { item.dailyRequests = 0; item.dailyReset = brazilDayStamp(); keysMigrated = true; }
}
KEYS = KEYS.filter(item => !item.expiresAt || Date.now() < Date.parse(item.expiresAt));
const saveKeys = () => { try { fs.writeFileSync(KEYFILE, JSON.stringify(KEYS, null, 2), { mode: 0o600 }); } catch (e) { console.error('Falha ao salvar keys.json:', e.message); } };
function newKey(name = 'default') {
  const key = 'jv-' + crypto.randomBytes(24).toString('base64url');
  const created = new Date();
  KEYS.push({ id: key.slice(0, 11), hash: sha(key), name, created: created.toISOString(), expiresAt: nextBrazilReset(created.getTime()).toISOString(), requests: 0, dailyRequests: 0, dailyReset: brazilDayStamp(created.getTime()), last: null });
  saveKeys();
  return key;
}
const findKey = k => { const h = sha(k); return KEYS.find(x => x.hash === h && (!x.expiresAt || Date.now() < Date.parse(x.expiresAt))); };
// Mantém as cotas diárias alinhadas ao reset de 01:00 mesmo sem novas requisições.
const dailyMaintenance = setInterval(() => {
  const stamp = brazilDayStamp();
  let changed = false;
  for (const item of KEYS) if (item.dailyReset !== stamp) {
    item.dailyReset = stamp; item.dailyRequests = 0; changed = true;
  }
  const before = KEYS.length;
  KEYS = KEYS.filter(item => !item.expiresAt || Date.now() < Date.parse(item.expiresAt));
  if (KEYS.length !== before) changed = true;
  if (changed) saveKeys();
}, 60 * 1000);
dailyMaintenance.unref?.();
if (keysMigrated) saveKeys();

// ---------- CLI ----------
const arg = process.argv[2];
if (arg === '--new-key') { console.log(newKey(process.argv[3] || 'cli')); process.exit(0); }
if (arg === '--list-keys') { KEYS.forEach(k => console.log(k.id + '…', k.name, '| criada', k.created, '| usos', k.requests)); process.exit(0); }
if (arg === '--revoke') {
  const p = process.argv[3] || '', n = KEYS.length;
  if (!p) { console.log('Informe o prefixo da key.'); process.exit(1); }
  KEYS = KEYS.filter(k => !k.id.startsWith(p)); saveKeys(); console.log(`Revogadas: ${n - KEYS.length}`); process.exit(0);
}

// ---------- utilidades ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const PRIVATE = /^(server\.js|keys\.json|\.env.*|package.*\.json|node_modules|\.git.*)$/i;
const isLoopback = req => {
  const a = req.socket.remoteAddress || '';
  return (a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1') && !req.headers['x-forwarded-for'];
};
const send = (res, code, obj, extra = {}) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...cors(), ...extra });
  res.end(JSON.stringify(obj));
};
const cors = () => ({
  'Access-Control-Allow-Origin': CFG.corsOrigin,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
});
const oaErr = (msg, type = 'invalid_request_error', code = null) => ({ error: { message: msg, type, code } });
const readBody = req => new Promise((ok, no) => {
  let n = 0; const ch = [];
  req.on('data', c => { n += c.length; if (n > CFG.maxBody) { no(new Error('corpo grande demais')); req.destroy(); } else ch.push(c); });
  req.on('end', () => ok(Buffer.concat(ch).toString('utf8')));
  req.on('error', no);
});

// limite de requisições por key (janela de 1 minuto)
const WIN = new Map();
const SIGNUP_WIN = new Map();
function signupLimited(ip) {
  const now = Date.now();
  if (SIGNUP_WIN.size > 5000) for (const [key, times] of SIGNUP_WIN) if (!times.some(t => now - t < 3600000)) SIGNUP_WIN.delete(key);
  const a = (SIGNUP_WIN.get(ip) || []).filter(t => now - t < 3600000);
  if (a.length >= 3) return true;
  a.push(now); SIGNUP_WIN.set(ip, a); return false;
}
function limited(id) {
  const now = Date.now();
  if (WIN.size > 10000) for (const [key, times] of WIN) if (!times.length || now - times[times.length - 1] > 120000) WIN.delete(key);
  const w = (WIN.get(id) || []).filter(t => now - t < 60000);
  if (w.length >= CFG.rate) { WIN.set(id, w); return Math.ceil((60000 - (now - w[0])) / 1000); }
  w.push(now); WIN.set(id, w); return 0;
}

function authKey(req) {
  const m = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  return m ? findKey(m[1].trim()) : null;
}

// ---------- proxy para o provedor de IA ----------
async function callUpstream(body) {
  const fails = [];
  for (const up of UPSTREAMS) {
    for (const model of up.models) {
      const b = { ...body, model };
      delete b.user;
      if (up.free) { delete b.temperature; delete b.stream; }
      const url = up.full ? up.url : up.url + '/chat/completions';
      const headers = { 'Content-Type': 'application/json' };
      if (up.key) headers.Authorization = 'Bearer ' + up.key;
      try {
        const ac = new AbortController(), tm = setTimeout(() => ac.abort(), up.local ? OLLAMA.connectTimeout : CFG.timeout);
        let r; try { r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(b), signal: ac.signal }); } finally { clearTimeout(tm); }
        if (r.ok) return { r, up, model, stream: !!b.stream };
        const txt = await r.text().catch(() => '');
        let msg = txt.slice(0, 200);
        try { const j = JSON.parse(txt); msg = j.error?.message || j.message || msg; } catch {}
        fails.push(`${up.name}/${model} → ${r.status}: ${msg}`);
        // modelo inexistente: tenta o próximo modelo do mesmo provedor; senão passa para o próximo provedor
        if ((r.status === 400 || r.status === 404) && /model|模型/i.test(msg)) continue;
        break;
      } catch (e) {
        fails.push(`${up.name} → ${(e.name === 'TimeoutError' || e.name === 'AbortError') ? 'sem resposta (timeout)' : e.message}`);
        break;
      }
    }
  }
  return { fails };
}

async function chat(req, res) {
  const metricStart=Date.now(); METRICS.requests++; METRICS.active++;
  const done=()=>{METRICS.active=Math.max(0,METRICS.active-1);METRICS.lastLatency=Date.now()-metricStart;METRICS.totalLatency+=METRICS.lastLatency;};
  const authHeader = req.headers.authorization || '';
  const k = authKey(req);
  if (authHeader && (!/^Bearer\s+.+$/i.test(authHeader) || !k)) { METRICS.errors++; done(); return send(res, 401, oaErr('API key JARVIS inválida ou expirada.', 'authentication_error', 'invalid_api_key')); }
  const anonId = 'anon:' + String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  if (!k && !CFG.freeMode) { METRICS.errors++; done(); return send(res, 401, oaErr('Autenticação necessária. Ative FREE_MODE=1 para usar o modo gratuito sem chave.', 'authentication_error', 'invalid_api_key')); }
  const wait = limited(k ? k.id : anonId);
  if (wait) { METRICS.errors++; done(); return send(res, 429, oaErr(`Limite de ${CFG.rate} requisições/min atingido. Retry after ${wait}s`, 'rate_limit_error'), { 'Retry-After': String(wait) }); }
  let body;
  try { body = JSON.parse(await readBody(req)); } catch { METRICS.errors++; done(); return send(res, 400, oaErr('JSON inválido no corpo da requisição.')); }
  if (!Array.isArray(body.messages) || !body.messages.length) { METRICS.errors++; done(); return send(res, 400, oaErr('"messages" é obrigatório.')); }
  if (!UPSTREAMS.length) { METRICS.errors++; done(); return send(res, 503, oaErr('O serviço gratuito não está disponível/configurado. Verifique a conexão e FREE_MODE/DISABLE_FREE_FALLBACK no .env.', 'server_error')); }

  if (!(body.max_tokens > 0) || body.max_tokens > CFG.maxTok * 2) body.max_tokens = CFG.maxTok;
  delete body.max_completion_tokens;
  if (k) {
    const stamp = brazilDayStamp();
    if (k.dailyReset !== stamp) { k.dailyReset = stamp; k.dailyRequests = 0; }
    k.requests = (k.requests || 0) + 1; k.dailyRequests = (k.dailyRequests || 0) + 1;
    k.last = new Date().toISOString(); saveKeys();
  }
  const out = await callUpstream(body);
  if (!out.r) { METRICS.errors++; done(); return send(res, 502, oaErr('Todos os provedores de IA falharam: ' + out.fails.join(' | '), 'upstream_error')); }

  done();
  const ct = out.r.headers.get('content-type') || 'application/json';
  res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no', 'X-Jarves-Upstream': out.up.name, ...cors() });
  if (out.stream && out.r.body && ct.includes('event-stream')) {
    const s = Readable.fromWeb(out.r.body);
    req.on('close', () => s.destroy());
    s.on('error', () => res.end());
    s.pipe(res);
  } else {
    res.end(Buffer.from(await out.r.arrayBuffer()));
  }
}

// ---------- V24: métricas e exportação ZIP segura ----------
const METRICS = { startedAt: Date.now(), requests: 0, errors: 0, active: 0, totalLatency: 0, lastLatency: 0 };
function crc32(buf) {
  let c = -1;
  for (const b of buf) { c ^= b; for (let k=0;k<8;k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); }
  return (c ^ -1) >>> 0;
}
function makeZip(files) {
  const locals=[], centrals=[]; let offset=0;
  for (const f of files) {
    const name=Buffer.from(f.name.replace(/\\/g,'/'),'utf8'), data=Buffer.from(f.content,'utf8');
    const compressed=zlib.deflateRawSync(data), crc=crc32(data), now=new Date();
    const dosTime=(now.getHours()<<11)|(now.getMinutes()<<5)|(Math.floor(now.getSeconds()/2));
    const dosDate=((Math.max(1980,now.getFullYear())-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
    const h=Buffer.alloc(30); h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0,6);h.writeUInt16LE(8,8);h.writeUInt16LE(dosTime,10);h.writeUInt16LE(dosDate,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(compressed.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(name.length,26);h.writeUInt16LE(0,28);
    locals.push(h,name,compressed);
    const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0,8);c.writeUInt16LE(8,10);c.writeUInt16LE(dosTime,12);c.writeUInt16LE(dosDate,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt16LE(0,30);c.writeUInt16LE(0,32);c.writeUInt16LE(0,34);c.writeUInt16LE(0,36);c.writeUInt32LE(0,38);c.writeUInt32LE(offset,42);
    centrals.push(c,name); offset+=h.length+name.length+compressed.length;
  }
  const central=Buffer.concat(centrals), end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(0,4);end.writeUInt16LE(0,6);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);end.writeUInt16LE(0,20);
  return Buffer.concat([...locals,central,end]);
}

// ---------- servidor ----------
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const p = u.pathname;
    if (req.method === 'OPTIONS') { res.writeHead(204, cors()); return res.end(); }


    // API pública do JARVIS FREE AI ENGINE
    if (p === '/api/ai/status' && req.method === 'GET') {
      const st=await ollamaStatus();
      return send(res,200,{ok:st.online,api:'online',engine:'ollama',...st,offlineCapable:true});
    }
    if (p === '/api/ai/models' && req.method === 'GET') {
      const st=await ollamaStatus();
      return send(res,st.online?200:503,{engine:'ollama',active:OLLAMA.model,models:st.installed||[],modelReady:!!st.modelReady,online:!!st.online});
    }
    if (p === '/api/ai/chat' && req.method === 'POST') return await localChat(req,res);
    if (p === '/api/ai/image' && req.method === 'POST') {
      if (!localAuth(req,res)) return;
      if (!POLLINATIONS.key) return send(res,503,oaErr('Geração externa de imagens não configurada. Adicione POLLINATIONS_API_KEY no .env do servidor.','provider_not_configured'));
      let b; try { b=JSON.parse(await readBody(req)); } catch { return send(res,400,oaErr('JSON inválido.')); }
      const prompt=String(b.prompt||'').trim();
      if (!prompt || prompt.length>4000) return send(res,400,oaErr('Descreva a imagem (máximo 4.000 caracteres).'));
      const width=Math.min(1536,Math.max(256,Math.round(Number(b.width)||1024)));
      const height=Math.min(1536,Math.max(256,Math.round(Number(b.height)||1024)));
      const model=String(b.model||POLLINATIONS.imageModel).slice(0,120);
      const target=POLLINATIONS.base+'/image/'+encodeURIComponent(prompt)+'?'+new URLSearchParams({model,width:String(width),height:String(height),nologo:'true'});
      const ac=new AbortController(), timer=setTimeout(()=>ac.abort(),POLLINATIONS.timeout);
      try {
        const upstream=await fetch(target,{headers:{Authorization:'Bearer '+POLLINATIONS.key,Accept:'image/*'},signal:ac.signal});
        if(!upstream.ok){const msg=(await upstream.text().catch(()=>'' )).slice(0,500);return send(res,502,oaErr(`Provedor de imagens respondeu HTTP ${upstream.status}: ${msg||'sem detalhes'}`,'image_provider_error'));}
        const type=upstream.headers.get('content-type')||'application/octet-stream';
        if(!type.startsWith('image/')) return send(res,502,oaErr('O provedor não retornou um arquivo de imagem válido.','invalid_image_response'));
        const bytes=Buffer.from(await upstream.arrayBuffer());
        if(!bytes.length||bytes.length>25*1024*1024) return send(res,502,oaErr('Imagem vazia ou maior que o limite de 25 MB.','image_size_error'));
        res.writeHead(200,{...cors(),'Content-Type':type,'Content-Length':bytes.length,'Cache-Control':'no-store','X-Jarvis-Provider':'pollinations'});return res.end(bytes);
      } catch(e) { return send(res,e.name==='AbortError'?504:502,oaErr(e.name==='AbortError'?'Tempo limite ao gerar imagem. Tente novamente.':`Falha de conexão com o provedor: ${e.message}`,'image_provider_unavailable')); }
      finally { clearTimeout(timer); }
    }
    if (p === '/api/ai/generate' && req.method === 'POST') {
      if(!localAuth(req,res)) return;
      let b; try{b=JSON.parse(await readBody(req));}catch{return send(res,400,oaErr('JSON inválido.'));}
      if(typeof b.prompt!=='string'||!b.prompt.trim()||b.prompt.length>12000) return send(res,400,oaErr('Prompt obrigatório (máximo 12.000 caracteres).'));
      let r; try { r=await localFetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:String(b.model||OLLAMA.model),prompt:b.prompt,stream:false,options:{num_predict:Math.min(Number(b.max_tokens)||700,2048)}})}); } catch { return send(res,503,oaErr('Ollama indisponível. Inicie o motor local.','local_engine_unavailable')); }
      if(!r.ok)return send(res,502,oaErr(`Falha do Ollama: HTTP ${r.status}`));
      const j=await r.json(); return send(res,200,{ok:true,model:j.model||OLLAMA.model,response:j.response||'',done:j.done});
    }
    if (p === '/api/ai/reset' && req.method === 'POST') {
      if(!localAuth(req,res)) return;
      let b={};try{b=JSON.parse(await readBody(req));}catch{}
      if(b.session_id) LOCAL_SESSIONS.delete(String(b.session_id).slice(0,100)); else LOCAL_SESSIONS.clear();
      return send(res,200,{ok:true,message:'Histórico em memória reiniciado.'});
    }

    if (p === '/v1/metrics') return send(res, 200, { ...METRICS, uptimeSeconds: Math.round((Date.now()-METRICS.startedAt)/1000), configuredProviders: UPSTREAMS.map(x=>x.name) });
    if (p === '/v1/health') { const local = await ollamaStatus(); return send(res, 200, { ok: true, name: 'jarves-gateway', version: '27.1.0', cloud: !isLoopback(req), providers: UPSTREAMS.map(x => x.name), upstream: UPSTREAMS.some(x => !x.free), free: CFG.freeFallback, freeMode: CFG.freeMode, openKeys: CFG.freeMode, publicSignup: CFG.publicSignup, localEngine: local, aiConfigured: local.online || UPSTREAMS.some(x => !x.local), dailyResetAt: nextBrazilReset().toISOString(), timezone: 'America/Sao_Paulo' }); }
    if (p === '/v1/providers') return send(res, 200, { providers: UPSTREAMS.map(x => ({ name: x.name, free: !!x.free, configured: !!(x.key || x.free) })), externalImage: { provider: 'pollinations', configured: !!POLLINATIONS.key, model: POLLINATIONS.imageModel } });
    if (p === '/v1/models') return send(res, 200, { object: 'list', data: [{ id: 'jarves-auto', object: 'model', owned_by: 'jarves' }] });

    if (p === '/v1/keys' && req.method === 'POST') {
      const authHeader = req.headers.authorization || '';
      const tok = authHeader.replace(/^Bearer\s+/i, '');
      const allowed = CFG.adminToken ? tok === CFG.adminToken : isLoopback(req);
      const publicAllowed = CFG.publicSignup && !CFG.adminToken;
      if (!allowed && !publicAllowed) return send(res, 403, oaErr(CFG.adminToken ? 'ADMIN_TOKEN inválido.' : 'Geração remota desativada. Ative PUBLIC_SIGNUP=1 para cadastro público limitado.', 'permission_error'));
      if (publicAllowed) { const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim(); if (signupLimited(ip)) return send(res, 429, oaErr('Limite de criação de sessões atingido. Tente novamente em uma hora.', 'rate_limit_error'), { 'Retry-After': '3600' }); }
      let nm = 'browser'; try { nm = String(JSON.parse(await readBody(req)).name || nm).slice(0, 40); } catch {}
      const key = newKey(nm);
      const record = findKey(key);
      return send(res, 200, { key, expiresAt: record.expiresAt, expiresInSeconds: Math.max(60, Math.floor((Date.parse(record.expiresAt)-Date.now())/1000)), resetAt: record.expiresAt, note: 'API key JARVES válida até o reset diário das 01:00 (horário de Brasília).' });
    }

    // Renova a API key própria do JARVES a cada 24h, sem criar uma nova inscrição pública.
    if (p === '/v1/keys/rotate' && req.method === 'POST') {
      const oldKey = authKey(req);
      if (!oldKey) return send(res, 401, oaErr('API key JARVES inválida ou expirada. Solicite uma nova chave.', 'authentication_error', 'invalid_api_key'));
      let nm = oldKey.name || 'browser';
      try { const body = JSON.parse(await readBody(req)); if (body.name) nm = String(body.name).slice(0, 40); } catch {}
      const key = newKey(nm);
      const record = findKey(key);
      KEYS = KEYS.filter(x => x.hash !== oldKey.hash);
      saveKeys();
      return send(res, 200, { key, expiresAt: record.expiresAt, expiresInSeconds: Math.max(60, Math.floor((Date.parse(record.expiresAt)-Date.now())/1000)), resetAt: record.expiresAt, rotated: true, note: 'API key JARVES renovada até o próximo reset diário das 01:00 (horário de Brasília).' });
    }

    if (p === '/v1/public-config') return send(res, 200, { googleClientId: CFG.googleClientId || '' });

    if (p === '/v1/auth/google' && req.method === 'POST') {
      if (!CFG.googleClientId) return send(res, 400, oaErr('GOOGLE_CLIENT_ID não configurado no .env do servidor.'));
      let cred = ''; try { cred = String(JSON.parse(await readBody(req)).credential || ''); } catch {}
      if (!cred) return send(res, 400, oaErr('credential ausente.'));
      let r, j;
      try { r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(cred), { signal: AbortSignal.timeout(8000) }); j = await r.json().catch(() => ({})); }
      catch { return send(res, 502, oaErr('Não foi possível validar o login com o Google agora (servidor sem acesso à internet?).', 'upstream_error')); }
      if (!r.ok || j.aud !== CFG.googleClientId || !(j.email_verified === 'true' || j.email_verified === true)) return send(res, 401, oaErr('Login Google inválido ou de outro app.', 'authentication_error'));
      return send(res, 200, { ok: true, sub: j.sub, email: j.email, name: j.name || j.email, picture: j.picture || '' });
    }

    if (p === '/v1/projects/export' && req.method === 'POST') {
      const exportKey = authKey(req);
      if (!exportKey && !CFG.freeMode) return send(res, 401, oaErr('Autenticação necessária.', 'authentication_error'));
      const exportIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
      const exportWait = limited(exportKey ? exportKey.id : 'export:' + exportIp);
      if (exportWait) return send(res, 429, oaErr(`Limite de exportações atingido. Tente novamente em ${exportWait}s.`, 'rate_limit_error'), {'Retry-After':String(exportWait)});
      let data; try { data=JSON.parse(await readBody(req)); } catch { return send(res,400,oaErr('JSON inválido.')); }
      if (!Array.isArray(data.files) || !data.files.length || data.files.length>200) return send(res,400,oaErr('Envie entre 1 e 200 arquivos.'));
      let total=0; const files=[];
      for (const f of data.files) {
        const name=String(f.name||'').replace(/\\/g,'/');
        if (!name || name.startsWith('/') || name.split('/').some(x=>!x || x==='..' || (x.startsWith('.') && x!=='.env.example'))) return send(res,400,oaErr('Caminho de arquivo inválido.'));
        const content=String(f.content??''); total+=Buffer.byteLength(content);
        if (total>8*1024*1024) return send(res,413,oaErr('Projeto excede 8 MB.'));
        files.push({name,content});
      }
      const zip=makeZip(files); res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="jarves-project.zip"','Content-Length':zip.length,...cors()}); return res.end(zip);
    }
    if (p === '/v1/chat/completions' && req.method === 'POST') return await chat(req, res);
    if (p.startsWith('/v1/')) return send(res, 404, oaErr('Rota não encontrada: ' + p));

    // arquivos estáticos
    let rel = decodeURIComponent(p === '/' ? '/index.html' : p).replace(/^\/+/, '');
    const fp = path.resolve(ROOT, rel);
    if (!fp.startsWith(ROOT + path.sep) || rel.split('/').some(s => PRIVATE.test(s) || s.startsWith('.') && s !== '.well-known')) { res.writeHead(404); return res.end('Not found'); }
    fs.stat(fp, (e, st) => {
      if (e || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
      const ext = path.extname(fp).toLowerCase(), gz = /gzip/.test(req.headers['accept-encoding'] || '') && /\.(html|js|css|json|svg|webmanifest)$/.test(ext);
      const h = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : /\.(png|svg)$/.test(ext) ? 'public, max-age=604800' : 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()', Vary: 'Accept-Encoding' };
      if (gz) h['Content-Encoding'] = 'gzip'; else h['Content-Length'] = st.size;
      res.writeHead(200, h);
      const rs = fs.createReadStream(fp); gz ? rs.pipe(zlib.createGzip({ level: 6 })).pipe(res) : rs.pipe(res);
    });
  } catch (e) {
    if (!res.headersSent) send(res, 500, oaErr('Erro interno: ' + e.message, 'server_error')); else res.end();
  }
});

server.listen(CFG.port, CFG.host, () => {
  console.log(`\nJARVES AI V27 Gateway rodando na porta ${CFG.port} (host ${CFG.host})`);
  console.log('Provedores:', UPSTREAMS.length ? UPSTREAMS.map(u => u.name + (u.free ? ' (local/gratuito)' : ' (chave externa)')).join(' → ') : 'NENHUM — configure Ollama ou uma chave de provedor');
  console.log('Pollinations imagens:', POLLINATIONS.key ? 'configurado' : 'não configurado (adicione POLLINATIONS_API_KEY ao .env)');
  if (!UPSTREAMS.some(u => !u.free)) console.log('⚠ Sem UPSTREAM_KEY: só o servidor gratuito (pode falhar/limitar). Copie .env.example para .env e coloque sua chave.');
  if (!KEYS.length) {
    const k = newKey('primeira-key');
    console.log('\n🔑 Sua primeira API key JARVES (guarde, não será mostrada de novo):\n   ' + k + '\n   (o site também gera uma sozinho em Settings → Gerar minha API key)');
  }
  console.log('');
});
