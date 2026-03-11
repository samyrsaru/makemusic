# MakeMusic Deployment Guide

Deploy the MakeMusic app with:
- **Frontend**: Cloudflare Workers (Pages)
- **Backend**: Hetzner VPS
- **Payment**: Polar.sh (sandbox → prod)

---

## Phase 1: Development Mode (Sandbox Polar)

### Prerequisites

1. **Accounts needed**:
   - [Cloudflare](https://dash.cloudflare.com) account
   - [Hetzner Cloud](https://console.hetzner.cloud) account
   - [Polar.sh](https://polar.sh) account (in sandbox mode)
   - [Clerk](https://clerk.com) account
   - [Replicate](https://replicate.com) account
   - [Cloudflare R2](https://dash.cloudflare.com) bucket

2. **Tools needed**:
   - Node.js 20+ and pnpm
   - SSH access to your Hetzner VPS
   - wrangler CLI: `npm install -g wrangler`

---

### Step 1: Backend Deployment (Hetzner VPS)

#### 1.1 Create VPS on Hetzner

1. Go to Hetzner Cloud Console
2. Create a new project or use existing
3. Add a server:
   - **Type**: Ubuntu 24.04 LTS
   - **Location**: Choose closest to your users
   - **Specs**: Start with CPX21 (2 vCPU, 4 GB RAM, 80 GB NVMe)
   - **Name**: makemusic-api-dev

4. Add your SSH key or generate new one
5. Note the server IP address

#### 1.2 Configure VPS

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2 for process management
npm install -g pm2

# Create app directory
mkdir -p /opt/makemusic
cd /opt/makemusic

# Create directories for data
mkdir -p data
```

#### 1.3 Set Up Environment Variables

```bash
cd /opt/makemusic

# Create environment file
cat > .env << 'EOF'
# Authentication (Clerk)
CLERK_SECRET_KEY=sk_test_YOUR_CLERK_SECRET
CLERK_PUBLISHABLE_KEY=pk_test_YOUR_CLERK_PUBLISHABLE

# Polar.sh (SANDBOX MODE)
POLAR_ACCESS_TOKEN=polar_test_YOUR_TOKEN
POLAR_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
POLAR_ENV=sandbox
POLAR_PRODUCT_ID=your_sandbox_product_id
POLAR_POLLING_INTERVAL_MS=300000
POLAR_SYNC_LOOKBACK_HOURS=24

# AI/ML
REPLICATE_API_TOKEN=r8_YOUR_REPLICATE_TOKEN

# Database
DATABASE_URL=/opt/makemusic/data/dev.db

# App
WEB_URL=https://YOUR_CLOUDFLARE_WORKERS_URL
PORT=3001

# Cloudflare R2
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret
R2_BUCKET_NAME=makemusic-audio-dev
R2_PUBLIC_URL=https://pub-YOUR_ID.r2.dev
EOF

# Secure the env file
chmod 600 .env
```

**Get these values from:**
- **Clerk**: Dashboard → API Keys (use Test mode keys)
- **Polar**: Settings → Access Tokens (create sandbox token)
- **Replicate**: Account → API Tokens
- **R2**: R2 dashboard → Manage R2 API Tokens

#### 1.4 Deploy Backend Code

**Option A: Git-based deployment (recommended)**

```bash
# On your local machine, set up deployment
git remote add production ssh://root@YOUR_SERVER_IP/opt/makemusic/repo

# Push to server
git push production main

# SSH to server and install dependencies
ssh root@YOUR_SERVER_IP
cd /opt/makemusic
pnpm install
pnpm run build
```

**Option B: Manual deployment**

```bash
# From local machine - copy files
rsync -avz --exclude=node_modules --exclude=dist \
  ./apps/api/ root@YOUR_SERVER_IP:/opt/makemusic/

# SSH and install
ssh root@YOUR_SERVER_IP
cd /opt/makemusic
pnpm install
pnpm run build
```

#### 1.5 Create PM2 Configuration

```bash
cat > /opt/makemusic/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'makemusic-api',
    script: './dist/index.js',
    cwd: '/opt/makemusic',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    kill_timeout: 5000,
    listen_timeout: 10000
  }]
}
EOF

mkdir -p /opt/makemusic/logs
```

#### 1.6 Start the API Server

```bash
cd /opt/makemusic

# Start with PM2
pm2 start ecosystem.config.cjs

# Save PM2 config to restart on boot
pm2 save
pm2 startup systemd

# Check status
pm2 status
pm2 logs makemusic-api
```

#### 1.7 Set Up Nginx as Reverse Proxy

```bash
# Install Nginx
apt install -y nginx

# Create Nginx config
cat > /etc/nginx/sites-available/makemusic-api << 'EOF'
server {
    listen 80;
    server_name api-dev.YOURDOMAIN.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/makemusic-api /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test and reload
nginx -t
systemctl reload nginx
```

#### 1.8 Set Up SSL with Let's Encrypt

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d api-dev.YOURDOMAIN.com --agree-tos --non-interactive --email your@email.com

# Auto-renewal is set up automatically
```

#### 1.9 Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Check status
ufw status
```

---

### Step 2: Frontend Deployment (Cloudflare Workers)

#### 2.1 Configure wrangler.toml

Create `apps/web/wrangler.toml`:

```toml
name = "makemusic-web-dev"
main = "dist/index.js"
compatibility_date = "2025-03-11"
compatibility_flags = ["nodejs_compat"]

[build]
command = "pnpm run build"

[site]
bucket = "./dist"

[env.dev.vars]
VITE_CLERK_PUBLISHABLE_KEY = "pk_test_YOUR_CLERK_KEY"
VITE_API_URL = "https://api-dev.YOURDOMAIN.com"
```

#### 2.2 Update Frontend for Production API

Update `apps/web/.env.production`:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_CLERK_KEY
VITE_API_URL=https://api-dev.YOURDOMAIN.com
```

Create `apps/web/src/config.ts`:

```typescript
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

Update API calls in the frontend to use this config.

#### 2.3 Install Wrangler and Deploy

```bash
cd apps/web

# Install wrangler locally
pnpm add -D wrangler

# Login to Cloudflare
npx wrangler login

# Deploy
npx wrangler deploy
```

**Note**: After first deploy, Cloudflare will give you a `*.workers.dev` URL. Save this for the backend CORS config.

#### 2.4 Update Backend CORS

After getting your Workers URL, update the backend `.env`:

```bash
# On VPS
nano /opt/makemusic/.env

# Change WEB_URL to your Workers URL
WEB_URL=https://makemusic-web-dev.YOUR_SUBDOMAIN.workers.dev

# Restart
pm2 restart makemusic-api
```

---

### Step 3: Configure Polar Webhooks

#### 3.1 Set Up Webhook Endpoint

1. Go to Polar Dashboard → Settings → Webhooks
2. Add webhook endpoint:
   - **URL**: `https://api-dev.YOURDOMAIN.com/webhooks/polar`
   - **Events**: Select all subscription events
   - **Secret**: Generate a secret and save it

3. Update backend `.env` with the webhook secret:
   ```bash
   POLAR_WEBHOOK_SECRET=whsec_YOUR_GENERATED_SECRET
   ```

4. Restart the API:
   ```bash
   pm2 restart makemusic-api
   ```

#### 3.2 Create Product in Polar (Sandbox)

1. Go to Polar Dashboard → Products
2. Create a new product:
   - **Name**: MakeMusic Subscription
   - **Price**: Set your monthly price (e.g., $9.99)
   - **Billing**: Monthly recurring
3. Copy the **Product ID** (starts with `prod_`)
4. Update `.env`:
   ```bash
   POLAR_PRODUCT_ID=prod_YOUR_PRODUCT_ID
   ```

---

### Step 4: Test Dev Deployment

1. **Test API health**:
   ```bash
   curl https://api-dev.YOURDOMAIN.com/health
   ```

2. **Test frontend**:
   - Visit your Workers URL
   - Sign up with Clerk
   - Try subscribing with Polar test card:
     - Card: `4242 4242 4242 4242`
     - Any future expiry, any CVC

3. **Test music generation**:
   - Go to Studio
   - Enter a song idea
   - Verify credits are deducted

---

## Phase 2: Production Migration

### Prerequisites

1. **Production accounts**:
   - Clerk: Switch to Production instance
   - Polar: Use live mode (not sandbox)
   - R2: Create production bucket
    - Domain: Configure `music.likeahe.ro`

### Step 1: Backend Production Setup

#### 1.1 Create Production VPS

Repeat Step 1.1 but name it `makemusic-api-prod`

#### 1.2 Production Environment

```bash
# On production VPS
cat > /opt/makemusic/.env << 'EOF'
# Authentication (Clerk PRODUCTION)
CLERK_SECRET_KEY=sk_live_YOUR_CLERK_SECRET
CLERK_PUBLISHABLE_KEY=pk_live_YOUR_CLERK_PUBLISHABLE

# Polar.sh (PRODUCTION MODE)
POLAR_ACCESS_TOKEN=polar_live_YOUR_TOKEN
POLAR_WEBHOOK_SECRET=whsec_YOUR_PROD_SECRET
POLAR_ENV=production
POLAR_PRODUCT_ID=your_prod_product_id
POLAR_POLLING_INTERVAL_MS=300000
POLAR_SYNC_LOOKBACK_HOURS=24

# AI/ML
REPLICATE_API_TOKEN=r8_YOUR_REPLICATE_TOKEN

# Database
DATABASE_URL=/opt/makemusic/data/prod.db

# App
WEB_URL=https://music.likeahe.ro
PORT=3001

# Cloudflare R2 (Production bucket)
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret
R2_BUCKET_NAME=makemusic-audio-prod
R2_PUBLIC_URL=https://pub-YOUR_ID.r2.dev
EOF
```

#### 1.3 Update Nginx for Production Domain

```bash
cat > /etc/nginx/sites-available/makemusic-api << 'EOF'
server {
    listen 80;
    server_name api.music.likeahe.ro;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

certbot --nginx -d api.music.likeahe.ro
```

---

### Step 2: Frontend Production Deployment

#### 2.1 Update wrangler.toml for Production

```toml
name = "makemusic-web-prod"
main = "dist/index.js"
compatibility_date = "2025-03-11"
compatibility_flags = ["nodejs_compat"]

[build]
command = "pnpm run build"

[site]
bucket = "./dist"

[env.production.vars]
VITE_CLERK_PUBLISHABLE_KEY = "pk_live_YOUR_CLERK_KEY"
VITE_API_URL = "https://api.music.likeahe.ro"
```

#### 2.2 Add Custom Domain

In Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your production worker
3. Settings → Triggers → Add Custom Domain
4. Add `music.likeahe.ro`

---

### Step 3: Production Polar Setup

1. Switch Polar to **Live Mode** (toggle in dashboard)
2. Create production product (same as sandbox)
3. Update webhook URL to production
4. Get production access token
5. Update all environment variables

---

### Step 4: DNS Configuration

In Cloudflare DNS:

```
Type    Name            Value                           TTL
A       api             YOUR_HETZNER_SERVER_IP          Auto
# music.likeahe.ro uses Cloudflare Workers, no CNAME needed
```

---

### Step 5: Database Migration (Optional)

If you want to migrate data from dev:

```bash
# On dev server
sqlite3 /opt/makemusic/data/dev.db ".dump" > backup.sql

# Copy to production
scp backup.sql root@PROD_SERVER_IP:/tmp/

# On prod server
sqlite3 /opt/makemusic/data/prod.db < /tmp/backup.sql
```

---

## Automation: CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Hetzner
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HETZNER_HOST }}
          username: root
          key: ${{ secrets.HETZNER_SSH_KEY }}
          script: |
            cd /opt/makemusic
            git pull origin main
            pnpm install
            pnpm run build
            pm2 restart makemusic-api

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm run build
        working-directory: apps/web
        env:
          VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PUBLISHABLE_KEY }}
          VITE_API_URL: ${{ secrets.API_URL }}
      
      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: apps/web
```

### Add GitHub Secrets

In your repo: Settings → Secrets and variables → Actions

```
HETZNER_HOST          # Your VPS IP
HETZNER_SSH_KEY       # Private SSH key content
CLERK_PUBLISHABLE_KEY # pk_live_...
API_URL               # https://api.music.likeahe.ro
CLOUDFLARE_API_TOKEN  # From Cloudflare API Tokens page
```

---

## Troubleshooting

### Backend Issues

**API won't start:**
```bash
pm2 logs makemusic-api
# Check for missing env vars
```

**Database locked:**
```bash
# SQLite doesn't support concurrent writes well
# Check if multiple instances running
pm2 status
```

**CORS errors:**
- Verify `WEB_URL` env var matches your frontend URL exactly
- Check includes protocol (https://)

### Frontend Issues

**Build fails:**
```bash
cd apps/web
pnpm run build
# Check for TypeScript errors
```

**API calls failing:**
- Check browser console for CORS errors
- Verify `VITE_API_URL` is set correctly
- Ensure backend is running: `curl https://api.YOURDOMAIN.com/health`

### Polar Issues

**Webhooks not receiving:**
```bash
# On VPS, check webhook logs
tail -f /opt/makemusic/logs/out.log | grep webhook
```

**Subscription not syncing:**
- Check Polar webhook is configured correctly
- Verify `POLAR_WEBHOOK_SECRET` matches
- Manual sync: `curl -X POST https://api.YOURDOMAIN.com/subscription/sync`

---

## Quick Reference

### Useful Commands

```bash
# Backend - VPS
pm2 status                    # Check API status
pm2 logs makemusic-api        # View logs
pm2 restart makemusic-api     # Restart API
pm2 reload makemusic-api      # Zero-downtime reload

# Frontend - Local
npx wrangler deploy           # Deploy to Workers
npx wrangler tail             # View live logs

# Database
sqlite3 /opt/makemusic/data/prod.db  # Access DB
.backup /tmp/backup.sql              # Backup
```

### Environment Summary

| Service | Dev | Production |
|---------|-----|------------|
| Frontend URL | `*.workers.dev` | `music.likeahe.ro` |
| Backend URL | `api-dev.music.likeahe.ro` | `api.music.likeahe.ro` |
| Clerk | Test mode | Live mode |
| Polar | Sandbox | Live |
| R2 Bucket | `makemusic-audio-dev` | `makemusic-audio-prod` |
| Database | `dev.db` | `prod.db` |

---

## Next Steps

1. ✅ Complete Phase 1 (dev mode)
2. ✅ Test all features with sandbox Polar
3. ✅ Get production accounts ready
4. ✅ Execute Phase 2 migration
5. ✅ Set up monitoring (consider Sentry, Logrocket)
6. ✅ Set up automated backups for the database
7. ✅ Configure CDN caching rules in Cloudflare

**Ready to start? Begin with Step 1.1 - create your Hetzner VPS!**