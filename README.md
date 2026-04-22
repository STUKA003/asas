# Trimio

Plataforma SaaS de agendamento para barbearias, multi-tenant por `slug`, com quatro superfícies principais:

- site público da barbearia
- painel administrativo da barbearia
- portal do barbeiro
- superadmin da plataforma

O sistema foi desenhado para resolver o problema completo da operação, não só a marcação. Além do booking, cobre gestão de clientes, serviços, extras, produtos, planos, disponibilidade, faturação por subscrição e controlo operacional por função.

## O que este sistema faz

### 1. Site público por barbearia

Cada barbearia tem um endereço próprio identificado por `slug`.

Exemplos:

- `https://trimio.pt/stukabarber`
- `https://trimio.pt/stukabarber/booking`
- `https://trimio.pt/stukabarber/plans`
- `https://trimio.pt/stukabarber/products`
- `https://trimio.pt/stukabarber/barber/login`

No lado público, o sistema suporta:

- homepage da barbearia com branding e conteúdo próprio
- listagem pública de serviços
- fluxo de agendamento online passo a passo
- seleção de barbeiro, data, hora, extras e produtos
- consulta de disponibilidade em tempo real
- listagem pública de planos
- listagem pública de produtos
- lookup de cliente por nome + telefone para validar plano ativo

### 2. Painel administrativo da barbearia

O painel admin existe para o dono ou equipa da barbearia operar o negócio.

Inclui:

- login e registo da barbearia
- verificação de email antes do primeiro acesso
- recuperação de password
- dashboard operacional
- CRUD de clientes
- CRUD de barbeiros
- CRUD de serviços
- CRUD de extras
- CRUD de produtos
- CRUD de planos
- gestão de bookings
- agenda operacional
- configuração de horários de trabalho
- bloqueios de agenda
- personalização da presença pública
- billing e subscrição
- relatórios

### 3. Portal do barbeiro

O portal do barbeiro separa o trabalho do profissional da gestão do negócio.

Inclui:

- login próprio do barbeiro
- dashboard pessoal
- agenda própria
- detalhe rápido de marcações
- notificações
- remarcação e atualização do estado de bookings dentro do contexto autorizado

### 4. Superadmin da plataforma

O superadmin existe para operar a plataforma Trimio como produto.

Inclui:

- login independente via credenciais de ambiente
- visão global da plataforma
- listagem e pesquisa de barbearias
- estado de verificação de email
- saúde de subscrição
- suspensão de lojas
- eventos de segurança de autenticação

## Porque a arquitetura está organizada assim

O sistema está dividido por superfícies e por contexto de autorização para reduzir acoplamento e risco:

- `public`: tudo o que é acessível por `slug` sem autenticação, com serialização restrita a dados públicos
- `auth` e módulos administrativos: operações autenticadas por dono/equipa da barbearia
- `barber-auth` e `barber-portal`: operações autenticadas do barbeiro, isoladas do admin
- `superadmin`: operações internas da plataforma

Isto existe por três razões:

- separar responsabilidades de produto
- permitir multi-tenancy simples via `slug`
- diminuir exposição indevida de dados entre contextos

## Como o sistema funciona

### Multi-tenant por `slug`

Cada pedido público usa o `slug` da URL para resolver a barbearia. Isso permite que um único backend sirva várias lojas com identidade e dados isolados.

### Autenticação por papel

Há três fluxos de autenticação distintos:

- admin da barbearia via `/api/auth`
- barbeiro via `/api/barber-auth`
- superadmin via `/api/superadmin`

O admin usa JWT com `userId`, `barbershopId` e `role`. O barbeiro tem autenticação própria. O superadmin usa credenciais globais de ambiente.

### Booking e disponibilidade

A disponibilidade é calculada a partir de:

- horários de trabalho
- bloqueios
- bookings já existentes
- duração total dos serviços e extras
- granularidade de slot da barbearia

O objetivo é que o slot retornado ao frontend já seja válido do ponto de vista operacional, em vez de delegar a lógica ao cliente.

### Planos e gating funcional

O sistema usa planos `FREE`, `BASIC` e `PRO`.

Limites atuais em [src/lib/plans.ts](/Users/leandrogomes/Desktop/barbearia-agendamento/src/lib/plans.ts:1):

- `FREE`: 1 barbeiro, 30 bookings/mês
- `BASIC`: 3 barbeiros, bookings ilimitados
- `PRO`: barbeiros ilimitados, bookings ilimitados

Algumas áreas do frontend usam `PlanGate` para bloquear funcionalidades premium como extras, produtos, planos e relatórios.

### Billing com Stripe

O backend trata:

- criação e sincronização de estado de subscrição
- mapeamento de `priceId` para plano
- atualização do plano efetivo da barbearia
- downgrade para `FREE` quando a subscrição expira ou é cancelada
- webhook de Stripe em `/api/stripe/webhook`

### Email transacional

O sistema envia emails para:

- verificação de conta
- recuperação de password

Em desenvolvimento, se `RESEND_API_KEY` e `MAIL_FROM` não existirem, o envio é simulado em consola. Em produção, a configuração é obrigatória.

## Stack técnica

### Backend

- Node.js
- TypeScript
- Express
- Prisma
- Zod
- JWT
- bcryptjs
- Stripe

### Frontend

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- React Hook Form
- Zustand
- Tailwind CSS

### Base de dados

- SQLite para desenvolvimento rápido local
- PostgreSQL para produção e VPS

## Estrutura do projeto

```text
barbearia-agendamento/
├── src/                     # backend
├── web/                     # frontend React
├── prisma/                  # schema local
├── prisma/postgres/         # schema e migrations de produção
├── deploy/                  # artefactos auxiliares de deploy
├── restart.sh               # arranque local rápido
├── internet.sh              # arranque local + túneis Cloudflare
├── vps.sh                   # arranque estilo VPS com PostgreSQL
├── ecosystem.config.js      # processo PM2
├── DEPLOY_VPS.md
├── UPDATE_VPS.md
├── POSTGRESQL_PRODUCAO.md
└── README.md
```

## Backend

Estrutura principal:

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

Ficheiros centrais:

- [src/server.ts](/Users/leandrogomes/Desktop/barbearia-agendamento/src/server.ts:1): arranque do servidor
- [src/app.ts](/Users/leandrogomes/Desktop/barbearia-agendamento/src/app.ts:1): configuração do Express, CORS, Helmet, manifest e routers
- [src/lib/prisma.ts](/Users/leandrogomes/Desktop/barbearia-agendamento/src/lib/prisma.ts): cliente Prisma
- [src/utils/availability.ts](/Users/leandrogomes/Desktop/barbearia-agendamento/src/utils/availability.ts:1): cálculo de disponibilidade
- [src/utils/scheduling.ts](/Users/leandrogomes/Desktop/barbearia-agendamento/src/utils/scheduling.ts:1): funções puras de agenda
- [src/modules/bookings/service.ts](/Users/leandrogomes/Desktop/barbearia-agendamento/src/modules/bookings/service.ts:1): regras de criação de booking

Módulos:

- `src/modules/auth`: registo, login, verificação de email, forgot/reset password
- `src/modules/public`: site público, dados públicos, disponibilidade e booking público
- `src/modules/barbershops`: configuração da barbearia
- `src/modules/barbers`: gestão de barbeiros
- `src/modules/services`: gestão de serviços
- `src/modules/extras`: gestão de extras
- `src/modules/products`: gestão de produtos
- `src/modules/plans`: gestão de planos internos da barbearia
- `src/modules/customers`: gestão de clientes
- `src/modules/bookings`: bookings, filtros e relatórios
- `src/modules/working-hours`: horários de trabalho
- `src/modules/blocked-times`: bloqueios de agenda
- `src/modules/barber-auth`: login do barbeiro
- `src/modules/barber-portal`: operações do portal do barbeiro
- `src/modules/notifications`: notificações
- `src/modules/stripe`: webhook de billing
- `src/modules/superadmin`: administração global da plataforma

Rotas base do backend:

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
- `/api/barber-auth`
- `/api/barber-portal`
- `/api/notifications`
- `/api/superadmin`
- `/api/stripe/webhook`

## Frontend

Estrutura principal:

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

Páginas principais:

- públicas:
  - [web/src/pages/PlatformHome.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/PlatformHome.tsx:1)
  - [web/src/pages/Home.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/Home.tsx:1)
  - [web/src/pages/Booking.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/Booking.tsx:1)
  - [web/src/pages/Services.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/Services.tsx:1)
  - [web/src/pages/Plans.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/Plans.tsx:1)
  - [web/src/pages/Products.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/Products.tsx:1)
- admin:
  - [web/src/pages/admin/Login.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/admin/Login.tsx:1)
  - [web/src/pages/admin/Dashboard.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/admin/Dashboard.tsx:1)
  - [web/src/pages/admin/Customers.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/admin/Customers.tsx:1)
  - [web/src/pages/admin/Barbers.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/admin/Barbers.tsx:1)
  - [web/src/pages/admin/Bookings.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/admin/Bookings.tsx:1)
  - [web/src/pages/admin/Schedule.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/admin/Schedule.tsx:1)
  - [web/src/pages/admin/Customization.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/admin/Customization.tsx:1)
  - [web/src/pages/admin/Billing.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/admin/Billing.tsx:1)
  - [web/src/pages/admin/Reports.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/admin/Reports.tsx:1)
- barbeiro:
  - [web/src/pages/barber/Login.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/barber/Login.tsx:1)
  - [web/src/pages/barber/Dashboard.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/barber/Dashboard.tsx:1)
  - [web/src/pages/barber/Schedule.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/barber/Schedule.tsx:1)
- superadmin:
  - [web/src/pages/superadmin/Login.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/superadmin/Login.tsx:1)
  - [web/src/pages/superadmin/Dashboard.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/superadmin/Dashboard.tsx:1)
  - [web/src/pages/superadmin/Barbershops.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/pages/superadmin/Barbershops.tsx:1)

Camadas importantes:

- [web/src/App.tsx](/Users/leandrogomes/Desktop/barbearia-agendamento/web/src/App.tsx:1): mapa completo de rotas
- `web/src/store/*`: estado de autenticação e booking
- `web/src/lib/api.ts`: cliente autenticado
- `web/src/lib/publicApi.ts`: cliente público por tenant
- `web/src/providers/TenantProvider.tsx`: resolução do tenant no frontend

## Modelo de dados

Entidades principais no schema PostgreSQL em [prisma/postgres/schema.prisma](/Users/leandrogomes/Desktop/barbearia-agendamento/prisma/postgres/schema.prisma:1):

- `Barbershop`: tenant principal
- `User`: utilizador administrativo da barbearia
- `Barber`: profissional
- `Service`: serviço base
- `Extra`: complemento de booking
- `Product`: produto vendido ou associado ao booking
- `Plan`: plano interno da barbearia para clientes
- `Customer`: cliente final
- `Booking`: marcação
- `WorkingHours`: disponibilidade estrutural
- `BlockedTime`: bloqueio manual
- `Notification`: notificações
- `AuthToken`: tokens de verificação e reset
- `AuthSecurityEvent`: eventos de segurança

## Segurança e privacidade

O sistema já incorpora várias decisões explícitas de segurança:

- verificação de email obrigatória para o owner antes do primeiro login
- reset de password com token hash guardado na base de dados
- eventos de segurança de autenticação
- serialização separada para rotas públicas
- separação entre auth admin, barber e superadmin
- `helmet` e `cors` configurados no backend
- confiança no proxy ativada para produção atrás de Nginx

Notas importantes:

- os endpoints públicos devem devolver apenas dados estritamente necessários
- hashes de password não devem sair em respostas HTTP
- o webhook Stripe usa `express.raw()` para validação correta de assinatura

## Variáveis de ambiente importantes

### Backend base

- `DATABASE_URL`
- `PORT`
- `HOST`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN`
- `APP_URL`

### Email

- `RESEND_API_KEY`
- `MAIL_FROM`

### Superadmin

- `SUPERADMIN_EMAIL`
- `SUPERADMIN_PASSWORD`

### Stripe

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_BASIC_MONTHLY`
- `STRIPE_PRICE_PRO_MONTHLY`

### Testes de integração

- `TEST_DATABASE_URL`

Sem `TEST_DATABASE_URL`, a suite HTTP de integração fica em `SKIP`.

## Desenvolvimento local

### Requisitos

- Node.js
- npm
- SQLite para desenvolvimento local simples

### Instalação

```bash
npm install
cd web && npm install
cd ..
```

### Arranque manual

Backend:

```bash
npm run db:generate
npm run db:push
npm run dev
```

Frontend:

```bash
cd web
npm run dev
```

### Arranque rápido com script

```bash
./restart.sh
```

Isto prepara Prisma local, arranca backend em `http://localhost:3000` e frontend em `http://localhost:5173`.

### Exposição pública temporária

```bash
./internet.sh
```

Este script abre túneis Cloudflare para backend e frontend local.

## Build e testes

Backend:

```bash
npm run build
```

Frontend:

```bash
cd web
npm run build
```

Testes:

```bash
npm test
```

Integração HTTP:

```bash
TEST_DATABASE_URL="postgresql://..." npm run test:integration
```

Hoje a suite inclui:

- testes unitários de scheduling
- testes HTTP end-to-end do backend quando existe `TEST_DATABASE_URL`

## Produção e VPS

O projeto está preparado para produção com PostgreSQL.

Ficheiros úteis:

- [DEPLOY_VPS.md](/Users/leandrogomes/Desktop/barbearia-agendamento/DEPLOY_VPS.md:1)
- [UPDATE_VPS.md](/Users/leandrogomes/Desktop/barbearia-agendamento/UPDATE_VPS.md:1)
- [POSTGRESQL_PRODUCAO.md](/Users/leandrogomes/Desktop/barbearia-agendamento/POSTGRESQL_PRODUCAO.md:1)
- [ecosystem.config.js](/Users/leandrogomes/Desktop/barbearia-agendamento/ecosystem.config.js:1)

Arranque tipo VPS:

```bash
./vps.sh
```

O processo PM2 de produção está definido como:

- nome: `trimio-api`
- script: `dist/server.js`

## Rotas principais do frontend

- `/`: homepage da plataforma
- `/register`: criação de nova barbearia
- `/verify-email`: confirmação de email
- `/admin/login`: login admin
- `/admin/*`: painel da barbearia
- `/superadmin/login`: login superadmin
- `/superadmin/*`: painel superadmin
- `/:slug`: homepage pública da barbearia
- `/:slug/booking`: booking público
- `/:slug/plans`: planos públicos
- `/:slug/products`: produtos públicos
- `/:slug/barber/login`: login do barbeiro
- `/:slug/barber`: portal do barbeiro

## Estado atual do produto

O projeto já é mais do que um MVP visual. Tem base real de operação:

- multi-tenant
- autenticação por papel
- onboarding com verificação de email
- recuperação de password
- booking público funcional
- disponibilidade calculada no backend
- gating por plano
- billing por Stripe
- superadmin com visibilidade operacional
- portal do barbeiro separado

As áreas que normalmente merecem evolução contínua são:

- maior cobertura de testes de integração
- observabilidade e métricas
- mais automação de billing e notificações
- endurecimento contínuo de privacidade de dados

## Resumo

Trimio é uma plataforma de gestão e agendamento para barbearias em que cada loja tem o seu próprio tenant, presença pública e operação interna, enquanto a plataforma mantém controlo global via superadmin.

Foi construída assim porque o problema real não é apenas “marcar horas”. É alinhar captação, operação, disponibilidade, equipa, recorrência e monetização num único sistema.
