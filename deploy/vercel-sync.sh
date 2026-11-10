#!/usr/bin/env bash
# Point the Vercel landing page at the current backend URL and deploy it.
#   deploy/vercel-sync.sh https://xxxx.trycloudflare.com [--prod]
# The landing page (site/) is static on Vercel. /api/*, the demo phone (/phone)
# and its assets are rewritten to the backend (console :8001 behind the tunnel,
# which proxies /api to the clinic API :8000). The desk console opens on the
# Vercel domain at /console.
set -euo pipefail
BACKEND="${1:?backend URL, e.g. https://xxxx.trycloudflare.com}"; BACKEND="${BACKEND%/}"
shift
cd "$(dirname "$0")/../site"
cat > vercel.json <<JSON
{
  "\$schema": "https://openapi.vercel.sh/vercel.json",
  "cleanUrls": true,
  "rewrites": [
    { "source": "/api/:path*", "destination": "$BACKEND/api/:path*" },
    { "source": "/healthz", "destination": "$BACKEND/healthz" },
    { "source": "/phone", "destination": "$BACKEND/phone.html" },
    { "source": "/console", "destination": "$BACKEND/?live=1" },
    { "source": "/js/:path*", "destination": "$BACKEND/js/:path*" },
    { "source": "/console.css", "destination": "$BACKEND/console.css" },
    { "source": "/brand/:path*", "destination": "$BACKEND/brand/:path*" }
  ],
  "headers": [
    { "source": "/phone", "headers": [{ "key": "Permissions-Policy", "value": "microphone=(self)" }] }
  ]
}
JSON
# The desk console is served through Vercel too, at /console (same origin, so the login cookie works).
sed -i "s#consoleUrl: \"[^\"]*\"#consoleUrl: \"/console\"#" config.js
grep consoleUrl config.js
vercel deploy --yes "$@"
