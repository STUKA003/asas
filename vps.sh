#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
PIDS_FILE="$DIR/.vps.pids"
BACKEND_LOG="/tmp/barbearia-vps-backend.log"
FRONTEND_LOG="/tmp/barbearia-vps-frontend.log"
FRONTEND_PORT="${FRONTEND_PORT:-4173}"
BACKEND_PORT="${PORT:-3000}"

require_postgres_env() {
  if [[ ! -f "$DIR/.env" ]]; then
    echo "Erro: ficheiro .env nao encontrado."
    exit 1
  fi

  local database_url
  database_url="$(grep '^DATABASE_URL=' "$DIR/.env" | head -n 1 | cut -d '=' -f 2- | tr -d '"')"

  if [[ -z "$database_url" ]]; then
    echo "Erro: DATABASE_URL nao definido no .env."
    exit 1
  fi

  if [[ "$database_url" != postgresql://* && "$database_url" != postgres://* ]]; then
    echo "Erro: o script VPS exige PostgreSQL no DATABASE_URL."
    echo "Atual: $database_url"
    exit 1
  fi
}

stop_all() {
  if [[ -f "$PIDS_FILE" ]]; then
    while IFS= read -r pid; do
      [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
    done < "$PIDS_FILE"
    rm -f "$PIDS_FILE"
  fi

  pkill -f "node dist/server.js" 2>/dev/null || true
  pkill -f "vite preview --host 0.0.0.0 --port $FRONTEND_PORT" 2>/dev/null || true
}

prepare_vps() {
  echo "A preparar ambiente VPS com PostgreSQL..."
  (
    cd "$DIR"
    npm run db:generate:postgres
    npm run db:deploy:postgres
    npm run build
  )

  (
    cd "$DIR/web"
    npm run build
  )
}

MODE="${1:-start}"

if [[ "$MODE" == "stop" ]]; then
  stop_all
  echo "Sistema VPS parado."
  exit 0
fi

if [[ "$MODE" != "start" ]]; then
  echo "Uso: ./vps.sh [start|stop]"
  exit 1
fi

require_postgres_env
stop_all
sleep 1
prepare_vps

echo "A subir backend de producao..."
(
  cd "$DIR"
  npm run start
) > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

sleep 2

echo "A subir frontend de producao..."
(
  cd "$DIR/web"
  npm run preview -- --host 0.0.0.0 --port "$FRONTEND_PORT"
) > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

printf "%s\n%s\n" "$BACKEND_PID" "$FRONTEND_PID" > "$PIDS_FILE"

echo "Sistema VPS iniciado."
echo "Backend:  http://0.0.0.0:$BACKEND_PORT"
echo "Frontend: http://0.0.0.0:$FRONTEND_PORT"
echo "Logs:"
echo "  Backend:  $BACKEND_LOG"
echo "  Frontend: $FRONTEND_LOG"
echo ""
echo "Para parar: ./vps.sh stop"
