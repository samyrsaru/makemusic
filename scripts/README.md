# MakeMusic Deployment Scripts

This directory contains helper scripts for deploying MakeMusic.

## Quick Start

### Manual Deployment

1. **Deploy Backend to Hetzner VPS:**
   ```bash
   ./deploy-backend.sh dev 123.456.789.012
   ```

2. **Deploy Frontend to Cloudflare Workers:**
   ```bash
   ./deploy-frontend.sh dev
   ```

### Automated Deployment (GitHub Actions)

The repository includes a GitHub Actions workflow for automated deployment.

**Setup required secrets:**
- `HETZNER_HOST` - Your VPS IP address
- `HETZNER_SSH_KEY` - Private SSH key (content, not file path)
- `CLERK_PUBLISHABLE_KEY` - From Clerk dashboard
- `API_URL` - Your backend URL (e.g., https://api.music.likeahe.ro)
- `FRONTEND_URL` - Your frontend URL (e.g., https://music.likeahe.ro)
- `CLOUDFLARE_API_TOKEN` - From Cloudflare API Tokens page
- `CLOUDFLARE_ACCOUNT_ID` - From Cloudflare dashboard

**Trigger deployment:**
- Push to `main` branch - auto-deploys to dev
- Manual trigger - choose environment in GitHub Actions tab

## File Structure

```
scripts/
├── deploy-backend.sh      # Deploy API to Hetzner VPS
├── deploy-frontend.sh     # Deploy web to Cloudflare Workers
└── README.md              # This file
```

## Prerequisites

### For Backend Deployment
- SSH access to Hetzner VPS configured
- PM2 installed on VPS
- Node.js 20+ and pnpm on VPS
- `.env` file configured on VPS

### For Frontend Deployment
- Wrangler CLI authenticated (`npx wrangler login`)
- `wrangler.toml` configured
- Cloudflare account with Workers enabled

## Troubleshooting

**SSH connection issues:**
```bash
# Test SSH connection
ssh root@YOUR_SERVER_IP

# If permission denied, check SSH key
ssh-add -l
```

**Build failures:**
```bash
# Check logs locally first
pnpm run build
```

**PM2 not found on VPS:**
```bash
# SSH to VPS and install
npm install -g pm2
```