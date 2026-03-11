#!/bin/bash
# Deploy script for MakeMusic frontend to Cloudflare Workers
# Usage: ./deploy-frontend.sh [dev|prod]

set -e

ENV=${1:-dev}

echo "🚀 Deploying MakeMusic Web ($ENV) to Cloudflare Workers..."

cd apps/web

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build
echo "🔨 Building..."
pnpm run build

# Deploy
echo "☁️  Deploying to Cloudflare..."
if [ "$ENV" = "production" ]; then
  npx wrangler deploy --env production
else
  npx wrangler deploy --env dev
fi

echo "✅ Frontend deployed!"
echo ""
echo "View logs: npx wrangler tail"