# SkyzoneBD — Ubuntu VPS Production Deployment Guide

**Application:** SkyzoneBD (B2B Wholesale Electrical Marketplace)  
**Target Host:** Ubuntu VPS (`3.26.54.131`)  
**Deployment User:** `deploy`  
**Application Directory:** `/var/www/skyzonebd/app`  
**Application Port:** `3001` (Isolated from `kuttush` on port `3000`)  
**Production Domain:** `https://skyzonebd.shop`  
**Database:** Neon PostgreSQL  
**Process Manager:** PM2 (`skyzonebd`)  
**Reverse Proxy:** Nginx  

---

## 1. VPS Prerequisites & System Setup

Ensure the following base packages and permissions exist on the VPS:

```bash
# Update Ubuntu package index
sudo apt update && sudo apt install -y git curl ufw nginx certbot python3-certbot-nginx

# Create directory structure for skyzonebd under deploy user
sudo mkdir -p /var/www/skyzonebd/app /var/www/skyzonebd/logs /var/www/certbot
sudo chown -R deploy:deploy /var/www/skyzonebd /var/www/certbot

# Verify swap space (essential for 1.9 GB RAM VPS)
swapon --show
# If swap is not enabled, create a 2GB swap file:
# sudo fallocate -l 2G /swapfile
# sudo chmod 600 /swapfile
# sudo mkswap /swapfile
# sudo swapon /swapfile
```

---

## 2. Node.js & NVM Installation

The application requires Node.js `26.13.0` and npm `11.20.0`:

```bash
# Install or use NVM as the deploy user
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc

# Install the exact Node version
nvm install 26.13.0
nvm use 26.13.0
nvm alias default 26.13.0

# Verify versions
node -v   # Should output: v26.13.0
npm -v    # Should output: 11.20.0

# Install PM2 globally
npm install -g pm2
```

---

## 3. Clone Repository & Install Dependencies

```bash
cd /var/www/skyzonebd
git clone https://github.com/raihanuddin561/skyzonebd.git app
cd /var/www/skyzonebd/app

# Clean install exact dependencies from package-lock.json
npm ci
```

---

## 4. Production Environment Configuration

Create the production environment file:

```bash
nano /var/www/skyzonebd/app/.env.production
```

Add your production credentials (see `Approval Gate 1` below for checklist):

```env
NODE_ENV="production"
PORT="3001"
HOSTNAME="0.0.0.0"

NEXT_PUBLIC_SITE_URL="https://skyzonebd.shop"
NEXT_PUBLIC_API_URL="https://skyzonebd.shop"
NEXT_PUBLIC_API_BASE_URL="https://skyzonebd.shop"
NEXT_PUBLIC_USE_API="true"

# Neon PostgreSQL connection string (with ?sslmode=require)
DATABASE_URL="postgresql://user:password@ep-sample-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Security Secrets (generate via: openssl rand -hex 32)
JWT_SECRET="YOUR_64_CHAR_HEX_JWT_SECRET"
MIGRATION_SECRET_KEY="YOUR_48_CHAR_HEX_MIGRATION_SECRET"
SEED_SECRET="YOUR_48_CHAR_HEX_SEED_SECRET"

# Vercel Blob Storage Token
BLOB_READ_WRITE_TOKEN="YOUR_VERCEL_BLOB_READ_WRITE_TOKEN"

# Resend Email API Key
RESEND_API_KEY="re_YOUR_RESEND_API_KEY"
ADMIN_ALERT_EMAIL="admin@skyzonebd.shop"

TAX_RATE="0"
SHIPPING_CHARGE="0"
```

Lock down file permissions:

```bash
chmod 600 /var/www/skyzonebd/app/.env.production
```

---

## 5. Database Setup & Migration Deployment

Prisma migrations must be applied deliberately and separately from the build:

```bash
cd /var/www/skyzonebd/app

# 1. Generate Prisma Client
npm run db:generate

# 2. Check pending migrations status against Neon
npx prisma migrate status

# 3. Apply committed migrations to production
npm run db:migrate:deploy
```

> [!WARNING]
> NEVER execute `prisma migrate dev`, `prisma migrate reset`, or `prisma db push` on the production server. Only use `prisma migrate deploy`.

---

## 6. Build the Application

To protect the 1.9 GB RAM VPS from memory exhaustion during Next.js compilation:

```bash
cd /var/www/skyzonebd/app

# Build with explicit Node memory ceiling
NODE_OPTIONS="--max-old-space-size=1536" npm run build
```

This compiles Next.js into `.next/standalone`, which contains only the minimum runtime requirements.

---

## 7. PM2 Process Configuration

Start the application with PM2 using our preconfigured `ecosystem.config.cjs`:

```bash
cd /var/www/skyzonebd/app

# Start SkyzoneBD on Port 3001
pm2 start ecosystem.config.cjs --env production

# Check status (Verify Kuttush and SkyzoneBD are both running)
pm2 status

# Save PM2 process list to persist across server reboots
pm2 save

# Setup PM2 startup hook (run if not already configured for deploy user)
# pm2 startup
```

---

## 8. Nginx Reverse Proxy Configuration

Copy the provided Nginx configuration to `/etc/nginx/sites-available/skyzonebd`:

```bash
sudo cp /var/www/skyzonebd/app/nginx/skyzonebd.conf /etc/nginx/sites-available/skyzonebd
sudo ln -s /etc/nginx/sites-available/skyzonebd /etc/nginx/sites-enabled/skyzonebd

# Test configuration syntax (Ensures Kuttush site is unaffected)
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 9. SSL Certificate Setup (Let's Encrypt / Certbot)

Ensure DNS for `skyzonebd.shop` and `www.skyzonebd.shop` points to `3.26.54.131`:

```bash
sudo certbot --nginx -d skyzonebd.shop -d www.skyzonebd.shop
```

Certbot will automatically configure the SSL certificate paths in `/etc/nginx/sites-available/skyzonebd` and schedule automatic renewals via systemd timers.

---

## 10. Health Verification

Verify that SkyzoneBD is serving requests and communicating with Neon PostgreSQL:

```bash
# 1. Test local application endpoint directly
curl http://127.0.0.1:3001/api/health

# Expected response:
# {"status":"ok","application":"skyzonebd","timestamp":"...","environment":"production","checks":{"api":{"status":"ok"},"database":{"status":"ok"},"config":{"status":"ok"}}}

# 2. Test domain over HTTPS
curl -I https://skyzonebd.shop/api/health

# 3. Verify Kuttush is completely intact on Port 3000
curl http://127.0.0.1:3000
```

---

## 11. Maintenance, Logs & Common Operations

### Inspect Logs
```bash
# Realtime logs for SkyzoneBD only
pm2 logs skyzonebd

# Tail Nginx access/error logs
sudo tail -f /var/log/nginx/skyzonebd_error.log
```

### Restart Application
```bash
pm2 restart skyzonebd
```

### Updating Application from Git
```bash
cd /var/www/skyzonebd/app

# 1. Pull latest code
git pull origin main

# 2. Install dependencies if package.json changed
npm ci

# 3. Generate Prisma client & apply migrations if schema changed
npm run db:generate
npm run db:migrate:deploy

# 4. Build standalone package
NODE_OPTIONS="--max-old-space-size=1536" npm run build

# 5. Reload PM2 process with zero downtime
pm2 reload skyzonebd
```

### Rollback Procedure
If a deployment fails:
```bash
cd /var/www/skyzonebd/app
git log -n 5 --oneline
git checkout <PREVIOUS_COMMIT_HASH>
NODE_OPTIONS="--max-old-space-size=1536" npm run build
pm2 restart skyzonebd
```

