#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
[ -f .env ] || cp .env.example .env
command -v node >/dev/null 2>&1 || { echo "ERRO: instale Node.js 18 ou superior."; exit 1; }
export HOST="::"
node server.js
