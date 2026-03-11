# Music (likeahe.ro) Deployment

## Domain Structure

- **Frontend:** `music.likeahe.ro`
- **Backend API:** `api.music.likeahe.ro`

## Deployment Order

### 1. Backend First (Hetzner VPS)

```bash
# Nginx config
cat > /etc/nginx/sites-available/music << 'EOF'
server {
    listen 80;
    server_name api.music.likeahe.ro;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

ln -s /etc/nginx/sites-available/music /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL
certbot --nginx -d api.music.likeahe.ro
```

**DNS:** Add A record `api.music` → YOUR_VPS_IP

### 2. Frontend (Cloudflare Workers)

```bash
cd apps/web
pnpm install
export VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
export VITE_API_URL=https://api.music.likeahe.ro
pnpm run build
npx wrangler deploy
```

**DNS:** Add CNAME `music` → your-worker.workers.dev

## Environment Variables

### Backend (.env)
```bash
WEB_URL=https://music.likeahe.ro
PORT=3001
# ... rest
```