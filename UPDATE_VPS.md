# Atualizar Git e VPS

## Sequência rápida

### Mac -> GitHub

```bash
cd /Users/leandrogomes/Desktop/barbearia-agendamento
git status
git add .
git commit -m "mensagem do commit"
git push origin main
```

### GitHub -> VPS

```bash
cd /var/www/trimio
git pull origin main
npm install
npx prisma migrate deploy
npx prisma generate
cd web && npm install && npm run build && cd ..
npm run build
pm2 restart trimio-api --update-env
pm2 logs trimio-api --lines 50
```

## 1. No computador local

Ver estado:

```bash
git status
```

Adicionar alterações:

```bash
git add .
```

Criar commit:

```bash
git commit -m "mensagem do commit"
```

Enviar para o GitHub:

```bash
git push origin main
```

## 2. Na VPS

Entrar na pasta do projeto:

```bash
cd /var/www/trimio
```

Puxar o código novo:

```bash
git pull origin main
```

Atualizar dependências backend:

```bash
npm install
```

Aplicar migrations PostgreSQL:

```bash
npx prisma migrate deploy
```

Gerar Prisma Client:

```bash
npx prisma generate
```

Build do frontend:

```bash
cd web
npm install
npm run build
cd ..
```

Build do backend:

```bash
npm run build
```

Reiniciar a app:

```bash
pm2 restart trimio-api --update-env
```

Ver logs:

```bash
pm2 logs trimio-api --lines 50
```

## 3. Sequência rápida na VPS

```bash
cd /var/www/trimio
git pull origin main
npm install
npx prisma migrate deploy
npx prisma generate
cd web && npm install && npm run build && cd ..
npm run build
pm2 restart trimio-api --update-env
pm2 logs trimio-api --lines 50
```

## Notas

- Usa `npx prisma generate` normal, porque o schema default já está em PostgreSQL.
- Se o `git pull` bloquear por alterações locais, confirma primeiro com `git status`.
- Se o checkout Stripe falhar, confirma as variáveis `APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC_MONTHLY` e `STRIPE_PRICE_PRO_MONTHLY`.
