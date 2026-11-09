#!/bin/sh
# Push the N8N_* values from .env.local into the Convex deployment env.
# Convex functions run in the Convex backend, which reads deployment env --
# it cannot see .env.local the way Next.js does.
set -e
for key in N8N_WEBHOOK_URL N8N_WEBHOOK_SECRET N8N_API_SECRET; do
  value=$(grep "^$key=" .env.local | head -1 | cut -d= -f2-)
  if [ -z "$value" ]; then
    echo "skip $key (not set in .env.local)"
    continue
  fi
  pnpm exec convex env set "$key" "$value"
done
