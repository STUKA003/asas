# PostgreSQL em producao

O projeto fica em SQLite no `localhost` para testes rapidos.
Para a VPS e lancamento, o caminho preparado e PostgreSQL.

## Ficheiros relevantes

- `.env.example` para ambiente local SQLite
- `.env.postgres.example` para VPS/PostgreSQL
- `docker-compose.postgres.yml`
- `prisma/schema.prisma` para local SQLite
- `prisma/postgres/schema.prisma` para VPS/PostgreSQL
- `prisma/migrations` para a linha local SQLite
- `prisma/postgres/migrations` para a linha PostgreSQL de lancamento

## Localhost

Usa o setup simples:

```bash
npm run db:generate
npm run db:push
```

## VPS com PostgreSQL

1. Definir o `DATABASE_URL` PostgreSQL:

```bash
cp .env.postgres.example .env
```

2. Gerar client e aplicar schema PostgreSQL:

```bash
npm run db:generate:postgres
npm run db:push:postgres
```

3. Em deploy real:

```bash
npm run db:deploy:postgres
```

## Testes de integracao

Os testes HTTP completos usam `TEST_DATABASE_URL`.
Exemplo:

```bash
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/barbearia_test?schema=public" npm run test:integration
```

Cada corrida cria um schema isolado para nao misturar dados.
