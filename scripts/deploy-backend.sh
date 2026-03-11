#!/bin/bash
# Deploy script for MakeMusic backend to Hetzner VPS
# Usage: ./deploy-backend.sh [dev|prod]

set -e

ENV=${1:-dev}
SERVER_IP=${2:-}

if [ -z "$SERVER_IP" ]; then
  echo "Usage: ./deploy-backend.sh [dev|prod] <SERVER_IP>"
  echo "Example: ./deploy-backend.sh dev 123.456.789.012"
  exit 1
fi

echo "🚀 Deploying MakeMusic API ($ENV) to $SERVER_IP..."

# Build locally first
echo "📦 Building locally..."
cd apps/api
pnpm install
pnpm run build
cd ../..

# Create remote directory
echo "📁 Setting up remote directory..."
ssh root@$SERVER_IP "mkdir -p /opt/makemusic/logs"

# Sync files (excluding node_modules and sensitive files)
echo "📤 Uploading files..."
rsync -avz --delete \
  --exclude=node_modules \
  --exclude=dist \
  --exclude='.env' \
  --exclude='*.db' \
  --exclude=logs \
  ./apps/api/ root@$SERVER_IP:/opt/makemusic/

# Install dependencies and restart on server
echo "🔧 Installing dependencies and restarting..."
ssh root@$SERVER_IP << EOF
  cd /opt/makemusic
  
  # Install dependencies
  pnpm install --production
  
  # Build
  pnpm run build
  
  # Check if PM2 is running
  if pm2 list | grep -q "makemusic-api"; then
    echo "🔄 Restarting API..."
    pm2 reload ecosystem.config.cjs --env $ENV
  else
    echo "▶️  Starting API for the first time..."
    pm2 start ecosystem.config.cjs --env $ENV
    pm2 save
  fi
  
  # Show status
  pm2 status
EOF

echo "✅ Deployment complete!"
echo ""
echo "Check logs with: ssh root@$SERVER_IP 'pm2 logs makemusic-api'"
echo "Check health: curl https://api-$ENV.yourdomain.com/health"