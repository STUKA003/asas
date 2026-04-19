#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
CLOUDFLARED_BIN="$DIR/cloudflared"
PIDS_FILE="$DIR/.internet-dev.pids"

BACKEND_LOG="$(mktemp -t barbearia_backend_XXXX.log)"
FRONTEND_LOG="$(mktemp -t barbearia_frontend_XXXX.log)"
CF_API_LOG="$(mktemp -t barbearia_cf_api_XXXX.log)"
CF_WEB_LOG="$(mktemp -t barbearia_cf_web_XXXX.log)"

prepare_local_db() {
  echo "A preparar Prisma e base local..."
  (
    cd "$DIR"
    npm run db:generate
    npm run db:push
  )
}

stop_all() {
  if [[ -f "$PIDS_FILE" ]]; then
    while IFS= read -r pid; do
      [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
    done < "$PIDS_FILE"
    rm -f "$PIDS_FILE"
  fi

  pkill -f "tsx watch src/server.ts" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  pkill -f "cloudflared tunnel --url http://localhost:3000" 2>/dev/null || true
  pkill -f "cloudflared tunnel --url http://localhost:5173" 2>/dev/null || true
}

wait_port() {
  local port="$1"
  local tries=0

  while (( tries < 60 )); do
    if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      return 0
    fi
    tries=$((tries + 1))
    sleep 1
  done

  return 1
}

wait_tunnel_url() {
  local log_file="$1"
  local tries=0

  while (( tries < 60 )); do
    local url
    url="$(grep -Eo 'https://[-a-z0-9]+\.trycloudflare\.com' "$log_file" | head -n 1 || true)"
    if [[ -n "$url" ]]; then
      echo "$url"
      return 0
    fi
    tries=$((tries + 1))
    sleep 1
  done

  return 1
}

if [[ "${1:-start}" == "stop" ]]; then
  stop_all
  echo "Tudo desligado."
  exit 0
fi

if [[ ! -x "$CLOUDFLARED_BIN" ]]; then
  echo "Erro: cloudflared nao encontrado/executavel em: $CLOUDFLARED_BIN"
  exit 1
fi

echo "Desligando processos anteriores..."
stop_all
sleep 1
prepare_local_db

echo "Subindo backend (3000)..."
(
  cd "$DIR"
  npm run dev
) > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

echo "Subindo frontend (5173)..."
(
  cd "$DIR/web"
  npm run dev
) > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

if ! wait_port 3000; then
  echo "Erro: backend nao subiu na porta 3000."
  echo "Log backend: $BACKEND_LOG"
  exit 1
fi

if ! wait_port 5173; then
  echo "Erro: frontend nao subiu na porta 5173."
  echo "Log frontend: $FRONTEND_LOG"
  exit 1
fi

echo "Abrindo tunel Cloudflare para API..."
"$CLOUDFLARED_BIN" tunnel --no-autoupdate --url http://localhost:3000 > "$CF_API_LOG" 2>&1 &
CF_API_PID=$!

echo "Abrindo tunel Cloudflare para frontend..."
"$CLOUDFLARED_BIN" tunnel --no-autoupdate --url http://localhost:5173 > "$CF_WEB_LOG" 2>&1 &
CF_WEB_PID=$!

API_URL="$(wait_tunnel_url "$CF_API_LOG" || true)"
WEB_URL="$(wait_tunnel_url "$CF_WEB_LOG" || true)"

printf "%s\n" "$BACKEND_PID" "$FRONTEND_PID" "$CF_API_PID" "$CF_WEB_PID" > "$PIDS_FILE"

echo ""
echo "Sistema online."
echo "Local API:      http://localhost:3000"
echo "Local Frontend: http://localhost:5173"
echo ""

if [[ -n "$API_URL" ]]; then
  echo "API publica:      $API_URL"
else
  echo "API publica:      nao encontrada ainda (veja log: $CF_API_LOG)"
fi

if [[ -n "$WEB_URL" ]]; then
  echo "Frontend publico: $WEB_URL"
else
  echo "Frontend publico: nao encontrado ainda (veja log: $CF_WEB_LOG)"
fi

echo ""
echo "Para desligar tudo: ./internet.sh stop"
