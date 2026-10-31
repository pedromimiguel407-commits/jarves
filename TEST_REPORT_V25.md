# JARVES AI V25 — Relatório de validação

## Verificações locais
- `node --check server.js`: aprovado.
- `node --check script.js`: aprovado.
- `node --check sw.js`: aprovado.
- JSON de `package.json` e `manifest.webmanifest`: aprovado.
- Inicialização do gateway, `/`, `/v1/health` e entrega de `sw.js`: verificação automatizada abaixo.

## Escopo e limites
- O service worker armazena somente a interface e recursos estáticos do mesmo domínio. Rotas `/v1/` são sempre excluídas do cache.
- Chat, Code Master, geração de imagens e demais chamadas externas não funcionam sem internet.
- Não foi possível medir latência do provedor gratuito nem testar em aparelho Android físico neste ambiente.
- A disponibilidade do modelo externo e os tempos de resposta continuam sujeitos a filas e limites do provedor.
