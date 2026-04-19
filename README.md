# BarberBook

Sistema SaaS de agendamento para barbearias com:

- site publico por barbearia
- painel administrativo da barbearia
- portal do barbeiro
- superadmin da plataforma
- relatorios
- planos, produtos e extras
- agenda, bloqueios e disponibilidade

O projeto esta preparado para:

- desenvolvimento local simples com SQLite
- publicacao futura em VPS com PostgreSQL

## 1. Resumo rapido

Cada barbearia tem um `slug`.

Exemplo:

- site publico: `www.barberbook.com/fadelab`
- agendamento: `www.barberbook.com/fadelab/booking`
- portal do barbeiro: `www.barberbook.com/fadelab/barber`
- painel admin: `www.barberbook.com/admin`
- superadmin: `www.barberbook.com/superadmin`

## 2. Stack e linguagens

### Backend

- `TypeScript`
- `Node.js`
- `Express`
- `Prisma ORM`
- `Zod`
- `JWT`
- `bcryptjs`

### Frontend

- `TypeScript`
- `React`
- `Vite`
- `React Router`
- `TanStack Query`
- `React Hook Form`
- `Zustand`
- `Tailwind CSS`

### Base de dados

- `SQLite` no ambiente local de testes
- `PostgreSQL` preparado para VPS / producao

## 3. O que o sistema faz

### Site publico da barbearia

- home publica com branding da barbearia
- listagem de servicos
- agendamento online
- venda de planos
- venda de produtos
- lookup de cliente por telefone para plano atual

### Painel admin da barbearia

- dashboard
- clientes
- barbeiros
- servicos
- extras
- produtos
- planos
- agenda
- horarios de trabalho
- bloqueios pontuais
- personalizacao
- faturacao / billing
- relatorios

### Portal do barbeiro

- login proprio
- dashboard
- agenda
- notificacoes
- remarcacao de bookings

### Superadmin da plataforma

- login superadmin
- dashboard global
- gestao de barbearias

## 4. Estrutura geral do projeto

```text
barbearia-agendamento/
├── src/                    # backend
├── web/                    # frontend
├── prisma/                 # schema SQLite local + dev.db + migrations locais
├── prisma/postgres/        # schema e migrations PostgreSQL para VPS
├── restart.sh              # arranque local
├── internet.sh             # arranque local + Cloudflare tunnel
├── vps.sh                  # arranque VPS com PostgreSQL
├── ACESSOS_SISTEMA.md
├── POSTGRESQL_PRODUCAO.md
└── README.md
```

## 5. Estrutura do backend

### Pasta principal

```text
src/
├── app.ts
├── server.ts
├── lib/
├── middlewares/
├── modules/
├── test/
└── utils/
```

### Ficheiros principais

- [src/server.ts](/Users/leandrogomes/Desktop/barbearia-agendamento/src/server.ts:1)
  ponto de entrada do servidor
- [src/app.ts](/Users/leandrogomes/Desktop/barbearia-agendamento/src/app.ts:1)
  configura Express, CORS, Helmet e routers

### Modulos do backend

```text
src/modules/
├── auth/              # login admin da barbearia
├── barber-auth/       # login do barbeiro
├── barber-portal/     # agenda e operacoes do barbeiro
├── barbers/           # CRUD de barbeiros
├── barbershops/       # configuracao da barbearia
├── blocked-times/     # bloqueios na agenda
├── bookings/          # agendamentos, remarcacao, relatorios
├── customers/         # clientes
├── extras/            # extras vendidos no booking
├── notifications/     # notificacoes
├── plans/             # planos da barbearia
├── products/          # produtos
├── public/            # site publico / booking publico por slug
├── services/          # servicos
├── superadmin/        # gestao global da plataforma
└── working-hours/     # horarios de trabalho
```

### Utilitarios importantes

- `src/utils/availability.ts`
  calcula disponibilidade e valida slots
- `src/utils/scheduling.ts`
  funcoes puras de agenda
- `src/modules/bookings/service.ts`
  criacao de booking com regras de negocio
- `src/modules/bookings/reports.ts`
  agregacoes dos relatorios

## 6. Estrutura do frontend

### Pasta principal

```text
web/src/
├── App.tsx
├── main.tsx
├── components/
├── pages/
├── lib/
├── providers/
└── store/
```

### Paginas principais

#### Publicas

- `web/src/pages/Home.tsx`
- `web/src/pages/Services.tsx`
- `web/src/pages/Booking.tsx`
- `web/src/pages/Plans.tsx`
- `web/src/pages/Products.tsx`

#### Admin

- `web/src/pages/admin/Dashboard.tsx`
- `web/src/pages/admin/Customers.tsx`
- `web/src/pages/admin/Barbers.tsx`
- `web/src/pages/admin/Services.tsx`
- `web/src/pages/admin/Extras.tsx`
- `web/src/pages/admin/Products.tsx`
- `web/src/pages/admin/Plans.tsx`
- `web/src/pages/admin/Bookings.tsx`
- `web/src/pages/admin/Schedule.tsx`
- `web/src/pages/admin/Customization.tsx`
- `web/src/pages/admin/Billing.tsx`
- `web/src/pages/admin/Reports.tsx`

#### Barbeiro

- `web/src/pages/barber/Login.tsx`
- `web/src/pages/barber/Dashboard.tsx`
- `web/src/pages/barber/Schedule.tsx`

#### Superadmin

- `web/src/pages/superadmin/Login.tsx`
- `web/src/pages/superadmin/Dashboard.tsx`
- `web/src/pages/superadmin/Barbershops.tsx`

### Componentes importantes

- `web/src/components/admin/CalendarView.tsx`
  agenda principal partilhada
- `web/src/components/booking/`
  fluxo de booking publico
- `web/src/components/layout/`
  layouts principais
- `web/src/components/ui/`
  componentes base da interface

### Estado e API

- `web/src/store/auth.ts`
- `web/src/store/barberAuth.ts`
- `web/src/store/superauth.ts`
- `web/src/lib/api.ts`
- `web/src/lib/publicApi.ts`

## 7. Rotas principais

### Publicas

- `/:slug`
- `/:slug/services`
- `/:slug/booking`
- `/:slug/plans`
- `/:slug/products`

### Admin

- `/admin/login`
- `/admin`
- `/admin/customers`
- `/admin/barbers`
- `/admin/services`
- `/admin/extras`
- `/admin/products`
- `/admin/plans`
- `/admin/bookings`
- `/admin/schedule`
- `/admin/customization`
- `/admin/billing`
- `/admin/reports`

### Barbeiro

- `/barber/login`
- `/:slug/barber/login`
- `/:slug/barber`
- `/:slug/barber/schedule`

### Superadmin

- `/superadmin/login`
- `/superadmin`
- `/superadmin/barbershops`

## 8. API principal

Rotas configuradas em [src/app.ts](/Users/leandrogomes/Desktop/barbearia-agendamento/src/app.ts:1):

- `/api/auth`
- `/api/public/:slug`
- `/api/barbershop`
- `/api/barbers`
- `/api/services`
- `/api/extras`
- `/api/products`
- `/api/plans`
- `/api/customers`
- `/api/bookings`
- `/api/working-hours`
- `/api/blocked-times`
- `/api/superadmin`
- `/api/barber-auth`
- `/api/barber-portal`
- `/api/notifications`

## 9. Base de dados

### Ambiente local

Em `localhost`, o projeto usa:

- schema local: [prisma/schema.prisma](/Users/leandrogomes/Desktop/barbearia-agendamento/prisma/schema.prisma:1)
- base local: [prisma/dev.db](/Users/leandrogomes/Desktop/barbearia-agendamento/prisma/dev.db)

Isto e o que torna o desenvolvimento simples e rapido.

### Ambiente VPS / producao

Para VPS com PostgreSQL, o projeto usa:

- schema PostgreSQL: [prisma/postgres/schema.prisma](/Users/leandrogomes/Desktop/barbearia-agendamento/prisma/postgres/schema.prisma:1)
- migrations PostgreSQL: [prisma/postgres/migrations](/Users/leandrogomes/Desktop/barbearia-agendamento/prisma/postgres/migrations/migration_lock.toml:1)

## 10. Variaveis de ambiente

### Local

Exemplo em [.env.example](/Users/leandrogomes/Desktop/barbearia-agendamento/.env.example:1):

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000

SUPERADMIN_EMAIL="admin@barberbook.app"
SUPERADMIN_PASSWORD="change-me"
```

### PostgreSQL / VPS

Exemplo em [.env.postgres.example](/Users/leandrogomes/Desktop/barbearia-agendamento/.env.postgres.example:1):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/barbearia_agendamento?schema=public"
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000

SUPERADMIN_EMAIL="admin@barberbook.app"
SUPERADMIN_PASSWORD="change-me"
```

## 11. Scripts principais

### Backend

Do [package.json](/Users/leandrogomes/Desktop/barbearia-agendamento/package.json:1):

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm test`
- `npm run test:integration`
- `npm run db:migrate`
- `npm run db:push`
- `npm run db:generate`
- `npm run db:studio`
- `npm run db:generate:postgres`
- `npm run db:push:postgres`
- `npm run db:migrate:postgres`
- `npm run db:deploy:postgres`

### Frontend

Do [web/package.json](/Users/leandrogomes/Desktop/barbearia-agendamento/web/package.json:1):

- `npm run dev`
- `npm run build`
- `npm run preview`

## 12. Scripts de arranque

### `restart.sh`

Ficheiro: [restart.sh](/Users/leandrogomes/Desktop/barbearia-agendamento/restart.sh:1)

Serve para desenvolvimento local.

Faz:

- para processos anteriores
- gera Prisma client
- faz `db push` local
- sobe backend
- sobe frontend

Uso:

```bash
./restart.sh
./restart.sh stop
```

### `internet.sh`

Ficheiro: [internet.sh](/Users/leandrogomes/Desktop/barbearia-agendamento/internet.sh:1)

Serve para testar o sistema localmente mas exposto pela internet com Cloudflare Tunnel.

Faz:

- para processos anteriores
- gera Prisma client
- faz `db push` local
- sobe backend
- sobe frontend
- abre tunel Cloudflare para API
- abre tunel Cloudflare para frontend

Uso:

```bash
./internet.sh
./internet.sh stop
```

### `vps.sh`

Ficheiro: [vps.sh](/Users/leandrogomes/Desktop/barbearia-agendamento/vps.sh:1)

Serve para ambiente de VPS com PostgreSQL.

Faz:

- valida que o `.env` esta com `DATABASE_URL` PostgreSQL
- gera Prisma client PostgreSQL
- aplica migrations PostgreSQL
- builda backend
- builda frontend
- sobe backend em modo producao
- sobe frontend em modo preview

Uso:

```bash
./vps.sh
./vps.sh stop
```

## 13. Como correr em localhost

### Backend + frontend com o script pronto

```bash
./restart.sh
```

### Ou manualmente

#### Backend

```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

#### Frontend

```bash
cd web
npm install
npm run dev
```

## 14. Como correr com internet publica

Requisitos:

- binario `cloudflared`

Depois:

```bash
./internet.sh
```

## 15. Como preparar para VPS

### 1. Configurar `.env`

Usar PostgreSQL:

```bash
cp .env.postgres.example .env
```

### 2. Subir sistema

```bash
./vps.sh
```

### 3. Opcional

Na VPS real, normalmente vais querer:

- `Nginx`
- `PM2` ou `systemd`
- dominio real
- SSL

## 16. Testes

### Testes existentes

- testes unitarios de funcoes de agenda
- testes HTTP de integracao preparados para PostgreSQL

Ficheiros:

- [src/utils/scheduling.test.ts](/Users/leandrogomes/Desktop/barbearia-agendamento/src/utils/scheduling.test.ts:1)
- [src/test/http.integration.test.ts](/Users/leandrogomes/Desktop/barbearia-agendamento/src/test/http.integration.test.ts:1)

### Executar testes

```bash
npm test
```

### Testes de integracao PostgreSQL

```bash
TEST_DATABASE_URL="postgresql://user:pass@host:5432/barbearia_test?schema=public" npm run test:integration
```

## 17. Planos do sistema

O sistema tem controlo por plano para funcionalidades da barbearia:

- `FREE`
- `BASIC`
- `PRO`

Exemplos de gating:

- extras, produtos, planos e relatorios exigem pelo menos `BASIC`
- personalizacao mais avancada exige `PRO`

No frontend isso e controlado por:

- [web/src/components/admin/PlanGate.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/components/admin/PlanGate.tsx:1)

## 18. Funcionalidades importantes implementadas

### Agenda

- granularidade configuravel por barbearia
- horarios de trabalho
- pausas de almoco por divisao de turnos
- bloqueios pontuais
- remarcacao
- disponibilidade por barbeiro

### Clientes

- CRUD de clientes
- edicao de telefone, email e notas
- relacao com planos
- historico de bookings

### Bookings

- booking publico
- booking interno
- remarcacao
- status
- extras e produtos associados

### Relatorios

- relatorio geral
- relatorio de planos
- PDF

### Planos

- planos da barbearia
- servicos incluidos
- dias permitidos
- link Stripe por plano

## 19. Acessos

Consulta tambem:

- [ACESSOS_SISTEMA.md](/Users/leandrogomes/Desktop/barbearia-agendamento/ACESSOS_SISTEMA.md:1)

## 20. Documentacao adicional

- [POSTGRESQL_PRODUCAO.md](/Users/leandrogomes/Desktop/barbearia-agendamento/POSTGRESQL_PRODUCAO.md:1)

## 21. Estado atual da arquitetura

### O que esta bom

- stack moderna e simples
- separacao backend / frontend
- multi-tenant por slug
- scripts claros para local, internet e VPS
- caminho PostgreSQL preparado

### O que ainda pode evoluir

- mais testes E2E completos
- deploy com PM2 ou systemd
- Nginx na VPS
- monitorizacao
- backups automatizados

## 22. Deploy em VPS para produção (500+ barbearias)

> Fazer isto quando tiveres o VPS. Por ordem.

### Infraestrutura necessária (Hetzner)

| Servidor | Plano | RAM / CPU | Custo | Para quê |
|---|---|---|---|---|
| App | CX42 | 16GB / 8 vCPU | ~16€/mês | Node.js + Nginx |
| Base de dados | CPX31 | 8GB / 4 vCPU | ~10€/mês | PostgreSQL + PgBouncer |
| Cache | CX22 | 4GB / 2 vCPU | ~4€/mês | Redis |

**Total: ~30€/mês.** Aguenta bem as primeiras centenas de barbearias.

Cloudflare (gratuito) à frente de tudo: DNS + SSL + CDN + DDoS + WAF.

---

### Passo 1 — Servidor de base de dados (CPX31)

```bash
# instalar PostgreSQL
sudo apt update && sudo apt install -y postgresql postgresql-contrib

# criar base de dados
sudo -u postgres psql -c "CREATE DATABASE barberbook;"
sudo -u postgres psql -c "CREATE USER barberbook WITH PASSWORD 'password_forte_aqui';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE barberbook TO barberbook;"

# instalar PgBouncer (connection pooling — obrigatório com PM2 cluster)
sudo apt install -y pgbouncer
```

Configurar `/etc/pgbouncer/pgbouncer.ini`:

```ini
[databases]
barberbook = host=127.0.0.1 port=5432 dbname=barberbook

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 500
default_pool_size = 25
```

```bash
# reiniciar pgbouncer
sudo systemctl restart pgbouncer
sudo systemctl enable pgbouncer
```

---

### Passo 2 — Servidor Redis (CX22)

```bash
sudo apt update && sudo apt install -y redis-server

# editar /etc/redis/redis.conf
# bind 127.0.0.1   (só aceita ligações locais)
# requirepass password_forte_aqui

sudo systemctl restart redis
sudo systemctl enable redis
```

Depois atualizar o rate limiter em `src/middlewares/rateLimiter.ts` para usar Redis em vez de memória in-process:

```bash
npm install rate-limit-redis ioredis
```

> Sem isto, com PM2 cluster cada worker tem rate limit separado — não funciona corretamente.

---

### Passo 3 — Servidor da aplicação (CX42)

```bash
# instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# instalar PM2
npm install -g pm2

# instalar Nginx
sudo apt install -y nginx
```

Clonar o projeto:

```bash
git clone <repo> /var/www/barberbook
cd /var/www/barberbook
npm install
cd web && npm install && npm run build && cd ..
```

Configurar `.env` com PostgreSQL via PgBouncer:

```env
DATABASE_URL="postgresql://barberbook:password_forte_aqui@IP_DB_SERVER:6432/barberbook?pgbouncer=true&connection_limit=1"
JWT_SECRET="chave_super_secreta_longa_aqui"
JWT_EXPIRES_IN="7d"
PORT=3000
SUPERADMIN_EMAIL="admin@teudominio.com"
SUPERADMIN_PASSWORD="password_forte_aqui"
```

> O `?pgbouncer=true&connection_limit=1` é obrigatório no Prisma quando usas PgBouncer em transaction mode.

Aplicar migrations e arrancar:

```bash
./vps.sh
```

---

### Passo 4 — PM2 em cluster mode

Criar `ecosystem.config.js` na raiz:

```js
module.exports = {
  apps: [{
    name: 'barberbook',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
  }]
}
```

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # faz o PM2 arrancar automaticamente após reboot
```

---

### Passo 5 — Nginx

Criar `/etc/nginx/sites-available/barberbook`:

```nginx
server {
    listen 80;
    server_name teudominio.com www.teudominio.com;

    # ficheiros estáticos do React (servidos pelo Nginx diretamente, sem tocar no Node)
    root /var/www/barberbook/web/dist;
    index index.html;

    # API → Node.js
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # tudo o resto → React (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/barberbook /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

### Passo 6 — Cloudflare

1. Adicionar o domínio no Cloudflare
2. DNS → A record apontando para o IP do servidor app (CX42)
3. SSL/TLS → modo **Full (strict)**
4. Speed → Auto Minify → ativar JS, CSS, HTML
5. Caching → Cache Level → Standard

O SSL é tratado pelo Cloudflare — o Nginx só precisa de ouvir na porta 80.

---

### Passo 7 — Backups automáticos da base de dados

No servidor de DB (CPX31), criar `/etc/cron.daily/backup-barberbook`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M)
BACKUP_DIR="/var/backups/barberbook"
mkdir -p $BACKUP_DIR

pg_dump -U barberbook barberbook | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

# guardar só os últimos 30 dias
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

```bash
sudo chmod +x /etc/cron.daily/backup-barberbook
```

> Para mais segurança, enviar os backups para Cloudflare R2 com `rclone`.

---

### Passo 8 — Migrar imagens de base64 para Cloudflare R2

**Este é o problema mais urgente.** Atualmente as imagens de produtos são guardadas como base64 no PostgreSQL. Com muitas barbearias isso torna a DB enorme e as queries lentas.

**Ativar R2 no Cloudflare:**
1. Cloudflare Dashboard → R2 → Create bucket → `barberbook-images`
2. Criar API token com permissão de leitura/escrita no bucket
3. Anotar: Account ID, Access Key ID, Secret Access Key, bucket name

**Instalar SDK:**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
```

**Adicionar ao `.env`:**
```env
R2_ACCOUNT_ID="account_id_aqui"
R2_ACCESS_KEY_ID="access_key_aqui"
R2_SECRET_ACCESS_KEY="secret_key_aqui"
R2_BUCKET_NAME="barberbook-images"
R2_PUBLIC_URL="https://pub-XXXX.r2.dev"
```

**Substituir o upload no controller de produtos** para fazer upload para R2 e guardar só a URL pública em vez do base64.

---

### Passo 9 — Verificar que está tudo a funcionar

```bash
# verificar PM2
pm2 status
pm2 logs barberbook --lines 50

# verificar Nginx
sudo nginx -t
sudo systemctl status nginx

# verificar PostgreSQL + PgBouncer
sudo systemctl status postgresql
sudo systemctl status pgbouncer

# verificar Redis
redis-cli ping   # deve responder PONG

# teste da API
curl https://teudominio.com/api/public/health
```

---

### Resumo do setup completo

```
Cloudflare (grátis)
  DNS + SSL + CDN + DDoS + WAF + R2 (imagens)
        ↓
  [App — CX42 ~16€/mês]
  Nginx → serve ficheiros React estáticos
  PM2 cluster → Node.js em todos os cores
        ↓                    ↓
  [DB — CPX31 ~10€/mês]   [Cache — CX22 ~4€/mês]
  PostgreSQL               Redis
  PgBouncer                rate limiting centralizado
```

## 22. Resumo final

Este projeto e um sistema completo de agendamento para barbearias em modelo SaaS.

Hoje ele esta organizado para:

- testar facilmente em `localhost`
- expor temporariamente pela internet com Cloudflare
- migrar depois para uma VPS com PostgreSQL

Se pegares neste projeto, a regra pratica e esta:

- queres testar localmente: `./restart.sh`
- queres mostrar pela internet a partir da tua maquina: `./internet.sh`
- queres subir em VPS com PostgreSQL: `./vps.sh`
