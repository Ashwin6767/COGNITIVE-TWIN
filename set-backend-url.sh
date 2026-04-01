#!/bin/bash
# Usage: ./set-backend-url.sh https://your-service.onrender.com
# This updates Vercel env vars and triggers a redeploy automatically.

set -e

BACKEND_URL="${1:-}"

if [ -z "$BACKEND_URL" ]; then
  echo "Usage: $0 https://your-backend.onrender.com"
  echo ""
  echo "Find your URL in Render dashboard → cognitive-twin-api → top of the page"
  exit 1
fi

# Strip trailing slash
BACKEND_URL="${BACKEND_URL%/}"

API_URL="${BACKEND_URL}/api"
WS_URL="${BACKEND_URL/https:/wss:}/api/ws/stream"

echo "Setting backend URLs:"
echo "  API:       $API_URL"
echo "  WebSocket: $WS_URL"
echo ""

cd "$(dirname "$0")/frontend"

# Remove existing env vars and re-add with new value
vercel env rm NEXT_PUBLIC_API_URL production --yes 2>/dev/null || true
vercel env rm NEXT_PUBLIC_WS_URL production --yes 2>/dev/null || true

echo "$API_URL" | vercel env add NEXT_PUBLIC_API_URL production
echo "$WS_URL"  | vercel env add NEXT_PUBLIC_WS_URL production

echo ""
echo "Env vars updated. Redeploying..."
cd "$(dirname "$0")"
vercel deploy --prod

echo ""
echo "✅ Done! Frontend is now connected to $BACKEND_URL"
echo ""
echo "You should also update backend FRONTEND_URL on Render:"
echo "  Key:   FRONTEND_URL"
echo "  Value: $(vercel ls 2>/dev/null | grep -oE 'https://[^ ]+vercel\.app' | head -1 || echo 'https://your-app.vercel.app')"
