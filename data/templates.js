const H=(b,s='',j='')=>`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif}${s}</style></head><body>${b}<script>${j}<\/script></body></html>`;
window.TPL={
game:[
{n:'2D Arena (combate, inimigos, inventário, pontuação)',c:H('<canvas id="c" width="640" height="400"></canvas><p id="hud"></p>','body{background:#0a1220;color:#cfe;text-align:center}canvas{background:#10223a;border:2px solid #19d3ff;max-width:100%}',`const c=document.getElementById('c'),x=c.getContext('2d'),K={};let p={x:320,y:200,hp:100,inv:[]},E=[],S=0,last=0;
function spawn(){E.push({x:Math.random()*640,y:Math.random()*400,hp:30})}
setInterval(spawn,2000);
function atk(){E.forEach(e=>{if(Math.hypot(e.x-p.x,e.y-p.y)<60){e.hp-=15;if(e.hp<=0){S+=10;if(Math.random()<.4)p.inv.push('Poção')}}});E=E.filter(e=>e.hp>0)}
onkeydown=e=>{K[e.key]=1;if(e.key==' ')atk();if(e.key=='h'&&p.inv.length){p.inv.pop();p.hp=Math.min(100,p.hp+30)}};
onkeyup=e=>K[e.key]=0;
function loop(t){const d=Math.min(3,(t-last)/16);last=t;
if(K.ArrowLeft||K.a)p.x-=3*d;if(K.ArrowRight||K.d)p.x+=3*d;if(K.ArrowUp||K.w)p.y-=3*d;if(K.ArrowDown||K.s)p.y+=3*d;
E.forEach(e=>{const a=Math.atan2(p.y-e.y,p.x-e.x);e.x+=Math.cos(a)*.8*d;e.y+=Math.sin(a)*.8*d;if(Math.hypot(e.x-p.x,e.y-p.y)<14)p.hp-=.3*d});
x.clearRect(0,0,640,400);x.fillStyle='#19d3ff';x.fillRect(p.x-8,p.y-8,16,16);x.fillStyle='#ff5d73';E.forEach(e=>x.fillRect(e.x-7,e.y-7,14,14));
document.getElementById('hud').textContent='Setas/WASD mover · Espaço atacar · H poção | HP '+Math.max(0,p.hp|0)+' | Pontos '+S+' | Poções: '+p.inv.length;
if(p.hp>0)requestAnimationFrame(loop);else document.getElementById('hud').textContent='Fim de jogo — pontos: '+S}
requestAnimationFrame(loop);`)},
{n:'Pong simples',c:H('<canvas id="c" width="480" height="300"></canvas>','body{background:#000;text-align:center}canvas{border:2px solid #0ff}',`const c=document.getElementById('c'),x=c.getContext('2d');let b={x:240,y:150,vx:3,vy:2},p=120,s=0;
c.onmousemove=e=>p=e.offsetY-30;
(function f(){b.x+=b.vx;b.y+=b.vy;if(b.y<0||b.y>300)b.vy*=-1;if(b.x>480)b.vx*=-1;if(b.x<20&&b.y>p&&b.y<p+60){b.vx=Math.abs(b.vx)+.2;s++}if(b.x<0){b.x=240;b.vx=3;s=0}
x.fillStyle='#000';x.fillRect(0,0,480,300);x.fillStyle='#0ff';x.fillRect(5,p,8,60);x.fillRect(b.x,b.y,8,8);x.fillText('Pontos '+s,220,14);requestAnimationFrame(f)})()`)},
{n:'Jogo 3D (Three.js) — colete as esferas',c:H('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>','body{margin:0;overflow:hidden;background:#0a1220}',`if(typeof THREE==='undefined'){document.body.innerHTML='<p style="color:#fff;font:16px system-ui;padding:20px">Three.js não carregou (precisa de internet).</p>'}else{
const R=new THREE.WebGLRenderer({antialias:true});R.setSize(innerWidth,innerHeight);document.body.appendChild(R.domElement);
const S=new THREE.Scene();S.background=new THREE.Color(0x0a1220);S.fog=new THREE.Fog(0x0a1220,20,60);
const C=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,200);
S.add(new THREE.AmbientLight(0xffffff,.5));const L=new THREE.DirectionalLight(0xffffff,.9);L.position.set(5,10,5);S.add(L);
const G=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:0x10304a}));G.rotation.x=-Math.PI/2;S.add(G);
const P=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x19d3ff}));P.position.y=.5;S.add(P);
const O=[];function spawn(){const m=new THREE.Mesh(new THREE.SphereGeometry(.4,16,16),new THREE.MeshStandardMaterial({color:0xffc857,emissive:0x553300}));m.position.set((Math.random()-.5)*40,.5,(Math.random()-.5)*40);S.add(m);O.push(m)}
for(let i=0;i<12;i++)spawn();
const K={};onkeydown=e=>K[e.key.toLowerCase()]=1;onkeyup=e=>K[e.key.toLowerCase()]=0;
let score=0,t=45,last=performance.now(),over=false;const hud=document.createElement('div');hud.style.cssText='position:fixed;top:8px;left:12px;color:#cfe;font:16px system-ui';document.body.appendChild(hud);
setInterval(()=>{if(!over&&--t<=0)over=true},1000);
onresize=()=>{R.setSize(innerWidth,innerHeight);C.aspect=innerWidth/innerHeight;C.updateProjectionMatrix()};
(function loop(n){requestAnimationFrame(loop);const d=Math.min(.05,(n-last)/1000);last=n;
if(!over){const v=8*d;if(K.w||K.arrowup)P.position.z-=v;if(K.s||K.arrowdown)P.position.z+=v;if(K.a||K.arrowleft)P.position.x-=v;if(K.d||K.arrowright)P.position.x+=v;P.position.x=Math.max(-29,Math.min(29,P.position.x));P.position.z=Math.max(-29,Math.min(29,P.position.z));
for(let i=O.length-1;i>=0;i--){O[i].rotation.y+=d*2;if(O[i].position.distanceTo(P.position)<1){S.remove(O[i]);O.splice(i,1);score++;spawn()}}}
C.position.set(P.position.x,9,P.position.z+10);C.lookAt(P.position);R.render(S,C);
hud.textContent=over?'Fim de jogo! Pontos: '+score+' (clique em Executar para jogar de novo)':'WASD/setas mover · Pontos '+score+' · Tempo '+t})(performance.now())}`)}],
web:[
{n:'Landing page',c:H('<header><b>MinhaMarca</b><a href="#">Contato</a></header><section class="h"><h1>Construa mais rápido</h1><p>Descreva sua oferta em uma frase clara.</p><a class="b" href="#">Começar</a></section><section class="g"><div>Recurso 1</div><div>Recurso 2</div><div>Recurso 3</div></section>','header{display:flex;justify-content:space-between;padding:16px 8%}.h{padding:12vh 8%;background:#0b1e3a;color:#fff}.h h1{font-size:clamp(32px,6vw,64px);margin:0}.b{display:inline-block;margin-top:14px;background:#19d3ff;color:#012;padding:10px 20px;border-radius:8px;text-decoration:none}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;padding:40px 8%}.g div{border:1px solid #ccd;border-radius:12px;padding:24px}')},
{n:'Página de login',c:H('<form id="f"><h2>Entrar</h2><input type="email" placeholder="E-mail" required><input type="password" placeholder="Senha" required><button>Entrar</button><p id="m"></p></form>','body{display:grid;place-items:center;height:100vh;background:#0b1e3a}form{background:#fff;padding:28px;border-radius:14px;display:grid;gap:10px;width:300px}input,button{padding:10px;border-radius:8px;border:1px solid #bbc}button{background:#19d3ff;border:0}',`f.onsubmit=e=>{e.preventDefault();m.textContent='Formulário validado (sem backend conectado).'}`)},
{n:'Dashboard',c:H('<div class="k"><div><b>128</b>Pedidos</div><div><b>R$ 9,4k</b>Receita</div><div><b>3,2%</b>Conversão</div></div><canvas id="c" width="500" height="160"></canvas>','body{padding:20px;background:#f3f6fb}.k{display:flex;gap:12px;margin-bottom:16px}.k div{flex:1;background:#fff;padding:14px;border-radius:10px}.k b{display:block;font-size:24px}canvas{background:#fff;border-radius:10px;max-width:100%}',`const x=c.getContext('2d');x.strokeStyle='#19a';x.beginPath();[20,60,40,100,80,130,110].forEach((v,i)=>x[i?'lineTo':'moveTo'](i*80+10,150-v));x.stroke()`)},
{n:'Loja virtual (carrinho)',c:H('<h2>Loja</h2><div id="l"></div><p>Carrinho: <b id="n">0</b> · Total R$ <b id="t">0</b></p>','body{padding:20px}.i{display:inline-block;border:1px solid #ccd;border-radius:10px;padding:12px;margin:6px}',`let q=0,t=0;[['Produto A',49],['Produto B',89]].forEach(([a,p])=>{const d=document.createElement('div');d.className='i';d.innerHTML=a+'<br>R$ '+p+'<br>';const b=document.createElement('button');b.textContent='Adicionar';b.onclick=()=>{q++;t+=p;document.getElementById('n').textContent=q;document.getElementById('t').textContent=t};d.append(b);l.append(d)})`)}],
app:[
{n:'Protótipo mobile (3 telas, navegação inferior)',c:H('<div class="ph"><div id="s"></div><nav><button data-t="Início">Início</button><button data-t="Buscar">Buscar</button><button data-t="Perfil">Perfil</button></nav></div>','body{background:#223;display:grid;place-items:center;height:100vh}.ph{width:300px;height:560px;background:#fff;border-radius:28px;display:flex;flex-direction:column;overflow:hidden}#s{flex:1;padding:24px;font-size:22px}nav{display:flex;border-top:1px solid #ddd}nav button{flex:1;padding:14px;border:0;background:none}',`const go=t=>s.textContent='Tela: '+t;document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>go(b.dataset.t));go('Início')`)},
{n:'Plano de navegação (Markdown)',c:'# Plano do app\n\n## Telas\n- Início → Detalhe\n- Buscar → Resultados\n- Perfil → Configurações\n\n## Componentes\nBarra inferior, cartão de item, lista, formulário.\n\n## Estrutura sugerida\n/screens /components /services /assets\n\nNota: este plano não compila app Android/iOS. Para isso use Flutter, React Native ou Capacitor.'}],
code:[{n:'Olá, mundo',c:H('<h1>Olá, JARVES</h1><button id="b">Clique</button>','body{font-family:system-ui;padding:24px}',`b.onclick=()=>alert('Funcionando!')`)}]};
