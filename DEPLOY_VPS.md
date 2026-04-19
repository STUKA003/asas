# Deploy numa VPS Ubuntu

Este projeto pode arrancar numa unica VPS com:

- `PostgreSQL`
- `Node.js 20`
- `PM2`
- `Nginx`

## 1. Instalar base

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx postgresql postgresql-contrib
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 3. Criar base de dados

```bash
sudo -u postgres psql -c "CREATE DATABASE trimio;"
sudo -u postgres psql -c "CREATE USER trimio WITH PASSWORD 'MUDA_ISTO';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE trimio TO trimio;"
```

## 4. Clonar projeto

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
git clone https://github.com/STUKA003/asas.git /var/www/trimio
cd /var/www/trimio
npm install
cd web && npm install && cd ..
```

## 5. Configurar `.env`

```bash
cp .env.postgres.example .env
```

Editar `.env`:

```env
DATABASE_URL="postgresql://trimio:MUDA_ISTO@localhost:5432/trimio?schema=public"
JWT_SECRET="MUDA_PARA_UMA_CHAVE_LONGA"
JWT_EXPIRES_IN="7d"
PORT=3000
SUPERADMIN_EMAIL="admin@teudominio.com"
SUPERADMIN_PASSWORD="MUDA_ISTO"
```

## 6. Build e migrations

```bash
npm run db:generate:postgres
npm run db:deploy:postgres
npm run build
cd web && npm run build && cd ..
```

## 7. Arrancar API

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 8. Configurar Nginx

```bash
sudo cp deploy/nginx.trimio.conf /etc/nginx/sites-available/trimio
sudo nano /etc/nginx/sites-available/trimio
```

Trocar `server_name _;` pelo teu dominio.

Depois:

```bash
sudo ln -s /etc/nginx/sites-available/trimio /etc/nginx/sites-enabled/trimio
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 9. SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d teudominio.com -d www.teudominio.com
```

## 10. Atualizar no futuro

```bash
cd /var/www/trimio
git pull
npm install
cd web && npm install && cd ..
npm run db:deploy:postgres
npm run build
cd web && npm run build && cd ..
pm2 restart trimio-api
```
