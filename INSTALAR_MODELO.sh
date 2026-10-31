#!/usr/bin/env bash
set -e
command -v ollama >/dev/null 2>&1 || { echo 'Instale Ollama: https://ollama.com/download'; exit 1; }
ollama pull qwen2.5:1.5b
echo 'Modelo pronto. Inicie o JARVIS com ./iniciar.sh'
