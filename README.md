# JARVES FREE AI ENGINE V26.1 — melhorias de estabilidade

- Gateway em modo gratuito por padrão: não encaminha chamadas para provedores pagos enquanto `FREE_MODE=1`.
- Chaves JARVES renovadas automaticamente até o próximo reset diário, às **01:00 (America/Sao_Paulo)**.
- Contadores diários por chave reiniciados no mesmo ciclo; chaves expiradas são removidas periodicamente.
- Endpoint `/v1/health` informa fuso horário e horário do próximo reset.
- Melhorias de usabilidade em telas pequenas, áreas de toque, rolagem e safe-area de celulares.
- Cache do aplicativo atualizado para evitar que navegadores continuem usando arquivos antigos.

**Importante:** o reset diário reinicia as chaves e os contadores internos do JARVES; ele não renova cotas de serviços externos nem garante disponibilidade, velocidade ou uso ilimitado de provedores gratuitos. A geração local exige Ollama instalado e um modelo baixado. A velocidade real depende do dispositivo, da memória, da conexão e do provedor.

# JARVES AI — Universal Assistant
THINK SMART. BUILD ANYTHING. CREATE THE FUTURE.

## Como usar
**Recomendado (API própria):** instale Node 18+ e rode `iniciar.bat` (Windows) ou `./iniciar.sh` (Mac/Linux) — ou `node server.js` — e abra http://localhost:3000.
1. Copie `.env.example` para `.env`. O `FREE_MODE=1` já vem ativado: não precisa de API key, cadastro, plano ou créditos para usar o gateway gratuito.
2. O site se conecta sozinho ao gateway e gera a sua **API key JARVES** (`jv-...`). Também dá para gerar em Settings → 🔑 Gerar minha API key ou com `node server.js --new-key`.

Sem Node: abra `index.html`/`python -m http.server` e configure provedor, modelo e API key em **Settings**.

## Estrutura
index.html · style.css · script.js · manifest.webmanifest · data/templates.js · assets/ (ícones) · modules/ (reservada para expansão)

## Limites conhecidos
- Sem provedor configurado, o chat e o AI Thinking informam o erro (nada é simulado).
- A API key fica no localStorage; para produção use um backend intermediário (URL base personalizada).
- Preview em iframe sandbox.
- App Studio não compila apps Android/iOS; gera protótipos HTML e planos.
- Web Navigator abre pesquisas em nova aba; não há API de pesquisa integrada.
- Game Studio 3D e módulos como arquivos separados em modules/ ainda não foram implementados.

## v18 — camada de inteligência
- **🧠 Raciocínio profundo** (chat): rascunho → revisão crítica → resposta final. No modo Automático, ativa sozinho em pedidos longos/analíticos.
- **AI Thinking**: prompts estruturados + caixa "Verificar (2 passos)" (auditoria independente com nível de confiança).
- **Memória**: o assistente aprende fatos duráveis sobre você (nome, profissão, preferências) e usa em todas as respostas. Veja/edite em Settings.
- **Resumo de contexto**: conversas longas são resumidas em vez de esquecidas.
- **Roteador melhor**: perguntas ("como funciona um jogo…?") vão para o chat, não geram jogo/imagem.
- **Autocorreção**: jogos e HTML gerados têm a sintaxe JS verificada; até 2 correções automáticas.
- Limite de saída Anthropic 2000 → 8192 tokens (código não é mais cortado).
- **Segurança**: não há mais chave embutida no script.js (veja v19.7).

## v19 — MOD STUDIO 🧩
Digite o **nome do jogo** + a ideia do mod → **1 · Pesquisar** (como o jogo aceita mods: loader, linguagem, estrutura, instalação) → **2 · Gerar mod** (projeto completo com o nome do mod) → **Baixar ZIP** ou salvar no File Manager.
- Botões de pesquisa (GitHub, Google, Nexus Mods, Modrinth) abrem a documentação real; cole-a na caixa de pesquisa para o mod sair mais fiel.
- No chat, pedidos como "crie um mod de dragões para Minecraft" abrem o Mod Studio automaticamente (ou use o modo 🧩 Mod de jogo).
- Limites: a pesquisa usa o conhecimento da IA (não baixa o código do jogo); o mod não é compilado aqui — teste antes de usar. Sem cheats para jogos online/anti-cheat.

## v19.1 — correção de erros de IA (402/401)
- O servidor gratuito (pollinations) agora é sempre o **último** recurso e nunca é memorizado como preferido.
- Se o servidor pedir espera ("Retry after Ns"), o app espera e tenta de novo sozinho.
- Se o modelo `glm-4-flash` for recusado pela z.ai, tenta `glm-4.5-flash` automaticamente.
- Erros mostram o motivo real de cada servidor (ex.: 401 = chave inválida), não só o último.
- A memória do assistente não dispara mais uma 2ª chamada junto com a resposta.

## v19.2 — conexão com a IA
- **Settings → Testar conexão**: diz na hora se chave, URL e modelo funcionam (e por que não).
- **Provedor pronto**: z.ai, bigmodel.cn, Groq, Google Gemini, OpenRouter, OpenAI — preenche URL e modelo (a chave do provedor anterior é limpa).
- Servidor gratuito de reserva agora respeita 1 requisição por vez e 31 s de intervalo.
- URLs salvas em Settings não são mais apagadas ao recarregar.

## v19.3 — Code Editor completo
- **Destaque de sintaxe** (HTML/CSS/JS) sobre o editor, números de linha alinhados.
- **Console de erros**: erros de JavaScript do código executado aparecem abaixo do preview, com a linha.
- **🛠 Corrigir com IA**: manda código + erros para a IA e aplica a correção; **↩ Desfazer IA** volta atrás.
- **Gerar com IA** agora também no Code Editor.
- **Tab / Shift+Tab** indentam, **Ctrl+Enter** executa, **Ctrl+S** salva.
- Novo template **Jogo 3D (Three.js)** no Game Studio (precisa de internet para carregar a biblioteca).

## v19.4 — ⚡ Modo Turbo (velocidade máxima)
- **Settings → Modo Turbo** (ligado por padrão): a resposta começa mais rápido e termina antes.
- Sem o 2º passo automático de raciocínio (rascunho → revisão): o 🧠 Raciocínio profundo só roda se você escolher.
- O resumo de conversas longas roda **em segundo plano** e não bloqueia mais a resposta.
- Contexto enviado à IA menor (até 14 mensagens / ~20 mil caracteres), menos tokens para processar.
- Se um servidor não responde em 25 s, troca automaticamente para o próximo (antes esperava 60 s ou mais).
- Tentativas após erro temporário mais curtas (300 ms em vez de 900 ms).
- Indicador ⚡ no status lateral quando o Turbo está ativo.

## v19.5 — Modelos 2D/3D sem loop infinito
- **Visualizador 3D**: não renderiza mais em loop contínuo; só desenha quando você move/gira/troca o modo. O botão **Girar** (agora desligado por padrão) liga o giro automático.
- **Proteção contra loops infinitos** no código gerado pela IA (`while(true)`, `for(;;)`, `do…while`): o loop é cortado com erro claro em vez de travar a aba; o validador já rejeita e a IA corrige sozinha.
- **Geração completa**: os prompts de 3D, 2D e texturas agora exigem código/SVG inteiro, sem omitir partes (o autocorreção refaz se vier cortado).

## v19.6 — Modo Velocidade 1–25 (substitui "Criatividade")
- O seletor **Criatividade 1–10** virou **⚡ Velocidade 1–25** (Chat e Mod Studio). Padrão: 15. Quanto maior, mais rápido.
- **1–8**: respostas completas e detalhadas; raciocínio profundo automático permitido (com o Turbo desligado).
- **9–17**: equilibrado.
- **18–25**: respostas curtas e diretas; de 18 em diante o chat limita o tamanho da resposta (~1400 tokens; 22+ ~700). Geração de jogos, mods, modelos e código não é limitada.
- Em todos os níveis: quanto maior a velocidade, menos histórico é enviado à IA (de ~33 mensagens no nível 1 a ~7 no 25), temperatura menor e tempo de espera menor antes de trocar de servidor.

## v19.7 — API própria (JARVES Gateway) + correção da IA parada
- **Causa da IA não funcionar**: a chave z.ai embutida no `script.js` estava exposta e é recusada pelo provedor (401). Foi **removida**. Se ela já foi publicada em algum lugar, revogue-a no painel da z.ai.
- **`server.js`** (Node, sem dependências): serve o site e uma API compatível com OpenAI em `/v1/chat/completions`, com **API keys próprias** `jv-...` (só o hash SHA-256 fica em `keys.json`), limite por minuto, streaming, troca automática de modelo/provedor (principal → reserva → gratuito) e CORS.
- A chave do provedor fica só no servidor (`.env`), nunca no navegador. Arquivos `.env`, `keys.json` e `server.js` não são servidos.
- O site detecta o gateway e se configura sozinho; em Settings há o provedor pronto "JARVES Gateway" e o botão **🔑 Gerar minha API key**.
- Gerar keys: só em localhost; hospedado na internet, defina `ADMIN_TOKEN` no `.env`. Comandos: `--new-key`, `--list-keys`, `--revoke <prefixo>`.
- Limite honesto: a API key JARVES é a *sua* camada de acesso; o modelo de IA continua vindo de um provedor (z.ai, Groq...), cuja chave você precisa criar uma vez.

## v19.8 — chave embutida + velocidade
- A **API key JARVES já vem no pacote** (`data/config.js` + hash em `keys.json`): é só rodar `iniciar.bat`/`iniciar.sh`; o site se conecta sozinho. Para publicar na internet, gere outra (`node server.js --new-key`) e revogue esta (`--revoke jv-GSBskI9`).
- Falta apenas a chave do provedor de IA no `.env` (`UPSTREAM_KEY`). Sem ela, o gateway usa o servidor gratuito de reserva (mais lento e limitado).
- Correção no gateway: o timeout cortava respostas longas/streaming; agora só vale até o servidor começar a responder (padrão 20 s para trocar de provedor).
- Velocidade: estáticos com gzip e cache; velocidade padrão do chat 20/25; prompt-base mais direto, com checagem interna de contas e código.

## v19.9 — funciona mesmo sem o servidor rodando
- Se você abrir o `index.html` direto (sem `iniciar.bat`/`node server.js`), o chat agora usa automaticamente o servidor gratuito de reserva em vez de dar erro de rede (mais lento e limitado). Para o desempenho completo, rode o servidor.
- Se tudo falhar, a mensagem diz exatamente o que fazer; sem tentativas repetidas inúteis.
- Corrigido o nome do host nas mensagens de erro (aparecia "http:") e o intervalo do servidor gratuito caiu de 31 s para 16 s.

## v20 — Otimização geral, voz e textos em lote
- **Velocidade 1–25 que realmente funciona**: o nível agora controla o limite de tokens de TODA geração (chat 700–6000; código/jogos/mods 4500–8192), o histórico enviado, a temperatura e os passos extras. A partir do 15 o modelo 2D/3D/textura pula a etapa de "referência" (metade do tempo); a partir do 18 a autocorreção faz só 1 nova tentativa. Padrão: **16 (médio-rápido)**. Em Settings há o **Perfil de desempenho** (6 / 11 / 16 / 20 / 25).
- **Fim do loop infinito de geração**: (1) toda requisição tem limite de tokens (também no gateway: `MAX_TOKENS_DEFAULT`); (2) o streaming corta sozinho se o modelo repetir o mesmo trecho 3 vezes; (3) se o servidor parar de enviar dados por 35 s, devolve o que já chegou; (4) teto de 5 min por resposta; (5) sem retentativas após timeout; (6) botão **⏹ Parar** no chat (e Parar no lote).
- **Textos em Lote** (novo módulo): até 30 temas, cada um vira um texto completo de 1–3 páginas (padrão 2 ≈ 900 palavras), em fila com 1–3 em paralelo, ETA, prazo de 2 h, 2 tentativas por texto, complemento automático se vier curto/cortado, retomável depois de recarregar, exporta `.md`/`.doc`/ZIP. 10 textos de 2 páginas = 10 chamadas de ~1.800 tokens: minutos com um provedor próprio (Groq/z.ai) e dentro de 2 h mesmo no servidor gratuito (1 requisição a cada 16 s).
- **Voz e áudio** (Settings → Desempenho e voz): **Modo explicativo** (respostas de professor: ideia central → passo a passo → analogia → resumo; opção "+ falar"), escolha de voz, velocidade/tom/volume, fala automática, **🔊 Ouvir** em cada mensagem e **🎤 microfone** no chat (Chrome/Edge/Safari).
- **Comandos no chat**: `/ajuda` `/lote tema1; tema2` `/velocidade 1-25` `/rapido` `/medio` `/completo` `/explicar on|off` `/voz on|off` `/ler` `/parar`.
- Correções: "Testar conexão" não trava mais (timeout 20 s); streaming sem timeout após o início; `<meta charset>` movido para o topo do `index.html`; versão do `package.json`.
- Limites honestos: a velocidade de geração depende do provedor de IA; o app reduz tokens, passos e histórico, mas não acelera o modelo em si. Voz usa as vozes do seu navegador/sistema.

## v21 — conta, terminal, modo celular e correções
- **Erro vermelho corrigido**: (1) telas assíncronas (File Manager etc.) quebravam ao trocar de aba rápido — agora são protegidas e erros de "tela antiga" não aparecem mais; (2) quando o armazenamento do navegador enchia, o app mostrava erro — agora libera espaço de conversas antigas sozinho; (3) erros reais da IA aparecem numa bolha suave com **🔄 Tentar de novo** e **⚙ Settings**.
- **Login (aba CONTA & PLANOS + tela de entrada)**: Google (Google Identity Services), conta por e-mail/senha neste aparelho ou visitante. Para ativar o Google: crie um *ID do cliente OAuth (Web)* no Google Cloud, coloque o endereço do site em "Origens JavaScript autorizadas" e cole o Client ID na tela (⚙ Configurar login Google) ou em `GOOGLE_CLIENT_ID` no `.env` (assim o servidor também valida o token). Sem Client ID o botão Google mostra o passo a passo.
- **TERMINAL** (modo prompt de comando): `ajuda`, `ls`, `cat`, `novo`, `rm`, `salvar`, `abas`, `abrir`, `velocidade`, `plano`, `mobile`, `tema`, `conta`, `sair`, os `/comandos` do chat e, para qualquer outro texto, conversa com a IA (Ctrl+C interrompe, ↑↓ histórico, Tab completa).
- **Velocidade de 10 em 10** (10 a 100) no chat e no Model Studio; `/velocidade 50`.
- **Planejar antes de criar**: pedidos de jogo, modelo 3D/2D e textura primeiro geram um plano + perguntas; você responde (ou diz "pode fazer") e só então a IA cria. Desligue em Conta.
- **Anexar do armazenamento**: botão 🗂️ no chat anexa arquivos do File Manager. Sem limite de palavras no campo de mensagem (anexos até 2 milhões de caracteres; o limite real depende do modelo do seu provedor).
- **Modo celular**: botão 📱/🖥️ no topo (ou Automático): barra de abas embaixo, uma coluna, botões grandes, campos sem zoom no iPhone.
- **Autocorreção**: ao digitar corrige acentos/abreviações comuns (nao→não, vc→você, configuracao→configuração) e maiúsculas no início das frases; botão ✨ corrige a mensagem com IA; opção "Corrigir com IA ao enviar".
- ⚠ Segurança: `data/config.js` traz uma API key JARVES embutida, visível a quem abrir o site. Ao publicar na internet, gere outra (`node server.js --new-key`), troque em `data/config.js` e revogue a antiga.


## Hospedagem na nuvem e acesso por Wi-Fi (v22)

O JARVES pode ser hospedado em um servidor na nuvem e acessado pelo navegador de qualquer aparelho conectado à internet (Wi-Fi ou rede móvel). O Wi-Fi só fornece a conexão: a geração de respostas acontece nos provedores configurados no backend.

### Publicar
1. Publique esta pasta `jarves/` em Railway ou Render (há `Dockerfile`, `railway.json` e `render.yaml`).
2. Configure no painel da hospedagem pelo menos uma chave de provedor: `UPSTREAM_KEY`; opcionalmente configure `UPSTREAM2_KEY`, `UPSTREAM3_KEY` e `UPSTREAM4_KEY` para fallback automático.
3. Configure um volume persistente e a variável `KEYS_FILE` apontando para ele (o `render.yaml` já usa `/var/data/keys.json`). Configure `PUBLIC_SIGNUP=1` para permitir que o navegador obtenha uma sessão JARVES automaticamente. O limite inicial é de 3 sessões por IP por hora e `RATE_LIMIT_PER_MIN` requisições por chave.
4. Acesse o endereço HTTPS fornecido pela hospedagem. Não use `localhost` no endereço público.

### Provedores e continuidade
O gateway tenta os provedores configurados em sequência e usa o servidor gratuito como último recurso, se habilitado. O endpoint `/v1/health` informa o estado do gateway e `/v1/providers` lista os provedores configurados. Uma rede Wi-Fi não substitui um modelo de IA; sem internet, somente as funções locais do navegador continuam disponíveis.

### Segurança importante
- Não publique chaves de provedores nem `ADMIN_TOKEN` no JavaScript ou no repositório. Cadastre-as como variáveis secretas no painel da hospedagem.
- `PUBLIC_SIGNUP=1` é para testes/demonstrações: em produção pública, adicione login, CAPTCHA, limites por usuário/IP e alertas de custo. Preserve `keys.json` em armazenamento persistente para que sessões continuem válidas após reinicializações.
- Use HTTPS. O gateway não faz varredura nem controle de dispositivos Wi-Fi; só fornece diagnóstico de conectividade do próprio app.


## JARVES AI V24 — Ultra Speed Cloud Intelligence

### Novos recursos
- **V24 Control**: painel único para Human Prompt Intelligence, Code Master, Auto Fix e Cloud Control.
- **Prompt Optimizer**: correção e otimização assistida por IA, mantendo nomes, números, restrições e intenção.
- **Code Master**: gera projetos em arquivos separados, exibe os arquivos e exporta ZIP pelo gateway.
- **Auto Fix**: valida sintaxe JavaScript sem executar o código e oferece até cinco rodadas de correção assistida por IA. Undo restaura o texto original.
- **Cloud metrics**: `/v1/health` e `/v1/metrics` mostram disponibilidade, provedores configurados, contagem de requisições, erros, tarefas ativas e latência observada.
- **Exportação segura**: `POST /v1/projects/export`, autenticada com API key JARVES; até 200 arquivos e 8 MB de conteúdo.

### Instalação
1. Instale Node.js 18 ou superior.
2. Copie `.env.example` para `.env`.
3. Configure `UPSTREAM_KEY` e, opcionalmente, provedores de reserva (`UPSTREAM2_KEY` etc.).
4. Execute `npm start` ou `./iniciar.sh`.
5. Abra `http://localhost:3000` e acesse **V24 Control**.

### Segurança e limites reais
- Chaves de provedores permanecem no backend quando se usa o gateway JARVES. Não publique `.env`, `keys.json` nem exponha `ADMIN_TOKEN`.
- O gateway usa streaming HTTP/SSE quando o provedor oferece essa resposta. O transporte depende do suporte do provedor; não foi adicionado um servidor WebSocket.
- O gateway deve ser publicado atrás de HTTPS em hospedagem compatível. O servidor Node não termina TLS por conta própria.
- O painel não afirma que um provedor está conectado apenas porque há uma configuração: consulte o status e faça uma requisição real.
- A validação do Auto Fix é sintática para JavaScript; não substitui testes funcionais, análise de dependências ou sandbox de execução.
- O Code Master gera até 30 arquivos por resposta e limita exportação a 8 MB. Projetos grandes devem ser gerados em etapas.
- O modo Turbo/Deep Thinking seleciona instruções de geração no painel, mas latência, contexto e custo são determinados pelo modelo e provedor configurados.
- A aplicação preserva os módulos anteriores e adiciona V24 como módulo independente.


## JARVES AI V24 — modo totalmente gratuito

- Não há planos, pagamentos, assinatura, créditos ou moedas virtuais.
- O frontend não solicita nem armazena API keys de provedores no modo FREE.
- `FREE_MODE=1` é o padrão e faz o gateway encaminhar somente ao provedor gratuito configurado no código (`text.pollinations.ai`). Chaves de provedores comerciais presentes no `.env` são ignoradas enquanto esse modo estiver ativo.
- Chat e exportação ZIP funcionam sem API key JARVES; o servidor aplica limite por IP para reduzir abuso.
- O uso de "tokens" dentro dos limites de geração é apenas uma unidade técnica de texto/modelo, não saldo, crédito ou cobrança do aplicativo.
- **Transparência:** o serviço externo gratuito pode ter limites, filas, indisponibilidade ou mudar suas condições. Não é possível garantir disponibilidade ilimitada nem gratuidade permanente de terceiros. O modo FREE impede o JARVES de selecionar deliberadamente provedores comerciais que possam cobrar.
- Para usar: extraia o ZIP, rode `npm start` (ou `iniciar.sh` / `iniciar.bat`) e abra `http://localhost:3000`.


## API key própria JARVES — renovação diária (V24 FREE)

- O JARVES emite uma chave de sessão própria no formato `jv-...`; ela autentica a sessão no gateway JARVES e **não é** uma API key da OpenAI, Pollinations, Groq ou outro provedor.
- Cada chave tem validade de 24 horas. O navegador tenta renová-la automaticamente 5 minutos antes do vencimento, sem pedir que o usuário copie uma nova chave.
- A rotação usa `POST /v1/keys/rotate`, exige a chave atual, emite uma nova e revoga imediatamente a anterior. Se a chave já expirou, o navegador solicita uma nova sessão respeitando o limite inicial por IP.
- O servidor guarda somente o hash SHA-256 das chaves em `keys.json`; a chave em texto claro fica no armazenamento local do navegador. Use HTTPS em qualquer publicação pública.
- Para permitir a emissão inicial no modo gratuito, `PUBLIC_SIGNUP=1` vem ativado no `.env.example`, com limite de 3 novas sessões por IP por hora. A renovação diária não consome esse limite.
- A rotação diária **não cria cota de IA, não fornece créditos e não remove limites do provedor externo**. A disponibilidade e os limites do modelo gratuito continuam dependendo do serviço upstream.

## Novos módulos de criação (atualização)

### Prompt Generator
- Gera prompts otimizados a partir de linguagem informal, abreviações e erros de escrita.
- Perfis TURBO, BALANCED, DEEP THINKING, CODE MASTER e CREATIVE.
- Corrige e organiza sem ampliar requisitos, preservando a intenção original.
- Permite copiar, comparar original/otimizado e enviar o prompt ao chat.

### AI Code Generator
- Perfis TURBO, BALANCED, DEEP THINKING, CODE MASTER e PROTOTYPE.
- Seleção de linguagem/stack e saída em arquivo único ou projeto multi-arquivo.
- Exportação ZIP e salvamento dos arquivos no File Manager.
- Inclui README quando o modelo não o entrega.
- O conteúdo gerado precisa ser revisado, compilado e testado no ambiente de destino; a geração não afirma que executou esses testes.

Os dois módulos usam o gateway configurado no JARVES. Velocidade e disponibilidade dependem do modelo e do provedor gratuito ativo; os modos não removem limites externos de requisição.


# JARVES AI V25 — ULTRA FAST

A V25 preserva os módulos e ferramentas da V24 e adiciona uma camada PWA para carregar a interface e os recursos estáticos já visitados mesmo sem conexão. O service worker **não armazena chamadas /v1/** nem respostas de IA: chat, geração, imagens remotas e sincronização continuam exigindo internet.

## Atualização V25
- Cache offline do shell (HTML, CSS, JavaScript, templates, módulos e ícones), com limpeza de versões antigas.
- Cache HTTP mais eficiente para arquivos estáticos; HTML revalidado e respostas da API sem cache.
- Cabeçalhos básicos de segurança nos arquivos estáticos e respostas JSON.
- Limpeza oportunista dos mapas de limite por IP/sessão para evitar crescimento indefinido em processos longos.
- Normalização de separadores de caminho na exportação ZIP.
- Metadados e identidade da versão atualizados para V25.

## Instalação / publicação
- Node.js 18+: `npm start`, depois abra `http://localhost:3000`.
- Hospedagem: mantenha `FREE_MODE=1`, HTTPS e as variáveis do `.env` fora do repositório.
- PWA: abra o site por HTTPS (ou localhost) e instale pelo menu do navegador. Para atualizar o cache, publique os novos arquivos juntos; a versão do cache é `jarves-v25-shell-1` em `sw.js`.
- Offline: a interface e os recursos já armazenados podem abrir; a IA não responde offline porque o modelo gratuito é remoto. Para IA realmente offline é necessário integrar e instalar um runtime local, por exemplo Ollama, em um dispositivo compatível.

## Limites mantidos
A velocidade real da geração depende da rede, fila, disponibilidade e limites do provedor gratuito. V25 otimiza carregamento e cache do site, mas não pode garantir respostas instantâneas nem disponibilidade permanente de terceiros.


# JARVIS FREE AI ENGINE — modo local com Ollama

Esta versão adiciona uma API REST local que conversa diretamente com o Ollama. O motor local não exige chave de provedor, assinatura ou créditos. Depois de instalar o Ollama e baixar o modelo, a inferência pode funcionar sem internet.

## Requisitos e instalação (Windows/Linux)

1. Instale o Node.js 18 ou superior.
2. Instale o Ollama no sistema operacional suportado: https://ollama.com/download
3. Inicie o Ollama e baixe o modelo:
   `ollama pull qwen2.5:1.5b`
4. Copie `.env.example` para `.env` e confira `OLLAMA_ENABLED=1`, `OLLAMA_URL` e `OLLAMA_MODEL`.
5. Execute `npm start` (ou `./iniciar.sh` no Linux).
6. Abra `http://localhost:3000`.

## API local

- `GET /api/ai/status` — estado real do Ollama e se o modelo configurado está instalado.
- `GET /api/ai/models` — modelos instalados e modelo ativo.
- `POST /api/ai/chat` — chat com contexto por `session_id`.
- `POST /api/ai/generate` — geração a partir de `prompt`.
- `POST /api/ai/reset` — limpa uma sessão ou todo o histórico em memória.

Exemplo de chat:
```bash
curl http://localhost:3000/api/ai/chat -H "Content-Type: application/json" \
  -d '{"session_id":"teste","messages":[{"role":"user","content":"Olá, responda em português."}]}'
```

Autenticação: as rotas aceitam uma chave JARVIS no cabeçalho `Authorization: Bearer SUA_CHAVE`. Se `FREE_MODE=1`, também permitem acesso sem chave, adequado apenas para uso local/ambiente confiável. Para publicar na internet, configure `FREE_MODE=0`, `ADMIN_TOKEN`, HTTPS, `CORS_ORIGIN` restrito e proteja a porta do Ollama; nunca exponha a porta 11434 diretamente.

## Android e hardware limitado

Não é correto prometer Ollama nativo em todo Android. Este projeto aceita uma URL Ollama configurável. Em Android, use um ambiente que realmente execute/forneça a API compatível (por exemplo, um serviço local compatível ou um computador na mesma rede) e configure `OLLAMA_URL` para esse host. O modelo 1.5B ainda pode consumir memória considerável; desempenho depende de RAM, quantização, CPU e do runtime.

## Limites honestos

- A API REST e a integração Ollama são implementadas neste backend.
- O backend não instala automaticamente Ollama nem baixa modelos silenciosamente: isso requer instalação e download explícitos.
- O status distingue servidor acessível de modelo instalado; estar online não significa que o modelo está pronto.
- O histórico `session_id` é mantido em memória e desaparece ao reiniciar o servidor.
- A interface existente continua compatível com o gateway `/v1`. Os endpoints `/api/ai/*` são a API local adicional; não há promessa de que toda tela antiga passe a usar o motor local sem ajustes próprios.


## V27 — atualização ampla do sistema

- Gateway com diagnóstico detalhado do motor local e disponibilidade de provedores.
- Chaves inválidas agora recebem HTTP 401 mesmo quando o modo gratuito está ativado.
- Histórico do Ollama não é mais compartilhado entre usuários sem `session_id`; sessões sem ID recebem identificador isolado.
- Limite de sessões locais em memória para evitar crescimento ilimitado.
- Ciclo de cotas e validade de chaves alinhado ao reset diário das 01:00 em `America/Sao_Paulo`.
- Verificações de sintaxe automatizadas com `npm run check`.

### Limitações honestas

O software não consegue garantir disponibilidade ou velocidade de provedores externos gratuitos, nem liberar serviços pagos de terceiros. A geração de texto/imagem depende de um provedor acessível ou de um modelo local instalado. O teste de inferência real precisa ser feito no ambiente de implantação, com Ollama/modelo ou serviço remoto operacional.


## Geração externa real (Pollinations)

O gateway aceita o provedor oficial Pollinations para texto e imagens. A API atual exige uma chave secreta `sk_...`; crie-a em https://enter.pollinations.ai e configure `POLLINATIONS_API_KEY` no `.env` do servidor. Nunca coloque essa chave em `script.js`, HTML ou no navegador.

- Texto: provedor OpenAI-compatível adicionado ao gateway em `/v1/chat/completions`.
- Imagens: `POST /api/ai/image` com JSON `{ "prompt": "...", "width": 1024, "height": 1024 }`; a resposta é o próprio arquivo de imagem.
- Para usar essa chave com `FREE_MODE=1`, defina `POLLINATIONS_ALLOW_IN_FREE_MODE=1`. Isso apenas autoriza o uso da chave; **não significa que o provedor seja ilimitado ou sem custo**.
- Sem chave externa, o motor local Ollama continua disponível, se instalado.

Reinicie o servidor após alterar `.env`. Verifique `/v1/health` e `/v1/providers`.
