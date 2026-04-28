# Trimio — Comandos de Referência

## SSH para a VPS

**Mac / Linux**
```bash
ssh -i ~/Desktop/trimio_vps_ed25519 ubuntu@51.91.158.175
```

**Windows (PowerShell)**
```powershell
ssh -i $HOME\Desktop\trimio_vps_ed25519 ubuntu@51.91.158.175
```

---

## Deploy completo (Mac/Linux → VPS)

```bash
# 1. Envia código para o GitHub
git add .
git commit -m "descrição"
git push origin main

# 2. Na VPS
cd /var/www/trimio
git pull origin main
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
cd web && npm run build && cd ..
pm2 restart trimio-api --update-env
```

**Sequência rápida numa linha (na VPS)**
```bash
cd /var/www/trimio && git pull origin main && npm install && npx prisma migrate deploy && npx prisma generate && npm run build && cd web && npm run build && cd .. && pm2 restart trimio-api --update-env
```

---

## Testar o sistema

**Correr o test.sh na VPS (recomendado)**
```bash
bash /var/www/trimio/test.sh
```

**Correr o test.sh no Mac**
```bash
cd ~/Desktop/barbearia-agendamento
bash test.sh
```

**Testar só uma barbearia**
```bash
bash test.sh stukabarber
```

**Atualizar o test.sh na VPS após editar no Mac**
```bash
scp -i ~/Desktop/trimio_vps_ed25519 ~/Desktop/barbearia-agendamento/test.sh ubuntu@51.91.158.175:/var/www/trimio/test.sh
```

---

## PM2 — Gerir a app

```bash
pm2 status                          # estado dos processos
pm2 restart trimio-api              # reiniciar
pm2 reload trimio-api               # reiniciar sem downtime
pm2 stop trimio-api                 # parar
pm2 logs trimio-api                 # logs em tempo real
pm2 logs trimio-api --lines 100     # últimas 100 linhas
pm2 logs trimio-api --err           # só erros
pm2 flush trimio-api                # limpar logs
pm2 monit                           # monitor visual (CPU/RAM)
```

---

## Nginx

```bash
sudo nginx -t                        # testar configuração
sudo nginx -s reload                 # recarregar sem downtime
sudo systemctl restart nginx         # reiniciar
sudo systemctl status nginx          # estado
sudo tail -f /var/log/nginx/access.log   # logs de acesso em tempo real
sudo tail -f /var/log/nginx/error.log    # logs de erro em tempo real
sudo nano /etc/nginx/sites-enabled/trimio  # editar config
```

---

## Base de dados (PostgreSQL)

```bash
# Entrar na DB
sudo -u postgres psql -d trimio

# Comandos dentro do psql
\dt                                  # listar tabelas
\di                                  # listar índices
\q                                   # sair

# Contar registos por tabela
sudo -u postgres psql -d trimio -c "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"

# Ver conexões ativas
sudo -u postgres psql -d trimio -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Backup manual
sudo -u postgres pg_dump trimio > /tmp/backup_$(date +%Y%m%d_%H%M).sql

# Restaurar backup
sudo -u postgres psql -d trimio < /tmp/backup_XXXXXXXX_XXXX.sql
```

---

## Prisma

```bash
# Aplicar migrations na VPS
npx prisma migrate deploy

# Gerar cliente após alterar schema
npx prisma generate

# Ver estado das migrations
npx prisma migrate status

# Abrir Prisma Studio (só local, com .env configurado)
npx prisma studio
```

---

## Recursos do servidor

```bash
# CPU, RAM, disco
htop                                 # monitor interativo
free -h                              # memória
df -h                                # disco
uptime                               # load average

# Processos
ps aux --sort=-%mem | head -10       # top por memória
ps aux --sort=-%cpu | head -10       # top por CPU

# Rede
ss -tlnp                             # portas abertas
ss -s                                # resumo conexões TCP

# Ficheiros grandes
du -sh /var/www/trimio/*             # tamanho por pasta
find /var/log -name "*.log" -size +50M  # logs grandes
```

---

## Segurança

```bash
# Fail2ban
sudo fail2ban-client status          # estado geral
sudo fail2ban-client status sshd     # bans SSH
sudo fail2ban-client unban IP        # desbanir IP

# UFW (firewall)
sudo ufw status verbose              # regras ativas
sudo ufw allow 8080                  # abrir porta
sudo ufw deny 8080                   # fechar porta

# Últimas tentativas de login SSH
sudo lastb | head -20                # logins falhados
last | head -20                      # logins com sucesso

# Certificado SSL — dias restantes
echo | openssl s_client -connect trimio.pt:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Variáveis de ambiente

```bash
# Ver .env (cuidado — contém segredos)
cat /var/www/trimio/.env

# Editar .env
nano /var/www/trimio/.env

# Após editar .env, reiniciar a app
pm2 restart trimio-api --update-env
```

---

## Git na VPS

```bash
git status                           # estado atual
git log --oneline -10                # últimos 10 commits
git pull origin main                 # puxar código novo
git diff HEAD~1                      # ver últimas alterações
```

---

## Comandos rápidos de diagnóstico

```bash
# App está online?
curl -s -o /dev/null -w "%{http_code}" https://trimio.pt/

# API responde?
curl -s https://trimio.pt/api/public/stukabarber | python3 -m json.tool | head -10

# Ver erros recentes (últimas 50 linhas de erro)
pm2 logs trimio-api --lines 50 --nostream --err

# Ver 5xx no nginx das últimas 1000 requests
sudo tail -1000 /var/log/nginx/access.log | awk '$9>=500{print $9,$7}' | sort | uniq -c | sort -rn

# Testar se Postgres está acessível
sudo -u postgres psql -d trimio -c "SELECT 1;" 2>&1
```
