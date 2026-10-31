'use strict';
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const port = 31000 + Math.floor(Math.random() * 20000);
const keys = path.join(os.tmpdir(), `jarves-v27-${process.pid}.json`);
const child = spawn(process.execPath, ['server.js'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', FREE_MODE: '1', PUBLIC_SIGNUP: '1', KEYS_FILE: keys, OLLAMA_ENABLED: '0' }, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  try {
    let health;
    for (let i=0;i<40;i++) { try { const r=await fetch(base+'/v1/health'); if(r.ok){health=await r.json();break;} } catch {} await sleep(100); }
    if (!health || health.version !== '27.1.0' || health.timezone !== 'America/Sao_Paulo') throw new Error('health/version/timezone failed');
    const bad = await fetch(base+'/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer definitely-invalid','Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'test'}]})});
    if (bad.status !== 401) throw new Error(`invalid API key should be 401, got ${bad.status}`);
    const signup = await fetch(base+'/v1/keys',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'smoke'})});
    const data = await signup.json();
    if (!signup.ok || !data.key || !data.expiresAt) throw new Error('public key signup failed');
    const rotated = await fetch(base+'/v1/keys/rotate',{method:'POST',headers:{Authorization:`Bearer ${data.key}`,'Content-Type':'application/json'},body:JSON.stringify({name:'smoke-rotated'})});
    const rotatedData = await rotated.json();
    if (!rotated.ok || !rotatedData.key || !rotatedData.rotated) throw new Error('key rotation failed');
    const imageNoKey = await fetch(base+'/api/ai/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'test image'})});
    const imageError = await imageNoKey.json();
    if (imageNoKey.status !== 503 || !String(imageError.error?.message||'').includes('POLLINATIONS_API_KEY')) throw new Error('image provider setup diagnostic failed');
    console.log('PASS: health, version, timezone, invalid-key rejection, signup, key rotation and external-image setup diagnostic');
  } catch (e) { console.error('FAIL:',e.message); process.exitCode=1; }
  finally { child.kill(); try{fs.unlinkSync(keys)}catch{} }
})();
