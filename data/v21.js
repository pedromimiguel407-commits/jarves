/* JARVES v21 — conta (login Google/local), terminal, modo celular,
   autocorreção de texto e proteção contra o "erro vermelho". Carregado depois de script.js. */
(()=>{
'use strict';
const Q=(s,r=document)=>r.querySelector(s);
const JSONH={'Content-Type':'application/json'};

/* ------------------------------------------------------------------ erros */
// Erros de "tela antiga" (usuário trocou de aba enquanto algo assíncrono terminava) não viram mais alerta.
const STALE=/Cannot (read|set) propert|null \(reading|undefined \(reading|is null|is undefined|not iterable|Failed to execute '(showModal|close)'/i;
window.JARVES_ERRORS=window.JARVES_ERRORS||[];
const swallow=(m,e)=>{window.JARVES_ERRORS.push({m,t:Date.now()});window.JARVES_ERRORS=window.JARVES_ERRORS.slice(-50);console.warn('[jarves] erro interno ignorado:',m);if(e&&e.preventDefault)e.preventDefault()};
addEventListener('error',e=>{if(STALE.test(String(e.message)))swallow(e.message,e)});
addEventListener('unhandledrejection',e=>{const m=String(e.reason&&e.reason.message||e.reason||'');if(STALE.test(m)||/AbortError|aborted/i.test(m))swallow(m,e)});

/* --------------------------------------------------- configuração pública */
let PC={googleClientId:'',server:false};
const loadPC=async()=>{try{if(!location.protocol.startsWith('http'))return;const r=await fetch(location.origin+'/v1/public-config',{cache:'no-store'});if(r.ok)PC={...PC,...await r.json(),server:true}}catch{}};
const GCID=()=>LS.get('gcid','')||PC.googleClientId||(window.JARVES_CONFIG&&JARVES_CONFIG.googleClientId)||'';

/* ---------------------------------------------------------- abas de negócio */

/* --------------------------------------------------------------- conta */
const U=()=>LS.get('user',null);
const hash53=(s,seed=0)=>{let h1=0xdeadbeef^seed,h2=0x41c6ce57^seed;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}h1=Math.imul(h1^h1>>>16,2246822507)^Math.imul(h2^h2>>>13,3266489909);h2=Math.imul(h2^h2>>>16,2246822507)^Math.imul(h1^h1>>>13,3266489909);return(4294967296*(2097151&h2)+(h1>>>0)).toString(36)};
async function pwHash(pw,salt){try{if(crypto&&crypto.subtle){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);const b=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:120000},k,256);return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}}catch{}return hash53(salt+pw)+hash53(pw+salt,7)}
const b64json=t=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(t.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));

function login(u){LS.set('user',u);Q('#auth')&&Q('#auth').remove();chip();toast('Bem-vindo, '+(u.name||'visitante')+'!');log('Login: '+(u.provider||'visitante'))}
function logout(){LS.set('user',null);chip();authUI();log('Logout')}
function chip(){const b=Q('#uchip');if(!b)return;const u=U();b.innerHTML=u&&!u.guest?`${u.picture?`<img src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer" style="width:18px;height:18px;border-radius:50%;vertical-align:-4px;margin-right:6px">`:'👤 '}${esc((u.name||u.email||'').split(' ')[0])}`:'👤 Entrar'}

async function onGoogle(resp){
  let prof=null;
  try{if(PC.server){const r=await fetch(location.origin+'/v1/auth/google',{method:'POST',headers:JSONH,body:JSON.stringify({credential:resp.credential})});if(r.ok){prof=await r.json();prof.verified=true}}}catch{}
  if(!prof){try{const p=b64json(resp.credential.split('.')[1]);prof={email:p.email,name:p.name||p.email,picture:p.picture||'',verified:false}}catch{return toast('Não foi possível ler o login do Google.',1)}}
  login({email:prof.email,name:prof.name,picture:prof.picture,provider:'google',verified:!!prof.verified})}

let gisLoading=null;
function loadGIS(){if(window.google&&google.accounts&&google.accounts.id)return Promise.resolve();if(gisLoading)return gisLoading;gisLoading=new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=ok;s.onerror=()=>{gisLoading=null;no(new Error('Sem acesso ao Google (verifique a internet).'))};document.head.append(s)});return gisLoading}
async function drawGoogle(host){
  host.innerHTML='';
  if(!GCID()){const b=document.createElement('button');b.className='btn ghost';b.style.width='100%';b.innerHTML='<b style="color:#4285f4">G</b> Entrar com Google';b.onclick=()=>googleSetup();host.append(b);return}
  try{await loadGIS();google.accounts.id.initialize({client_id:GCID(),callback:onGoogle,auto_select:false,ux_mode:'popup'});google.accounts.id.renderButton(host,{theme:'filled_black',size:'large',shape:'pill',text:'signin_with',width:Math.min(300,host.clientWidth||300)})}
  catch(e){host.innerHTML=`<div class="note">${esc(e.message)}</div>`}}
function googleSetup(){
  const d=dialog(`<b>Ativar login com Google</b><p class="note">1) No Google Cloud Console → APIs e serviços → Credenciais → <i>Criar ID do cliente OAuth</i> (tipo <b>Aplicativo da Web</b>).<br>2) Em <i>Origens JavaScript autorizadas</i> coloque: <code>${esc(location.origin)}</code><br>3) Cole abaixo o <b>Client ID</b> (termina em .apps.googleusercontent.com). Para validar o login no servidor, ponha o mesmo valor em <code>GOOGLE_CLIENT_ID</code> no .env.</p><input id="gc" placeholder="123456-abc.apps.googleusercontent.com" value="${esc(LS.get('gcid',''))}"><div class="row" style="margin-top:10px"><button class="btn" id="gs">Salvar</button><button class="btn ghost" id="gx">Cancelar</button></div>`);
  Q('#gx',d).onclick=()=>d.close();
  Q('#gs',d).onclick=()=>{const v=Q('#gc',d).value.trim();if(v&&!/\.apps\.googleusercontent\.com$/.test(v))return toast('Esse não parece um Client ID do Google.',1);LS.set('gcid',v);d.close();const h=Q('#gbtn');if(h)drawGoogle(h);toast(v?'Client ID salvo.':'Client ID removido.')}}

function authUI(){
  if(Q('#auth'))return;
  const o=document.createElement('div');o.id='auth';
  o.innerHTML=`<div class="glass authbox"><img class="logo" src="assets/icon.svg" alt="" style="width:56px;height:56px;margin:0 auto 8px;display:block"><h2 style="margin:0;text-align:center">Entrar no JARVES AI</h2><p class="note" style="text-align:center;margin:4px 0 14px">Use sua conta Google ou crie uma conta neste aparelho.</p>
  <div id="gbtn" style="display:flex;justify-content:center;margin-bottom:10px"></div>
  <div class="note" style="text-align:center;margin:6px 0">— ou com e-mail —</div>
  <input id="ae" type="email" placeholder="seu@email.com" autocomplete="email" data-nofix="1"><input id="ap" type="password" placeholder="senha (mín. 6 caracteres)" autocomplete="current-password" style="margin-top:8px" data-nofix="1">
  <div class="row" style="margin-top:10px"><button class="btn grow" id="al">Entrar</button><button class="btn ghost grow" id="ar">Criar conta</button></div>
  <div id="am" class="note" style="min-height:18px;margin-top:6px;text-align:center"></div>
  <button class="btn ghost" id="ag" style="width:100%;margin-top:6px">Continuar como visitante</button>
  <p class="note" style="font-size:11px;margin:10px 0 0">Contas por e-mail ficam salvas só neste navegador (senha com hash). O login Google é validado pelo servidor quando o GOOGLE_CLIENT_ID está no .env.</p></div>`;
  document.body.append(o);
  const msg=t=>Q('#am',o).textContent=t,em=()=>Q('#ae',o).value.trim().toLowerCase(),pw=()=>Q('#ap',o).value;
  drawGoogle(Q('#gbtn',o));
  Q('#ar',o).onclick=async()=>{const e=em(),p=pw();if(!/^\S+@\S+\.\S+$/.test(e))return msg('Digite um e-mail válido.');if(p.length<6)return msg('A senha precisa ter pelo menos 6 caracteres.');const A=LS.get('accts',{});if(A[e])return msg('Esse e-mail já tem conta. Clique em Entrar.');const salt=Math.random().toString(36).slice(2);A[e]={salt,h:await pwHash(p,salt),name:e.split('@')[0]};LS.set('accts',A);login({email:e,name:A[e].name,provider:'local'})};
  Q('#al',o).onclick=async()=>{const e=em(),p=pw(),A=LS.get('accts',{}),a=A[e];if(!a)return msg('Conta não encontrada. Clique em Criar conta.');if(await pwHash(p,a.salt)!==a.h)return msg('Senha incorreta.');login({email:e,name:a.name,provider:'local'})};
  Q('#ag',o).onclick=()=>login({guest:1,name:'visitante',provider:'visitante'});
  Q('#ap',o).onkeydown=ev=>{if(ev.key==='Enter')Q('#al',o).click()}}

/* --------------------------------------------------------- modo celular */
const UIM=()=>LS.get('ui','auto');
function isMob(){const m=UIM();return m==='on'||(m==='auto'&&matchMedia('(max-width:820px)').matches)}
function applyUI(){const mob=isMob();document.documentElement.dataset.ui=mob?'mobile':'desktop';const b=Q('#uimode');if(b){b.textContent=mob?'📱':'🖥️';b.title='Interface: '+(mob?'celular':'desktop')+' (toque para trocar)'}if(mob)Q('#side')&&Q('#side').classList.remove('open')}
function cycleUI(){const mob=isMob();LS.set('ui',mob?'off':'on');applyUI();toast(mob?'Interface de computador':'Interface de celular')}
matchMedia('(max-width:820px)').addEventListener&&matchMedia('(max-width:820px)').addEventListener('change',()=>{if(UIM()==='auto')applyUI()});

/* ------------------------------------------------ autocorreção do que digito */
const FIXW={nao:'não',voce:'você',voces:'vocês',vc:'você',vcs:'vocês',tb:'também',tbm:'também',tambem:'também',pq:'porque',entao:'então',oq:'o que',ola:'olá',mt:'muito',mto:'muito',msm:'mesmo',hj:'hoje',td:'tudo',tds:'todos',obg:'obrigado',vlw:'valeu',blz:'beleza',qnd:'quando',qdo:'quando',dps:'depois',agr:'agora',aq:'aqui',ngm:'ninguém',algm:'alguém',estao:'estão',sao:'são',ja:'já',tao:'tão',porem:'porém',alem:'além',apos:'após',proximo:'próximo',unico:'único',ultimo:'último',rapido:'rápido',facil:'fácil',dificil:'difícil',util:'útil',codigo:'código',pagina:'página',musica:'música',numero:'número',ingles:'inglês',portugues:'português',teh:'the',adn:'and',recieve:'receive',definately:'definitely',seperate:'separate',wich:'which'};
const SUF=[[/(\p{L}{2,})coes$/u,'$1ções'],[/(\p{L}{2,})cao$/u,'$1ção'],[/(\p{L}{2,})xao$/u,'$1xão']];
const DUP=new Set(['de','da','do','em','um','uma','para','com','eu','você','na','no']);
const fixWord=w=>{const l=w.toLowerCase();let r=FIXW[l];if(!r){for(const[rx,to]of SUF){if(rx.test(l)){r=l.replace(rx,to);break}}}if(!r)return w;if(w===w.toUpperCase()&&w.length>2)return r.toUpperCase();if(w[0]!==w[0].toLowerCase())return r[0].toUpperCase()+r.slice(1);return r};
function autofix(e){
  const el=e.target;if(!el||!(el.matches&&el.matches('textarea,input[type=text],input:not([type])')))return;
  if(!LS.get('autofix',1)||e.isComposing||el.dataset.nofix||el.closest('.ed,#dlg .ed')||el.dataset.code)return;
  if(e.inputType!=='insertText'&&e.inputType!=='insertLineBreak')return;
  if(!(e.inputType==='insertLineBreak'||/^[\s.,;:!?)]$/.test(e.data||'')))return;
  const pos=el.selectionStart,v=el.value;if(pos!==el.selectionEnd)return;
  const delim=e.inputType==='insertLineBreak'?'\n':v[pos-1],head=v.slice(0,pos-1),tail=v.slice(pos);
  const m=head.match(/(\p{L}+)$/u);if(!m)return;
  let word=m[1],before=head.slice(0,head.length-word.length);
  if(/[\/@#._:\\-]$/.test(before)||/https?:\/\/\S*$/.test(head))return; // comandos, e-mails, links
  let nw=fixWord(word);
  if(/(^|[.!?]\s+|\n\s*)$/.test(before)&&!/^\/|^```/.test(before.trim())&&nw[0]===nw[0].toLowerCase()&&/\p{L}/u.test(nw[0]))nw=nw[0].toUpperCase()+nw.slice(1);
  const pm=before.match(/(\p{L}+)\s+$/u);if(pm&&DUP.has(nw.toLowerCase())&&pm[1].toLowerCase()===nw.toLowerCase()&&delim===' '){before=before.slice(0,before.length-pm[0].length)}
  const out=before+nw+delim,caret=out.length;
  if(out+tail===v)return;
  el.value=out+tail;el.setSelectionRange(caret,caret)}
document.addEventListener('input',autofix);
// corretor do navegador também ligado nos campos de texto comuns (menos editores de código)
new MutationObserver(()=>{document.querySelectorAll('#view textarea:not([data-fixed]),#view input[type=text]:not([data-fixed])').forEach(el=>{el.dataset.fixed=1;if(el.closest('.ed')||el.id==='ft'||el.id==='tcmd')return;el.spellcheck=true;el.setAttribute('lang','pt-BR');el.setAttribute('autocapitalize','sentences')})}).observe(document.body,{childList:true,subtree:true});

// "Corrigir com IA ao enviar" (opcional): corrige a mensagem inteira antes de enviar, sem atrasar mais de 6 s
async function aiFixText(t){const a=await Promise.race([askAI([{role:'user',content:t}],'Você é um revisor. Corrija ortografia, acentuação, pontuação e gramática SEM mudar sentido nem idioma e sem acrescentar nada. Responda SOMENTE com o texto corrigido.'),new Promise((_,no)=>setTimeout(()=>no(new Error('t')),6000))]);const r=String(a).trim();return r&&r.length<t.length*1.6+40?r:t}
async function interceptSend(ev){
  const inp=Q('#in');if(!inp||!LS.get('aifix',0)||!ready())return;
  if(inp.dataset.done){delete inp.dataset.done;return}
  const t=inp.value.trim();if(t.length<8||t[0]==='/')return;
  ev.preventDefault();ev.stopImmediatePropagation();
  try{inp.value=await aiFixText(t)}catch{}
  inp.dataset.done=1;Q('#sd').click()}
document.addEventListener('keydown',ev=>{if(ev.target&&ev.target.id==='in'&&ev.key==='Enter'&&!ev.shiftKey)interceptSend(ev)},true);
document.addEventListener('click',ev=>{if(ev.target&&ev.target.id==='sd')interceptSend(ev)},true);

/* --------------------------------------------------------------- conta */
const toggle=(id,label,on,hint='')=>`<label style="display:flex;gap:10px;align-items:flex-start;margin:8px 0;font-size:14px;color:var(--t)"><input type="checkbox" id="${id}" ${on?'checked':''} style="width:auto;margin-top:4px"><span>${label}${hint?`<br><span class="note">${hint}</span>`:''}</span></label>`;

const CONTA={n:'CONTA',d:'',r(){
  const u=U();
  return `<div style="display:grid;gap:14px;max-width:820px">
  <div class="glass"><b>👤 Conta</b><div style="margin:8px 0">${u&&!u.guest?`${u.picture?`<img src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer" style="width:42px;height:42px;border-radius:50%;vertical-align:middle;margin-right:10px">`:''}<b>${esc(u.name||'')}</b> <span class="note">${esc(u.email||'')} · ${u.provider==='google'?'Google'+(u.verified?' ✔ verificado':' (não verificado no servidor)'):'conta local'}</span>`:'<span class="note">Você está como visitante.</span>'}</div>
  <div class="row">${u&&!u.guest?'<button class="btn ghost" id="co">Sair</button>':'<button class="btn" id="ci">Entrar / criar conta</button>'}<button class="btn ghost" id="cg">⚙ Configurar login Google</button></div></div>
  <div class="glass"><b>⚙ Opções do assistente</b>
   ${toggle('o1','📋 Planejar antes de criar',LS.get('plan',1)==1,'Em pedidos de jogo, modelo 3D/2D e textura, a IA primeiro mostra um plano e faz perguntas; só depois cria. (Diga “pode fazer” para pular.)')}
   ${toggle('o2','✏️ Autocorreção ao digitar',LS.get('autofix',1)==1,'Corrige acentos e abreviações comuns (nao→não, vc→você) e maiúsculas no começo das frases.')}
   ${toggle('o3','✨ Corrigir com IA ao enviar',LS.get('aifix',0)==1,'Revisa ortografia e gramática da mensagem antes de enviar (espera no máximo 6 s).')}
   <label>Interface</label><select id="o4"><option value="auto">Automática (pelo tamanho da tela)</option><option value="on">📱 Celular</option><option value="off">🖥️ Computador</option></select></div></div>`},
b(){
  const u=U();
  Q('#co')&&(Q('#co').onclick=logout);Q('#ci')&&(Q('#ci').onclick=authUI);Q('#cg').onclick=googleSetup;
  Q('#o1').onchange=e=>LS.set('plan',e.target.checked?1:0);Q('#o2').onchange=e=>LS.set('autofix',e.target.checked?1:0);Q('#o3').onchange=e=>LS.set('aifix',e.target.checked?1:0);
  Q('#o4').value=UIM();Q('#o4').onchange=e=>{LS.set('ui',e.target.value);applyUI()}}};

/* ------------------------------------------------------------- terminal */
const TERM={n:'TERMINAL',d:'',r(){return `<div class="glass term"><div id="tout"></div><div class="tin"><span id="tps">jarves&gt;</span><input id="tcmd" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="digite um comando ou uma pergunta (ajuda)" data-nofix="1"></div></div>`},
b(){
  const out=Q('#tout'),inp=Q('#tcmd');let hist=LS.get('thist',[]),hi=hist.length,conv=[],last='',busy=null;
  const P=(t,c='')=>{const d=document.createElement('div');if(c)d.className=c;d.textContent=t;out.append(d);out.scrollTop=1e9;return d};
  const tabs=()=>Object.keys(M);
  const findTab=x=>{x=String(x||'').toLowerCase().trim();return tabs().find(k=>k===x||M[k].n.toLowerCase()===x||M[k].n.toLowerCase().replace(/[^a-z0-9]+/g,'')===x.replace(/[^a-z0-9]+/g,''))};
  const files=async()=>[...await fAll(),...REF.values()];
  const onoff=a=>!/^(off|desl|0|nao|não|n)$/i.test(a||'on');
  const T={
   ajuda:()=>`Comandos:
 ajuda · limpar · data · eco <txt> · historico
 ls [filtro] · cat <arq> · novo <arq> [texto] · rm <arq> · salvar <arq>  (grava a última resposta da IA)
 abas · abrir <aba> · conta · sair
 velocidade <10-100> · plano on|off · autocorrecao on|off · mobile auto|on|off · tema cyan|violet
 ia <pergunta>  — ou digite qualquer texto sem comando para falar com a IA
 /ajuda, /lote, /velocidade… (comandos do chat também funcionam)
Ctrl+C interrompe a IA · ↑ ↓ histórico · Tab completa`,
   limpar:()=>{out.innerHTML=''},clear:()=>{out.innerHTML=''},
   data:()=>new Date().toLocaleString(S.lang||'pt-BR'),
   eco:a=>a,
   historico:()=>hist.slice(-30).map((h,i)=>' '+(i+1)+'  '+h).join('\n')||'(vazio)',
   ls:async a=>{const l=(await files()).filter(f=>!a||f.name.toLowerCase().includes(a.toLowerCase()));return l.length?l.map(f=>`${String(fmtSz(f.size)).padEnd(10)} ${f.name}${f.ref?'  (ref)':''}`).join('\n'):'(nenhum arquivo)'},
   cat:async a=>{const f=a&&(await files()).find(x=>x.name===a);if(!f)return 'Arquivo não encontrado: '+(a||'(informe o nome)');if(f.text==null)return '(arquivo binário, '+fmtSz(f.size)+')';return f.text.length>6000?f.text.slice(0,6000)+'\n… ('+(f.text.length-6000)+' caracteres a mais)':f.text},
   novo:async a=>{const m=a.match(/^(\S+)\s*([\s\S]*)$/);if(!m)return 'Uso: novo <arquivo> [texto]';await fPut({name:m[1],type:'text/plain',text:m[2],size:m[2].length,date:Date.now()});log('Terminal: criou '+m[1]);return 'Criado '+m[1]},
   rm:async a=>{const f=a&&await fGet(a);if(!f)return 'Arquivo não encontrado: '+(a||'');if(!await confirmD(`Excluir "${a}"?`))return 'Cancelado.';await fDel(a);log('Terminal: excluiu '+a);return 'Excluído '+a},
   salvar:async a=>{if(!a)return 'Uso: salvar <arquivo>';if(!last)return 'Ainda não há resposta da IA para salvar.';await fPut({name:a,type:'text/plain',text:last,size:last.length,date:Date.now()});return 'Resposta salva em '+a},
   abas:()=>tabs().map(k=>` ${k.padEnd(10)} ${M[k].n}`).join('\n'),
   abrir:a=>{const k=findTab(a);if(!k)return 'Aba não encontrada. Use: abas';setTimeout(()=>go(k),200);return 'Abrindo '+M[k].n+'…'},
   conta:()=>{setTimeout(()=>go('conta'),200);return 'Abrindo Conta…'},
   sair:()=>{setTimeout(logout,200);return 'Saindo…'},
   velocidade:a=>{const v=+a;if(!v)return 'Velocidade atual: '+spdUI(SPD())+'. Uso: velocidade <10-100> (de 10 em 10)';return 'Velocidade ajustada para '+spdUI(setSpd(v>25?spdIn(v):v))},
   plano:a=>{LS.set('plan',onoff(a)?1:0);return 'Planejar antes de criar: '+(onoff(a)?'ligado':'desligado')},
   autocorrecao:a=>{LS.set('autofix',onoff(a)?1:0);return 'Autocorreção ao digitar: '+(onoff(a)?'ligada':'desligada')},
   mobile:a=>{const m=/^(on|sim|celular|1)$/i.test(a)?'on':/^(off|nao|não|desktop|pc|0)$/i.test(a)?'off':'auto';LS.set('ui',m);applyUI();return 'Interface: '+({on:'celular',off:'computador',auto:'automática'})[m]},
   tema:a=>{S={...S,theme:/viol/i.test(a)?'violet':'cyan'};saveS();refresh();return 'Tema: '+S.theme}
  };
  T.ia=a=>ask(a);T.perguntar=T.ia;
  async function ask(text){
    if(!text)return 'Uso: ia <pergunta>';
    if(!ready())return 'Nenhum provedor de IA configurado. Abra Settings (ou rode o servidor).';
    const d=P('…','tai'),ctl=new AbortController();busy=ctl;askAI.sig=ctl.signal;
    try{conv.push({role:'user',content:text});conv=conv.slice(-12);askAI0.cap=Math.max(spdCap(SPD()),1500);
     const a=await askAI(conv,'Você é o JARVES AI em modo terminal. Responda de forma direta e curta, em texto simples ou markdown leve, no idioma do usuário.',x=>{d.textContent=x;out.scrollTop=1e9});
     last=a;conv.push({role:'assistant',content:a});d.textContent=a}
    catch(e){d.textContent=/abort/i.test(e.message)?'^C interrompido.':'✗ '+e.message;d.className='terr'}
    finally{askAI0.cap=0;askAI.sig=null;busy=null;out.scrollTop=1e9}
    return null}
  async function run(line){
    line=line.trim();if(!line)return;P('jarves> '+line,'tcmdline');
    if(hist[hist.length-1]!==line){hist.push(line);hist=hist.slice(-100);LS.set('thist',hist)}hi=hist.length;
    const sl=line.match(/^\/([a-zà-ú]+)\s*([\s\S]*)$/i);
    try{
     let r;
     if(sl&&CMDS[sl[1].toLowerCase()])r=await CMDS[sl[1].toLowerCase()](sl[2].trim());
     else{const m=line.match(/^(\S+)\s*([\s\S]*)$/),c=m[1].toLowerCase();r=T[c]?await T[c](m[2].trim()):await ask(line)}
     if(r)P(r)
    }catch(e){P('✗ '+e.message,'terr')}}
  inp.onkeydown=async e=>{
   if(e.key==='Enter'){const v=inp.value;inp.value='';await run(v)}
   else if(e.key==='ArrowUp'){e.preventDefault();if(hi>0)inp.value=hist[--hi]||''}
   else if(e.key==='ArrowDown'){e.preventDefault();inp.value=hi<hist.length-1?hist[++hi]:'';hi=Math.min(hi,hist.length)}
   else if(e.key==='c'&&e.ctrlKey&&busy){busy.abort();VOZ.stop()}
   else if(e.key==='l'&&e.ctrlKey){e.preventDefault();out.innerHTML=''}
   else if(e.key==='Tab'){e.preventDefault();const v=inp.value,m=v.match(/^(\S*)$/);if(m){const c=Object.keys(T).filter(x=>x.startsWith(v.toLowerCase()));if(c.length===1)inp.value=c[0]+' ';else if(c.length>1)P(c.join('  '))}else{const w=v.match(/(\S+)$/)[1];const fs=await files();const c=fs.map(f=>f.name).filter(n=>n.toLowerCase().startsWith(w.toLowerCase()));if(c.length===1)inp.value=v.slice(0,v.length-w.length)+c[0];else if(c.length>1)P(c.join('  '))}}};
  P('JARVES AI — terminal. Digite "ajuda" para ver os comandos, ou escreva uma pergunta.','tnote');
  setTimeout(()=>inp.focus(),50);
  Q('.term').onclick=()=>{if(!getSelection().toString())inp.focus()}}};

/* -------------------------------------------------- registro de módulos / navegação */
function drawNav(){
  const nav=Q('#nav');if(!nav)return;
  nav.innerHTML=Object.entries(M).map(([k,m])=>`<button data-k="${k}">${m.n}</button>`).join('');
  const cur=location.hash.slice(1);nav.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k===cur))}

const st=M.settings;delete M.settings;M.term=TERM;M.conta=CONTA;if(st)M.settings=st;

const go0=window.go;
window.go=function(k){
  go0(k);const nav=Q('#nav');nav&&nav.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k===k))};

// cabeçalho: botão de conta e botão de modo celular
const hd=Q('header'),net=Q('#net');
if(hd&&net){const a=document.createElement('button');a.id='uchip';a.className='chip';a.onclick=()=>go('conta');const m=document.createElement('button');m.id='uimode';m.className='chip';m.onclick=cycleUI;hd.insertBefore(m,net);hd.insertBefore(a,m)}
chip();applyUI();drawNav();

// atalho na Home
const home=M.home&&M.home.b;if(home)M.home.b=function(){home.apply(this,arguments);const g=Q('#view .grid');if(g&&!Q('[data-go="term"]',g)){g.insertAdjacentHTML('beforeend','<div class="glass card" data-go="term"><h3>Terminal</h3><p>Modo prompt de comando</p></div><div class="glass card" data-go="conta"><h3>Conta</h3><p>Login e opções do assistente</p></div>');g.querySelectorAll('[data-go]').forEach(c=>c.onclick=()=>go(c.dataset.go))}};

// se a aba atual (hash) já é uma das novas, desenha de novo
const cur=location.hash.slice(1);if(cur==='term'||cur==='conta')go(cur);

(async()=>{await loadPC();drawNav();const u=U();if(!u)authUI();else if(Q('#auth'))Q('#auth').remove();if(Q('#gbtn'))drawGoogle(Q('#gbtn'))})();
})();
