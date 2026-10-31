
/* JARVES AI V24 — Prompt Intelligence, Code Master, Auto Fix e Cloud Monitor */
(()=>{
'use strict';
const q=(s,r=document)=>r.querySelector(s);
const esc24=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const state={mode:'BALANCED',original:'',optimized:'',files:[],history:[],busy:false,fixCount:0};
const modes=['TURBO','BALANCED','DEEP THINKING','CODE MASTER'];
const panel=()=>`<div class="v24">
 <div class="glass v24hero"><div><span class="chip">JARVES AI V24</span><h2>Ultra Speed · Cloud Intelligence</h2><p class="note">Prompt humano, geração de projetos e validação assistida.</p></div><select id="v24mode">${modes.map(x=>`<option ${x===state.mode?'selected':''}>${x}</option>`).join('')}</select></div>
 <div class="grid v24grid">
  <section class="glass"><h3>🧠 Human Prompt Intelligence</h3><textarea id="v24prompt" rows="7" placeholder="Descreva o que você quer criar ou resolver..."></textarea><div class="row v24actions"><button class="btn" id="v24fix">Corrigir prompt</button><button class="btn ghost" id="v24opt">Otimizar</button><button class="btn ghost" id="v24compare">Comparar</button><button class="btn ghost" id="v24original">Executar original</button></div><div id="v24promptout" class="note"></div></section>
  <section class="glass"><h3>💻 AI Code Master</h3><input id="v24project" placeholder="Nome do projeto"><textarea id="v24spec" rows="5" placeholder="Descreva o site, jogo ou aplicativo e suas funcionalidades..."></textarea><div class="row v24actions"><button class="btn" id="v24generate">Gerar projeto</button><button class="btn ghost" id="v24download" disabled>Exportar ZIP</button></div><div id="v24codeout" class="note">Os arquivos gerados aparecerão aqui.</div></section>
  <section class="glass"><h3>🔧 Auto Code Fix</h3><textarea id="v24fixcode" rows="6" placeholder="Cole código JavaScript para validar e corrigir..."></textarea><div class="row v24actions"><button class="btn" id="v24validate">Validar</button><button class="btn ghost" id="v24repair">Auto Fix (até 5 tentativas)</button><button class="btn ghost" id="v24undo" disabled>Undo Fix</button></div><div id="v24fixout" class="note"></div></section>
  <section class="glass"><h3>☁️ Cloud Control & Performance</h3><div id="v24cloud" class="note">Verificando servidor...</div><div class="row v24actions"><button class="btn ghost" id="v24refresh">Atualizar status</button><button class="btn ghost" id="v24cancel">Cancelar exportação</button></div><div id="v24metrics" class="v24metrics"></div></section>
 </div><div class="glass"><h3>📁 Arquivos do projeto</h3><div id="v24files" class="note">Nenhum projeto gerado nesta sessão.</div></div>
</div>`;
async function ask(prompt,sys='Você é o JARVES AI V24, um engenheiro de software cuidadoso. Siga requisitos literalmente e não invente testes executados.') {
 if(typeof askAI0!=='function') throw Error('Motor de IA não inicializado.');
 return await askAI0([{role:'user',content:prompt}],sys);
}
function status(id,msg){const el=q('#'+id);if(el)el.textContent=msg}
function parseJSON(s){
 const t=String(s).replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
 try{return JSON.parse(t)}catch{}
 const a=t.indexOf('{'),b=t.lastIndexOf('}');
 if(a>=0&&b>a)return JSON.parse(t.slice(a,b+1));
 throw Error('A resposta não trouxe JSON válido. Tente novamente.');
}
async function cloud(){
 const el=q('#v24cloud');if(!el)return;
 if(!location.protocol.startsWith('http')){el.textContent='Modo arquivo local: gateway cloud indisponível. Inicie o servidor Node para ativar o backend.';return}
 try{
  const t=performance.now(),r=await fetch('/v1/health',{cache:'no-store'}),ms=Math.round(performance.now()-t),j=await r.json();
  el.textContent=`Servidor ${r.ok&&j.ok?'ONLINE':'INDISPONÍVEL'} · ${ms} ms · ${j.free?'provedor gratuito habilitado':'provedor gratuito indisponível'} · ${j.freeMode?'sem chave':'autenticação necessária'}`;
  if(!r.ok)return;
  const mr=await fetch('/v1/metrics',{cache:'no-store'});if(mr.ok){const m=await mr.json();q('#v24metrics').innerHTML=[['Requisições',m.requests],['Erros',m.errors],['Ativas',m.active],['Latência recente',m.lastLatency+' ms'],['Uptime',m.uptimeSeconds+' s'],['Provedores',m.configuredProviders.join(', ')||'Nenhum'],['Correções nesta sessão',state.fixCount]].map(([a,b])=>`<div><b>${esc24(b)}</b><small>${esc24(a)}</small></div>`).join('')}
 }catch(e){el.textContent='Servidor não alcançável: '+e.message+' · Verifique internet, URL e backend.'}
}
function bind(){
 q('#v24mode').onchange=e=>state.mode=e.target.value;
 const runPrompt=async(opt)=>{const raw=q('#v24prompt').value.trim();if(!raw)return status('v24promptout','Digite um prompt primeiro.');state.original=raw;status('v24promptout','Analisando intenção…');
  try{const out=await ask(`Prompt original:\n${raw}\n\n${opt?'Reescreva como instrução clara, completa e estruturada, preservando intenção, restrições, nomes, números e comandos. Não adicione requisitos. Retorne somente o prompt otimizado.':'Corrija somente ortografia, gramática e organização, sem mudar requisitos nem intenção. Retorne somente o texto corrigido.'}`);state.optimized=String(out).trim();status('v24promptout','PROMPT OTIMIZADO:\n'+state.optimized)}
  catch(e){status('v24promptout','Falha: '+e.message)}};
 q('#v24fix').onclick=()=>runPrompt(false);q('#v24opt').onclick=()=>runPrompt(true);
 q('#v24compare').onclick=()=>status('v24promptout','ORIGINAL:\n'+state.original+'\n\nOTIMIZADO:\n'+state.optimized);
 q('#v24original').onclick=()=>GenSend(q('#v24prompt').value.trim());
 async function GenSend(t){if(!t)return;try{const result=await ask(t);status('v24promptout','RESPOSTA DO MODELO:\\n'+String(result))}catch(e){status('v24promptout','Falha ao executar: '+e.message)}}
 q('#v24generate').onclick=async()=>{
  const spec=q('#v24spec').value.trim(),name=q('#v24project').value.trim()||'jarves-project';if(!spec)return status('v24codeout','Descreva o projeto primeiro.');
  state.files=[];q('#v24download').disabled=true;status('v24codeout','Planejando arquitetura e gerando arquivos…');
  try{
   const raw=await ask(`Crie um projeto completo chamado "${name}" com esta especificação:\n${spec}\n\nResponda SOMENTE JSON válido no formato {"files":[{"name":"index.html","content":"..."}],"readme":"..."}.\nInclua arquivos completos, sem reticências ou trechos omitidos. Para projeto web simples, use HTML/CSS/JS separados. Não inclua segredos ou API keys. Limite a 30 arquivos e 1 MB de texto total. Inclua README.md e .env.example quando necessário.`);
   const obj=parseJSON(raw);if(!Array.isArray(obj.files)||!obj.files.length)throw Error('Nenhum arquivo foi retornado.');
   state.files=obj.files.map(f=>({name:String(f.name),content:String(f.content??'')}));if(obj.readme&&!state.files.some(f=>f.name.toLowerCase()==='readme.md'))state.files.push({name:'README.md',content:String(obj.readme)});
   const total=state.files.reduce((n,f)=>n+f.content.length,0);if(state.files.length>30||total>1000000)throw Error('Projeto excedeu os limites de segurança.');
   status('v24codeout',`Projeto gerado: ${state.files.length} arquivos · ${total.toLocaleString()} caracteres. Revise antes de executar.`);
   q('#v24files').innerHTML=state.files.map(f=>`<div class="v24file"><b>${esc24(f.name)}</b><button class="btn ghost" data-v24file="${esc24(f.name)}">Visualizar</button></div>`).join('');
   q('#v24files').querySelectorAll('[data-v24file]').forEach(b=>b.onclick=()=>{const f=state.files.find(x=>x.name===b.dataset.v24file);status('v24codeout',f.name+'\n'+f.content)});
   q('#v24download').disabled=false;
  }catch(e){status('v24codeout','Erro de geração: '+e.message)}
 };
 let exportController=null;
 q('#v24download').onclick=async()=>{
  if(!state.files.length)return;try{
   if(!S.baseUrl)throw Error('Inicie o servidor JARVES para exportar ZIP.');
   exportController=new AbortController();const base=S.baseUrl.replace(/\/$/,'');
   const r=await fetch(base+'/projects/export',{method:'POST',headers:{'Content-Type':'application/json',...(S.key?{Authorization:'Bearer '+S.key}:{})},body:JSON.stringify({files:state.files}),signal:exportController.signal});
   if(!r.ok)throw Error((await r.text()).slice(0,300));const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(q('#v24project').value.trim()||'jarves-project')+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);status('v24codeout','ZIP exportado.');
  }catch(e){status('v24codeout',e.name==='AbortError'?'Exportação cancelada.':'Falha no ZIP: '+e.message)}finally{exportController=null}
 };
 q('#v24cancel').onclick=()=>{if(exportController)exportController.abort();else status('v24cloud','Nenhuma exportação ativa para cancelar.')};
 let lastCode='';
 q('#v24validate').onclick=()=>{const c=q('#v24fixcode').value;try{new Function(c);status('v24fixout','Sintaxe JavaScript válida. Nenhum código foi executado.')}catch(e){status('v24fixout',e.name+': '+e.message)}};
 q('#v24repair').onclick=async()=>{
  const original=q('#v24fixcode').value;if(!original.trim())return status('v24fixout','Cole JavaScript primeiro.');
  lastCode=original;q('#v24undo').disabled=false;let code=original;
  for(let i=1;i<=5;i++){
   try{new Function(code);q('#v24fixcode').value=code;return status('v24fixout',`Código validado após ${i-1} correção(ões). A validação verificou sintaxe, não comportamento.`)}
   catch(err){status('v24fixout',`Tentativa ${i}/5 · ${err.name}: ${err.message}`);
    try{code=String(await ask(`Corrija o código JavaScript abaixo. Erro: ${err.name}: ${err.message}\nRetorne somente o código completo, sem markdown.\n\n${code}`,'Você é um especialista em depuração JavaScript. Preserve comportamento e não remova funcionalidades.'));state.fixCount++;code=code.replace(/^```(?:javascript|js)?\s*/i,'').replace(/\s*```$/,'').trim()}
    catch(e){return status('v24fixout','Falha ao solicitar correção: '+e.message)}
   }
  }
  q('#v24fixcode').value=code;try{new Function(code);status('v24fixout','Correção validada na quinta tentativa.')}catch(e){status('v24fixout','Limite de 5 tentativas atingido. Último erro: '+e.message)}
 };
 q('#v24undo').onclick=()=>{q('#v24fixcode').value=lastCode;status('v24fixout','Última alteração desfeita.');q('#v24undo').disabled=true};
 q('#v24refresh').onclick=cloud;cloud();
}
M.v24={n:'V24 CONTROL',d:'Prompt, Code Master e Cloud',r:panel,b:bind};
const nav=q('#nav');if(nav){nav.innerHTML=Object.entries(M).map(([k,m])=>`<button data-k="${k}">${m.n}</button>`).join('');}
if(location.hash==='#v24')go('v24');
})();
