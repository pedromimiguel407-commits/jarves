# Relatório de testes — JARVIS FREE AI ENGINE

- [x] `node --check server.js`
- [x] Sintaxe JSON de `package.json` e `manifest.webmanifest`
- [x] Inicialização do servidor Node
- [x] Respostas HTTP dos endpoints locais sem Ollama: status/modelos identificam indisponibilidade sem fingir conexão
- [ ] Chat real com Qwen: requer Ollama instalado e `qwen2.5:1.5b` baixado no host de execução
- [ ] Teste em Android físico: depende do runtime Ollama compatível instalado/disponível no dispositivo

Nenhum teste de inferência é declarado aprovado sem motor local e modelo reais.

## V26.1 — verificação adicional

- [x] Sintaxe Node.js verificada em server.js, script.js, data/config.js, data/v21.js, data/v24.js e sw.js.
- [x] Gateway iniciado em ambiente isolado com FREE_MODE=1.
- [x] `/v1/health` confirma modo gratuito, fuso America/Sao_Paulo e próximo reset às 01:00.
- [x] Emissão de chave confirma validade até o próximo reset diário.
- [x] Arquivo de chaves mantém apenas hashes SHA-256; nenhuma chave de provedor é embutida no navegador.
- [x] Ajustes CSS responsivos adicionados para celulares.
- [ ] Teste de inferência remota: depende da disponibilidade do serviço gratuito externo.
- [ ] Teste de inferência local: depende de Ollama e do modelo instalados no dispositivo/servidor.
- [ ] Teste em aparelho Android físico: não disponível neste ambiente.
- [x] Ollama local adicionado como primeiro provedor opcional do gateway, com timeout de conexão curto e fallback remoto gratuito.


## V27 — testes executados nesta atualização

- [x] `node --check` em server.js, script.js, sw.js e tests/smoke.js.
- [x] `npm run check`.
- [x] Smoke test HTTP com servidor isolado: `/v1/health`, versão 27.0.0 e fuso de Brasília.
- [x] API key inválida rejeitada com HTTP 401 mesmo em FREE_MODE.
- [x] Cadastro público limitado de chave testado.
- [x] Rotação de chave testada.
- [ ] Inferência de IA externa: não declarada como aprovada; depende do provedor gratuito responder na implantação.
- [ ] Inferência Ollama: não declarada como aprovada; exige Ollama e modelo instalado no host.
- [ ] Teste físico em Android: depende de aparelho e hospedagem do usuário.
