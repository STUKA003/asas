#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
PIDS_FILE="$DIR/.start.pids"

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
}

MODE="${1:-start}"

if [[ "$MODE" == "stop" ]]; then
	stop_all
	echo "Sistema parado."
	exit 0
fi

if [[ "$MODE" != "start" ]]; then
	echo "Uso: ./restart.sh [start|stop]"
	exit 1
fi

stop_all
sleep 1
prepare_local_db

(
	cd "$DIR"
	npm run dev
) > /tmp/barbearia-backend.log 2>&1 &
BACKEND_PID=$!

sleep 2

(
	cd "$DIR/web"
	npm run dev
) > /tmp/barbearia-frontend.log 2>&1 &
FRONTEND_PID=$!

printf "%s\n%s\n" "$BACKEND_PID" "$FRONTEND_PID" > "$PIDS_FILE"

echo "Sistema iniciado!"
echo "Backend:  http://localhost:3000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Para parar: ./restart.sh stop"
