#!/usr/bin/env bash
# Trimio — health check completo
# Uso: ./check.sh

set -euo pipefail

# ── Cores ────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "  ${GREEN}✓${RESET} $*"; }
fail() { echo -e "  ${RED}✗${RESET} $*"; ERRORS=$((ERRORS+1)); }
warn() { echo -e "  ${YELLOW}!${RESET} $*"; WARNS=$((WARNS+1)); }
section() { echo -e "\n${BOLD}${CYAN}▸ $*${RESET}"; }

ERRORS=0; WARNS=0

# ── 1. PM2 ───────────────────────────────────────────────────────────
section "Processo Node (PM2)"
PM2_STATUS=$(ssh -i ~/Desktop/trimio_vps_ed25519 -o StrictHostKeyChecking=no ubuntu@51.91.158.175 \
  "pm2 jlist 2>/dev/null" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data:
  print(p['name'], p['pm2_env']['status'], p['pm2_env']['restart_time'], p['monit']['memory'])
" 2>/dev/null || echo "")

if [[ -z "$PM2_STATUS" ]]; then
  fail "PM2 não está a responder"
else
  while IFS=' ' read -r name status restarts mem; do
    mem_mb=$(( mem / 1024 / 1024 ))
    if [[ "$status" == "online" ]]; then
      ok "$name — online · ${mem_mb}MB RAM"
    else
      fail "$name — $status"
    fi
    if (( restarts > 10 )); then
      warn "$name reiniciou $restarts vezes (pode indicar crashes)"
    else
      ok "$name — $restarts restarts"
    fi
  done <<< "$PM2_STATUS"
fi

# ── 2. Nginx ─────────────────────────────────────────────────────────
section "Nginx"
NGINX_STATUS=$(ssh -i ~/Desktop/trimio_vps_ed25519 -o StrictHostKeyChecking=no ubuntu@51.91.158.175 \
  "systemctl is-active nginx 2>/dev/null" || echo "inactive")
if [[ "$NGINX_STATUS" == "active" ]]; then
  ok "nginx a correr"
else
  fail "nginx está $NGINX_STATUS"
fi

# ── 3. Base de dados ─────────────────────────────────────────────────
section "Base de dados (PostgreSQL)"
DB_RESULT=$(ssh -i ~/Desktop/trimio_vps_ed25519 -o StrictHostKeyChecking=no ubuntu@51.91.158.175 \
  "sudo -u postgres psql -d trimio -c 'SELECT count(*) FROM pg_stat_activity;' -t 2>/dev/null | tr -d ' '" || echo "erro")

if [[ "$DB_RESULT" =~ ^[0-9]+$ ]]; then
  ok "PostgreSQL acessível · $DB_RESULT conexões ativas"
  if (( DB_RESULT > 50 )); then
    warn "Muitas conexões ($DB_RESULT) — pode haver leak"
  fi
else
  fail "PostgreSQL não responde"
fi

# Erros desde o último restart
PRISMA_ERRORS=$(ssh -i ~/Desktop/trimio_vps_ed25519 -o StrictHostKeyChecking=no ubuntu@51.91.158.175 \
  "pm2 logs trimio-api --lines 50 --nostream --err 2>/dev/null | tac | awk '/PM2.*restarted/{exit} /PrismaClientKnownRequestError/{count++} END{print count+0}'")
if (( PRISMA_ERRORS > 0 )); then
  fail "$PRISMA_ERRORS erros Prisma desde o último restart"
  LAST_ERR=$(ssh -i ~/Desktop/trimio_vps_ed25519 -o StrictHostKeyChecking=no ubuntu@51.91.158.175 \
    "pm2 logs trimio-api --lines 50 --nostream --err 2>/dev/null | grep 'The column\|does not exist\|code:' | tail -1 || echo ''")
  [[ -n "$LAST_ERR" ]] && echo -e "     ${RED}→ $LAST_ERR${RESET}"
else
  ok "Sem erros Prisma desde o último restart"
fi

# ── 4. Recursos do servidor ──────────────────────────────────────────
section "Recursos do servidor"
RESOURCES=$(ssh -i ~/Desktop/trimio_vps_ed25519 -o StrictHostKeyChecking=no ubuntu@51.91.158.175 "
  CPU=\$(top -bn2 -d0.5 | grep '%Cpu' | tail -1 | awk '{print 100 - \$8}')
  MEM_TOTAL=\$(free -m | awk '/^Mem/ {print \$2}')
  MEM_USED=\$(free -m | awk '/^Mem/ {print \$3}')
  DISK_PCT=\$(df / | awk 'NR==2 {print \$5}' | tr -d '%')
  echo \"\$CPU \$MEM_USED \$MEM_TOTAL \$DISK_PCT\"
")

read -r cpu mem_used mem_total disk_pct <<< "$RESOURCES"
cpu_int=${cpu%.*}

if (( cpu_int > 80 )); then
  fail "CPU: ${cpu}% (alto)"
else
  ok "CPU: ${cpu}%"
fi

mem_pct=$(( mem_used * 100 / mem_total ))
if (( mem_pct > 85 )); then
  fail "RAM: ${mem_used}MB / ${mem_total}MB (${mem_pct}%)"
else
  ok "RAM: ${mem_used}MB / ${mem_total}MB (${mem_pct}%)"
fi

if (( disk_pct > 85 )); then
  fail "Disco: ${disk_pct}% utilizado"
elif (( disk_pct > 70 )); then
  warn "Disco: ${disk_pct}% utilizado"
else
  ok "Disco: ${disk_pct}% utilizado"
fi

# ── 5. Endpoints da API ──────────────────────────────────────────────
section "Endpoints da API"

check_endpoint() {
  local label="$1" url="$2" expected_status="${3:-200}"
  result=$(curl -o /dev/null -s -w "%{http_code} %{time_total}" "$url")
  status=$(echo "$result" | cut -d' ' -f1)
  time=$(echo "$result" | cut -d' ' -f2)
  time_ms=$(echo "$time * 1000" | bc | cut -d'.' -f1)

  if [[ "$status" == "$expected_status" ]]; then
    if (( time_ms > 2000 )); then
      warn "$label — ${status} mas lento (${time_ms}ms)"
    else
      ok "$label — ${status} · ${time_ms}ms"
    fi
  else
    fail "$label — esperado $expected_status, recebeu $status"
  fi
}

check_endpoint "Site público"         "https://trimio.pt/"
check_endpoint "Info barbearia"       "https://trimio.pt/api/public/stukabarber"
check_endpoint "Serviços"             "https://trimio.pt/api/public/stukabarber/services"
check_endpoint "Barbeiros"            "https://trimio.pt/api/public/stukabarber/barbers"
check_endpoint "Extras"               "https://trimio.pt/api/public/stukabarber/extras"
check_endpoint "Auth (sem token)"     "https://trimio.pt/api/barbershop" "401"

# ── 6. Erros recentes no nginx ───────────────────────────────────────
section "Erros recentes (Nginx — últimas 50 requests)"
NGINX_ERRORS=$(ssh -i ~/Desktop/trimio_vps_ed25519 -o StrictHostKeyChecking=no ubuntu@51.91.158.175 \
  "sudo tail -50 /var/log/nginx/access.log 2>/dev/null | awk '\$9+0>=400 {print \$9, \$7}' | sort | uniq -c | sort -rn | head -10" || echo "")

if [[ -z "$NGINX_ERRORS" ]]; then
  ok "Sem erros 4xx/5xx recentes"
else
  while read -r count code path; do
    [[ -z "$count" ]] && continue
    if [[ "$code" == "413" ]]; then
      warn "${count}× ${path} → ${code} (payload demasiado grande)"
    elif [[ "$code" == "401" || "$code" == "403" ]]; then
      warn "${count}× ${path} → ${code} (não autenticado)"
    elif [[ "$code" == "404" ]]; then
      : # 404s são normais em SPAs
    else
      fail "${count}× ${path} → ${code}"
    fi
  done <<< "$NGINX_ERRORS"
fi

# ── Resumo ───────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}────────────────────────────────${RESET}"
if (( ERRORS == 0 && WARNS == 0 )); then
  echo -e "${GREEN}${BOLD}  Tudo OK — sistema saudável${RESET}"
elif (( ERRORS == 0 )); then
  echo -e "${YELLOW}${BOLD}  ${WARNS} aviso(s) — sistema a funcionar${RESET}"
else
  echo -e "${RED}${BOLD}  ${ERRORS} erro(s)  ${WARNS} aviso(s) — requer atenção${RESET}"
fi
echo -e "${BOLD}────────────────────────────────${RESET}"
echo ""
