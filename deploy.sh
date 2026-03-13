#!/bin/bash

set -e

APP_NAME="music"
DEV_PATH="/home/samyr/dev/apps/$APP_NAME"
PROD_PATH="/opt/myapps/$APP_NAME"

echo "🚀 Deploying $APP_NAME..."

# Build API
echo "📦 Building API..."
cd "$DEV_PATH/apps/api"
pnpm install --no-frozen-lockfile
pnpm run build

# Copy API to production
echo "🔄 Copying API to $PROD_PATH..."
sudo mkdir -p "$PROD_PATH"
sudo rm -rf "$PROD_PATH/dist"
sudo cp -r "$DEV_PATH/apps/api/dist/" "$PROD_PATH/"
sudo cp "$DEV_PATH/apps/api/package.json" "$PROD_PATH/"

# Copy ecosystem config
echo "⚙️ Copying PM2 config..."
sudo cp "$DEV_PATH/../ecosystem.config.cjs" /opt/myapps/

# Install nginx config
echo "🌐 Installing nginx config..."
sudo cp "$DEV_PATH/nginx.conf" /etc/nginx/sites-available/music
sudo ln -sf /etc/nginx/sites-available/music /etc/nginx/sites-enabled/music
sudo nginx -t && sudo systemctl reload nginx

# Set proper permissions
echo "🔐 Setting permissions..."
sudo chown -R samyr:samyr "$PROD_PATH"

# Install production dependencies for API
echo "📋 Installing API production dependencies..."
cd "$PROD_PATH"
pnpm install --no-frozen-lockfile --production

# Restart PM2
echo "🔄 Restarting PM2..."
pm2 restart music || pm2 start /opt/myapps/ecosystem.config.cjs

echo "✅ Deployment complete!"
echo "API: $PROD_PATH"
echo ""
echo "⚠️  Don't forget to set environment variables in $PROD_PATH/.env"
